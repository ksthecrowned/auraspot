import { CONTACT_EMAIL, SITE_NAME, TAGLINE } from '@/lib/site';
import Link from 'next/link';

export default function MarketingFooter() {
  return (
    <footer className="border-border/50 border-t py-8">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4">
        <p className="text-muted-foreground text-sm">
          {SITE_NAME} — {TAGLINE}
        </p>
        <Link
          href={`mailto:${CONTACT_EMAIL}`}
          className="text-muted-foreground text-sm transition-colors hover:text-foreground"
        >
          {CONTACT_EMAIL}
        </Link>
      </div>
    </footer>
  );
}
