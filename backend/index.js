// Load environment variables from a .env file
require('dotenv').config();

// Import required modules
const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const socketIo = require('socket.io');

// Initialize Express app and server port
const app = express();
const PORT = process.env.PORT || 4000;
const API_KEY = process.env.FINNHUB_API_KEY;

if (!API_KEY) {
    console.error('FINNHUB_API_KEY is missing. Please set it in your .env file.');
    process.exit(1);
}

// Stock symbols to subscribe to
const symbols = ['AAPL', 'GOOGL', 'MSFT'];

// Finnhub WebSocket URL and trade event type constants
const FINNHUB_WS_URL = `wss://ws.finnhub.io?token=${API_KEY}`;
const TRADE_EVENT_TYPE = 'trade';

const cors = require('cors');
app.use(cors());

const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

// Store the latest prices for subscribed stocks
const latestPrices = {};

// Handle new client connections
io.on('connection', (socket) => {
    console.log('Client connected');
    socket.on('disconnect', () => console.log('Client disconnected'));

    // Send initial stock data to the client
    const initialData = Object.entries(latestPrices).map(([symbol, { price, timestamp }]) => ({
        symbol,
        price,
        timestamp,
    }));
    socket.emit('initialData', initialData);
});

// Helper function to create Finnhub WebSocket
const createFinnhubWebSocket = () => new WebSocket(FINNHUB_WS_URL);

// Helper function to manage subscriptions
const handleSubscription = (action) => {
    symbols.forEach((symbol) => {
        finnhubSocket.send(JSON.stringify({ type: action, symbol }));
    });
};

// Initialize WebSocket connection
let finnhubSocket = createFinnhubWebSocket();
let reconnecting = false;

const initializeFinnhubWebSocket = () => {
    finnhubSocket.on('open', () => {
        console.log('Connected to Finnhub WebSocket');
        handleSubscription('subscribe');
    });

    finnhubSocket.on('message', (data) => {
        const message = JSON.parse(data);
        if (message.type === TRADE_EVENT_TYPE) {
            message.data.forEach((trade) => {
                const { s: symbol, p: price, t: timestamp } = trade;

                if (!symbol || !price || !timestamp) {
                    console.warn('Incomplete trade data:', trade);
                    return;
                }

                latestPrices[symbol] = { price, timestamp };
                io.emit('stockData', { symbol, price, timestamp });
            });
        }
    });

    finnhubSocket.on('error', (error) => {
        console.error('WebSocket error:', error);
    });

    finnhubSocket.on('close', (code, reason) => {
        console.log(`WebSocket closed: ${code} ${reason}`);
        if (code !== 1000 && !reconnecting) {
            reconnecting = true;
            setTimeout(() => {
                console.log('Reconnecting to Finnhub WebSocket...');
                finnhubSocket = createFinnhubWebSocket();
                initializeFinnhubWebSocket();
                reconnecting = false;
            }, 5000);
        }
    });
};

// Start WebSocket connection
initializeFinnhubWebSocket();

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'chillin yo', subscribedSymbols: symbols });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
