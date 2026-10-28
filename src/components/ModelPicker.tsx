import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2, RefreshCw, Search, Settings2 } from 'lucide-react';
import { useStore } from '../state';
import { discoverModels } from '../providers';
import type { ProviderConfig } from '../types';

export default function ModelPicker() {
  const {
    providers,
    setProviders,
    activeProvider,
    activeProviderId,
    setActiveProviderId,
    setProviderModel,
    setSettingsOpen,
  } = useStore();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [detecting, setDetecting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    window.setTimeout(() => searchRef.current?.focus(), 20);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return providers
      .map((provider) => {
        const models =
          provider.models.length > 0 ? provider.models : provider.model ? [provider.model] : [];
        return {
          provider,
          models: models.filter((model) => model.toLowerCase().includes(needle)),
        };
      })
      .filter((group) => group.models.length > 0);
  }, [providers, query]);

  const detect = async (provider: ProviderConfig) => {
    setDetecting(provider.id);
    setError('');
    try {
      const models = await discoverModels(provider);
      setProviders((prev) =>
        prev.map((entry) =>
          entry.id === provider.id
            ? {
                ...entry,
                models,
                model: models.includes(entry.model) ? entry.model : models[0] ?? entry.model,
                modelsFetchedAt: Date.now(),
              }
            : entry,
        ),
      );
      if (models.length === 0) setError('The provider returned no models.');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDetecting(null);
    }
  };

  return (
    <div className="model-picker" ref={containerRef}>
      <button type="button" className="model-trigger" onClick={() => setOpen((value) => !value)}>
        <span
          className="provider-dot"
          style={{ background: activeProvider?.color ?? 'var(--muted)' }}
        />
        <span className="model-trigger-name">{activeProvider?.model || 'Select model'}</span>
        <ChevronDown size={12} />
      </button>

      {open && (
        <div className="model-popover">
          <div className="model-search">
            <Search size={13} />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search models…"
            />
          </div>

          <div className="model-list">
            {groups.length === 0 && (
              <div className="model-empty">
                No models match. Add a key in Settings and press Detect.
              </div>
            )}
            {groups.map(({ provider, models }) => (
              <div key={provider.id} className="model-group">
                <div className="model-group-head" onClick={() => setActiveProviderId(provider.id)}>
                  <span className="provider-dot" style={{ background: provider.color }} />
                  <span className="model-group-name">{provider.name}</span>
                  <span className={`key-badge ${provider.apiKey ? 'ok' : ''}`}>
                    {provider.apiKey ? 'key' : 'no key'}
                  </span>
                </div>
                {models.map((model) => {
                  const selected = activeProviderId === provider.id && provider.model === model;
                  return (
                    <button
                      key={`${provider.id}:${model}`}
                      type="button"
                      className={`model-row ${selected ? 'selected' : ''}`}
                      onClick={() => {
                        setActiveProviderId(provider.id);
                        setProviderModel(provider.id, model);
                        setOpen(false);
                      }}
                    >
                      <span className="model-row-name">{model}</span>
                      {selected && <Check size={13} />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="model-footer">
            <button
              type="button"
              className="btn btn-sm"
              disabled={!activeProvider || detecting !== null}
              onClick={() => activeProvider && void detect(activeProvider)}
            >
              {detecting && detecting === activeProvider?.id ? (
                <Loader2 size={12} className="spin" />
              ) : (
                <RefreshCw size={12} />
              )}
              Detect models
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                setOpen(false);
                setSettingsOpen(true);
              }}
            >
              <Settings2 size={12} />
              Manage
            </button>
          </div>
          {error && <div className="model-error">{error}</div>}
        </div>
      )}
    </div>
  );
}
