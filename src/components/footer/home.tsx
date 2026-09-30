import { Wordmark } from '@/components/brand';
import {
  CONTACT_EMAIL,
  SITE_NAME,
  SOURCE_URL,
  TAGLINE,
  UPSTREAM_URL,
} from '@/lib/site';
import Link from 'next/link';

const COLUMNS = [
  {
    title: 'Découvrir',
    links: [
      { href: '/explore', label: 'Explorer' },
      { href: '/explore?category=music', label: 'Musique' },
      { href: '/explore?category=sport', label: 'Sport' },
      { href: '/#comment-ca-marche', label: 'Comment ça marche' },
    ],
  },
  {
    title: 'Explorer',
    links: [
      { href: '/claim-link', label: 'Créer ma page' },
      { href: '/explore', label: 'Revendiquer ma fiche' },
      { href: '/app', label: 'Mon espace' },
    ],
  },
  {
    title: SITE_NAME,
    links: [
      {
        href: `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Aide ${SITE_NAME}`)}`,
        label: 'Aide',
      },
      { href: '/legal/privacy', label: 'Confidentialité' },
      { href: '/legal/terms', label: 'Conditions' },
    ],
  },
];

export default function HomeFooter() {
  return (
    <footer className="mt-auto w-full border-border/60 border-t pt-12">
      <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="flex flex-col gap-3">
          <Link href="/" className="w-fit">
            <Wordmark className="text-2xl" />
          </Link>
          <p className="font-brand font-semibold text-muted-foreground">
            {TAGLINE}
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="w-fit text-muted-foreground text-sm transition-colors hover:text-foreground"
          >
            {CONTACT_EMAIL}
          </a>
        </div>
        {COLUMNS.map((column) => (
          <div key={column.title} className="flex flex-col gap-3">
            <p className="font-brand font-semibold text-sm">{column.title}</p>
            <ul className="flex flex-col gap-2">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-10 flex flex-col gap-2 border-border/60 border-t py-6 text-muted-foreground text-xs sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} {SITE_NAME}
        </p>
        {/* AGPL-3.0 notices: source offered to users, upstream credited. */}
        <p className="flex flex-wrap gap-x-3 gap-y-1">
          <a
            href={SOURCE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            Code source
          </a>
          <span>·</span>
          <a
            href={UPSTREAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            Basé sur OpenBio
          </a>
          <span>·</span>
          <a
            href="https://www.gnu.org/licenses/agpl-3.0.html"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            Licence AGPL-3.0
          </a>
        </p>
      </div>
    </footer>
  );
}
