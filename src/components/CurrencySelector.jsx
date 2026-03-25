import React, { useState, useRef, useEffect } from 'react';

const AVAILABLE_PAIRS = ['BTC-USD', 'ETH-USD', 'LTC-USD', 'BCH-USD'];

/**
 * A multi-select dropdown for choosing which currency pairs to display.
 *
 * It's styled as a custom dropdown rather than a native <select multiple>
 * because those look different on every OS and are generally pretty ugly.
 * Each pair gets a checkbox so users can toggle them individually.
 */
function CurrencySelector({ selected, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close the dropdown when clicking outside of it
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const togglePair = (pair) => {
    if (selected.includes(pair)) {
      onChange(selected.filter((p) => p !== pair));
    } else {
      onChange([...selected, pair]);
    }
  };

  const label =
    selected.length === 0
      ? 'Select currency pairs…'
      : selected.join(', ');

  return (
    <div className="currency-selector" ref={dropdownRef}>
      <button
        className="currency-selector__toggle"
        onClick={() => setIsOpen(!isOpen)}
        id="currency-selector-toggle"
      >
        <span className="currency-selector__label">{label}</span>
        <span className={`currency-selector__arrow ${isOpen ? 'open' : ''}`}>
          ▾
        </span>
      </button>

      {isOpen && (
        <div className="currency-selector__dropdown">
          {AVAILABLE_PAIRS.map((pair) => (
            <label key={pair} className="currency-selector__option">
              <input
                type="checkbox"
                checked={selected.includes(pair)}
                onChange={() => togglePair(pair)}
                id={`currency-checkbox-${pair}`}
              />
              <span className="currency-selector__pair-name">{pair}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default CurrencySelector;
