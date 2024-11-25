// Load environment variables from a .env file
require('dotenv').config();

// Import required modules
const express = require('express');
const WebSocket = require('ws'); // For connecting to Finnhub WebSocket API
const http = require('http'); // HTTP server module
const socketIo = require('socket.io'); // For real-time communication with clients via WebSockets

// Initialize Express app and server port
const app = express();
const PORT = process.env.PORT || 4000; // Use port from environment or default to 4000
const API_KEY = process.env.FINNHUB_API_KEY; // Finnhub API key from .env file

// Validate the API key before starting the server
if (!API_KEY) {
    console.error('FINNHUB_API_KEY is missing. Please set it in your .env file.');
    process.exit(1); // Exit the application with an error code
}

// List of stock symbols to subscribe to
const symbols = ['AAPL', 'GOOGL', 'MSFT']; // Example: Apple, Google, Microsoft

// Finnhub WebSocket URL and trade event type constants
const FINNHUB_WS_URL = `wss://ws.finnhub.io?token=${API_KEY}`;
const TRADE_EVENT_TYPE = 'trade';

// Enable CORS (Cross-Origin Resource Sharing) for the Express app
const cors = require('cors');
app.use(cors());

// Create an HTTP server using the Express app
const server = http.createServer(app);

// Initialize Socket.IO for real-time communication with clients
const io = socketIo(server, {
    cors: {
        origin: '*', // Allow requests from any origin
        methods: ['GET', 'POST'], // Allow GET and POST methods
    },
});

// Object to store the latest prices and timestamps for subscribed stocks
const latestPrices = {};

// Middleware to log client connections and disconnections
io.use((socket, next) => {
    console.log('Client connected');
    socket.on('disconnect', () => console.log('Client disconnected'));
    next();
});

// Handle new client connections via Socket.IO
io.on('connection', (socket) => {
    // Send initial stock data (if available) to the newly connected client
    const initialData = Object.entries(latestPrices).map(([symbol, { price, timestamp }]) => ({
        symbol,
        price,
        timestamp,
    }));
    socket.emit('initialData', initialData);
});

// Initialize a WebSocket connection to Finnhub's API
let finnhubSocket = new WebSocket(FINNHUB_WS_URL);

// Debounce reconnect attempts to avoid overlapping reconnections
let reconnecting = false;

// Function to handle the Finnhub WebSocket connection
const initializeFinnhubWebSocket = () => {
    // Handle WebSocket open event (connection established)
    finnhubSocket.on('open', () => {
        console.log('Connected to Finnhub WebSocket');
        // Subscribe to stock symbols
        symbols.forEach((symbol) => {
            finnhubSocket.send(JSON.stringify({ type: 'subscribe', symbol }));
        });
    });

    // Handle incoming WebSocket messages (stock data updates)
    finnhubSocket.on('message', (data) => {
        const message = JSON.parse(data); // Parse the incoming message
        if (message.type === TRADE_EVENT_TYPE) { // Process trade updates
            message.data.forEach((trade) => {
                const { s: symbol, p: price, t: timestamp } = trade;

                // Validate trade data to ensure completeness
                if (!symbol || !price || !timestamp) {
                    console.warn('Received incomplete trade data:', trade);
                    return; // Skip processing this trade
                }

                // Update the latest prices object with new data
                latestPrices[symbol] = { price, timestamp };
                // Broadcast updated stock data to all connected clients
                io.emit('stockData', { symbol, price, timestamp });
            });
        }
    });

    // Handle WebSocket error event
    finnhubSocket.on('error', (error) => {
        console.error('WebSocket error:', error);
    });

    // Handle WebSocket close event (connection lost or closed)
    finnhubSocket.on('close', (code, reason) => {
        console.log(`WebSocket closed: ${code} ${reason}`);

        // Cleanly unsubscribe from all symbols on close
        symbols.forEach((symbol) => {
            finnhubSocket.send(JSON.stringify({ type: 'unsubscribe', symbol }));
        });

        // Reconnect if the connection was not closed cleanly
        if (code !== 1000 && !reconnecting) { // 1000 indicates a normal closure
            reconnecting = true;
            setTimeout(() => {
                console.log('Reconnecting to Finnhub WebSocket...');
                finnhubSocket = new WebSocket(FINNHUB_WS_URL);
                initializeFinnhubWebSocket(); // Reinitialize the WebSocket connection
                reconnecting = false;
            }, 5000); // Wait 5 seconds before attempting to reconnect
        }
    });
};

// Start the Finnhub WebSocket connection
initializeFinnhubWebSocket();

// Serve a simple health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'chillin yo', subscribedSymbols: symbols });
});

// Start the HTTP server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
