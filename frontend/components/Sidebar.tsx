'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { 
  LayoutDashboard, 
  FileText, 
  Calculator, 
  GitMerge, 
  Settings,
  Landmark
} from 'lucide-react';
import Image from 'next/image';

export function Sidebar() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/extraction', label: 'Extraction', icon: FileText },
    { href: '/formulas', label: 'Formulas', icon: Calculator },
    { href: '/automation', label: 'Automation', icon: GitMerge },
  ];

  const bottomLinks = [
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="fixed left-0 top-0 h-full flex flex-col p-4 z-50 bg-surface-container border-r border-outline-variant w-sidebar-width shadow-md">
      <div className="flex items-center gap-3 mb-xl px-sm">
        <div className="w-10 h-10 rounded bg-primary-container flex items-center justify-center shrink-0">
          <Landmark className="w-5 h-5 text-primary-fixed" />
        </div>
        <div>
          <h1 className="text-headline-sm font-headline-sm font-bold text-on-surface tracking-tight">Axeane Kompta</h1>
          <p className="text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider mt-1">Automation Bridge</p>
        </div>
      </div>
      <ul className="flex flex-col gap-sm flex-1">
        {links.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <li key={link.href}>
              <Link 
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ease-in-out text-label-caps font-label-caps uppercase ${
                  isActive 
                  ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm' 
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
                {link.label}
              </Link>
            </li>
          );
        })}
        <div className="mt-auto flex flex-col gap-sm">
          {bottomLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <li key={link.href}>
                 <Link 
                  href={link.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ease-in-out text-label-caps font-label-caps uppercase ${
                    isActive 
                    ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm' 
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
                  {link.label}
                </Link>
              </li>
            );
          })}
        </div>
      </ul>
    </nav>
  );
}
