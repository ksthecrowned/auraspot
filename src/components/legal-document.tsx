import Link from 'next/link';
import type { ReactNode } from 'react';

export type LegalSection = {
  id: string;
  title: string;
  content: ReactNode;
};

// Legal page: title on the halo, sticky table of contents on desktop,
// readable text column, cross-link to the other legal page.
export default function LegalDocument({
  title,
  intro,
  updatedAt,
  sections,
  related,
}: {
  title: string;
  intro: ReactNode;
  updatedAt: string;
  sections: LegalSection[];
  related: { href: string; label: string };
}) {
  return (
    <div className="flex w-full flex-col gap-10">
      <section className="relative flex flex-col gap-3 pt-6">
        <div
          aria-hidden="true"
          className="aura-halo -z-10 -top-24 -left-16 pointer-events-none absolute h-72 w-[30rem]"
        />
        <p className="text-muted-foreground text-sm">
          Dernière mise à jour : {updatedAt}
        </p>
        <h1 className="font-bold font-brand text-4xl leading-tight md:text-5xl">
          {title}
        </h1>
        <div className="max-w-2xl text-lg text-muted-foreground">{intro}</div>
      </section>

      <div className="grid gap-10 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav
          aria-label="Sommaire"
          className="hidden lg:sticky lg:top-8 lg:block lg:self-start"
        >
          <p className="mb-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
            Sommaire
          </p>
          <ol className="flex flex-col gap-2 border-border border-l">
            {sections.map((section, index) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="-ml-px block border-transparent border-l-2 pl-3 text-muted-foreground text-sm transition-colors hover:border-violet-500 hover:text-foreground"
                >
                  {index + 1}. {section.title}
                </a>
              </li>
            ))}
          </ol>
          <Link
            href={related.href}
            className="mt-6 inline-block font-brand font-semibold text-sm hover:underline"
          >
            {related.label} →
          </Link>
        </nav>

        <article className="flex min-w-0 max-w-3xl flex-col gap-10">
          {sections.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              className="flex scroll-mt-8 flex-col gap-3 text-[15px] text-foreground/85 leading-relaxed [&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5"
            >
              <h2 className="font-bold font-brand text-2xl text-foreground">
                {index + 1}. {section.title}
              </h2>
              {section.content}
            </section>
          ))}
          <Link
            href={related.href}
            className="font-brand font-semibold text-sm hover:underline lg:hidden"
          >
            {related.label} →
          </Link>
        </article>
      </div>
    </div>
  );
}
