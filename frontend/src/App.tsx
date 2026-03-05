import { useState } from 'react';
import { AuthContext, useAuthState } from './hooks/useAuth';
import { Layout } from './components/Layout';
import type { Page } from './components/Sidebar';
import { LoginPage } from './components/pages/LoginPage';
import { DashboardPage } from './components/pages/DashboardPage';
import { APIKeysPage } from './components/pages/APIKeysPage';
import { CreditsPage } from './components/pages/CreditsPage';
import { UsagePage } from './components/pages/UsagePage';
import { ModelsPage } from './components/pages/ModelsPage';
import { APITesterPage } from './components/pages/APITesterPage';
import './index.css';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <DashboardPage />;
      case 'keys': return <APIKeysPage />;
      case 'credits': return <CreditsPage />;
      case 'usage': return <UsagePage />;
      case 'models': return <ModelsPage />;
      case 'tester': return <APITesterPage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

export function App() {
  const auth = useAuthState();

  if (auth.loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '13px',
          color: 'var(--accent-cyan)',
          letterSpacing: '0.1em',
        }}>
          INITIALIZING...
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={auth}>
      {auth.token ? <AppContent /> : <LoginPage />}
    </AuthContext.Provider>
  );
}

export default App;
