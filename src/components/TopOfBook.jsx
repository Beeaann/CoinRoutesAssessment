import React from 'react';
import { useSelector, shallowEqual } from 'react-redux';
import { selectBestBidAsk } from '../store/orderBookSlice.js';

/**
 * Displays the single best bid and ask, plus the spread between them.
 */
const TopOfBook = React.memo(function TopOfBook({ productId }) {
  const { bestBid, bestAsk } = useSelector(
    (state) => selectBestBidAsk(state, productId),
    shallowEqual
  );

  // Calculate spread from best bid/ask
  const spread =
    bestBid && bestAsk ? (bestAsk[0] - bestBid[0]).toFixed(2) : '—';

  return (
    <div className="top-of-book" id={`top-of-book-${productId}`}>
      <h3 className="widget-title">Top of Book</h3>
      <div className="top-of-book__content">
        <div className="top-of-book__side top-of-book__bid">
          <span className="top-of-book__label">Best Bid</span>
          <span className="top-of-book__price bid-color">
            {bestBid ? bestBid[0].toFixed(2) : '—'}
          </span>
          <span className="top-of-book__qty">
            {bestBid ? bestBid[1].toFixed(6) : '—'}
          </span>
        </div>

        <div className="top-of-book__spread">
          <span className="top-of-book__spread-label">Spread</span>
          <span className="top-of-book__spread-value">${spread}</span>
        </div>

        <div className="top-of-book__side top-of-book__ask">
          <span className="top-of-book__label">Best Ask</span>
          <span className="top-of-book__price ask-color">
            {bestAsk ? bestAsk[0].toFixed(2) : '—'}
          </span>
          <span className="top-of-book__qty">
            {bestAsk ? bestAsk[1].toFixed(6) : '—'}
          </span>
        </div>
      </div>
    </div>
  );
});

export default TopOfBook;
