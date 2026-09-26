'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useClientAuth } from '@/contexts/ClientAuthContext';

const FIELD =
  'mt-1.5 block h-11 w-full rounded-xl border border-[#8A96B0] bg-white px-3.5 text-[15px] text-[#131A2D] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[#6F7A92] hover:border-[#5B678A] focus:border-[#BE9349] focus:ring-[3px] focus:ring-[#BE9349]/25';

export default function ClientPortalLoginPage() {
  const { login } = useClientAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/client-portal-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (res.ok) {
        login(json.client);
        router.push('/clientportal');
      } else {
        setError(json.error || 'Login failed');
      }
    } catch {
      setError('Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mi-login-panel relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="mi-login-grain pointer-events-none absolute inset-0" aria-hidden="true" />
      <form
        onSubmit={handleSubmit}
        method="post"
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-white p-8 shadow-[0_32px_64px_-28px_rgba(4,9,21,0.85)] before:pointer-events-none before:absolute before:inset-x-8 before:top-0 before:h-px before:bg-[linear-gradient(90deg,transparent,#BE9349,transparent)]"
      >
        <Image src="/logo-trimmed.png" alt="Migrantly.ae - Your world, unlocked." width={1413} height={757} priority className="mx-auto h-20 w-auto" />
        <h1 className="font-display mt-5 text-center text-[1.75rem] font-semibold leading-tight text-[#0F1D3D]">Client Portal</h1>
        <p className="mt-1.5 text-balance text-center text-sm text-[#4D566B]">Sign in with the credentials your counselor emailed you.</p>

        {error && (
          <div role="alert" className="mt-5 rounded-xl border border-[#F2B8B0] bg-[#FDECEA] px-3.5 py-2.5 text-sm text-[#A32521]">
            {error}
          </div>
        )}

        <div className="mt-5">
          <label htmlFor="client-email" className="block text-[13px] font-semibold text-[#131A2D]">Email</label>
          <input
            id="client-email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={FIELD}
          />
        </div>
        <div className="mt-4">
          <label htmlFor="client-password" className="block text-[13px] font-semibold text-[#131A2D]">Password</label>
          <input
            id="client-password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={FIELD}
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="mi-shimmer mt-6 flex h-11 w-full items-center justify-center rounded-xl border border-[#EECA7D]/30 bg-[linear-gradient(135deg,#14264F_0%,#0F1D3D_100%)] text-sm font-semibold text-white shadow-[0_14px_26px_-14px_rgba(15,29,61,0.85)] transition hover:border-[#EECA7D]/60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#BE9349]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
