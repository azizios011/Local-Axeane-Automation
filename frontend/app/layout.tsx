import type {Metadata} from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/Sidebar';
import { TopNav } from '@/components/TopNav';
import ToastProvider from '@/components/ToastProvider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Axeane Kompta',
  description: 'Accounting Automation Platform',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-background text-on-background min-h-screen text-body-md overflow-x-hidden antialiased" suppressHydrationWarning>
        <ToastProvider>
          <Sidebar />
          <TopNav />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
