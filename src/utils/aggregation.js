/**
 * Aggregation utility for the Ladder view.
 *
 * Buckets order book entries into given price increments and sums their quantities.
 * Performance: Operates directly on the raw Redux O(1) hash map to avoid large array conversions.
 *
 * @param {Object} bookObj - Hash map of prices to quantities { "70000": "1.5" }
 * @param {number} increment - The price increment to bucket by (e.g. 0.01, 0.10, 1.00)
 * @returns {Array} Sorted array of [price, quantity] as numbers
 */
export function aggregateBook(bookObj, increment) {
  if (!bookObj) return [];
  const buckets = {};

  for (const priceStr in bookObj) {
    const price = parseFloat(priceStr);
    const qty = parseFloat(bookObj[priceStr]);

    // Round down to the nearest increment boundary.
    const bucketKey = (Math.floor(price / increment) * increment).toFixed(10);

    if (buckets[bucketKey]) {
      buckets[bucketKey] += qty;
    } else {
      buckets[bucketKey] = qty;
    }
  }

  // Convert back to array of [price, qty] and sort by price ascending.
  // We only sort the small number of result buckets (O(M log M)),
  // bypassing the need to ever sort the 5,000+ raw entries.
  return Object.entries(buckets)
    .map(([p, q]) => [parseFloat(p), q])
    .sort((a, b) => a[0] - b[0]);
}
