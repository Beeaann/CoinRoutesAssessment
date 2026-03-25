import React, { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { makeSelectSortedBids, makeSelectSortedAsks } from '../store/orderBookSlice.js';
import { aggregateEntries } from '../utils/aggregation.js';

const AGGREGATION_OPTIONS = [0.01, 0.05, 0.10, 0.50, 1.00, 5.00];
const VISIBLE_ROWS = 15;

/**
 * A single row in the ladder.
 */
const LadderRow = React.memo(function LadderRow({ price, qty, maxQty, side }) {
  // Volume bar width is proportional to the largest level visible
  const barWidth = maxQty > 0 ? (qty / maxQty) * 100 : 0;
  const barClass = side === 'bid' ? 'volume-bar--bid' : 'volume-bar--ask';
  const priceClass = side === 'bid' ? 'bid-color' : 'ask-color';

  return (
    <tr className={`ladder__row ladder__row--${side}`}>
      <td className={`ladder__price ${priceClass}`}>{price.toFixed(2)}</td>
      <td className="ladder__qty">{qty.toFixed(6)}</td>
      <td className="ladder__bar-cell">
        <div className="volume-bar-container">
          <div
            className={`volume-bar ${barClass}`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </td>
    </tr>
  );
});

/**
 * The Ladder view — shows aggregated bids and asks around the spread.
 */
const Ladder = React.memo(function Ladder({ productId }) {
  const [increment, setIncrement] = useState(0.01);

  // Create stable selector instances for this specific Ladder component
  const selectBids = useMemo(() => makeSelectSortedBids(), []);
  const selectAsks = useMemo(() => makeSelectSortedAsks(), []);

  const rawBids = useSelector((state) => selectBids(state, productId));
  const rawAsks = useSelector((state) => selectAsks(state, productId));

  // Aggregate bids and asks based on the selected increment.
  // We memoize this so we only re-aggregate when data or increment changes.
  const aggregatedBids = useMemo(() => {
    const entries = rawBids.map(([p, q]) => [String(p), String(q)]);
    const agg = aggregateEntries(entries, increment);
    // aggregateEntries returns ascending — bids need to be highest first
    agg.reverse();
    return agg.slice(0, VISIBLE_ROWS);
  }, [rawBids, increment]);

  const aggregatedAsks = useMemo(() => {
    const entries = rawAsks.map(([p, q]) => [String(p), String(q)]);
    const agg = aggregateEntries(entries, increment);
    // Asks are already ascending (lowest first), take the closest to spread
    return agg.slice(0, VISIBLE_ROWS);
  }, [rawAsks, increment]);

  // Find the max quantity across both sides so we can scale the volume bars
  const maxQty = useMemo(() => {
    let max = 0;
    for (const [, q] of aggregatedBids) max = Math.max(max, q);
    for (const [, q] of aggregatedAsks) max = Math.max(max, q);
    return max;
  }, [aggregatedBids, aggregatedAsks]);

  // Calculate the spread between best bid and best ask
  const bestBid = aggregatedBids.length > 0 ? aggregatedBids[0][0] : null;
  const bestAsk = aggregatedAsks.length > 0 ? aggregatedAsks[0][0] : null;
  const spread = bestBid !== null && bestAsk !== null
    ? (bestAsk - bestBid).toFixed(2)
    : '—';

  return (
    <div className="ladder" id={`ladder-${productId}`}>
      <div className="ladder__header">
        <h3 className="widget-title">Ladder</h3>
        <div className="ladder__controls">
          <label htmlFor={`agg-select-${productId}`} className="ladder__agg-label">
            Agg:
          </label>
          <select
            id={`agg-select-${productId}`}
            className="ladder__agg-select"
            value={increment}
            onChange={(e) => setIncrement(parseFloat(e.target.value))}
          >
            {AGGREGATION_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt.toFixed(2)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="ladder__table-wrapper">
        <table className="ladder__table">
          <thead>
            <tr>
              <th>Price</th>
              <th>Quantity</th>
              <th>Volume</th>
            </tr>
          </thead>
          <tbody>
            {/* Asks first (highest ask on top, lowest near spread) */}
            {[...aggregatedAsks].reverse().map(([price, qty]) => (
              <LadderRow
                key={`ask-${price}`}
                price={price}
                qty={qty}
                maxQty={maxQty}
                side="ask"
              />
            ))}

            {/* Spread row — the gap between best bid and best ask */}
            <tr className="ladder__spread-row">
              <td colSpan={3} className="ladder__spread-cell">
                USD Spread: ${spread}
              </td>
            </tr>

            {/* Bids below the spread, highest first */}
            {aggregatedBids.map(([price, qty]) => (
              <LadderRow
                key={`bid-${price}`}
                price={price}
                qty={qty}
                maxQty={maxQty}
                side="bid"
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

export default Ladder;
