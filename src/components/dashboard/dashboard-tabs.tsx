'use client';

import { SegmentedControl } from '@/components/forms/aura-fields';
import type React from 'react';
import { useState } from 'react';

const TABS = [
  { value: 'pages', label: 'Mes fiches' },
  { value: 'settings', label: 'Réglages' },
] as const;

export function DashboardTabs({
  pages,
  settings,
}: {
  pages: React.ReactNode;
  settings: React.ReactNode;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]['value']>('pages');

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="w-full max-w-xs">
        <SegmentedControl options={TABS} value={tab} onChange={setTab} />
      </div>
      <div className={tab === 'pages' ? undefined : 'hidden'}>{pages}</div>
      <div className={tab === 'settings' ? undefined : 'hidden'}>
        {settings}
      </div>
    </div>
  );
}
