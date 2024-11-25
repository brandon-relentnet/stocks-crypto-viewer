// index.js
require('dotenv').config();
const express = require('express');
const WebSocket = require('ws');
const Database = require('better-sqlite3');
const http = require('http'); // Import http module
const socketIo = require('socket.io'); // Import Socket.IO

const app = express();
const PORT = process.env.PORT || 4000; // Change the port to avoid conflicts
const API_KEY = process.env.FINNHUB_API_KEY;
const symbols = ['AAPL', 'GOOGL', 'MSFT'];

const cors = require('cors');
app.use(cors());

// Create an HTTP server
const server = http.createServer(app);

// Set up Socket.IO with CORS configuration
const io = socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

// Set up SQLite database
const db = new Database('stock_data.db');

// Create a table to store stock prices
db.exec(`
  CREATE TABLE IF NOT EXISTS stocks (
    symbol TEXT,
    price REAL,
    timestamp INTEGER
  )
`);

// Function to insert data into the database
const insertStockData = db.prepare(`
  INSERT INTO stocks (symbol, price, timestamp) VALUES (?, ?, ?)
`);

// Handle Socket.IO client connections
io.on('connection', (socket) => {
    console.log('Client connected via Socket.IO');

    // Send initial data to the client
    const stocks = db
        .prepare(
            `
      SELECT symbol, price, timestamp
      FROM (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY timestamp DESC) AS rn
        FROM stocks
      ) WHERE rn = 1
    `
        )
        .all();

    socket.emit('initialData', stocks);

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Set up the WebSocket connection to Finnhub
const finnhubSocket = new WebSocket(`wss://ws.finnhub.io?token=${API_KEY}`);

finnhubSocket.on('open', () => {
    console.log('Connected to Finnhub WebSocket');
    // Subscribe to stock symbols
    symbols.forEach((symbol) => {
        finnhubSocket.send(JSON.stringify({ type: 'subscribe', symbol }));
    });
});

finnhubSocket.on('message', (data) => {
    const message = JSON.parse(data);
    if (message.type === 'trade') {
        message.data.forEach((trade) => {
            const { s: symbol, p: price, t: timestamp } = trade;
            insertStockData.run(symbol, price, timestamp);
            // Emit the data to connected clients via Socket.IO
            io.emit('stockData', { symbol, price, timestamp });
        });
    }
});

finnhubSocket.on('error', (error) => {
    console.error('WebSocket error:', error);
});

finnhubSocket.on('close', (code, reason) => {
    console.log(`WebSocket closed: ${code} ${reason}`);
    // I'll implement reconnection logic later
});

// Express route to fetch the latest price for all symbols
app.get('/api/stocks', (req, res) => {
    const stocks = db
        .prepare(
            `
      SELECT symbol, price, timestamp
      FROM (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY timestamp DESC) AS rn
        FROM stocks
      ) WHERE rn = 1
    `
        )
        .all();

    res.json(stocks);
});

// Express route to fetch historical data for a specific symbol
app.get('/api/stocks/:symbol', (req, res) => {
    const { symbol } = req.params;
    const data = db
        .prepare('SELECT symbol, price, timestamp FROM stocks WHERE symbol = ? ORDER BY timestamp DESC')
        .all(symbol);

    res.json(data);
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
