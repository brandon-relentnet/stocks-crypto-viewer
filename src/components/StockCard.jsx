// StockCard.jsx
import React from 'react';
import { FaArrowUp, FaArrowDown, FaMinus } from 'react-icons/fa'; // For directional arrows

const StockCard = ({ symbol, stock }) => {
    if (!stock) {
        return (
            <div className="stock-card">
                <h2>{symbol}</h2>
                <p>Loading data...</p>
            </div>
        );
    }

    const {
        price,
        previousClose,
        priceChange,
        percentageChange,
        direction
    } = stock;

    // Determine arrow and color based on direction
    let ArrowIcon;
    let changeColor;

    switch (direction) {
        case 'up':
            ArrowIcon = FaArrowUp;
            changeColor = 'var(--green)';
            break;
        case 'down':
            ArrowIcon = FaArrowDown;
            changeColor = 'var(--red)';
            break;
        default:
            ArrowIcon = FaMinus;
            changeColor = 'var(--subtext0)';
    }

    return (
        <div className="p-4 w-60 bg-surface0 rounded shadow border-2 border-surface0 hover:border-accent hover:shadow-lg transition duration-300 relative">
            <div className='absolute top-0 right-0 p-1'>📍</div>
            <h2 className='text-xl font-bold'>{symbol}</h2>
            <p className="current-price">${price.toFixed(2)}</p>
            {previousClose !== null && (
                <div className="flex" style={{ color: changeColor }}>
                    <span className='mr-1 text-xl'>{priceChange} ({percentageChange}%)</span>
                    <div className='absolute bottom-0 right-0 p-1 text-2xl'>
                        <ArrowIcon />
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockCard;
