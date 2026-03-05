import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useApi } from '../../hooks/useApi';
import { models as modelsApi, LLM_API_BASE } from '../../lib/api';
import type { Model } from '../../lib/api';
import { Send, Clock, Zap, Copy, Check } from 'lucide-react';

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  [key: string]: unknown;
}

export function APITesterPage() {
  const { token } = useAuth();
  const { data: models } = useApi<Model[]>(() => modelsApi.list(token!), [token]);

  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [message, setMessage] = useState('Hello! What can you do?');
  const [temperature, setTemperature] = useState(0.7);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ChatCompletionResponse | null>(null);
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) { setError('Please enter an API key'); return; }
    if (!model) { setError('Please select a model'); return; }

    setLoading(true);
    setError('');
    setResponse(null);
    const start = Date.now();

    try {
      const res = await fetch(`${LLM_API_BASE}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey.trim(),
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: message }],
          temperature,
        }),
      });
      const json = await res.json() as ChatCompletionResponse & { detail?: string; error?: { message?: string } };
      if (!res.ok) {
        throw new Error(json.detail ?? json.error?.message ?? `HTTP ${res.status}`);
      }
      setElapsed(Date.now() - start);
      setResponse(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
      setElapsed(Date.now() - start);
    } finally {
      setLoading(false);
    }
  };

  const copyResponse = async () => {
    if (response) {
      await navigator.clipboard.writeText(JSON.stringify(response, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const activeModels = (models ?? []).filter(m => m.is_active);
  const usageData = response?.usage;
  const responseText = response?.choices?.[0]?.message?.content;

  return (
    <div style={{ padding: '24px', height: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontFamily: "'Space Mono', monospace", fontSize: '20px', color: 'var(--text-primary)', margin: '0 0 4px', fontWeight: 700 }}>API Tester</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>Test the /v1/chat/completions endpoint</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '16px', flex: 1, minHeight: 0 }}>
        {/* Left Panel */}
        <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={labelStyle}>API KEY</label>
              <input
                type="text"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="fr-xxxxxxxxxx"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>MODEL</label>
              <select
                value={model}
                onChange={e => setModel(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="">Select a model...</option>
                {activeModels.map(m => (
                  <option key={m.id} value={m.name}>{m.name} ({m.provider})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>MESSAGE</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={5}
                style={{ ...inputStyle, resize: 'vertical', minHeight: '100px' }}
                placeholder="Enter your message..."
              />
            </div>
            <div>
              <label style={{ ...labelStyle, display: 'flex', justifyContent: 'space-between' }}>
                <span>TEMPERATURE</span>
                <span style={{ color: 'var(--accent-cyan)', fontFamily: "'JetBrains Mono', monospace" }}>{temperature.toFixed(1)}</span>
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={e => setTemperature(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                <span>0.0 precise</span>
                <span>2.0 creative</span>
              </div>
            </div>
          </div>

          {error && (
            <div style={{
              background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.3)',
              color: 'var(--accent-red)', padding: '10px', fontSize: '12px', fontFamily: "'JetBrains Mono', monospace",
            }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '12px',
              background: loading ? 'rgba(88, 166, 255, 0.2)' : 'var(--accent-cyan)',
              color: loading ? 'var(--text-secondary)' : '#080c10',
              border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '13px', fontFamily: "'Space Mono', monospace", fontWeight: 700,
              letterSpacing: '0.08em',
              boxShadow: loading ? 'none' : '0 0 20px rgba(88, 166, 255, 0.3)',
              transition: 'all 0.15s',
            }}
          >
            <Send size={14} />
            {loading ? 'SENDING...' : 'SEND REQUEST'}
          </button>
        </form>

        {/* Right Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minHeight: 0 }}>
          {/* Meta info */}
          {(elapsed !== null || response) && (
            <div style={{
              display: 'flex', gap: '16px',
              background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
              padding: '10px 16px',
            }}>
              {elapsed !== null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <Clock size={12} style={{ color: 'var(--accent-cyan)' }} />
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--accent-cyan)' }}>{elapsed}ms</span>
                </div>
              )}
              {usageData && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <Zap size={12} style={{ color: 'var(--accent-purple)' }} />
                  <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    <span style={{ color: 'var(--text-muted)' }}>in:</span> <span style={{ color: 'var(--accent-purple)' }}>{usageData.prompt_tokens}</span>
                    <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>|</span>
                    <span style={{ color: 'var(--text-muted)' }}>out:</span> <span style={{ color: 'var(--accent-purple)' }}>{usageData.completion_tokens}</span>
                    <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>|</span>
                    <span style={{ color: 'var(--text-muted)' }}>total:</span> <span style={{ color: 'var(--accent-purple)' }}>{usageData.total_tokens}</span>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Response Text */}
          {responseText && (
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-color)', fontSize: '10px', color: 'var(--text-secondary)', fontFamily: "'Space Mono', monospace", letterSpacing: '0.08em' }}>
                RESPONSE
              </div>
              <div style={{
                padding: '14px',
                flex: 1,
                overflowY: 'auto',
                fontSize: '14px',
                color: 'var(--text-primary)',
                lineHeight: 1.7,
                fontFamily: "'IBM Plex Sans', sans-serif",
              }}>
                {responseText}
              </div>
            </div>
          )}

          {/* Raw JSON */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', flex: responseText ? '0 0 auto' : 1, display: 'flex', flexDirection: 'column', minHeight: responseText ? '160px' : 0 }}>
            <div style={{
              padding: '10px 14px', borderBottom: '1px solid var(--border-color)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: "'Space Mono', monospace", letterSpacing: '0.08em' }}>
                {response ? 'RAW JSON' : 'WAITING FOR REQUEST...'}
              </span>
              {response && (
                <button
                  onClick={copyResponse}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    background: 'transparent', border: 'none',
                    color: copied ? 'var(--accent-green)' : 'var(--text-muted)',
                    cursor: 'pointer', fontSize: '10px', fontFamily: "'Space Mono', monospace",
                    transition: 'color 0.15s',
                  }}
                >
                  {copied ? <Check size={11} /> : <Copy size={11} />}
                  {copied ? 'COPIED' : 'COPY'}
                </button>
              )}
            </div>
            <pre style={{
              flex: 1, margin: 0, padding: '14px',
              fontSize: '11px', fontFamily: "'JetBrains Mono', monospace",
              color: response ? 'var(--text-primary)' : 'var(--text-muted)',
              overflowY: 'auto', lineHeight: 1.6,
              background: 'transparent',
            }}>
              {response
                ? JSON.stringify(response, null, 2)
                : loading
                ? '// Sending request...'
                : '// Response will appear here'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '10px',
  color: 'var(--text-secondary)',
  fontFamily: "'Space Mono', monospace",
  letterSpacing: '0.08em',
  marginBottom: '5px',
};

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
