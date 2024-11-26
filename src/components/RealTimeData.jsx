// RealTimeStockData.jsx
import React from 'react';
import StockCard from './StockCard';

const RealTimeStockData = ({ subscribedSymbols, stockData }) => {
    return (
        <div>
            <h2 className='mb-4 ml-1 text-xl font-bold text-subtext1 text-center'>Real-Time Stock Prices</h2>
            {subscribedSymbols.length === 0 ? (
                <p>No symbols subscribed yet...</p>
            ) : (
                <div className='flex flex-wrap flex-grow justify-center gap-4'>
                    {subscribedSymbols.map((symbol) => {
                        const stock = stockData[symbol];
                        return (
                            <div key={symbol}>
                                <StockCard symbol={symbol} stock={stock} />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default RealTimeStockData;
