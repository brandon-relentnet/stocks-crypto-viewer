// Load environment variables from a .env file
require('dotenv').config();

// Import required modules
const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');

// Initialize Express app and server port
const app = express();
const PORT = process.env.PORT || 4000;
const API_KEY = process.env.FINNHUB_API_KEY;

if (!API_KEY) {
    console.error('FINNHUB_API_KEY is missing. Please set it in your .env file.');
    process.exit(1);
}

// Finnhub WebSocket URL and trade event type constants
const FINNHUB_WS_URL = `wss://ws.finnhub.io?token=${API_KEY}`;
const TRADE_EVENT_TYPE = 'trade';

// Enable CORS and JSON body parsing
const cors = require('cors');
app.use(cors());
app.use(express.json()); // For parsing application/json in POST requests

// Create an HTTP server using the Express app
const server = http.createServer(app);

// Initialize Socket.IO for real-time communication with clients
const io = socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

// File to store active subscriptions
const SUBSCRIPTIONS_FILE = path.join(__dirname, 'subscriptions.json');

// Store dynamically subscribed stock symbols and the latest prices
const activeSubscriptions = new Set();
const latestPrices = {};

// Helper function to save subscriptions to a file
const saveSubscriptionsToFile = () => {
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(Array.from(activeSubscriptions)), 'utf8');
};

// Helper function to load subscriptions from a file
const loadSubscriptionsFromFile = () => {
    if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
        try {
            const data = fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf8');
            const symbols = JSON.parse(data);
            symbols.forEach((symbol) => activeSubscriptions.add(symbol));
            console.log('Loaded subscriptions from file:', symbols);
        } catch (error) {
            console.error('Error reading subscriptions file:', error);
        }
    }
};

// Load subscriptions from file on server start
loadSubscriptionsFromFile();

// Helper function to create Finnhub WebSocket
const createFinnhubWebSocket = () => new WebSocket(FINNHUB_WS_URL);

// Initialize WebSocket connection
let finnhubSocket = createFinnhubWebSocket();
let reconnecting = false;

// Helper function to subscribe to a single symbol
const subscribeToSymbol = (symbol) => {
    if (!activeSubscriptions.has(symbol)) {
        finnhubSocket.send(JSON.stringify({ type: 'subscribe', symbol }));
        activeSubscriptions.add(symbol);
        saveSubscriptionsToFile();
        console.log(`Subscribed to ${symbol}`);
    }
};

// Helper function to unsubscribe from a single symbol
const unsubscribeFromSymbol = (symbol) => {
    if (activeSubscriptions.has(symbol)) {
        finnhubSocket.send(JSON.stringify({ type: 'unsubscribe', symbol }));
        activeSubscriptions.delete(symbol);
        saveSubscriptionsToFile();
        console.log(`Unsubscribed from ${symbol}`);
    }
};

// WebSocket initialization and reconnection handling
const initializeFinnhubWebSocket = () => {
    finnhubSocket.on('open', () => {
        console.log('Connected to Finnhub WebSocket');
        // Resubscribe to all active symbols
        activeSubscriptions.forEach((symbol) => {
            finnhubSocket.send(JSON.stringify({ type: 'subscribe', symbol }));
        });
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

                // Update latest prices and broadcast to clients
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

// Handle new client connections via Socket.IO
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

// API endpoint to add a new symbol
app.post('/subscribe', (req, res) => {
    const { symbol } = req.body;
    if (!symbol) {
        return res.status(400).json({ error: 'Symbol is required' });
    }

    subscribeToSymbol(symbol);
    res.json({ message: `Subscription for ${symbol} added`, activeSubscriptions: Array.from(activeSubscriptions) });
});

// API endpoint to remove a symbol
app.post('/unsubscribe', (req, res) => {
    const { symbol } = req.body;
    if (!symbol) {
        return res.status(400).json({ error: 'Symbol is required' });
    }

    unsubscribeFromSymbol(symbol);
    res.json({ message: `Subscription for ${symbol} removed`, activeSubscriptions: Array.from(activeSubscriptions) });
});

// API endpoint to list all active subscriptions
app.get('/subscriptions', (req, res) => {
    res.json({ activeSubscriptions: Array.from(activeSubscriptions) });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
