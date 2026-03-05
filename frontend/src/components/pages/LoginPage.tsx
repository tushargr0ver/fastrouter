import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

export function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, fullName);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      backgroundImage: `
        linear-gradient(rgba(88, 166, 255, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(88, 166, 255, 0.03) 1px, transparent 1px)
      `,
      backgroundSize: '40px 40px',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'var(--accent-cyan)',
            color: '#080c10',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Space Mono', monospace",
            fontWeight: 700,
            fontSize: '22px',
            margin: '0 auto 16px',
            boxShadow: '0 0 30px rgba(88, 166, 255, 0.4)',
          }}>
            FR
          </div>
          <h1 style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: '20px',
            color: 'var(--text-primary)',
            margin: '0 0 6px',
            fontWeight: 700,
          }}>FastRouter</h1>
          <p style={{
            fontSize: '12px',
            color: 'var(--text-muted)',
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '0.1em',
            margin: 0,
          }}>
            UNIFIED AI API GATEWAY
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          padding: '28px',
        }}>
          <div style={{
            display: 'flex',
            gap: '0',
            marginBottom: '24px',
            borderBottom: '1px solid var(--border-color)',
          }}>
            {(['login', 'register'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: mode === m ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                  color: mode === m ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontFamily: "'Space Mono', monospace",
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  marginBottom: '-1px',
                  transition: 'all 0.15s',
                }}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {mode === 'register' && (
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', fontFamily: "'Space Mono', monospace", marginBottom: '6px', letterSpacing: '0.05em' }}>
                  FULL NAME
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                  style={inputStyle}
                  placeholder="John Doe"
                />
              </div>
            )}
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', fontFamily: "'Space Mono', monospace", marginBottom: '6px', letterSpacing: '0.05em' }}>
                EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={inputStyle}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', fontFamily: "'Space Mono', monospace", marginBottom: '6px', letterSpacing: '0.05em' }}>
                PASSWORD
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={inputStyle}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(248, 81, 73, 0.1)',
                border: '1px solid rgba(248, 81, 73, 0.4)',
                color: 'var(--accent-red)',
                padding: '8px 12px',
                fontSize: '12px',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px',
                background: loading ? 'rgba(88, 166, 255, 0.3)' : 'var(--accent-cyan)',
                color: loading ? 'var(--text-secondary)' : '#080c10',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                fontFamily: "'Space Mono', monospace",
                fontWeight: 700,
                letterSpacing: '0.08em',
                transition: 'all 0.15s',
                boxShadow: loading ? 'none' : '0 0 20px rgba(88, 166, 255, 0.3)',
              }}
            >
              {loading ? 'AUTHENTICATING...' : mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border-color)',
  color: 'var(--text-primary)',
  fontSize: '13px',
  fontFamily: "'JetBrains Mono', monospace",
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
};
