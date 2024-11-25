import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import Subscribe from './Subscribe'; // Import the Subscribe component
import StockCard from './StockCard';

const RealTimeStockData = () => {
    const [stockData, setStockData] = useState([]);
    const [subscribedSymbols, setSubscribedSymbols] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const socket = io('http://localhost:4000');

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
                subscribedSymbols.map((symbol) => {
                    const stock = stockData.find((s) => s.symbol === symbol);
                    return (
                        <div key={symbol}>
                            <StockCard symbol={symbol} stock={stock} />
                        </div>
                    );
                })
            )}
        </div>
    );
};

export default RealTimeStockData;
