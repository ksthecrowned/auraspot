import type React from 'react';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    // overflow-x-clip (not hidden) trims the hero halo without breaking the
    // sticky column and support button.
    <div className="mx-auto flex min-h-screen w-full flex-col items-center overflow-x-clip px-4 pt-5 pb-8 md:px-8">
      {children}
    </div>
  );
}
