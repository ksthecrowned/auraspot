import { LOGO_URL } from '@/lib/site';
import type { ReactNode } from 'react';

export default function EmailLetter({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        backgroundColor: '#f4f4f5',
        padding: '40px 16px',
      }}
    >
      <div
        style={{
          maxWidth: '480px',
          margin: '0 auto',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '28px 28px 0 28px' }}>
          {/* biome-ignore lint/nursery/noImgElement: email template */}
          <img
            src={LOGO_URL}
            alt="AuraSpot"
            width="32"
            height="32"
            style={{ borderRadius: '8px', verticalAlign: 'middle' }}
          />
          <span
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: '#09090b',
              marginLeft: '10px',
            }}
          >
            AuraSpot
          </span>
        </div>
        <div style={{ padding: '24px 28px 28px 28px' }}>
          <h1
            style={{
              fontSize: '22px',
              fontWeight: 700,
              color: '#09090b',
              margin: '0 0 16px 0',
            }}
          >
            {title}
          </h1>
          {children}
        </div>
      </div>
    </div>
  );
}

export function EmailButton({ href, label }: { href: string; label: string }) {
  return (
    <div style={{ textAlign: 'center', margin: '24px 0 0 0' }}>
      <a
        href={href}
        style={{
          display: 'inline-block',
          padding: '12px 32px',
          backgroundColor: '#09090b',
          color: '#ffffff',
          borderRadius: '10px',
          textDecoration: 'none',
          fontWeight: 600,
          fontSize: '14px',
        }}
      >
        {label}
      </a>
    </div>
  );
}
