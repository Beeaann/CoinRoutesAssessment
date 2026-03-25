import React, { useState, useEffect } from 'react';
import TopOfBook from './TopOfBook.jsx';
import PriceChart from './PriceChart.jsx';
import Ladder from './Ladder.jsx';

// Widget visibility keys (persisted to localStorage per product)
const STORAGE_KEY_PREFIX = 'coinroutes_widget_visibility_';

function loadVisibility(productId) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PREFIX + productId);
    if (stored) return JSON.parse(stored);
  } catch {
    // Use defaults on error
  }
  return { topOfBook: true, priceChart: true, ladder: true };
}

function saveVisibility(productId, visibility) {
  try {
    localStorage.setItem(
      STORAGE_KEY_PREFIX + productId,
      JSON.stringify(visibility)
    );
  } catch {
    // Ignore storage errors
  }
}

/**
 * Container component for a single currency pair. 
 * Renders TopOfBook, PriceChart, and Ladder as toggleable widgets.
 */
function CurrencyPanel({ productId }) {
  const [visibility, setVisibility] = useState(() =>
    loadVisibility(productId)
  );
  const [showSettings, setShowSettings] = useState(false);

  // Persist whenever visibility changes
  useEffect(() => {
    saveVisibility(productId, visibility);
  }, [productId, visibility]);

  const toggleWidget = (widget) => {
    setVisibility((prev) => ({
      ...prev,
      [widget]: !prev[widget],
    }));
  };

  return (
    <div className="currency-panel" id={`panel-${productId}`}>
      <div className="currency-panel__header">
        <h2 className="currency-panel__title">{productId}</h2>
        <button
          className="currency-panel__settings-btn"
          onClick={() => setShowSettings(!showSettings)}
          title="Toggle widget visibility"
          id={`settings-btn-${productId}`}
        >
          ⚙
        </button>
      </div>

      {showSettings && (
        <div className="currency-panel__config">
          <label className="currency-panel__config-option">
            <input
              type="checkbox"
              checked={visibility.topOfBook}
              onChange={() => toggleWidget('topOfBook')}
            />
            Top of Book
          </label>
          <label className="currency-panel__config-option">
            <input
              type="checkbox"
              checked={visibility.priceChart}
              onChange={() => toggleWidget('priceChart')}
            />
            Price Chart
          </label>
          <label className="currency-panel__config-option">
            <input
              type="checkbox"
              checked={visibility.ladder}
              onChange={() => toggleWidget('ladder')}
            />
            Ladder
          </label>
        </div>
      )}

      <div className="currency-panel__widgets">
        {visibility.topOfBook && <TopOfBook productId={productId} />}
        {visibility.priceChart && <PriceChart productId={productId} />}
        {visibility.ladder && <Ladder productId={productId} />}
      </div>
    </div>
  );
}

export default CurrencyPanel;
