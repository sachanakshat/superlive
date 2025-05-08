"use client";

import React from 'react';
import dynamic from 'next/dynamic';

// Use dynamic import with no SSR to avoid navigator is not defined errors
const HomePage = dynamic(() => import('./components/HomePage'), { ssr: false });

export default function Page() {
  return <HomePage />;
}
