const WS_URL = 'wss://advanced-trade-ws.coinbase.com';
const THROTTLE_MS = 250;

let ws = null;
let productIds = [];
let pendingRef = {};
let timersRef = {};

/**
 * Flush any pending diffs for a specific product to the main thread.
 */
function flushPending(productId) {
  const changeMap = pendingRef[productId];
  if (changeMap && changeMap.size > 0) {
    const changes = Array.from(changeMap.values());
    self.postMessage({ type: 'DIFF', payload: { productId, changes } });
    pendingRef[productId] = new Map();
  }
  timersRef[productId] = null;
}

/**
 * Queue a batch of changes for a product, deduplicating via a Map.
 */
function enqueueChanges(productId, changes) {
  if (!pendingRef[productId]) {
    pendingRef[productId] = new Map();
  }
  const map = pendingRef[productId];

  for (const change of changes) {
    map.set(`${change.side}:${change.price}`, change);
  }

  if (!timersRef[productId]) {
    timersRef[productId] = setTimeout(() => flushPending(productId), THROTTLE_MS);
  }
}

self.onmessage = (e) => {
  const msg = e.data;

  if (msg.type === 'SUBSCRIBE') {
    productIds = msg.productIds;
    if (!productIds || productIds.length === 0) return;

    if (ws) ws.close();
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'subscribe',
        product_ids: productIds,
        channel: 'level2',
      }));
    };

    ws.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        // Skip malformed messages
        return;
      }

      if (data.channel !== 'l2_data' || !data.events) return;

      for (const evt of data.events) {
        const productId = evt.product_id;

        if (evt.type === 'snapshot') {
          // Send massive snapshot immediately
          const bids = (evt.updates || [])
            .filter((u) => u.side === 'bid')
            .map((u) => [u.price_level, u.new_quantity]);
          
          const asks = (evt.updates || [])
            .filter((u) => u.side === 'offer')
            .map((u) => [u.price_level, u.new_quantity]);

          self.postMessage({ type: 'SNAPSHOT', payload: { productId, bids, asks } });
        } else if (evt.type === 'update') {
          // Accumulate incremental updates
          const changes = (evt.updates || []).map((u) => ({
            side: u.side === 'offer' ? 'ask' : u.side,
            price: u.price_level,
            qty: u.new_quantity,
          }));
          enqueueChanges(productId, changes);
        }
      }
    };
  } else if (msg.type === 'UNSUBSCRIBE') {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'unsubscribe',
        product_ids: productIds,
        channel: 'level2',
      }));
    }
    if (ws) {
      ws.close();
      ws = null;
    }
    
    // Clear out pending timeouts
    for (const id of Object.keys(timersRef)) {
      if (timersRef[id]) clearTimeout(timersRef[id]);
    }
    timersRef = {};
    pendingRef = {};
  }
};
