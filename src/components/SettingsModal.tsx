import { useState } from 'react';
import { X, Key, ExternalLink, Plus, Trash2, ChevronDown, ChevronUp, Zap, Shield } from 'lucide-react';
import { AppSettings, AIProvider } from '../context';

interface SettingsModalProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  onClose: () => void;
}

const PRESET_TEMPLATES: Omit<AIProvider, 'apiKey'>[] = [
  { id: '', name: 'Claude (Anthropic)', baseUrl: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-20250514', icon: '🟠', color: '#d97706', format: 'anthropic', headers: { 'anthropic-version': '2023-06-01' } },
  { id: '', name: 'OpenAI (GPT-4o)', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o', icon: '🟢', color: '#10b981', format: 'openai' },
  { id: '', name: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-2.0-flash', icon: '🔵', color: '#3b82f6', format: 'gemini' },
  { id: '', name: 'Meta Llama (Together)', baseUrl: 'https://api.together.xyz/v1', model: 'meta-llama/Llama-3.3-70B-Instruct', icon: '🟣', color: '#8b5cf6', format: 'openai' },
  { id: '', name: 'OpenRouter (Any)', baseUrl: 'https://openrouter.ai/api/v1', model: 'anthropic/claude-sonnet-4-20250514', icon: '🌐', color: '#06b6d4', format: 'openai', headers: { 'HTTP-Referer': window.location.origin, 'X-Title': 'MetaCode IDE' } },
  { id: '', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat', icon: '🐋', color: '#0ea5e9', format: 'openai' },
  { id: '', name: 'Mistral AI', baseUrl: 'https://api.mistral.ai/v1', model: 'mistral-large-latest', icon: '🌊', color: '#f97316', format: 'openai' },
  { id: '', name: 'Groq (Fast)', baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile', icon: '⚡', color: '#f59e0b', format: 'openai' },
  { id: '', name: 'Custom / Self-hosted', baseUrl: 'http://localhost:11434/v1', model: 'llama3', icon: '🔧', color: '#6b7280', format: 'openai' },
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden shadow-glow-strong"
        style={{
          background: 'var(--bg-glass)',
          border: '1px solid var(--border-secondary)',
          backdropFilter: 'blur(30px) saturate(180%)',
          WebkitBackdropFilter: 'blur(30px) saturate(180%)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-7 border-b" style={{ borderColor: 'var(--border-primary)' }}>
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center gradient-bg shadow-glow"
            >
              <Zap size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Настройки
              </h2>
              <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                Управляй AI-провайдерами и подключениями
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: '1px solid var(--border-primary)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-7 space-y-4">
          {/* Provider List */}
          {localSettings.providers.map((provider) => (
            <div
              key={provider.id}
              className="rounded-2xl overflow-hidden transition-all duration-300"
              style={{
                background: 'var(--bg-tertiary)',
                border: `1px solid ${provider.apiKey ? 'var(--border-secondary)' : 'var(--border-primary)'}`,
                opacity: provider.apiKey ? 1 : 0.75,
              }}
            >
              {/* Provider Header */}
              <div
                className="flex items-center gap-4 p-5 cursor-pointer transition-all duration-200"
                onClick={() => setExpandedProvider(expandedProvider === provider.id ? null : provider.id)}
                style={{ background: expandedProvider === provider.id ? 'var(--bg-hover)' : 'transparent' }}
              >
                <span className="text-3xl">{provider.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {provider.name}
                    </p>
                    <span
                      className="badge"
                      style={{
                        background: `${provider.color}20`,
                        color: provider.color,
                        border: `1px solid ${provider.color}30`,
                      }}
                    >
                      {provider.format}
                    </span>
                  </div>
                  <p className="text-xs mt-1 font-medium" style={{ color: 'var(--text-muted)' }}>
                    {provider.model}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div
                    className="w-3 h-3 rounded-full shadow-glow"
                    style={{ background: provider.apiKey ? 'var(--success)' : 'var(--error)' }}
                  />
                  {expandedProvider === provider.id ? (
                    <ChevronUp size={18} style={{ color: 'var(--text-muted)' }} />
                  ) : (
                    <ChevronDown size={18} style={{ color: 'var(--text-muted)' }} />
                  )}
                </div>
              </div>

              {/* Expanded Settings */}
              {expandedProvider === provider.id && (
                <div className="p-5 pt-0 space-y-5 border-t animate-fade-in" style={{ borderColor: 'var(--border-primary)' }}>
                  <div className="pt-5">
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2.5" style={{ color: 'var(--text-muted)' }}>
                      API Key
                    </label>
                    <input
                      type="password"
                      value={provider.apiKey}
                      onChange={(e) => updateProvider(provider.id, { apiKey: e.target.value })}
                      placeholder="Enter API key..."
                      className="input-field"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-2.5" style={{ color: 'var(--text-muted)' }}>
                        Model
                      </label>
                      <input
                        type="text"
                        value={provider.model}
                        onChange={(e) => updateProvider(provider.id, { model: e.target.value })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-2.5" style={{ color: 'var(--text-muted)' }}>
                        Base URL
                      </label>
                      <input
                        type="text"
                        value={provider.baseUrl}
                        onChange={(e) => updateProvider(provider.id, { baseUrl: e.target.value })}
                        className="input-field"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3">
                    <button
                      onClick={() => setLocalSettings((prev) => ({ ...prev, activeProviderId: provider.id }))}
                      className={`text-sm px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 ${
                        localSettings.activeProviderId === provider.id ? 'btn-primary' : 'btn-secondary'
                      }`}
                    >
                      {localSettings.activeProviderId === provider.id ? '✓ Active' : 'Set Active'}
                    </button>
                    <button
                      onClick={() => removeProvider(provider.id)}
                      className="text-sm flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all duration-300 hover:scale-105"
                      style={{ color: 'var(--error)', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add Provider */}
          {showAddProvider ? (
            <div
              className="rounded-2xl p-6 space-y-5 animate-scale-in shadow-glow"
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-accent)',
              }}
            >
              <h3 className="text-base font-bold flex items-center gap-2.5" style={{ color: 'var(--text-accent)' }}>
                <Plus size={18} /> Add New Provider
              </h3>

              {/* Template Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                  Quick Template
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {PRESET_TEMPLATES.map((template, i) => (
                    <button
                      key={i}
                      onClick={() => setNewProvider(template)}
                      className={`flex items-center gap-3 p-4 rounded-xl text-left text-sm transition-all duration-300 hover:scale-[1.02] ${
                        newProvider.name === template.name ? 'btn-primary' : 'btn-secondary'
                      }`}
                    >
                      <span className="text-xl">{template.icon}</span>
                      <span className="truncate font-semibold">{template.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2.5" style={{ color: 'var(--text-muted)' }}>
                    Name
                  </label>
                  <input
                    type="text"
                    value={newProvider.name}
                    onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2.5" style={{ color: 'var(--text-muted)' }}>
                    Format
                  </label>
                  <select
                    value={newProvider.format}
                    onChange={(e) => setNewProvider({ ...newProvider, format: e.target.value as any })}
                    className="input-field"
                  >
                    <option value="openai">OpenAI Compatible</option>
                    <option value="anthropic">Anthropic (Claude)</option>
                    <option value="gemini">Google Gemini</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2.5" style={{ color: 'var(--text-muted)' }}>
                  Base URL
                </label>
                <input
                  type="text"
                  value={newProvider.baseUrl}
                  onChange={(e) => setNewProvider({ ...newProvider, baseUrl: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2.5" style={{ color: 'var(--text-muted)' }}>
                  Model
                </label>
                <input
                  type="text"
                  value={newProvider.model}
                  onChange={(e) => setNewProvider({ ...newProvider, model: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2.5" style={{ color: 'var(--text-muted)' }}>
                  API Key
                </label>
                <input
                  type="password"
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  placeholder="Enter API key..."
                  className="input-field"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button onClick={() => setShowAddProvider(false)} className="btn-secondary">
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
              className="w-full border-2 border-dashed rounded-2xl p-6 transition-all duration-300 hover:scale-[1.01] flex items-center justify-center gap-3 group"
              style={{
                borderColor: 'var(--border-secondary)',
                color: 'var(--text-muted)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-primary)';
                e.currentTarget.style.color = 'var(--text-accent)';
                e.currentTarget.style.boxShadow = 'var(--accent-glow)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-secondary)';
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" /> 
              <span className="font-semibold">Add AI Provider</span>
            </button>
          )}

          {/* GitHub Token */}
          <div className="border-t pt-6 mt-6" style={{ borderColor: 'var(--border-primary)' }}>
            <label className="block text-base font-bold mb-3 flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
              <Shield size={18} style={{ color: 'var(--success)' }} />
              GitHub Token
            </label>
            <input
              type="password"
              value={localSettings.githubToken}
              onChange={(e) => setLocalSettings({ ...localSettings, githubToken: e.target.value })}
              placeholder="ghp_..."
              className="input-field"
            />
            <p className="text-sm mt-3 flex items-center gap-2 font-medium" style={{ color: 'var(--text-muted)' }}>
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:underline"
                style={{ color: 'var(--success)' }}
              >
                Create token <ExternalLink size={12} />
              </a>
              <span>(needs repo scope)</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-7 border-t" style={{ borderColor: 'var(--border-primary)' }}>
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button onClick={handleSave} className="btn-primary">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
