import { configureStore } from '@reduxjs/toolkit';
import orderBookReducer from './orderBookSlice.js';

/**
 * Pretty straightforward store setup — just the one orderBook slice for now.
 * We could add middleware for logging or analytics later if needed.
 */
export const store = configureStore({
  reducer: {
    orderBook: orderBookReducer,
  },
});
