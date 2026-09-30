import ClaimLinkForm from '@/components/forms/claim-link';
import { auth } from '@/lib/auth';
import Logo from '@/public/logo.png';
import { headers } from 'next/headers';
import Image from 'next/image';
import Link from 'next/link';

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md animate-fade-up rounded-2xl border border-border/50 bg-card p-8 shadow-lg">
        <div className="mb-8 flex flex-col items-center">
          <Link href="/">
            <Image src={Logo} alt="AuraSpot" width={48} height={48} />
          </Link>
          <h1 className="mt-4 font-cal text-3xl">Réservez votre page</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Choisissez l’adresse de votre page AuraSpot
          </p>
        </div>
        <ClaimLinkForm />
        {!session && (
          <p className="mt-6 text-center text-muted-foreground text-sm">
            Déjà un compte ?{' '}
            <Link
              href="/app/sign-in"
              className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
            >
              Se connecter
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
