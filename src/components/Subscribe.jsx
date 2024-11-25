import React, { useState } from 'react';

const Subscribe = ({ onSubscription }) => {
    const [symbol, setSymbol] = useState('');
    const [message, setMessage] = useState('');

    const handleSubscribe = async (e) => {
        e.preventDefault();

        if (!symbol.trim()) {
            setMessage('Please enter a valid symbol.');
            return;
        }

        try {
            const response = await fetch('http://localhost:4000/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ symbol: symbol.toUpperCase() }),
            });

            const data = await response.json();
            if (response.ok) {
                setMessage(`Successfully subscribed to ${symbol.toUpperCase()}.`);
                setSymbol(''); // Clear the input field
                onSubscription(data.activeSubscriptions); // Update parent with the new subscription list
            } else {
                setMessage(data.error || 'Failed to subscribe.');
            }
        } catch (error) {
            console.error('Error subscribing to symbol:', error);
            setMessage('An error occurred while subscribing. Please try again.');
        }
    };

    return (
        <div>
            <h2>Subscribe to a Stock Symbol</h2>
            <form onSubmit={handleSubscribe}>
                <input
                    type="text"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    placeholder="Enter stock symbol (e.g., AAPL)"
                />
                <button type="submit">Subscribe</button>
            </form>
            {message && <p>{message}</p>}
        </div>
    );
};

export default Subscribe;
