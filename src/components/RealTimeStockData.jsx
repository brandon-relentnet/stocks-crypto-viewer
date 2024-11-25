// RealTimeStockData.jsx

import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import Subscribe from './Subscribe'; // Import the Subscribe component
import StockCard from './StockCard';

const RealTimeStockData = () => {
    const [stockData, setStockData] = useState({});
    const [subscribedSymbols, setSubscribedSymbols] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const socket = io('http://localhost:4000'); // Adjust the URL if necessary

        // Fetch the current list of subscriptions
        const fetchSubscribedSymbols = async () => {
            try {
                const response = await fetch('http://localhost:4000/subscriptions');
                const data = await response.json();
                setSubscribedSymbols(data.activeSubscriptions || []);
            } catch (error) {
                console.error('Error fetching subscriptions:', error);
            }
        };

        fetchSubscribedSymbols();

        socket.on('connect', () => {
            console.log('Connected to server via Socket.IO');
        });

        // Handle initial data load
        socket.on('initialData', (data) => {
            // Transform the array into an object for easier access
            const dataMap = {};
            data.forEach(item => {
                dataMap[item.symbol] = item;
            });
            setStockData(dataMap);
            setLoading(false);
        });

        // Handle real-time stock data updates
        socket.on('stockData', (data) => {
            setStockData((prevData) => ({
                ...prevData,
                [data.symbol]: data,
            }));
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const handleNewSubscription = (newSubscriptions) => {
        setSubscribedSymbols(newSubscriptions); // Update the subscribed symbols list
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div>
            <h1>Real-Time Stock Prices</h1>
            <Subscribe onSubscription={handleNewSubscription} />
            {subscribedSymbols.length === 0 ? (
                <p>No symbols subscribed yet...</p>
            ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
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
