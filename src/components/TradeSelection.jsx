import React from 'react';

const TradeSelection = ({ subscribedSymbols }) => {

    return (
        <div className='absolute top-0 left-1/2 m-16 rounded-b overflow-hidden'>
            <h1>Trade Selection</h1>
            <p>Choose the trades you want to see:</p>
            {subscribedSymbols.length === 0 ? (
                <p>No symbols subscribed yet...</p>
            ) : (
                    <ul className='flex-1 bg-surface0 rounded-t overflow-auto h-80'>
                    {subscribedSymbols.map((symbol) => {
                        return (
                            <li key={symbol} className='w-full border-b border-surface1'>
                                <div className='flex items-center ps-3'>
                                    <input
                                        type="checkbox"
                                        id={symbol}
                                        className='w-4 h-4 text-blue bg-surface1 border-surface1 rounded focus:ring-blue'
                                    />
                                    <label htmlFor={symbol} className='w-full py-4 ms-2 text-sm font-medium'>{symbol}</label>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

        </div>
    );
}

export default TradeSelection;