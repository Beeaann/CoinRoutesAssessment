import { createSlice } from '@reduxjs/toolkit';
import { createSelector } from '@reduxjs/toolkit';

/**
 * Redux slice for the live order book.
 * 
 * We store bids and asks as plain objects keyed by price string. 
 * This gives us instant O(1) lookups when applying WebSocket diffs.
 */

const initialState = {};

const orderBookSlice = createSlice({
  name: 'orderBook',
  initialState,
  reducers: {
    // Initial full book snapshot replacement
    setSnapshot: (state, action) => {
      const { productId, bids, asks } = action.payload;

      const bidMap = {};
      for (const [price, qty] of bids) {
        bidMap[price] = qty;
      }

      const askMap = {};
      for (const [price, qty] of asks) {
        askMap[price] = qty;
      }

      state[productId] = { bids: bidMap, asks: askMap };
    },

    // Process incremental updates (upsert or delete if qty is 0)
    applyDiff: (state, action) => {
      const { productId, changes } = action.payload;

      if (!state[productId]) {
        // We got a diff before a snapshot — just ignore it.
        // This can happen briefly during reconnections.
        return;
      }

      for (const { side, price, qty } of changes) {
        const book = side === 'bid' ? state[productId].bids : state[productId].asks;

        if (parseFloat(qty) === 0) {
          delete book[price];
        } else {
          book[price] = qty;
        }
      }
    },
  },
});

export const { setSnapshot, applyDiff } = orderBookSlice.actions;
export default orderBookSlice.reducer;

// --- Selectors ---

/**
 * Creates a dedicated memoized selector for sorted bids (highest first).
 * Call this once per component instance to avoid sharing cache.
 */
export const makeSelectSortedBids = () =>
  createSelector(
    [(state, productId) => state.orderBook[productId]],
    (book) => {
      if (!book) return [];
      // Only convert and sort what we actually have — the sort itself
      // is unavoidable but at least each component has its own cache
      return Object.entries(book.bids)
        .map(([p, q]) => [parseFloat(p), parseFloat(q)])
        .sort((a, b) => b[0] - a[0]);
    }
  );

/**
 * Creates a dedicated memoized selector for sorted asks (lowest first).
 */
export const makeSelectSortedAsks = () =>
  createSelector(
    [(state, productId) => state.orderBook[productId]],
    (book) => {
      if (!book) return [];
      return Object.entries(book.asks)
        .map(([p, q]) => [parseFloat(p), parseFloat(q)])
        .sort((a, b) => a[0] - b[0]);
    }
  );

/**
 * Does a quick scan for the best price on each side.
 * Way faster than sorting the entire book just to grab two prices.
 */
export const selectBestBidAsk = (state, productId) => {
  const book = state.orderBook[productId];
  if (!book) return { bestBid: null, bestAsk: null };

  let bestBidPrice = -Infinity;
  let bestBidQty = 0;
  for (const [p, q] of Object.entries(book.bids)) {
    const price = parseFloat(p);
    if (price > bestBidPrice) {
      bestBidPrice = price;
      bestBidQty = parseFloat(q);
    }
  }

  let bestAskPrice = Infinity;
  let bestAskQty = 0;
  for (const [p, q] of Object.entries(book.asks)) {
    const price = parseFloat(p);
    if (price < bestAskPrice) {
      bestAskPrice = price;
      bestAskQty = parseFloat(q);
    }
  }

  return {
    bestBid: bestBidPrice !== -Infinity ? [bestBidPrice, bestBidQty] : null,
    bestAsk: bestAskPrice !== Infinity ? [bestAskPrice, bestAskQty] : null,
  };
};
