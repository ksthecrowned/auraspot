'use client';

import { Button } from '@/components/ui/button';
import { GradientButton } from '@/components/ui/gradient-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signIn } from '@/lib/auth-client';
import { safeNextPath } from '@/lib/safe-next-path';
import Logo from '@/public/logo.png';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type SyntheticEvent, useState } from 'react';

export default function SignInPage() {
  const router = useRouter();
  const nextPath = safeNextPath(useSearchParams().get('redirectUrl'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await signIn.email({ email, password });
    if (result.error) {
      setError(result.error.message ?? 'Something went wrong');
      setLoading(false);
      return;
    }
    router.push(nextPath);
  };

  return (
    <div className="w-full max-w-md animate-fade-up rounded-2xl border border-border/50 bg-card p-8 shadow-lg">
      <div className="mb-8 flex flex-col items-center">
        <Link href="/">
          <Image src={Logo} alt="AuraSpot" width={48} height={48} />
        </Link>
        <h1 className="mt-4 font-cal text-2xl">Welcome back</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Sign in to your account
        </p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            className="h-11 rounded-xl"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            className="h-11 rounded-xl"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="flex justify-end">
            <Link
              href="/app/reset-password"
              className="text-muted-foreground text-sm hover:text-foreground"
            >
              Forgot your password?
            </Link>
          </div>
        </div>
        {error && (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-destructive text-sm">
            {error}
          </p>
        )}
        <GradientButton
          type="submit"
          disabled={loading}
          className="mt-1 w-full"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign in'}
        </GradientButton>
      </form>
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-border/50 border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">
            or continue with
          </span>
        </div>
      </div>
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-11 flex-1 gap-2 rounded-xl"
          onClick={() =>
            signIn.social({ provider: 'google', callbackURL: nextPath })
          }
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            role="img"
            aria-label="Google"
          >
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Google
        </Button>
      </div>
      <p className="mt-6 text-center text-muted-foreground text-sm">
        Don&apos;t have an account?{' '}
        <Link
          href={
            nextPath === '/app'
              ? '/app/sign-up'
              : `/app/sign-up?redirectUrl=${encodeURIComponent(nextPath)}`
          }
          className="font-medium text-foreground underline underline-offset-4 hover:text-violet-600"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
