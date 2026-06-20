"use client";
import dynamic from 'next/dynamic';

// Disable SSR for the main App component since it relies heavily on localStorage and browser APIs for offline sync
const App = dynamic(() => import("../App"), { ssr: false });

export default function Home() {
  return <App />;
}
