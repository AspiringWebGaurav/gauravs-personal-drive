import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Navbar } from '@/components/layout/Navbar';
import { EnhancedFooter } from '@/components/layout/EnhancedFooter';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="h-full flex flex-col">
        <Navbar />
        <main className="flex-1 min-h-0">
          {children}
        </main>
        <EnhancedFooter />
      </div>
    </ProtectedRoute>
  );
}