import Link from 'next/link';

interface DashboardHeaderProps {
  userName: string;
}

export default function DashboardHeader({ userName }: DashboardHeaderProps) {
  const firstName = userName?.split(' ')[0] || 'User';

  return (
    <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6 flex-shrink-0">
      <Link href="/" className="text-slate-700 font-bold text-lg tracking-tight">
        BAJA <span className="text-sky-600">LOGO</span>
      </Link>
      <div className="text-slate-700 font-semibold">
        Hi, {firstName} 👋
      </div>
      <div className="flex items-center gap-4">
        <Link href="/dashboard/support" className="text-sm text-slate-500 hover:text-slate-700 transition">
          Call Us
        </Link>
        <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center text-xs font-bold text-slate-600">
          {firstName.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
