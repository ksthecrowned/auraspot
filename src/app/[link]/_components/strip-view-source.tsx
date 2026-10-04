'use client';

import { useEffect } from 'react';

export default function StripViewSource() {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('src')) {
      return;
    }
    url.searchParams.delete('src');
    const next = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState(window.history.state, '', next);
  }, []);

  return null;
}
