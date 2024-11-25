import React, { useEffect } from 'react';
import RealTimeStockData from './components/RealTimeData';
import { useState } from 'react';
import TradeSelection from './components/TradeSelection';
import Subscribe from './components/Subscribe';
import io from 'socket.io-client';

const App = () => {
  const [subscribedSymbols, setSubscribedSymbols] = useState([]);
  const [stockData, setStockData] = useState({});
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

  return (
    <div className='w-9/12 mx-auto my-40'>
      <TradeSelection 
        subscribedSymbols={subscribedSymbols} 
      />

      <h1 className='text-6xl font-bold mb-24'>Scrollr Stocks Integration</h1>
      <h2 className='mb-4 ml-1 text-xl font-bold text-subtext1'>Subscribe to a Stock Symbol</h2>
      <Subscribe 
        setSubscribedSymbols={setSubscribedSymbols}
        onSubscription={handleNewSubscription}
      />

      <RealTimeStockData 
        subscribedSymbols={subscribedSymbols} 
        loading={loading}
        stockData={stockData}
      />
    </div>
  );
};

export default App;
