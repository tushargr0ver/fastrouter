import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useApi } from '../../hooks/useApi';
import { credits } from '../../lib/api';
import type { Credits } from '../../lib/api';
import { Wallet, TrendingUp, TrendingDown, Plus } from 'lucide-react';

export function CreditsPage() {
  const { token } = useAuth();
  const { data, loading, error, refetch } = useApi<Credits>(() => credits.get(token!), [token]);
  const [amount, setAmount] = useState('10');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState(false);

  const handleAddCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setAddError('');
    setAddSuccess(false);
    try {
      await credits.add(token!, Number(amount));
      setAddSuccess(true);
      refetch();
      setTimeout(() => setAddSuccess(false), 3000);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add credits');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: "'Space Mono', monospace", fontSize: '20px', color: 'var(--text-primary)', margin: '0 0 4px', fontWeight: 700 }}>Credits</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>Manage your usage credits and billing</p>
      </div>

      {/* Balance Hero */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        padding: '32px',
        marginBottom: '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, rgba(63, 185, 80, 0.05) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: "'Space Mono', monospace", letterSpacing: '0.15em', marginBottom: '12px' }}>
          AVAILABLE BALANCE
        </div>
        <div style={{
          fontSize: '56px',
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 700,
          color: loading ? 'var(--text-muted)' : 'var(--accent-green)',
          textShadow: loading ? 'none' : '0 0 30px rgba(63, 185, 80, 0.4)',
          lineHeight: 1,
          marginBottom: '8px',
        }}>
          {loading ? '...' : `$${(data?.balance ?? 0).toFixed(4)}`}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>USD Credits</div>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'TOTAL PURCHASED', value: loading ? '...' : `$${(data?.total_purchased ?? 0).toFixed(4)}`, icon: Plus, accent: 'var(--accent-cyan)', bg: 'rgba(88, 166, 255, 0.06)' },
          { label: 'TOTAL USED', value: loading ? '...' : `$${(data?.total_used ?? 0).toFixed(4)}`, icon: TrendingDown, accent: 'var(--accent-orange)', bg: 'rgba(240, 136, 62, 0.06)' },
          { label: 'AVAILABLE', value: loading ? '...' : `$${(data?.balance ?? 0).toFixed(4)}`, icon: Wallet, accent: 'var(--accent-green)', bg: 'rgba(63, 185, 80, 0.06)' },
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} style={{
              background: item.bg,
              border: `1px solid ${item.accent}30`,
              padding: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Icon size={13} style={{ color: item.accent }} />
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: "'Space Mono', monospace", letterSpacing: '0.08em' }}>{item.label}</span>
              </div>
              <div style={{ fontSize: '22px', fontFamily: "'JetBrains Mono', monospace", color: item.accent, fontWeight: 600 }}>{item.value}</div>
            </div>
          );
        })}
      </div>

      {error && (
        <div style={{ background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.3)', color: 'var(--accent-red)', padding: '10px 14px', fontSize: '12px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Add Credits */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={13} style={{ color: 'var(--text-secondary)' }} />
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: "'Space Mono', monospace", letterSpacing: '0.08em' }}>ADD CREDITS</span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '4px' }}>(admin/testing)</span>
        </div>
        <div style={{ padding: '20px' }}>
          <form onSubmit={handleAddCredits} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', fontFamily: "'Space Mono', monospace", marginBottom: '6px', letterSpacing: '0.05em' }}>
                AMOUNT (USD)
              </label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                min="0.01"
                step="0.01"
                required
                style={{
                  width: '100%', padding: '8px 10px',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)', fontSize: '14px',
                  fontFamily: "'JetBrains Mono', monospace", outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <button
              type="submit"
              disabled={adding}
              style={{
                padding: '8px 16px',
                background: adding ? 'rgba(63, 185, 80, 0.3)' : 'var(--accent-green)',
                color: adding ? 'var(--text-secondary)' : '#080c10',
                border: 'none', cursor: adding ? 'not-allowed' : 'pointer',
                fontSize: '12px', fontFamily: "'Space Mono', monospace", fontWeight: 700,
                letterSpacing: '0.05em', whiteSpace: 'nowrap',
                boxShadow: adding ? 'none' : '0 0 15px rgba(63, 185, 80, 0.2)',
              }}
            >
              {adding ? 'ADDING...' : 'ADD CREDITS'}
            </button>
          </form>
          {addError && (
            <div style={{ marginTop: '10px', background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.3)', color: 'var(--accent-red)', padding: '8px', fontSize: '12px', fontFamily: "'JetBrains Mono', monospace" }}>
              {addError}
            </div>
          )}
          {addSuccess && (
            <div style={{ marginTop: '10px', background: 'rgba(63,185,80,0.1)', border: '1px solid rgba(63,185,80,0.3)', color: 'var(--accent-green)', padding: '8px', fontSize: '12px', fontFamily: "'JetBrains Mono', monospace" }}>
              ✓ Credits added successfully
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
