import React, { useState, useEffect, useRef } from 'react';
import { useSelector, shallowEqual } from 'react-redux';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { selectBestBidAsk } from '../store/orderBookSlice.js';

const MAX_DATA_POINTS = 100;

/**
 * A real-time price chart tracking the best bid and best ask over time.
 * Keeps a rolling window of the last 100 data points.
 */
const PriceChart = React.memo(function PriceChart({ productId }) {
  const { bestBid, bestAsk } = useSelector(
    (state) => selectBestBidAsk(state, productId),
    shallowEqual
  );

  const [dataPoints, setDataPoints] = useState([]);
  const countRef = useRef(0);

  // Track the last recorded values to avoid duplicate data points
  const lastBidRef = useRef(null);
  const lastAskRef = useRef(null);

  useEffect(() => {
    const bidPrice = bestBid ? bestBid[0] : null;
    const askPrice = bestAsk ? bestAsk[0] : null;

    // Skip if we don't have any data yet
    if (bidPrice === null && askPrice === null) return;

    // Don't add a point if nothing actually changed
    if (bidPrice === lastBidRef.current && askPrice === lastAskRef.current) return;

    lastBidRef.current = bidPrice;
    lastAskRef.current = askPrice;
    countRef.current += 1;

    setDataPoints((prev) => {
      // Recharts requires at least two points to draw a line. 
      // If this is the very first data point, duplicate it to instantly draw a flat line.
      if (prev.length === 0) {
        countRef.current += 1;
        return [
          { idx: countRef.current - 1, bid: bidPrice, ask: askPrice },
          { idx: countRef.current, bid: bidPrice, ask: askPrice },
        ];
      }

      const next = [
        ...prev,
        {
          idx: countRef.current,
          bid: bidPrice,
          ask: askPrice,
        },
      ];
      // Trim to rolling window
      if (next.length > MAX_DATA_POINTS) {
        return next.slice(next.length - MAX_DATA_POINTS);
      }
      return next;
    });
  }, [bestBid, bestAsk]);

  return (
    <div className="price-chart" id={`price-chart-${productId}`}>
      <h3 className="widget-title">Price Chart</h3>
      <div className="price-chart__container">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={dataPoints}>
            <XAxis
              dataKey="idx"
              tick={false}
              stroke="#444"
              axisLine={{ stroke: '#333' }}
            />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fill: '#999', fontSize: 11 }}
              stroke="#444"
              axisLine={{ stroke: '#333' }}
              tickFormatter={(val) => val.toFixed(2)}
              width={80}
            />
            <Tooltip
              contentStyle={{
                background: '#16213e',
                border: '1px solid #333',
                borderRadius: '6px',
                color: '#eee',
                fontSize: '12px',
              }}
              formatter={(value) => (value ? value.toFixed(2) : '—')}
              labelFormatter={() => ''}
            />
            <Legend
              wrapperStyle={{ color: '#ccc', fontSize: '12px' }}
            />
            <Line
              type="monotone"
              dataKey="bid"
              stroke="#00e676"
              dot={false}
              strokeWidth={1.5}
              name="Best Bid"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="ask"
              stroke="#ff9100"
              dot={false}
              strokeWidth={1.5}
              name="Best Ask"
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

export default PriceChart;
