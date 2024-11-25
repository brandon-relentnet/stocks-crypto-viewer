import React from 'react';
import RealTimeStockData from './components/RealTimeStockData';

const App = () => {
  return (
    <div className='w-9/12 mx-auto my-80'>
      <h1 className='text-3xl font-bold mb-8'>Scrollr Stocks Integration</h1>
      <RealTimeStockData />
    </div>
  );
};

export default App;
