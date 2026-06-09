export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex bg-background min-h-screen relative w-full">
      {children}
    </div>
  );
}
