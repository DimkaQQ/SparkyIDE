import { useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  GitBranch,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  PROVIDER_PRESETS,
  discoverModels,
  presetToProvider,
  slug,
} from '../providers';
import {
  describeGitHubError,
  describeTokenAccess,
  getTokenAccess,
  getViewer,
} from '../github';
import GitHubDeviceFlow from './GitHubDeviceFlow';
import { useStore } from '../state';
import type { ApiFormat, ProviderConfig } from '../types';

type Tab = 'providers' | 'github' | 'general';

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const {
    providers,
    setProviders,
    activeProviderId,
    setActiveProviderId,
    githubToken,
    setGithubToken,
    githubUser,
    setGithubUser,
    theme,
    toggleTheme,
    resetAll,
    workspace,
  } = useStore();

  const [tab, setTab] = useState<Tab>('providers');
  // Every card toggles on its own: the API key field is always visible,
  // only the advanced fields sit behind the chevron.
  const [openCards, setOpenCards] = useState<Set<string>>(
    () => new Set([providers.find((provider) => !provider.apiKey)?.id ?? activeProviderId]),
  );
  const toggleCard = (id: string) =>
    setOpenCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [detecting, setDetecting] = useState<Set<string>>(new Set());
  const [detectAllBusy, setDetectAllBusy] = useState(false);
  const [notices, setNotices] = useState<
    Record<string, { kind: 'ok' | 'error'; text: string }>
  >({});
  const [showAdd, setShowAdd] = useState(false);

  const [tokenDraft, setTokenDraft] = useState('');
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authAccess, setAuthAccess] = useState<{ summary: string; warning: string } | null>(null);

  const update = (id: string, patch: Partial<ProviderConfig>) => {
    setProviders((prev) =>
      prev.map((provider) => (provider.id === id ? { ...provider, ...patch } : provider)),
    );
  };

  const setNotice = (id: string, notice: { kind: 'ok' | 'error'; text: string }) => {
    setNotices((prev) => ({ ...prev, [id]: notice }));
  };

  const detect = async (provider: ProviderConfig) => {
    setDetecting((prev) => new Set(prev).add(provider.id));
    try {
      const models = await discoverModels(provider);
      update(provider.id, {
        models,
        modelsFetchedAt: Date.now(),
        model: models.includes(provider.model) ? provider.model : models[0] ?? provider.model,
      });
      setNotice(provider.id, {
        kind: 'ok',
        text:
          models.length > 0
            ? `${models.length} model${models.length === 1 ? '' : 's'} available`
            : 'The provider returned an empty model list.',
      });
    } catch (error) {
      setNotice(provider.id, {
        kind: 'error',
        text: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setDetecting((prev) => {
        const next = new Set(prev);
        next.delete(provider.id);
        return next;
      });
    }
  };

  const detectAll = async () => {
    setDetectAllBusy(true);
    const targets = providers.filter((provider) => provider.apiKey);
    for (const provider of targets) {
      await detect(provider);
    }
    setDetectAllBusy(false);
  };

  const addProvider = (name: string) => {
    const preset = PROVIDER_PRESETS.find((entry) => entry.name === name);
    if (!preset) return;
    let id = slug(preset.name);
    let suffix = 1;
    while (providers.some((provider) => provider.id === id)) {
      suffix += 1;
      id = `${slug(preset.name)}-${suffix}`;
    }
    const provider = presetToProvider(preset, id);
    setProviders((prev) => [...prev, provider]);
    setOpenCards((prev) => new Set(prev).add(id));
    setShowAdd(false);
    setNotice(id, { kind: 'ok', text: 'Add your API key, then press Detect models.' });
  };

  const removeProvider = (id: string) => {
    const remaining = providers.filter((provider) => provider.id !== id);
    setProviders(remaining);
    if (activeProviderId === id && remaining[0]) setActiveProviderId(remaining[0].id);
  };

  const applyGitHubToken = async (token: string) => {
    setAuthBusy(true);
    setAuthError('');
    setAuthAccess(null);
    try {
      const user = await getViewer(token);
      setGithubToken(token);
      setGithubUser(user);
      setTokenDraft('');
      try {
        setAuthAccess(describeTokenAccess(await getTokenAccess(token)));
      } catch {
        setAuthAccess(null);
      }
    } catch (error) {
      setAuthError(describeGitHubError(error));
    } finally {
      setAuthBusy(false);
    }
  };

  const verifyGitHub = async () => {
    const token = tokenDraft.trim() || githubToken;
    if (!token) return;
    await applyGitHubToken(token);
  };

  const formatOptions: { value: ApiFormat; label: string }[] = [
    { value: 'openai', label: 'OpenAI compatible' },
    { value: 'anthropic', label: 'Anthropic (Claude)' },
    { value: 'gemini', label: 'Google Gemini' },
  ];

  return (
    <div className="modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <span className="modal-title">Settings</span>
          <div className="spacer" />
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close settings">
            <X size={15} />
          </button>
        </div>

        <div className="settings-tabs">
          <button
            type="button"
            className={`settings-tab ${tab === 'providers' ? 'active' : ''}`}
            onClick={() => setTab('providers')}
          >
            <Sparkles size={13} /> AI providers
          </button>
          <button
            type="button"
            className={`settings-tab ${tab === 'github' ? 'active' : ''}`}
            onClick={() => setTab('github')}
          >
            <GitBranch size={13} /> GitHub
          </button>
          <button
            type="button"
            className={`settings-tab ${tab === 'general' ? 'active' : ''}`}
            onClick={() => setTab('general')}
          >
            General
          </button>
        </div>

        <div className="settings-body">
          {tab === 'providers' && (
            <>
              <div className="settings-hint">
                <p>
                  Connect any provider with an API key. Sparky asks each one for its model list
                  automatically, so you always see the models your key can actually use.
                </p>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => void detectAll()}
                  disabled={detectAllBusy || providers.every((provider) => !provider.apiKey)}
                >
                  <RefreshCw size={12} className={detectAllBusy ? 'spin' : ''} />
                  Detect all
                </button>
              </div>

              {providers.map((provider) => {
                const isOpen = openCards.has(provider.id);
                const isRevealed = revealed.has(provider.id);
                const isDetecting = detecting.has(provider.id);
                const notice = notices[provider.id];
                return (
                  <div key={provider.id} className="provider-card">
                    <button
                      type="button"
                      className="provider-head"
                      aria-expanded={isOpen}
                      onClick={() => toggleCard(provider.id)}
                    >
                      <span
                        className="provider-icon"
                        style={{ background: provider.color }}
                      >
                        {provider.icon}
                      </span>
                      <span className="provider-info">
                        <span className="provider-name">{provider.name}</span>
                        <span className="provider-sub">
                          {provider.model || 'no model'} · {provider.format}
                          {provider.models.length > 0 ? ` · ${provider.models.length} models` : ''}
                        </span>
                      </span>
                      <span className={`key-status ${provider.apiKey ? 'ok' : ''}`}>
                        {provider.apiKey ? 'key set' : 'add key'}
                      </span>
                      {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {/* The key field lives outside the collapsible form so it is
                        visible on every screen, without any click. */}
                    <div className="provider-key">
                      <div className="field">
                        <label htmlFor={`key-${provider.id}`}>API key</label>
                        <div className="input-with-action">
                          <input
                            id={`key-${provider.id}`}
                            className="input"
                            type={isRevealed ? 'text' : 'password'}
                            value={provider.apiKey}
                            placeholder="sk-… / ghp_… / AIza…"
                            autoComplete="off"
                            spellCheck={false}
                            onChange={(event) =>
                              update(provider.id, { apiKey: event.target.value.trim() })
                            }
                          />
                          <button
                            type="button"
                            className="icon-btn"
                            title={isRevealed ? 'Hide key' : 'Show key'}
                            onClick={() =>
                              setRevealed((prev) => {
                                const next = new Set(prev);
                                if (next.has(provider.id)) next.delete(provider.id);
                                else next.add(provider.id);
                                return next;
                              })
                            }
                          >
                            {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        </div>
                        <p className="field-hint">
                          Stored in this browser; sent only to {provider.name}.
                        </p>
                      </div>
                      <div className="provider-actions">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => void detect(provider)}
                          disabled={isDetecting || !provider.apiKey}
                          title={
                            provider.apiKey
                              ? 'Ask the provider for the models your key can use'
                              : 'Add an API key first'
                          }
                        >
                          {isDetecting ? (
                            <Loader2 size={12} className="spin" />
                          ) : (
                            <RefreshCw size={12} />
                          )}
                          {isDetecting ? 'Detecting…' : 'Detect models'}
                        </button>
                      </div>
                      {notice && (
                        <div className={`notice ${notice.kind === 'ok' ? 'ok' : 'error'}`}>
                          {notice.kind === 'ok' ? (
                            <Check size={13} />
                          ) : (
                            <AlertTriangle size={13} />
                          )}
                          <span>{notice.text}</span>
                        </div>
                      )}
                    </div>

                    {isOpen && (
                      <div className="provider-form">
                        <div className="form-row">
                          <div className="field">
                            <label htmlFor={`url-${provider.id}`}>Base URL</label>
                            <input
                              id={`url-${provider.id}`}
                              className="input"
                              value={provider.baseUrl}
                              onChange={(event) =>
                                update(provider.id, { baseUrl: event.target.value.trim() })
                              }
                            />
                          </div>
                          <div className="field">
                            <label htmlFor={`format-${provider.id}`}>API format</label>
                            <select
                              id={`format-${provider.id}`}
                              className="select"
                              value={provider.format}
                              onChange={(event) =>
                                update(provider.id, {
                                  format: event.target.value as ApiFormat,
                                  models: [],
                                })
                              }
                            >
                              {formatOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="field">
                          <label htmlFor={`model-${provider.id}`}>Model</label>
                          <input
                            id={`model-${provider.id}`}
                            className="input"
                            value={provider.model}
                            onChange={(event) =>
                              update(provider.id, { model: event.target.value.trim() })
                            }
                          />
                        </div>

                        <div className="provider-actions">
                          <button
                            type="button"
                            className={`btn btn-sm ${activeProviderId === provider.id ? 'active' : ''}`}
                            onClick={() => setActiveProviderId(provider.id)}
                          >
                            {activeProviderId === provider.id ? (
                              <>
                                <Check size={12} /> Active
                              </>
                            ) : (
                              'Use this provider'
                            )}
                          </button>
                          <div className="spacer" />
                          <button
                            type="button"
                            className="btn btn-sm danger"
                            onClick={() => removeProvider(provider.id)}
                            disabled={providers.length <= 1}
                          >
                            <Trash2 size={12} /> Remove
                          </button>
                        </div>

                        {provider.models.length > 0 && (
                          <div className="model-chips">
                            {provider.models.map((model) => (
                              <button
                                key={model}
                                type="button"
                                className={`model-chip ${provider.model === model ? 'selected' : ''}`}
                                onClick={() => update(provider.id, { model })}
                              >
                                {model}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {showAdd ? (
                <div className="add-provider">
                  <div className="add-provider-head">
                    <span>Add a provider</span>
                    <button type="button" className="icon-btn" onClick={() => setShowAdd(false)}>
                      <X size={13} />
                    </button>
                  </div>
                  <div className="add-grid">
                    {PROVIDER_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        className="add-card"
                        onClick={() => addProvider(preset.name)}
                      >
                        <span className="provider-icon" style={{ background: preset.color }}>
                          {preset.icon}
                        </span>
                        <span>
                          <span className="add-card-name">{preset.name}</span>
                          <span className="add-card-sub">{preset.format}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <button type="button" className="add-btn" onClick={() => setShowAdd(true)}>
                  <Plus size={14} /> Add AI provider
                </button>
              )}
            </>
          )}

          {tab === 'github' && (
            <>
              <div className="settings-hint">
                <p>
                  A personal access token lets Sparky list repositories, read files, push commits
                  and open pull requests. Push needs write access: a classic token with the{' '}
                  <code>repo</code> scope, or a fine-grained token with{' '}
                  <strong>Contents: Read and write</strong> (plus <strong>Pull requests</strong> for
                  PRs). The token is stored only in this browser.
                </p>
                <a
                  className="btn btn-sm"
                  href="https://github.com/settings/tokens/new?scopes=repo&description=Sparky%20IDE"
                  target="_blank"
                  rel="noreferrer"
                >
                  <KeyRound size={12} /> Classic token
                </a>
                <a
                  className="btn btn-sm"
                  href="https://github.com/settings/personal-access-tokens/new"
                  target="_blank"
                  rel="noreferrer"
                >
                  <KeyRound size={12} /> Fine-grained token
                </a>
              </div>

              {githubUser ? (
                <div className="gh-user-card">
                  <img src={githubUser.avatarUrl} alt={githubUser.login} className="gh-avatar" />
                  <div className="gh-account-text">
                    <span className="gh-login">@{githubUser.login}</span>
                    <span className="muted-small">Connected</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => {
                      setGithubToken('');
                      setGithubUser(null);
                      setAuthAccess(null);
                    }}
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <div className="notice">
                  <GitBranch size={13} />
                  <span>No GitHub account connected yet.</span>
                </div>
              )}

              <GitHubDeviceFlow
                onToken={(token) => {
                  void applyGitHubToken(token);
                }}
              />

              <div className="settings-divider">
                <span>or paste a personal access token</span>
              </div>

              <div className="field">
                <label htmlFor="gh-token">
                  {githubUser ? 'Replace token' : 'Personal access token'}
                </label>
                <input
                  id="gh-token"
                  className="input"
                  type="password"
                  value={tokenDraft}
                  onChange={(event) => setTokenDraft(event.target.value)}
                  placeholder="ghp_… or github_pat_…"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void verifyGitHub();
                  }}
                />
              </div>

              <div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void verifyGitHub()}
                  disabled={authBusy || (!tokenDraft.trim() && !githubToken)}
                >
                  {authBusy ? <Loader2 size={13} className="spin" /> : <GitBranch size={13} />}
                  Verify and save
                </button>
              </div>

              {authAccess && !authError && (
                <div className={authAccess.warning ? 'notice error' : 'notice'}>
                  {authAccess.warning ? <AlertTriangle size={13} /> : <Check size={13} />}
                  <span>
                    {authAccess.summary}
                    {authAccess.warning ? ` — ${authAccess.warning}` : ''}
                  </span>
                </div>
              )}

              {authError && (
                <div className="notice error">
                  <AlertTriangle size={13} /> {authError}
                </div>
              )}
            </>
          )}

          {tab === 'general' && (
            <>
              <div className="gh-card">
                <h3>Appearance</h3>
                <p>Sparky adapts its palette to the editor.</p>
                <div>
                  <button type="button" className="btn btn-sm" onClick={toggleTheme}>
                    Switch to {theme === 'dark' ? 'light' : 'dark'} theme
                  </button>
                </div>
              </div>

              <div className="gh-card">
                <h3>Workspace</h3>
                <p>
                  {Object.keys(workspace).length} files ·{' '}
                  {(
                    Object.values(workspace).reduce((sum, content) => sum + new Blob([content]).size, 0) /
                    1024
                  ).toFixed(1)}{' '}
                  KB stored in this browser.
                </p>
              </div>

              <div className="gh-card">
                <h3>
                  <RotateCcw size={14} /> Reset everything
                </h3>
                <p>
                  Deletes chats, the workspace, provider keys and the GitHub token from this
                  browser. This cannot be undone.
                </p>
                <div>
                  <button
                    type="button"
                    className="btn btn-sm danger"
                    onClick={() => {
                      if (window.confirm('Reset all Sparky IDE data in this browser?')) resetAll();
                    }}
                  >
                    <Trash2 size={12} /> Reset data
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="modal-foot">
          <span className="modal-note">
            Keys never leave your browser except when calling the provider you configured.
          </span>
          <div className="spacer" />
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
