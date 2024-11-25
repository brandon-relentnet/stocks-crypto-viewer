// RealTimeStockData.jsx
import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';

const RealTimeStockData = () => {
    const [stockData, setStockData] = useState([]);
    const [loading, setLoading] = useState(true);
    const symbols = ['AAPL', 'GOOGL', 'MSFT'];

    useEffect(() => {
        const socket = io('http://localhost:4000');

        socket.on('connect', () => {
            console.log('Connected to server via Socket.IO');
        });

        socket.on('initialData', (data) => {
            setStockData(data);
            setLoading(false);
        });

        socket.on('stockData', (data) => {
            setStockData((prevData) => {
                const existingIndex = prevData.findIndex((item) => item.symbol === data.symbol);
                if (existingIndex !== -1) {
                    // Update existing symbol
                    const updatedData = [...prevData];
                    updatedData[existingIndex] = data;
                    return updatedData;
                } else {
                    // Add new symbol
                    return [...prevData, data];
                }
            });
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    if (loading) return <div>Loading...</div>;

    return (
        <div>
            <h1>Real-Time Stock Prices</h1>
            {symbols.map((symbol) => {
                const stock = stockData.find((s) => s.symbol === symbol);
                return (
                    <div key={symbol}>
                        <h2>{symbol}</h2>
                        <p>Price: {stock ? stock.price : 'No data available yet...'}</p>
                        <p>Timestamp: {stock ? new Date(stock.timestamp).toLocaleTimeString() : ''}</p>
                    </div>
                );
            })}
        </div>
    );
};

export default RealTimeStockData;
