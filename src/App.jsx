import React, { useState, useMemo } from 'react';
import CurrencySelector from './components/CurrencySelector.jsx';
import CurrencyPanel from './components/CurrencyPanel.jsx';
import { useOrderBookWS } from './hooks/useOrderBookWS.js';

/**
 * Main app component — the top-level layout.
 *
 * The user picks currency pairs from the dropdown, and each selected pair
 * gets its own panel with live order book data. The WebSocket hook handles
 * connecting to Coinbase and feeding data into Redux.
 *
 * We memoize the productIds array so the WebSocket hook doesn't see a new
 * reference on every render and try to reconnect unnecessarily.
 */
function App() {
  const [selectedPairs, setSelectedPairs] = useState(['BTC-USD']);

  // Memoize so useOrderBookWS's useEffect dependency stays stable
  // when the actual selections haven't changed
  const productIds = useMemo(() => [...selectedPairs], [selectedPairs]);

  // This hook manages the entire WebSocket lifecycle
  useOrderBookWS(productIds);

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__logo">
          <span className="app__logo-icon">₿</span>
          <h1 className="app__title">CoinRoutes Order Book</h1>
        </div>
        <CurrencySelector
          selected={selectedPairs}
          onChange={setSelectedPairs}
        />
      </header>

      <main className="app__content">
        {selectedPairs.length === 0 && (
          <div className="app__empty-state">
            <p>Select one or more currency pairs to get started.</p>
          </div>
        )}

        <div className="app__panels-grid">
          {selectedPairs.map((pair) => (
            <CurrencyPanel key={pair} productId={pair} />
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;
