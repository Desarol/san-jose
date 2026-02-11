import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

const adminNav = [
  { label: 'Overview', href: '/admin' },
  { label: 'Lots', href: '/admin/lots' },
  { label: 'Zones', href: '/admin/zones' },
  { label: 'Reservations', href: '/admin/reservations' },
  { label: 'Documents', href: '/admin/documents' },
  { label: 'Tickets', href: '/admin/tickets' },
  { label: 'Users', href: '/admin/users' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') redirect('/dashboard');

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-800 text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="font-bold text-lg">
            ST <span className="text-sky-400">Admin</span>
          </Link>
          <nav className="flex gap-1 ml-6">
            {adminNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-1.5 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10 transition"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-white/60">{profile.full_name || user.email}</span>
          <Link href="/" className="text-xs text-white/40 hover:text-white/60">
            View Site &rarr;
          </Link>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
