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
const DISPLAY_SYMBOLS_FILE = path.resolve('./data/displaySymbols.json');
const MERGED_DATASET_FILE = path.resolve('./data/mergedDataset.json');
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


// Function to determine the type of symbol
async function determineSymbolType(symbol) {
    const searchURL = `https://finnhub.io/api/v1/search?q=${symbol}&token=${API_KEY}`;
    try {
        const data = await fetch(searchURL).then(res => res.json());
        if (data.result && data.result.length > 0) {
            const matchingSymbol = data.result.find(item => item.symbol === symbol);
            if (matchingSymbol) {
                const type = matchingSymbol.type;
                if (type === 'Crypto') {
                    return 'crypto';
                } else {
                    return 'stock';
                }
            }
        }
    } catch (error) {
        console.error(`[${new Date().toLocaleTimeString()}] Error determining type for ${symbol}: ${error.message}`);
    }
    return 'stock'; // Default to stock if not found
}

// Function to fetch display symbol based on type
async function getDisplaySymbol(symbol, type) {
    const searchURL = `https://finnhub.io/api/v1/search?q=${symbol}&token=${API_KEY}`;
    const data = await fetchWithRetries(searchURL, symbol, 'display symbol');
    if (data && data.result && data.result.length > 0) {
        const matchingSymbol = data.result.find(item => item.symbol === symbol);
        if (matchingSymbol) {
            return {
                symbol: symbol,
                displaySymbol: matchingSymbol.displaySymbol || matchingSymbol.description || matchingSymbol.symbol, // Use appropriate field
            };
        }
    }
    return null;
}

// Processing symbols with type classification
async function processSymbolsWithType(symbols, fetchFunction, resultHandler, taskName) {
    const results = [];
    for (const symbol of symbols) {
        console.log(`[${new Date().toLocaleTimeString()}] Starting ${taskName} for ${symbol}...`);

        const type = await determineSymbolType(symbol);
        const result = await fetchFunction(symbol, type);

        if (result) {
            results.push({ ...result, type });
            console.log(`[${new Date().toLocaleTimeString()}] Completed ${taskName} for ${symbol}`);
        } else {
            console.warn(`[${new Date().toLocaleTimeString()}] Skipped ${taskName} for ${symbol} due to errors.`);
        }

        await delay(DELAY_BETWEEN_CALLS_MS);
    }
    await resultHandler(results);
}

// Function to merge display symbols with reference prices
async function mergeDatasets() {
    try {
        // Load both datasets
        const [displaySymbols, referencePrices] = await Promise.all([
            fs.readFile(DISPLAY_SYMBOLS_FILE, 'utf-8').then(JSON.parse),
            fs.readFile(REFERENCE_PRICES_FILE, 'utf-8').then(JSON.parse),
        ]);

        // Merge datasets by matching `symbol`
        const merged = referencePrices.map((refPrice) => {
            const match = displaySymbols.find((dispSymbol) => dispSymbol.symbol === refPrice.symbol);

            // Merge display symbol if found
            if (match) {
                return {
                    ...refPrice,
                    displaySymbol: match.displaySymbol,
                };
            }

            // If no match, return reference price as-is
            return refPrice;
        });

        // Save the merged dataset
        await fs.writeFile(MERGED_DATASET_FILE, JSON.stringify(merged, null, 2));
        console.log(`Merged dataset saved to ${MERGED_DATASET_FILE}`);
    } catch (error) {
        console.error(`Error merging datasets: ${error.message}`);
    }
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


// Function to save display symbols to a JSON file
async function saveDisplaySymbols(displaySymbols) {
    try {
        await fs.writeFile(DISPLAY_SYMBOLS_FILE, JSON.stringify(displaySymbols, null, 2));
        console.log(`[${new Date().toLocaleTimeString()}] Display symbols saved to ${DISPLAY_SYMBOLS_FILE}`);
    } catch (error) {
        console.error(`[${new Date().toLocaleTimeString()}] Error saving display symbols: ${error.message}`);
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

    // Process reference prices
    await processSymbolsWithType(symbols, async (symbol) => {
        const type = await determineSymbolType(symbol); // Determine type
        return getStockReferencePrice(symbol); // Fetch reference price
    }, saveReferencePrices, 'reference pricing');

    // Process display symbols
    await processSymbolsWithType(symbols, getDisplaySymbol, saveDisplaySymbols, 'display symbol fetching');

    // Merge datasets
    await mergeDatasets();

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
