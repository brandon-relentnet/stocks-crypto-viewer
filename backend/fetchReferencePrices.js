import fetch from 'node-fetch';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// Initialize environment variables
dotenv.config();

// Constants
const API_KEY = process.env.FINNHUB_API_KEY;
const SUBSCRIPTIONS_FILE = path.resolve('./data/subscriptions.json');
const REFERENCE_PRICES_FILE = path.resolve('./data/referencePrices.json');
const SYMBOL_DATA_FILE = path.resolve('./data/symbolData.json');
const DELAY_BETWEEN_CALLS_MS = 500; // Increased delay to mitigate rate limiting
const RETRY_DELAY_MS = 10000; // Retry delay in case of rate limiting
const MAX_RETRIES = 3; // Maximum number of retries on failure

// Get the current directory equivalent to __dirname in CommonJS
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// General-purpose function to fetch data from Finnhub API with retry logic
async function fetchWithRetries(url, symbol, description) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`[${new Date().toLocaleTimeString()}] Fetching ${description} for ${symbol} (Attempt ${attempt})`);
            const response = await fetch(url);
            if (response.ok) {
                return await response.json();
            } else if (response.status === 429) {
                console.warn(`[${new Date().toLocaleTimeString()}] Rate limited for ${symbol}. Retrying in ${RETRY_DELAY_MS / 1000}s...`);
                await delay(RETRY_DELAY_MS);
            } else {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
        } catch (error) {
            console.error(`[${new Date().toLocaleTimeString()}] Error fetching ${description} for ${symbol}: ${error.message}`);
            if (attempt === MAX_RETRIES) {
                console.error(`[${new Date().toLocaleTimeString()}] Failed to fetch ${description} for ${symbol} after ${MAX_RETRIES} attempts.`);
                return null;
            }
        }
    }
}

// Function to fetch reference price for a single symbol
async function getStockReferencePrice(symbol) {
    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEY}`;
    const data = await fetchWithRetries(url, symbol, 'reference price');
    if (data) {
        return {
            symbol, // Include the symbol in the returned data
            currentPrice: data.c,
            previousClose: data.pc,
            timestamp: data.t
        };
    }
    return null;
}

// Function to read symbol data cache
async function readSymbolDataCache() {
    try {
        const data = await fs.readFile(SYMBOL_DATA_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        // If file doesn't exist, return empty object
        return {};
    }
}

// Function to save symbol data cache
async function saveSymbolDataCache(symbolData) {
    try {
        await fs.writeFile(SYMBOL_DATA_FILE, JSON.stringify(symbolData, null, 2));
        console.log(`[${new Date().toLocaleTimeString()}] Symbol data cache saved to ${SYMBOL_DATA_FILE}`);
    } catch (error) {
        console.error(`[${new Date().toLocaleTimeString()}] Error saving symbol data cache: ${error.message}`);
    }
}

// Modified function to get or fetch symbol data
async function getSymbolData(symbol, symbolDataCache) {
    if (symbolDataCache[symbol]) {
        return symbolDataCache[symbol];
    }

    const searchURL = `https://finnhub.io/api/v1/search?q=${symbol}&token=${API_KEY}`;
    const data = await fetchWithRetries(searchURL, symbol, 'symbol data');

    if (data && data.result && data.result.length > 0) {
        const matchingSymbol = data.result.find(item => item.symbol === symbol);
        if (matchingSymbol) {
            const type = matchingSymbol.type === 'Crypto' ? 'crypto' : 'stock';
            const displaySymbol = matchingSymbol.displaySymbol || matchingSymbol.description || matchingSymbol.symbol;

            const symbolData = { type, displaySymbol };
            symbolDataCache[symbol] = symbolData; // Update cache
            return symbolData;
        }
    }

    return null;
}

// Function to save reference prices to a JSON file
async function saveReferencePrices(prices) {
    try {
        // Ensure each price entry includes a symbol
        const updatedPrices = prices.filter(price => price && price.symbol);
        await fs.writeFile(REFERENCE_PRICES_FILE, JSON.stringify(updatedPrices, null, 2));
        console.log(`[${new Date().toLocaleTimeString()}] Reference prices saved to ${REFERENCE_PRICES_FILE}`);
    } catch (error) {
        console.error(`[${new Date().toLocaleTimeString()}] Error saving reference prices: ${error.message}`);
    }
}

// Main function to orchestrate fetching and saving data
async function updateReferencePrices() {
    console.log(`\n=== Updating Reference Prices at ${new Date().toLocaleString()} ===`);

    const symbols = await readSubscriptions();
    if (symbols.length === 0) {
        console.log('No symbols to fetch. Exiting update.');
        return;
    }

    console.log(`[${new Date().toLocaleTimeString()}] Total number of symbols subscribed: ${symbols.length}`);

    // Load symbol data cache
    const symbolDataCache = await readSymbolDataCache();

    const referencePrices = [];

    for (const symbol of symbols) {
        console.log(`[${new Date().toLocaleTimeString()}] Processing ${symbol}...`);

        const symbolData = await getSymbolData(symbol, symbolDataCache);

        if (!symbolData) {
            console.warn(`[${new Date().toLocaleTimeString()}] Skipped ${symbol} due to missing symbol data.`);
            continue;
        }

        // Fetch reference price
        const refPrice = await getStockReferencePrice(symbol);
        if (refPrice) {
            referencePrices.push({
                ...refPrice,
                type: symbolData.type,
                displaySymbol: symbolData.displaySymbol,
            });
            console.log(`[${new Date().toLocaleTimeString()}] Fetched data for ${symbol}`);
        } else {
            console.warn(`[${new Date().toLocaleTimeString()}] Skipped reference price fetching for ${symbol} due to errors.`);
        }

        await delay(DELAY_BETWEEN_CALLS_MS);
    }

    // Save reference prices
    await saveReferencePrices(referencePrices);

    // Always save the updated symbol data cache
    await saveSymbolDataCache(symbolDataCache);

    console.log(`=== Update Completed at ${new Date().toLocaleString()} ===\n`);
}

// Schedule the script to run once daily at 17:00 UTC (5 PM UTC)
cron.schedule('0 17 * * *', async () => {
    try {
        await updateReferencePrices();
    } catch (error) {
        console.error(`Error during scheduled update: ${error.message}`);
    }
});

// Optionally, run the update immediately when the script starts
updateReferencePrices().catch(error => {
    console.error(`Error during initial update: ${error.message}`);
});
