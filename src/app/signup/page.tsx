'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="bg-slate-900/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-10 text-center max-w-[380px] w-full">
        <div className="w-14 h-14 bg-gradient-to-br from-sky-500 to-cyan-500 rounded-[14px] inline-flex items-center justify-center text-2xl font-bold mb-5">
          ST
        </div>
        <h2 className="text-xl font-semibold text-white mb-1.5">Create Account</h2>
        <p className="text-[13px] text-white/40 mb-6">Join Santo Tomas Nuevo development</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.12] rounded-[10px] text-white text-sm outline-none focus:border-sky-500 transition placeholder:text-white/30"
          />
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.12] rounded-[10px] text-white text-sm outline-none focus:border-sky-500 transition placeholder:text-white/30"
          />
          <input
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.12] rounded-[10px] text-white text-sm outline-none focus:border-sky-500 transition placeholder:text-white/30"
          />

          {error && (
            <div className="text-red-400 text-xs bg-red-400/10 rounded-lg px-3 py-2">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-sky-500 to-cyan-500 rounded-[10px] text-white text-sm font-semibold hover:brightness-110 transition disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-sm text-white/40 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-sky-400 hover:underline">
            Sign in
          </Link>
        </p>
        <p className="mt-3">
          <Link href="/" className="text-xs text-white/30 hover:text-white/50 transition">
            &larr; Back to map
          </Link>
        </p>
      </div>
    </div>
  );
}
