import { Search, Bell, Cloud, UserCircle } from 'lucide-react';
import Image from 'next/image';

export function TopNav() {
  return (
    <header className="ml-sidebar-width flex justify-between items-center px-lg py-sm h-16 w-[calc(100%-260px)] z-40 bg-surface/80 backdrop-blur-md fixed top-0 border-b border-outline-variant transition-all">
      <div className="flex items-center">
        <div className="relative hidden md:flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-on-surface-variant" />
          <input 
            className="pl-10 pr-4 py-2 bg-surface-container rounded border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary text-body-sm font-body-sm w-64 transition-all focus:w-80 outline-none placeholder:text-on-surface-variant text-on-surface" 
            placeholder="Search..." 
            type="text"
          />
        </div>
      </div>
      <div className="flex items-center gap-md">
        <button className="text-on-surface-variant hover:text-primary transition-colors duration-150 ease-linear rounded-full p-2 hover:bg-surface-container-high">
          <Bell className="w-5 h-5" />
        </button>
        <button className="text-on-surface-variant hover:text-primary transition-colors duration-150 ease-linear rounded-full p-2 hover:bg-surface-container-high">
          <Cloud className="w-5 h-5" />
        </button>
        <button className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant ml-sm cursor-pointer hover:ring-2 hover:ring-primary transition-all flex items-center justify-center">
          <UserCircle className="w-6 h-6 text-on-surface-variant" />
        </button>
      </div>
    </header>
  );
}
