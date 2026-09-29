import type React from 'react';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full flex-col items-center px-4 pt-5 pb-8 md:px-8">
      {children}
    </div>
  );
}
