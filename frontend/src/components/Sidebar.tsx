import { 
  LayoutDashboard, Key, CreditCard, BarChart2, 
  Cpu, Terminal, LogOut, Shield, ChevronRight
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export type Page = 'dashboard' | 'keys' | 'credits' | 'usage' | 'models' | 'tester';

interface NavItem {
  id: Page;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'keys', label: 'API Keys', icon: Key },
  { id: 'credits', label: 'Credits', icon: CreditCard },
  { id: 'usage', label: 'Usage', icon: BarChart2 },
  { id: 'models', label: 'Models', icon: Cpu },
  { id: 'tester', label: 'API Tester', icon: Terminal },
];

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { user, logout } = useAuth();

  return (
    <aside style={{
      width: '240px',
      minWidth: '240px',
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{
        padding: '20px 16px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          background: 'var(--accent-cyan)',
          color: '#080c10',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Space Mono', monospace",
          fontWeight: 700,
          fontSize: '14px',
          flexShrink: 0,
        }}>
          FR
        </div>
        <div>
          <div style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: '13px',
            color: 'var(--text-primary)',
            fontWeight: 700,
            lineHeight: 1.2,
          }}>
            FastRouter
          </div>
          <div style={{
            fontSize: '10px',
            color: 'var(--text-muted)',
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '0.05em',
          }}>
            AI API GATEWAY
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
        {navItems.map(item => {
          const Icon = item.icon;
          const active = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 16px',
                background: active ? 'rgba(88, 166, 255, 0.12)' : 'transparent',
                border: 'none',
                borderLeft: active ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                color: active ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '13px',
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontWeight: active ? 500 : 400,
                textAlign: 'left',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
                }
              }}
            >
              <Icon size={15} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {active && <ChevronRight size={12} style={{ opacity: 0.6 }} />}
            </button>
          );
        })}
      </nav>

      {/* User info */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border-color)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '8px',
        }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'rgba(88, 166, 255, 0.2)',
            border: '1px solid var(--accent-cyan)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            color: 'var(--accent-cyan)',
            fontFamily: "'Space Mono', monospace",
            fontWeight: 700,
            flexShrink: 0,
          }}>
            {user?.email?.charAt(0).toUpperCase() ?? 'U'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '12px',
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {user?.email ?? 'Unknown'}
            </div>
            {user?.is_admin && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                background: 'rgba(240, 136, 62, 0.15)',
                border: '1px solid rgba(240, 136, 62, 0.4)',
                color: 'var(--accent-orange)',
                fontSize: '9px',
                padding: '1px 5px',
                fontFamily: "'Space Mono', monospace",
                letterSpacing: '0.05em',
              }}>
                <Shield size={8} />
                ADMIN
              </div>
            )}
          </div>
        </div>
        <button
          onClick={logout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 8px',
            background: 'transparent',
            border: '1px solid var(--border-color)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '11px',
            fontFamily: "'IBM Plex Sans', sans-serif",
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-red)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-red)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-color)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
          }}
        >
          <LogOut size={12} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
