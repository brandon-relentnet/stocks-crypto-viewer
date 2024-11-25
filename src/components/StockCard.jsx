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
            changeColor = 'green';
            break;
        case 'down':
            ArrowIcon = FaArrowDown;
            changeColor = 'red';
            break;
        default:
            ArrowIcon = FaMinus;
            changeColor = 'gray';
    }

    return (
        <div className="stock-card">
            <h2>{symbol}</h2>
            <p className="current-price">${price.toFixed(2)}</p>
            {previousClose !== null && (
                <div className="price-change" style={{ color: changeColor }}>
                    <ArrowIcon />
                    <span>{priceChange} ({percentageChange}%)</span>
                </div>
            )}
            {previousClose !== null && (
                <p className="previous-close">Previous Close: ${previousClose.toFixed(2)}</p>
            )}
        </div>
    );
};

export default StockCard;
