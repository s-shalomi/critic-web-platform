'use client';

import React from 'react';
import { LoadingOverlay } from '@/shared/components/LoadingOverlay/LoadingOverlay';

export default function RootLoading() {
  return (
    <LoadingOverlay
      title="LOADING CRITIC..."
      subtitle="Compiling workspace and preparing learning environment..."
      fullScreen
    />
  );
}
