import { useState } from 'react';
import { X, Plus, Trash2, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { AppSettings, AIProvider } from '../context';

interface SettingsModalProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  onClose: () => void;
}

const PRESET_TEMPLATES: Omit<AIProvider, 'apiKey'>[] = [
  { id: '', name: 'Claude (Anthropic)', baseUrl: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-20250514', icon: 'A', color: '#d97706', format: 'anthropic', headers: { 'anthropic-version': '2023-06-01' } },
  { id: '', name: 'OpenAI (GPT-4o)', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o', icon: 'O', color: '#10b981', format: 'openai' },
  { id: '', name: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-2.0-flash', icon: 'G', color: '#3b82f6', format: 'gemini' },
  { id: '', name: 'Meta Llama (Together)', baseUrl: 'https://api.together.xyz/v1', model: 'meta-llama/Llama-3.3-70B-Instruct', icon: 'L', color: '#8b5cf6', format: 'openai' },
  { id: '', name: 'OpenRouter (Any)', baseUrl: 'https://openrouter.ai/api/v1', model: 'anthropic/claude-sonnet-4-20250514', icon: 'R', color: '#06b6d4', format: 'openai', headers: { 'HTTP-Referer': window.location.origin, 'X-Title': 'MetaCode IDE' } },
  { id: '', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat', icon: 'D', color: '#0ea5e9', format: 'openai' },
  { id: '', name: 'Mistral AI', baseUrl: 'https://api.mistral.ai/v1', model: 'mistral-large-latest', icon: 'M', color: '#f97316', format: 'openai' },
  { id: '', name: 'Groq (Fast)', baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile', icon: 'Q', color: '#f59e0b', format: 'openai' },
  { id: '', name: 'Custom / Self-hosted', baseUrl: 'http://localhost:11434/v1', model: 'llama3', icon: 'C', color: '#6b7280', format: 'openai' },
];

export default function SettingsModal({ settings, setSettings, onClose }: SettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<AppSettings>(JSON.parse(JSON.stringify(settings)));
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [newProvider, setNewProvider] = useState<Omit<AIProvider, 'apiKey'>>(PRESET_TEMPLATES[0]);
  const [newApiKey, setNewApiKey] = useState('');

  const handleSave = () => {
    setSettings(localSettings);
    onClose();
  };

  const updateProvider = (id: string, updates: Partial<AIProvider>) => {
    setLocalSettings((prev) => ({
      ...prev,
      providers: prev.providers.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }));
  };

  const removeProvider = (id: string) => {
    setLocalSettings((prev) => ({
      ...prev,
      providers: prev.providers.filter((p) => p.id !== id),
      activeProviderId: prev.activeProviderId === id ? (prev.providers[0]?.id || '') : prev.activeProviderId,
    }));
  };

  const addProvider = () => {
    const id = `custom-${Date.now()}`;
    const provider: AIProvider = { ...newProvider, id, apiKey: newApiKey };
    setLocalSettings((prev) => ({
      ...prev,
      providers: [...prev.providers, provider],
      activeProviderId: prev.activeProviderId || id,
    }));
    setShowAddProvider(false);
    setNewApiKey('');
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-lg overflow-hidden animate-fade-in"
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4"
          style={{
            height: 'var(--topbar-h)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <span className="font-semibold" style={{ color: 'var(--text-strong)', fontSize: 'var(--text-sm)' }}>
            Settings
          </span>
          <button onClick={onClose} className="btn-icon">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Provider List */}
          {localSettings.providers.map((provider) => (
            <div
              key={provider.id}
              className="rounded"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                opacity: provider.apiKey ? 1 : 0.7,
              }}
            >
              {/* Provider Header */}
              <div
                className="flex items-center gap-3 p-3 cursor-pointer transition-colors"
                onClick={() => setExpandedProvider(expandedProvider === provider.id ? null : provider.id)}
                style={{ background: expandedProvider === provider.id ? 'var(--surface-hover)' : 'transparent' }}
              >
                <div
                  className="flex items-center justify-center font-bold text-white flex-shrink-0"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 'var(--radius)',
                    background: provider.color,
                    fontSize: 'var(--text-xs)',
                  }}
                >
                  {provider.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                      {provider.name}
                    </p>
                    <span
                      className="badge"
                      style={{
                        background: `${provider.color}20`,
                        color: provider.color,
                        border: `1px solid ${provider.color}40`,
                        fontSize: 'var(--text-xs)',
                      }}
                    >
                      {provider.format}
                    </span>
                  </div>
                  <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                    {provider.model}
                  </p>
                </div>
                <div
                  className="status-dot flex-shrink-0"
                  style={{ background: provider.apiKey ? 'var(--success)' : 'var(--error)' }}
                />
                {expandedProvider === provider.id ? (
                  <ChevronUp size={14} style={{ color: 'var(--muted)' }} />
                ) : (
                  <ChevronDown size={14} style={{ color: 'var(--muted)' }} />
                )}
              </div>

              {/* Expanded Settings */}
              {expandedProvider === provider.id && (
                <div className="p-3 pt-0 space-y-3 border-t animate-fade-in" style={{ borderColor: 'var(--border)' }}>
                  <div className="pt-3">
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
                      API Key
                    </label>
                    <input
                      type="password"
                      value={provider.apiKey}
                      onChange={(e) => updateProvider(provider.id, { apiKey: e.target.value })}
                      placeholder="Enter API key..."
                      className="input"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
                        Model
                      </label>
                      <input
                        type="text"
                        value={provider.model}
                        onChange={(e) => updateProvider(provider.id, { model: e.target.value })}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
                        Base URL
                      </label>
                      <input
                        type="text"
                        value={provider.baseUrl}
                        onChange={(e) => updateProvider(provider.id, { baseUrl: e.target.value })}
                        className="input"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setLocalSettings((prev) => ({ ...prev, activeProviderId: provider.id }))}
                      className={localSettings.activeProviderId === provider.id ? 'btn-primary' : 'btn'}
                    >
                      {localSettings.activeProviderId === provider.id ? 'Active' : 'Set Active'}
                    </button>
                    <button
                      onClick={() => removeProvider(provider.id)}
                      className="btn"
                      style={{ color: 'var(--error)', borderColor: 'var(--error)' }}
                    >
                      <Trash2 size={14} />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add Provider */}
          {showAddProvider ? (
            <div
              className="rounded p-4 space-y-3 animate-fade-in"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--accent)',
              }}
            >
              <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--accent)' }}>
                <Plus size={14} /> Add New Provider
              </h3>

              {/* Template Selector */}
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--muted)' }}>
                  Quick Template
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_TEMPLATES.map((template, i) => (
                    <button
                      key={i}
                      onClick={() => setNewProvider(template)}
                      className={`flex items-center gap-2 p-2 rounded text-left text-xs transition-colors ${
                        newProvider.name === template.name ? 'btn-primary' : 'btn'
                      }`}
                    >
                      <div
                        className="flex items-center justify-center font-bold text-white flex-shrink-0"
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 'var(--radius-sm)',
                          background: template.color,
                          fontSize: 'var(--text-xs)',
                        }}
                      >
                        {template.icon}
                      </div>
                      <span className="truncate font-medium">{template.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
                    Name
                  </label>
                  <input
                    type="text"
                    value={newProvider.name}
                    onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
                    Format
                  </label>
                  <select
                    value={newProvider.format}
                    onChange={(e) => setNewProvider({ ...newProvider, format: e.target.value as any })}
                    className="input"
                  >
                    <option value="openai">OpenAI Compatible</option>
                    <option value="anthropic">Anthropic (Claude)</option>
                    <option value="gemini">Google Gemini</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
                  Base URL
                </label>
                <input
                  type="text"
                  value={newProvider.baseUrl}
                  onChange={(e) => setNewProvider({ ...newProvider, baseUrl: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
                  Model
                </label>
                <input
                  type="text"
                  value={newProvider.model}
                  onChange={(e) => setNewProvider({ ...newProvider, model: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
                  API Key
                </label>
                <input
                  type="password"
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  placeholder="Enter API key..."
                  className="input"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowAddProvider(false)} className="btn">
                  Cancel
                </button>
                <button onClick={addProvider} className="btn-primary">
                  Add Provider
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddProvider(true)}
              className="w-full rounded p-3 flex items-center justify-center gap-2 transition-colors"
              style={{
                border: '2px dashed var(--border)',
                color: 'var(--muted)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.color = 'var(--accent)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.color = 'var(--muted)';
              }}
            >
              <Plus size={16} />
              <span className="text-sm font-medium">Add AI Provider</span>
            </button>
          )}

          {/* GitHub Token */}
          <div className="border-t pt-4 mt-4" style={{ borderColor: 'var(--border)' }}>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>
              GitHub Token
            </label>
            <input
              type="password"
              value={localSettings.githubToken}
              onChange={(e) => setLocalSettings({ ...localSettings, githubToken: e.target.value })}
              placeholder="ghp_..."
              className="input"
            />
            <p className="text-xs mt-2 flex items-center gap-1" style={{ color: 'var(--muted)' }}>
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1"
                style={{ color: 'var(--accent)' }}
              >
                Create token <ExternalLink size={10} />
              </a>
              <span>(needs repo scope)</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex justify-end gap-2 px-4"
          style={{
            height: 'var(--topbar-h)',
            borderTop: '1px solid var(--border)',
          }}
        >
          <button onClick={onClose} className="btn">
            Cancel
          </button>
          <button onClick={handleSave} className="btn-primary">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
