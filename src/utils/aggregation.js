/**
 * Aggregation utility for the Ladder view.
 *
 * Buckets order book entries into given price increments and sums their quantities.
 *
 * @param {Array} entries - Array of [priceString, quantityString] from the order book
 * @param {number} increment - The price increment to bucket by (e.g. 0.01, 0.10, 1.00)
 * @returns {Array} Sorted array of [price, quantity] as numbers
 */
export function aggregateEntries(entries, increment) {
  const buckets = {};

  for (const [priceStr, qtyStr] of entries) {
    const price = parseFloat(priceStr);
    const qty = parseFloat(qtyStr);

    // Round down to the nearest increment boundary.
    const bucketKey = (Math.floor(price / increment) * increment).toFixed(10);

    if (buckets[bucketKey]) {
      buckets[bucketKey] += qty;
    } else {
      buckets[bucketKey] = qty;
    }
  }

  // Convert back to array of [price, qty] and sort by price ascending
  return Object.entries(buckets)
    .map(([p, q]) => [parseFloat(p), q])
    .sort((a, b) => a[0] - b[0]);
}
