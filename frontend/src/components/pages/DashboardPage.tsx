import { useAuth } from '../../hooks/useAuth';
import { useApi } from '../../hooks/useApi';
import { usage, credits, admin } from '../../lib/api';
import type { UsageStats, Credits, AdminStats } from '../../lib/api';
import { Activity, Zap, DollarSign, Wallet, TrendingUp, Clock } from 'lucide-react';

function StatCard({ title, value, subtitle, icon: Icon, accent }: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<{ size?: number }>;
  accent: string;
}) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-color)',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '2px',
        background: accent,
        opacity: 0.8,
      }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{
            fontSize: '10px',
            color: 'var(--text-muted)',
            fontFamily: "'Space Mono', monospace",
            letterSpacing: '0.1em',
            marginBottom: '8px',
          }}>
            {title}
          </div>
          <div style={{
            fontSize: '28px',
            fontFamily: "'JetBrains Mono', monospace",
            color: 'var(--text-primary)',
            fontWeight: 600,
            lineHeight: 1,
            marginBottom: '4px',
          }}>
            {value}
          </div>
          {subtitle && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{subtitle}</div>
          )}
        </div>
        <div style={{
          width: '36px',
          height: '36px',
          background: `${accent}20`,
          border: `1px solid ${accent}40`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: accent,
        }}>
          <Icon size={16} />
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { token, user } = useAuth();

  const statsApi = useApi<UsageStats>(() => usage.stats(token!), [token]);
  const creditsApi = useApi<Credits>(() => credits.get(token!), [token]);
  const logsApi = useApi(() => usage.list(token!, 0, 10), [token]);
  const adminStatsApi = useApi<AdminStats>(
    () => user?.is_admin ? admin.stats(token!) : Promise.resolve(null as unknown as AdminStats),
    [token, user?.is_admin]
  );

  const stats = statsApi.data;
  const creds = creditsApi.data;

  const fmt = (n: number | undefined | null) => {
    if (n == null) return '—';
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toFixed(0);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: '20px',
          color: 'var(--text-primary)',
          margin: '0 0 4px',
          fontWeight: 700,
        }}>
          Overview
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
          Welcome back, {user?.full_name ?? user?.email}
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <StatCard
          title="TOTAL REQUESTS"
          value={statsApi.loading ? '...' : fmt(stats?.total_requests)}
          subtitle="All time"
          icon={Activity}
          accent="var(--accent-cyan)"
        />
        <StatCard
          title="TOTAL TOKENS"
          value={statsApi.loading ? '...' : fmt(stats?.total_tokens)}
          subtitle="Input + Output"
          icon={Zap}
          accent="var(--accent-purple)"
        />
        <StatCard
          title="CREDITS USED"
          value={creditsApi.loading ? '...' : `$${(creds?.total_used ?? 0).toFixed(4)}`}
          subtitle="Total spend"
          icon={DollarSign}
          accent="var(--accent-orange)"
        />
        <StatCard
          title="CREDITS BALANCE"
          value={creditsApi.loading ? '...' : `$${(creds?.balance ?? 0).toFixed(4)}`}
          subtitle="Available"
          icon={Wallet}
          accent="var(--accent-green)"
        />
      </div>

      {/* Admin stats row */}
      {user?.is_admin && adminStatsApi.data && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}>
          {[
            { label: 'TOTAL USERS', value: String(adminStatsApi.data.total_users) },
            { label: 'ACTIVE KEYS', value: fmt(adminStatsApi.data.active_keys ?? 0) },
            { label: 'PLATFORM REQUESTS', value: fmt(adminStatsApi.data.total_requests) },
          ].map(item => (
            <div key={item.label} style={{
              background: 'rgba(240, 136, 62, 0.05)',
              border: '1px solid rgba(240, 136, 62, 0.2)',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <TrendingUp size={14} style={{ color: 'var(--accent-orange)', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '9px', color: 'var(--accent-orange)', fontFamily: "'Space Mono', monospace", letterSpacing: '0.08em' }}>{item.label}</div>
                <div style={{ fontSize: '18px', fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-primary)', fontWeight: 600 }}>{item.value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '16px' }}>
        {/* Recent Usage */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <Clock size={13} style={{ color: 'var(--text-secondary)' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: "'Space Mono', monospace", letterSpacing: '0.08em' }}>
              RECENT ACTIVITY
            </span>
          </div>
          {logsApi.loading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', fontFamily: "'JetBrains Mono', monospace" }}>Loading...</div>
          ) : logsApi.error ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--accent-red)', fontSize: '12px' }}>{logsApi.error}</div>
          ) : !logsApi.data?.length ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>No usage yet</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    {['Model', 'Tokens', 'Cost', 'Time'].map(h => (
                      <th key={h} style={{
                        padding: '8px 12px',
                        textAlign: 'left',
                        fontSize: '10px',
                        color: 'var(--text-muted)',
                        fontFamily: "'Space Mono', monospace",
                        letterSpacing: '0.08em',
                        fontWeight: 400,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logsApi.data.map((log, i) => (
                    <tr key={log.id} style={{
                      borderBottom: i < (logsApi.data?.length ?? 0) - 1 ? '1px solid rgba(33, 38, 45, 0.7)' : 'none',
                    }}>
                      <td style={{ padding: '8px 12px', fontSize: '12px', fontFamily: "'JetBrains Mono', monospace", color: 'var(--accent-cyan)' }}>{log.model_name}</td>
                      <td style={{ padding: '8px 12px', fontSize: '12px', fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-primary)' }}>{fmt(log.total_tokens)}</td>
                      <td style={{ padding: '8px 12px', fontSize: '12px', fontFamily: "'JetBrains Mono', monospace", color: 'var(--accent-green)' }}>${log.cost.toFixed(6)}</td>
                      <td style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        {new Date(log.created_at).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Start */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--border-color)',
          }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: "'Space Mono', monospace", letterSpacing: '0.08em' }}>
              QUICK START
            </span>
          </div>
          <div style={{ padding: '16px' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.6 }}>
              Use your API key to make requests to any supported model:
            </p>
            <pre style={{
              background: 'var(--bg)',
              border: '1px solid var(--border-color)',
              padding: '12px',
              fontSize: '11px',
              fontFamily: "'JetBrains Mono', monospace",
              color: 'var(--text-primary)',
              overflowX: 'auto',
              lineHeight: 1.6,
              margin: 0,
            }}>
{`curl http://localhost:8001/v1/chat/completions \\
  -H "X-API-Key: fr-..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{
      "role": "user",
      "content": "Hello!"
    }]
  }'`}
            </pre>
            <div style={{
              marginTop: '12px',
              padding: '10px',
              background: 'rgba(63, 185, 80, 0.06)',
              border: '1px solid rgba(63, 185, 80, 0.2)',
              fontSize: '11px',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
            }}>
              <span style={{ color: 'var(--accent-green)', fontFamily: "'Space Mono', monospace" }}>✓ </span>
              OpenAI-compatible API — drop-in replacement for any client library
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
