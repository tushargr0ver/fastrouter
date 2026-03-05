import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useApi } from '../../hooks/useApi';
import { keys } from '../../lib/api';
import type { APIKey, APIKeyCreated } from '../../lib/api';
import { Plus, Trash2, ToggleLeft, ToggleRight, Copy, Check, Key, X } from 'lucide-react';

function Badge({ active }: { active: boolean }) {
  return (
    <span style={{
      fontSize: '10px',
      padding: '2px 7px',
      fontFamily: "'Space Mono', monospace",
      letterSpacing: '0.05em',
      background: active ? 'rgba(63, 185, 80, 0.12)' : 'rgba(248, 81, 73, 0.12)',
      border: `1px solid ${active ? 'rgba(63, 185, 80, 0.3)' : 'rgba(248, 81, 73, 0.3)'}`,
      color: active ? 'var(--accent-green)' : 'var(--accent-red)',
    }}>
      {active ? 'ACTIVE' : 'INACTIVE'}
    </span>
  );
}

export function APIKeysPage() {
  const { token } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<APIKeyCreated | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [copied, setCopied] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: keyList, loading, error, refetch } = useApi<APIKey[]>(
    () => keys.list(token!),
    [token]
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      const k = await keys.create(token!, newKeyName);
      setCreatedKey(k);
      setNewKeyName('');
      refetch();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create key');
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await keys.toggle(token!, id);
      refetch();
    } catch (_) {}
  };

  const handleDelete = async (id: string) => {
    try {
      await keys.delete(token!, id);
      setDeleteConfirm(null);
      refetch();
    } catch (_) {}
  };

  const copyKey = async (key: string) => {
    await navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeModal = () => {
    setShowModal(false);
    setCreatedKey(null);
    setCreateError('');
    setNewKeyName('');
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1000px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: "'Space Mono', monospace", fontSize: '20px', color: 'var(--text-primary)', margin: '0 0 4px', fontWeight: 700 }}>API Keys</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>Manage your API keys for authentication</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            background: 'var(--accent-cyan)',
            color: '#080c10',
            border: 'none',
            cursor: 'pointer',
            fontSize: '12px',
            fontFamily: "'Space Mono', monospace",
            fontWeight: 700,
            letterSpacing: '0.05em',
            boxShadow: '0 0 15px rgba(88, 166, 255, 0.25)',
          }}
        >
          <Plus size={13} /> NEW KEY
        </button>
      </div>

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 180px 140px 140px 100px 100px',
          padding: '10px 16px',
          borderBottom: '1px solid var(--border-color)',
        }}>
          {['Name', 'Key Prefix', 'Created', 'Last Used', 'Status', 'Actions'].map(h => (
            <div key={h} style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: "'Space Mono', monospace", letterSpacing: '0.08em' }}>{h}</div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', fontFamily: "'JetBrains Mono', monospace" }}>Loading...</div>
        ) : error ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--accent-red)', fontSize: '12px' }}>{error}</div>
        ) : !keyList?.length ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <Key size={32} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
            <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No API keys yet</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>Create your first key to get started</div>
          </div>
        ) : (
          keyList.map((key, i) => (
            <div key={key.id} style={{
              display: 'grid',
              gridTemplateColumns: '1fr 180px 140px 140px 100px 100px',
              padding: '12px 16px',
              alignItems: 'center',
              borderBottom: i < keyList.length - 1 ? '1px solid rgba(33, 38, 45, 0.7)' : 'none',
            }}>
              <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{key.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--accent-cyan)', fontFamily: "'JetBrains Mono', monospace" }}>{key.key_prefix}...</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {new Date(key.created_at).toLocaleDateString()}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}
              </div>
              <div><Badge active={key.is_active} /></div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => handleToggle(key.id)}
                  title={key.is_active ? 'Deactivate' : 'Activate'}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: key.is_active ? 'var(--accent-green)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '4px 6px',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'all 0.15s',
                  }}
                >
                  {key.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                </button>
                {deleteConfirm === key.id ? (
                  <>
                    <button onClick={() => handleDelete(key.id)} style={{ background: 'rgba(248,81,73,0.2)', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', cursor: 'pointer', padding: '4px 6px', fontSize: '10px', fontFamily: "'Space Mono', monospace" }}>DEL</button>
                    <button onClick={() => setDeleteConfirm(null)} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px 6px', display: 'flex', alignItems: 'center' }}><X size={11} /></button>
                  </>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(key.id)}
                    title="Delete"
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px 6px',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-red)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-red)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-color)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(2px)',
        }}>
          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
            width: '480px', maxWidth: '90vw',
          }}>
            <div style={{
              padding: '16px 20px', borderBottom: '1px solid var(--border-color)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '13px', color: 'var(--text-primary)', fontWeight: 700 }}>
                {createdKey ? 'API KEY CREATED' : 'CREATE API KEY'}
              </span>
              <button onClick={closeModal} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: '20px' }}>
              {createdKey ? (
                <div>
                  <div style={{
                    background: 'rgba(63, 185, 80, 0.08)',
                    border: '1px solid rgba(63, 185, 80, 0.3)',
                    padding: '12px',
                    marginBottom: '16px',
                    fontSize: '11px',
                    color: 'var(--accent-green)',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    ✓ Key created: <strong>{createdKey.name}</strong>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--accent-orange)', marginBottom: '10px', fontFamily: "'Space Mono', monospace" }}>
                    ⚠ COPY NOW — This key will not be shown again
                  </p>
                  <div style={{
                    display: 'flex', gap: '8px', alignItems: 'center',
                    background: 'var(--bg)', border: '1px solid var(--border-bright)',
                    padding: '10px 12px',
                  }}>
                    <code style={{ flex: 1, fontSize: '12px', color: 'var(--accent-cyan)', fontFamily: "'JetBrains Mono', monospace", wordBreak: 'break-all' }}>
                      {createdKey.key}
                    </code>
                    <button
                      onClick={() => copyKey(createdKey.key)}
                      style={{
                        background: copied ? 'rgba(63, 185, 80, 0.15)' : 'rgba(88, 166, 255, 0.1)',
                        border: `1px solid ${copied ? 'var(--accent-green)' : 'var(--accent-cyan)'}`,
                        color: copied ? 'var(--accent-green)' : 'var(--accent-cyan)',
                        cursor: 'pointer', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px',
                        fontSize: '11px', fontFamily: "'Space Mono', monospace", flexShrink: 0, transition: 'all 0.15s',
                      }}
                    >
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      {copied ? 'COPIED' : 'COPY'}
                    </button>
                  </div>
                  <button
                    onClick={closeModal}
                    style={{
                      marginTop: '16px', width: '100%', padding: '10px',
                      background: 'var(--bg-elevated)', border: '1px solid var(--border-color)',
                      color: 'var(--text-secondary)', cursor: 'pointer',
                      fontSize: '12px', fontFamily: "'Space Mono', monospace",
                    }}
                  >
                    DONE
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCreate}>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', fontFamily: "'Space Mono', monospace", marginBottom: '6px', letterSpacing: '0.05em' }}>
                    KEY NAME
                  </label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={e => setNewKeyName(e.target.value)}
                    placeholder="my-app-key"
                    required
                    style={{
                      width: '100%', padding: '8px 10px',
                      background: 'var(--bg-elevated)', border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)', fontSize: '13px',
                      fontFamily: "'JetBrains Mono', monospace", outline: 'none',
                      boxSizing: 'border-box', marginBottom: '14px',
                    }}
                  />
                  {createError && (
                    <div style={{
                      background: 'rgba(248, 81, 73, 0.1)', border: '1px solid rgba(248, 81, 73, 0.3)',
                      color: 'var(--accent-red)', padding: '8px', fontSize: '12px',
                      fontFamily: "'JetBrains Mono', monospace", marginBottom: '14px',
                    }}>{createError}</div>
                  )}
                  <button
                    type="submit"
                    disabled={creating}
                    style={{
                      width: '100%', padding: '10px',
                      background: creating ? 'rgba(88,166,255,0.3)' : 'var(--accent-cyan)',
                      color: creating ? 'var(--text-secondary)' : '#080c10',
                      border: 'none', cursor: creating ? 'not-allowed' : 'pointer',
                      fontSize: '12px', fontFamily: "'Space Mono', monospace", fontWeight: 700,
                      letterSpacing: '0.08em',
                    }}
                  >
                    {creating ? 'CREATING...' : 'CREATE KEY'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
