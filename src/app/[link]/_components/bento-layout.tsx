'use client';

import type React from 'react';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { sizeToGrid } from '@/components/bento/sizes';
import { api } from '@/trpc/react';
import type { BentoSchema } from '@/types';
import { useParams } from 'next/navigation';
import { useCallback, useMemo, useRef } from 'react';
import {
  type Layouts,
  Responsive,
  type ResponsiveProps,
  WidthProvider,
} from 'react-grid-layout';
import type * as z from 'zod';
import { useBentoHistory } from './bento-history';
import { usePreview } from './preview-context';

function bentoToLayoutItem(
  b: z.infer<typeof BentoSchema>,
  breakpoint: 'sm' | 'md'
) {
  const { w, h } = sizeToGrid(b.size[breakpoint], breakpoint);
  return {
    i: b.id,
    x: b.position[breakpoint]?.x ?? 0,
    y: b.position[breakpoint]?.y ?? 0,
    w,
    h,
  };
}

type LayoutItem = ReturnType<typeof bentoToLayoutItem>;

// Stored positions only give the order (row, then column). Each block then
// takes the first free spot, so the grid always fills its full width.
// Heights can be 0.5 (4x1 banners), so occupancy is tracked in half rows.
type Area = { x: number; row: number; w: number; rows: number };

function cellsOf({ x, row, w, rows }: Area) {
  const cells: string[] = [];
  for (let dx = 0; dx < w; dx++) {
    for (let dy = 0; dy < rows; dy++) {
      cells.push(`${x + dx}:${row + dy}`);
    }
  }
  return cells;
}

function firstFreeArea(
  taken: Set<string>,
  cols: number,
  w: number,
  rows: number
): Area {
  for (let row = 0; ; row++) {
    for (let x = 0; x + w <= cols; x++) {
      const area = { x, row, w, rows };
      if (cellsOf(area).every((cell) => !taken.has(cell))) {
        return area;
      }
    }
  }
}

function packLayout(items: LayoutItem[], cols: number): LayoutItem[] {
  const taken = new Set<string>();

  return [...items]
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map((item) => {
      const w = Math.min(item.w, cols);
      const rows = Math.max(1, Math.round(item.h * 2));
      const area = firstFreeArea(taken, cols, w, rows);
      for (const cell of cellsOf(area)) {
        taken.add(cell);
      }
      return { ...item, x: area.x, y: area.row / 2, w };
    });
}

function findChangedPositions(
  bentos: z.infer<typeof BentoSchema>[],
  newLayouts: Layouts
) {
  const updates: Array<{
    bento: z.infer<typeof BentoSchema>;
    smPos: { x: number; y: number } | undefined;
    mdPos: { x: number; y: number } | undefined;
  }> = [];

  for (const bento of bentos) {
    const sm = newLayouts.sm?.find((l) => l.i === bento.id);
    const md = newLayouts.md?.find((l) => l.i === bento.id);

    const smPos = sm ? { x: sm.x, y: sm.y } : undefined;
    const mdPos = md ? { x: md.x, y: md.y } : undefined;

    const smChanged =
      smPos &&
      (smPos.x !== bento.position.sm?.x || smPos.y !== bento.position.sm?.y);
    const mdChanged =
      mdPos &&
      (mdPos.x !== bento.position.md?.x || mdPos.y !== bento.position.md?.y);

    if (smChanged || mdChanged) {
      updates.push({ bento, smPos, mdPos });
    }
  }

  return updates;
}

export default function BentoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { link } = useParams<{ link: string }>();
  const ResponsiveGridLayout = useMemo(
    () => WidthProvider(Responsive) as React.ComponentType<ResponsiveProps>,
    []
  );

  const { preview } = usePreview();
  const { pushSnapshot } = useBentoHistory();
  const { data: profileLink } = api.profileLink.getByLink.useQuery(
    { link },
    { staleTime: 60_000 }
  );

  const { mutateAsync: updateBento } =
    api.profileLink.updateBento.useMutation();

  const hasDragged = useRef(false);

  const bentos = profileLink?.bento ?? [];

  const layouts = useMemo(
    () => ({
      sm: packLayout(
        bentos.map((b) => bentoToLayoutItem(b, 'sm')),
        2
      ),
      md: packLayout(
        bentos.map((b) => bentoToLayoutItem(b, 'md')),
        4
      ),
    }),
    [bentos]
  );

  const onLayoutChange = useCallback(
    (newLayouts: Layouts) => {
      if (!hasDragged.current || !profileLink) {
        return;
      }
      hasDragged.current = false;

      const updates = findChangedPositions(profileLink.bento, newLayouts);

      // Run updates sequentially to prevent race conditions
      let chain = Promise.resolve();
      for (const { bento, smPos, mdPos } of updates) {
        chain = chain.then(() =>
          updateBento({
            link: profileLink.link,
            bento: {
              ...bento,
              position: {
                sm: smPos ?? bento.position.sm,
                md: mdPos ?? bento.position.md,
              },
            },
          }).then(() => undefined)
        );
      }
    },
    [profileLink, updateBento]
  );

  return (
    <ResponsiveGridLayout
      className="layout"
      layouts={layouts}
      cols={{ xxs: 2, xs: 2, sm: 2, md: 4, lg: 4 }}
      breakpoints={{ lg: 800, md: 600, sm: 300, xs: 0, xxs: 0 }}
      rowHeight={176}
      margin={[24, 24]}
      containerPadding={[0, 0]}
      draggableHandle={
        typeof window !== 'undefined' && window.innerWidth < 600
          ? '.drag-handle'
          : undefined
      }
      isResizable={false}
      isDraggable={profileLink?.canEdit && !preview}
      onDragStart={() => {
        pushSnapshot();
        hasDragged.current = true;
      }}
      onLayoutChange={(_newLayout, newLayouts) => {
        onLayoutChange(newLayouts);
      }}
    >
      {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
      {/* @ts-ignore */}
      {children}
    </ResponsiveGridLayout>
  );
}
