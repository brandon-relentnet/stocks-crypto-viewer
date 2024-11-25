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
        <div className='mb-6 bg-surface0 rounded shadow inline-block p-4'>
            <form onSubmit={handleSubscribe}>
                <input
                    type="text"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    placeholder="Enter stock symbol (e.g., AAPL)"
                    className='bg-surface1 py-2 px-4 rounded shadow mr-4 border-2 border-surface1 focus:outline-none focus:border-accent hover:shadow-lg focus:shadow-2xl hover:border-surface2 transition duration-300'
                />
                <button className='bg-surface1 py-4 px-8 rounded shadow text-subtext0 hover:bg-surface2 active:bg-accent hover:text-text active:text-base hover:shadow-lg active:shadow-2xl transition duration-300' type="submit">Subscribe</button>
            </form>
            {message && <p className='text-red ml-1'>*{message}</p>}
        </div>
    );
};

export default Subscribe;
