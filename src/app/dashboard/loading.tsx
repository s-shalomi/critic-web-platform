'use client';

import React from 'react';
import { LoadingOverlay } from '@/shared/components/LoadingOverlay/LoadingOverlay';

export default function DashboardLoading() {
  return (
    <LoadingOverlay
      title="INITIALIZING INVESTIGATION DASHBOARD..."
      subtitle="Compiling workspace, loading available topics & synchronizing Socratic profile..."
      fullScreen
    />
  );
}
