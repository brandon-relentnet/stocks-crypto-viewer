import React from 'react';
import RealTimeStockData from './components/RealTimeStockData';

const App = () => {
  return (
    <div className='w-9/12 mx-auto my-40'>
      <h1 className='text-5xl font-bold mb-16'>Scrollr Stocks Integration</h1>
      <RealTimeStockData />
    </div>
  );
};

export default App;
