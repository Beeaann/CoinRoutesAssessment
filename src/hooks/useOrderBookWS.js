import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { setSnapshot, applyDiff } from '../store/orderBookSlice.js';

/**
 * Manages the Coinbase WebSocket connection via a dedicated Web Worker.
 *
 * Performance: All WebSocket events, JSON parsing, array transformations, 
 * and throttling logic are offloaded to a background thread.
 * This hook acts merely as an orchestrator and message ferry.
 */
export function useOrderBookWS(productIds) {
  const dispatch = useDispatch();
  const workerRef = useRef(null);

  // Convert array to string so useEffect only fires when the actual list mutates
  const stringifiedIds = JSON.stringify(productIds);

  useEffect(() => {
    const ids = JSON.parse(stringifiedIds);
    if (!ids || ids.length === 0) return;

    // Spin up the background thread
    workerRef.current = new Worker(
      new URL('../workers/orderBook.worker.js', import.meta.url),
      { type: 'module' }
    );

    // Listen to the pre-digested payload chunks sent back from the Worker
    workerRef.current.onmessage = (event) => {
      const { type, payload } = event.data;
      if (type === 'SNAPSHOT') {
        dispatch(setSnapshot(payload));
      } else if (type === 'DIFF') {
        dispatch(applyDiff(payload));
      }
    };

    // Kickstart the worker connection
    workerRef.current.postMessage({ type: 'SUBSCRIBE', productIds: ids });

    // Cleanup: Teardown worker correctly on unmount
    return () => {
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'UNSUBSCRIBE' });
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [stringifiedIds, dispatch]);
}
