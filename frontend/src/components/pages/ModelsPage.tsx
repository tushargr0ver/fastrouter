import { useAuth } from '../../hooks/useAuth';
import { useApi } from '../../hooks/useApi';
import { models as modelsApi } from '../../lib/api';
import type { Model } from '../../lib/api';
import { Cpu, AlertCircle } from 'lucide-react';

const providerColors: Record<string, { bg: string; border: string; text: string; label: string }> = {
  openai: { bg: 'rgba(63, 185, 80, 0.08)', border: 'rgba(63, 185, 80, 0.3)', text: 'var(--accent-green)', label: 'OpenAI' },
  anthropic: { bg: 'rgba(240, 136, 62, 0.08)', border: 'rgba(240, 136, 62, 0.3)', text: 'var(--accent-orange)', label: 'Anthropic' },
  google: { bg: 'rgba(88, 166, 255, 0.08)', border: 'rgba(88, 166, 255, 0.3)', text: 'var(--accent-cyan)', label: 'Google' },
  cohere: { bg: 'rgba(188, 140, 255, 0.08)', border: 'rgba(188, 140, 255, 0.3)', text: 'var(--accent-purple)', label: 'Cohere' },
};

function getProvider(p: string) {
  const key = p?.toLowerCase();
  return providerColors[key] ?? { bg: 'rgba(139, 148, 158, 0.08)', border: 'rgba(139, 148, 158, 0.3)', text: 'var(--text-secondary)', label: p };
}

function ModelCard({ model }: { model: Model }) {
  const prov = getProvider(model.provider);
  const fmtCtx = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n);

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        padding: '18px',
        position: 'relative',
        transition: 'border-color 0.2s',
      }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-bright)'}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-color)'}
    >
      {/* Status dot */}
      <div style={{
        position: 'absolute', top: '14px', right: '14px',
        width: '7px', height: '7px', borderRadius: '50%',
        background: model.is_active ? 'var(--accent-green)' : 'var(--text-muted)',
        boxShadow: model.is_active ? '0 0 6px rgba(63, 185, 80, 0.6)' : 'none',
      }} title={model.is_active ? 'Active' : 'Inactive'} />

      {/* Provider badge */}
      <div style={{ marginBottom: '10px' }}>
        <span style={{
          fontSize: '10px', padding: '2px 7px',
          fontFamily: "'Space Mono', monospace", letterSpacing: '0.05em',
          background: prov.bg, border: `1px solid ${prov.border}`,
          color: prov.text,
        }}>
          {prov.label}
        </span>
      </div>

      {/* Model name */}
      <div style={{
        fontSize: '14px',
        fontFamily: "'JetBrains Mono', monospace",
        color: 'var(--text-primary)',
        fontWeight: 600,
        marginBottom: '8px',
        wordBreak: 'break-word',
      }}>
        {model.name}
      </div>

      {model.description && (
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.5 }}>
          {model.description}
        </div>
      )}

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px',
        borderTop: '1px solid var(--border-color)',
        paddingTop: '12px',
        marginTop: model.description ? 0 : '12px',
      }}>
        <div>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: "'Space Mono', monospace", letterSpacing: '0.08em', marginBottom: '2px' }}>CONTEXT</div>
          <div style={{ fontSize: '13px', fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-primary)' }}>{fmtCtx(model.context_window)}</div>
        </div>
        <div>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: "'Space Mono', monospace", letterSpacing: '0.08em', marginBottom: '2px' }}>IN / OUT (1K)</div>
          <div style={{ fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", color: 'var(--accent-green)' }}>
            ${model.input_price_per_1k_tokens.toFixed(4)} / ${model.output_price_per_1k_tokens.toFixed(4)}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ModelsPage() {
  const { token } = useAuth();
  const { data: models, loading, error } = useApi<Model[]>(
    () => modelsApi.list(token!),
    [token]
  );

  const grouped = (models ?? []).reduce<Record<string, Model[]>>((acc, m) => {
    const p = m.provider?.toLowerCase() ?? 'other';
    acc[p] = acc[p] ?? [];
    acc[p].push(m);
    return acc;
  }, {});

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: "'Space Mono', monospace", fontSize: '20px', color: 'var(--text-primary)', margin: '0 0 4px', fontWeight: 700 }}>
          Models
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
          Available AI models — {models?.length ?? '...'} total
        </p>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', fontSize: '12px', fontFamily: "'JetBrains Mono', monospace" }}>
          Loading models...
        </div>
      )}

      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.3)',
          color: 'var(--accent-red)', padding: '12px 16px', fontSize: '12px',
        }}>
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {!loading && !error && !models?.length && (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <Cpu size={40} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
          <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No models available</div>
        </div>
      )}

      {Object.entries(grouped).map(([provider, provModels]) => {
        const prov = getProvider(provider);
        return (
          <div key={provider} style={{ marginBottom: '28px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              marginBottom: '12px',
            }}>
              <span style={{
                fontSize: '11px', fontFamily: "'Space Mono', monospace",
                letterSpacing: '0.1em', color: prov.text,
              }}>
                {prov.label.toUpperCase()}
              </span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                {provModels.length} models
              </span>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '12px',
            }}>
              {provModels.map(m => <ModelCard key={m.id} model={m} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
