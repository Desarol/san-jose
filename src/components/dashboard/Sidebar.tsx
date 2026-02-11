'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const navItems = [
  { label: 'DASHBOARD', href: '/dashboard', icon: '◫' },
  { label: 'PROFILE INFO', href: '/dashboard/profile', icon: '◯' },
  { label: 'YOUR LOTS', href: '/dashboard/lots', icon: '▦' },
  { label: 'RESERVE A LOT', href: '/dashboard/reserve', icon: '◈' },
  { label: 'DOCUMENTS', href: '/dashboard/documents', icon: '◧' },
  { label: 'CONTACT SUPPORT', href: '/dashboard/support', icon: '◉' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <aside className="w-[180px] min-h-screen bg-slate-700 flex flex-col py-6 flex-shrink-0">
      <nav className="flex flex-col gap-0.5 px-3">
        {navItems.map((item) => {
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`text-[13px] font-semibold tracking-wide px-3 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? 'text-sky-400 bg-white/10'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-3">
        <button
          onClick={handleLogout}
          className="text-[13px] font-semibold tracking-wide text-white/50 hover:text-white px-3 py-2.5 rounded-lg transition-colors w-full text-left hover:bg-white/5"
        >
          LOGOUT
        </button>
      </div>
    </aside>
  );
}
