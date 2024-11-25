import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.FINNHUB_API_KEY;
const symbol = 'AAPL'; // Example stock symbol

async function getStockReferencePrice(symbol) {
    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEY}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        return {
            currentPrice: data.c,
            previousClose: data.pc,
            timestamp: data.t
        };
    } catch (error) {
        console.error(`Error fetching stock data for ${symbol}:`, error);
        return null;
    }
}

// Usage
getStockReferencePrice(symbol).then(refPrice => {
    if (refPrice) {
        console.log(`Previous Close for ${symbol}: $${refPrice.previousClose}`);
    }
});