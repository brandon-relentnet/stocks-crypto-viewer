import React from 'react';

const TradeSelection = ({ subscribedSymbols }) => {

    return (
        <div className='rounded-b overflow-hidden'>
            <h1 className='mb-4 ml-1 text-xl font-bold text-subtext1'>Trade Selection</h1>
            {subscribedSymbols.length === 0 ? (
                <p>No symbols subscribed yet...</p>
            ) : (
                    <ul className='flex-1 bg-surface0 rounded-t overflow-auto h-80'>
                    {subscribedSymbols.map((symbol) => {
                        return (
                            <li key={symbol} className='w-52 border-b border-surface1'>
                                <div className='flex items-center ps-3'>
                                    <input
                                        type="checkbox"
                                        id={symbol}
                                        className='appearance-none w-4 h-4 bg-surface1 border-2 border-surface1 rounded hover:text-surface2 checked:bg-accent checked:border-accent hover:border-accent transition duration-200'
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