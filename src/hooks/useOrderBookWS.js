import { useEffect, useRef, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { setSnapshot, applyDiff } from '../store/orderBookSlice.js';

const WS_URL = 'wss://advanced-trade-ws.coinbase.com';

/**
 * Manages the Coinbase WebSocket connection and streams live order book data.
 *
 * We throttle dispatches to 4 times a second (250ms) to keep the UI smooth 
 * during wild market swings, and we deduplicate rapid-fire updates to the 
 * same price level before they hit Redux.
 */
export function useOrderBookWS(productIds) {
  const dispatch = useDispatch();
  const wsRef = useRef(null);

  // Throttle bookkeeping: we accumulate changes per product and flush periodically.
  // Using a Map keyed by "side:price" so rapid-fire updates to the same level
  // coalesce automatically instead of piling up as redundant entries.
  const pendingRef = useRef({});
  const timersRef = useRef({});

  const THROTTLE_MS = 250;

  /**
   * Flush any pending diffs for a specific product to the Redux store.
   * We convert the deduped map back into an array for the reducer.
   */
  const flushPending = useCallback(
    (productId) => {
      const changeMap = pendingRef.current[productId];
      if (changeMap && changeMap.size > 0) {
        const changes = Array.from(changeMap.values());
        dispatch(applyDiff({ productId, changes }));
        pendingRef.current[productId] = new Map();
      }
      timersRef.current[productId] = null;
    },
    [dispatch]
  );

  /**
   * Queue a batch of changes for a product. We use a Map keyed by "side:price"
   * so that if the same level gets hit 50 times between flushes, we only dispatch
   * the final state. This massively reduces the number of Redux state mutations.
   */
  const enqueueChanges = useCallback(
    (productId, changes) => {
      if (!pendingRef.current[productId]) {
        pendingRef.current[productId] = new Map();
      }
      const map = pendingRef.current[productId];

      for (const change of changes) {
        // Later updates for the same side+price overwrite earlier ones
        map.set(`${change.side}:${change.price}`, change);
      }

      if (!timersRef.current[productId]) {
        timersRef.current[productId] = setTimeout(
          () => flushPending(productId),
          THROTTLE_MS
        );
      }
    },
    [flushPending]
  );

  useEffect(() => {
    // Don't bother connecting if there's nothing to subscribe to
    if (!productIds || productIds.length === 0) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      // Subscribe to the level2 channel for all selected products
      const subscribeMsg = {
        type: 'subscribe',
        product_ids: productIds,
        channel: 'level2',
      };
      ws.send(JSON.stringify(subscribeMsg));
    };

    ws.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        // Malformed message — not much we can do, just skip it
        return;
      }

      if (data.channel !== 'l2_data') return;

      // The Coinbase Advanced Trade WS sends events inside an "events" array.
      // Each event has a type (snapshot or update) and a product_id.
      if (!data.events) return;

      for (const evt of data.events) {
        const productId = evt.product_id;

        if (evt.type === 'snapshot') {
          // Full order book snapshot — replace everything for this product.
          // Bids and asks come as arrays of { price_level, new_quantity }
          const bids = (evt.updates || [])
            .filter((u) => u.side === 'bid')
            .map((u) => [u.price_level, u.new_quantity]);
          const asks = (evt.updates || [])
            .filter((u) => u.side === 'offer')
            .map((u) => [u.price_level, u.new_quantity]);

          dispatch(setSnapshot({ productId, bids, asks }));
        } else if (evt.type === 'update') {
          // Incremental update — queue it up for throttled dispatch
          const changes = (evt.updates || []).map((u) => ({
            side: u.side === 'offer' ? 'ask' : u.side,
            price: u.price_level,
            qty: u.new_quantity,
          }));
          enqueueChanges(productId, changes);
        }
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
    };

    // Cleanup: unsubscribe, close the socket, clear any pending timers
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        const unsubMsg = {
          type: 'unsubscribe',
          product_ids: productIds,
          channel: 'level2',
        };
        ws.send(JSON.stringify(unsubMsg));
      }
      ws.close();
      wsRef.current = null;

      // Clear out all pending throttle timers so we don't dispatch after cleanup
      for (const id of Object.keys(timersRef.current)) {
        if (timersRef.current[id]) {
          clearTimeout(timersRef.current[id]);
        }
      }
      timersRef.current = {};
      pendingRef.current = {};
    };
  }, [productIds, dispatch, enqueueChanges]);
}
