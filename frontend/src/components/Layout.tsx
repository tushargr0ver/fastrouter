import { Sidebar } from './Sidebar';
import type { Page } from './Sidebar';

interface LayoutProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  children: React.ReactNode;
}

export function Layout({ currentPage, onNavigate, children }: LayoutProps) {
  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: 'var(--bg)',
      overflow: 'hidden',
    }}>
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} />
      <main style={{
        flex: 1,
        overflow: 'auto',
        background: 'var(--bg)',
      }}>
        {children}
      </main>
    </div>
  );
}
