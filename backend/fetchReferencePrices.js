// fetchReferencePrices.js

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { promises as fs } from 'fs';
import path from 'path';

// Initialize environment variables
dotenv.config();

// Constants
const API_KEY = process.env.FINNHUB_API_KEY;
const SUBSCRIPTIONS_FILE = path.resolve('./subscriptions.json');
const REFERENCE_PRICES_FILE = path.resolve('./referencePrices.json');

let DELAY_BETWEEN_CALLS_MS = 500;

// Utility function to delay execution
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to read subscriptions.json
async function readSubscriptions() {
    try {
        const data = await fs.readFile(SUBSCRIPTIONS_FILE, 'utf-8');
        const symbols = JSON.parse(data);
        if (!Array.isArray(symbols)) {
            throw new Error('subscriptions.json must contain an array of symbols.');
        }
        return symbols;
    } catch (error) {
        console.error(`Error reading subscriptions.json: ${error.message}`);
        return [];
    }
}

// Function to fetch reference price for a single symbol
async function getStockReferencePrice(symbol) {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${API_KEY}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} for symbol: ${symbol}`);
        }
        const data = await response.json();

        return {
            symbol,
            currentPrice: data.c,
            previousClose: data.pc,
            timestamp: data.t
        };
    } catch (error) {
        console.error(`Error fetching data for ${symbol}: ${error.message}`);
        return null;
    }
}

// Function to fetch all reference prices sequentially with delays
async function fetchAllReferencePrices(symbols) {
    const results = [];

    for (const symbol of symbols) {
        console.log(`Fetching data for ${symbol}...`);
        const refPrice = await getStockReferencePrice(symbol);
        if (refPrice) {
            results.push(refPrice);
            console.log(`Fetched ${symbol}: Previous Close = $${refPrice.previousClose}`);
        }
        // Wait for the specified delay before next API call
        await delay(DELAY_BETWEEN_CALLS_MS);
    }
    return results;
}

// Function to save reference prices to a JSON file
async function saveReferencePrices(prices) {
    const tempFilePath = path.join(__dirname, 'referencePrices.temp.json');
    try {
        await fs.writeFile(tempFilePath, JSON.stringify(prices, null, 2));
        await fs.rename(tempFilePath, REFERENCE_PRICES_FILE);
        console.log(`Reference prices saved to ${REFERENCE_PRICES_FILE}`);
    } catch (error) {
        console.error(`Error saving reference prices: ${error.message}`);
    }
}

// Main function to orchestrate fetching and saving reference prices
async function updateReferencePrices() {
    console.log(`\n=== Updating Reference Prices at ${new Date().toLocaleString()} ===`);

    const symbols = await readSubscriptions();
    if (symbols.length === 0) {
        console.log('No symbols to fetch. Exiting update.');
        return;
    }

    let subscribedCount = 0;
    for (let i of symbols) {
        ++subscribedCount;
    }

    console.log(`Total number of symbols subscribed: ${subscribedCount}`);
    if (subscribedCount < 60) {
        DELAY_BETWEEN_CALLS_MS = 50;
        console.log(`Delay between calls adjusted to ${DELAY_BETWEEN_CALLS_MS} ms for small number of symbols.`);
    }


    const refPrices = await fetchAllReferencePrices(symbols);
    if (refPrices.length > 0) {
        await saveReferencePrices(refPrices);
    } else {
        console.log('No reference prices fetched.');
    }

    console.log(`=== Update Completed at ${new Date().toLocaleString()} ===\n`);
}

// Schedule the script to run once daily at 17:00 UTC (5 PM UTC)
// Adjust the cron expression as needed for your desired time and timezone
cron.schedule('0 17 * * *', () => {
    updateReferencePrices();
    // If you want to handle it asynchronously without blocking, you can remove the await and handle promises accordingly
});

// Optionally, run the update immediately when the script starts
updateReferencePrices();
