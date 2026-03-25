# CoinRoutes Order Book

A real-time cryptocurrency order book web application built with React, Redux Toolkit, and Vite. This application connects to the live Coinbase Advanced Trade WebSocket API to stream, reconstruct, and render high-frequency market data in a professional trading terminal interface.

## Features

- **Live WebSocket Data:** Connects directly to `wss://advanced-trade-ws.coinbase.com` for real-time Level 2 order book updates.
- **Multi-Currency Support:** View and track multiple pairs simultaneously (BTC-USD, ETH-USD, LTC-USD, BCH-USD).
- **High Performance:** Designed to handle hundreds of updates per second without UI lag or React render loops.
- **Modular Widgets:** Each currency panel includes toggleable widgets (persistent via `localStorage`):
  - **Top of Book:** Displays the best bid, best ask, and current spread.
  - **Price Chart:** A real-time rolling line chart of the best bid/ask prices (powered by Recharts).
  - **Ladder:** A classic depth-of-market view showing aggregated liquidity with visual volume bars.
- **Dynamic Aggregation:** Group prices in the ladder view by adjustable increments (e.g., penny, 10-cent, or dollar precision).
- **Dark Theme:** Styled with custom CSS Grid to resemble professional trading software.

## Tech Stack

- **Framework:** React 18 (Hooks/Functional Components)
- **State Management:** Redux Toolkit (`createSlice`, `createSelector`)
- **Build Tool:** Vite
- **Charting:** Recharts
- **Styling:** Vanilla CSS (CSS Grid / Flexbox)

## Getting Started

### Prerequisites
You will need [Node.js](https://nodejs.org/) installed on your machine (v18+ recommended).

### Installation & Setup

1. **Clone or download the repository.**
2. **Navigate into the project directory:**
   ```bash
   cd CoinRoutesAssessment
   ```
3. **Install dependencies:**
   ```bash
   npm install
   ```
4. **Start the development server:**
   ```bash
   npm run dev
   ```
5. **Open your browser:** Navigate to `http://localhost:5173` to view the live application.

## Architecture Highlights

This application implements several core optimizations to handle real-time crypto volatility:

1. **Web Worker Offloading:** All WebSocket management, JSON parsing, array transformations, and Map-based throttling are natively isolated inside a dedicated Web Worker (`orderBook.worker.js`). By shifting this heavy data-crunching pipeline to a background thread, the browser's main thread is fully liberated to maintain a buttery 120FPS UI.
2. **O(1) State Management:** The Redux store maintains bids and asks as raw hash maps keyed by price strings. This allows the application to apply fast-moving WebSocket diffs in `O(1)` time without re-sorting an array on every tick.
3. **O(N) Aggregation Bucketing:** Instead of sorting 5,000-element arrays every time the Redux store updates, the application feeds the raw hash maps directly into a bucketing algorithm that reduces thousands of price levels into ~200 visual buckets in linear time (`O(N)`). Only the resulting handful of buckets are then sorted, eliminating `O(N log N)` bottlenecking.
4. **Hardware-Accelerated CSS:** Heavy visual elements, like the rapidly resizing volume bars in the ladder, utilize compositing-layer transforms (`transform: scaleX()`) rather than layout-triggering dimension changes (`width`). This completely eliminates layout thrashing.
