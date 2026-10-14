'use client';

import React from 'react';
import { LoadingOverlay } from '@/shared/components/LoadingOverlay/LoadingOverlay';

export default function ModuleStageLoading() {
  return (
    <LoadingOverlay
      title="PREPARING MODULE STAGE..."
      subtitle="Loading stage artifacts, canvas state, and Socratic peer..."
      fullScreen
    />
  );
}
