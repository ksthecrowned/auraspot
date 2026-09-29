import { SITE_NAME } from '@/lib/site';
import Link from 'next/link';

export default function ProfileFooter({
  customFooter,
}: {
  customFooter: string | null;
}) {
  return (
    <footer className="py-10 text-center">
      {customFooter ? (
        <p className="text-muted-foreground text-xs">{customFooter}</p>
      ) : (
        <Link
          href="/personalities"
          className="text-muted-foreground text-sm transition-colors hover:text-foreground"
        >
          Découvrir d’autres personnalités sur{' '}
          <span className="font-bold font-brand text-foreground">
            {SITE_NAME}
          </span>
        </Link>
      )}
    </footer>
  );
}
