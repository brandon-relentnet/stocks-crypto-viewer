import React from 'react';

const StockCard = ({ symbol, stock }) => {
    return (
        <div className='mb-4 p-4 bg-surface0 rounded w-80'>
            <h2>{symbol}</h2>
            <p>Price: {stock ? stock.price : 'Loading...'}</p>
        </div>
    );
}

export default StockCard;