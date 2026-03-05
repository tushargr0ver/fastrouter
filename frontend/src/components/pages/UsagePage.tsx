import { useAuth } from '../../hooks/useAuth';
import { useApi } from '../../hooks/useApi';
import { usage } from '../../lib/api';
import type { UsageLog, UsageStats } from '../../lib/api';
import { Activity, Zap, DollarSign, Filter } from 'lucide-react';
import { useState } from 'react';

export function UsagePage() {
  const { token } = useAuth();
  const [filterModel, setFilterModel] = useState('');

  const { data: logs, loading: logsLoading, error: logsError } = useApi<UsageLog[]>(
    () => usage.list(token!, 0, 50),
    [token]
  );
  const { data: stats, loading: statsLoading } = useApi<UsageStats>(
    () => usage.stats(token!),
    [token]
  );

  const filteredLogs = filterModel
    ? (logs ?? []).filter(l => l.model_name.toLowerCase().includes(filterModel.toLowerCase()))
    : (logs ?? []);

  const models = [...new Set((logs ?? []).map(l => l.model_name))];

  const fmt = (n: number | undefined | null) => {
    if (n == null) return '—';
    if (n >= 1000000) return `${(n / 1000000).toFixed(2)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toFixed(0);
  };

  const providerColor: Record<string, string> = {
    openai: 'var(--accent-green)',
    anthropic: 'var(--accent-orange)',
    google: 'var(--accent-cyan)',
    cohere: 'var(--accent-purple)',
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1100px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: "'Space Mono', monospace", fontSize: '20px', color: 'var(--text-primary)', margin: '0 0 4px', fontWeight: 700 }}>Usage Analytics</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>Detailed breakdown of your API usage</p>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'REQUESTS', value: statsLoading ? '...' : fmt(stats?.total_requests), icon: Activity, accent: 'var(--accent-cyan)' },
          { label: 'TOTAL TOKENS', value: statsLoading ? '...' : fmt(stats?.total_tokens), icon: Zap, accent: 'var(--accent-purple)' },
          { label: 'TOTAL COST', value: statsLoading ? '...' : `$${(stats?.total_cost ?? 0).toFixed(6)}`, icon: DollarSign, accent: 'var(--accent-green)' },
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>
              <div style={{
                width: '32px', height: '32px',
                background: `${item.accent}15`,
                border: `1px solid ${item.accent}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: item.accent, flexShrink: 0,
              }}>
                <Icon size={14} />
              </div>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: "'Space Mono', monospace", letterSpacing: '0.08em', marginBottom: '3px' }}>{item.label}</div>
                <div style={{ fontSize: '20px', fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-primary)', fontWeight: 600 }}>{item.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Usage Table */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
        <div style={{
          padding: '12px 16px', borderBottom: '1px solid var(--border-color)',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <Filter size={13} style={{ color: 'var(--text-secondary)' }} />
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: "'Space Mono', monospace", letterSpacing: '0.08em', flex: 1 }}>
            USAGE LOGS ({filteredLogs.length})
          </span>
          {models.length > 0 && (
            <select
              value={filterModel}
              onChange={e => setFilterModel(e.target.value)}
              style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)', fontSize: '11px',
                fontFamily: "'JetBrains Mono', monospace", padding: '4px 8px',
                cursor: 'pointer', outline: 'none',
              }}
            >
              <option value="">All models</option>
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                {['Model', 'Provider', 'Input Tokens', 'Output Tokens', 'Cost', 'Time'].map(h => (
                  <th key={h} style={{
                    padding: '9px 12px', textAlign: 'left',
                    fontSize: '10px', color: 'var(--text-muted)',
                    fontFamily: "'Space Mono', monospace", letterSpacing: '0.08em', fontWeight: 400,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logsLoading ? (
                <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', fontFamily: "'JetBrains Mono', monospace" }}>Loading...</td></tr>
              ) : logsError ? (
                <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--accent-red)', fontSize: '12px' }}>{logsError}</td></tr>
              ) : !filteredLogs.length ? (
                <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>No usage data yet</td></tr>
              ) : (
                filteredLogs.map((log, i) => (
                  <tr key={log.id} style={{ borderBottom: i < filteredLogs.length - 1 ? '1px solid rgba(33, 38, 45, 0.6)' : 'none' }}>
                    <td style={{ padding: '9px 12px', fontSize: '12px', fontFamily: "'JetBrains Mono', monospace", color: 'var(--accent-cyan)' }}>{log.model_name}</td>
                    <td style={{ padding: '9px 12px' }}>
                      <span style={{
                        fontSize: '10px', padding: '2px 6px',
                        fontFamily: "'Space Mono', monospace", letterSpacing: '0.05em',
                        color: providerColor[log.provider?.toLowerCase()] ?? 'var(--text-secondary)',
                        background: `${providerColor[log.provider?.toLowerCase()] ?? 'var(--text-secondary)'}15`,
                        border: `1px solid ${providerColor[log.provider?.toLowerCase()] ?? 'var(--text-secondary)'}30`,
                      }}>
                        {log.provider}
                      </span>
                    </td>
                    <td style={{ padding: '9px 12px', fontSize: '12px', fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-primary)' }}>{fmt(log.input_tokens)}</td>
                    <td style={{ padding: '9px 12px', fontSize: '12px', fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-primary)' }}>{fmt(log.output_tokens)}</td>
                    <td style={{ padding: '9px 12px', fontSize: '12px', fontFamily: "'JetBrains Mono', monospace", color: 'var(--accent-green)' }}>${log.cost.toFixed(6)}</td>
                    <td style={{ padding: '9px 12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
