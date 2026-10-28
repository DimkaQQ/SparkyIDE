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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border-primary)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--accent-gradient)' }}
            >
              <Zap size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                Настройки
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Управляй AI-провайдерами и подключениями
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {/* Provider List */}
          {localSettings.providers.map((provider) => (
            <div
              key={provider.id}
              className="rounded-xl overflow-hidden transition-all duration-200"
              style={{
                background: 'var(--bg-tertiary)',
                border: `1px solid ${provider.apiKey ? 'var(--border-primary)' : 'var(--border-primary)'}`,
                opacity: provider.apiKey ? 1 : 0.7,
              }}
            >
              {/* Provider Header */}
              <div
                className="flex items-center gap-3 p-4 cursor-pointer transition-all duration-200"
                onClick={() => setExpandedProvider(expandedProvider === provider.id ? null : provider.id)}
                style={{ background: expandedProvider === provider.id ? 'var(--bg-hover)' : 'transparent' }}
              >
                <span className="text-2xl">{provider.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {provider.name}
                    </p>
                    <span
                      className="badge"
                      style={{
                        background: `${provider.color}20`,
                        color: provider.color,
                      }}
                    >
                      {provider.format}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {provider.model}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: provider.apiKey ? 'var(--success)' : 'var(--error)' }}
                  />
                  {expandedProvider === provider.id ? (
                    <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} />
                  ) : (
                    <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />
                  )}
                </div>
              </div>

              {/* Expanded Settings */}
              {expandedProvider === provider.id && (
                <div className="p-4 pt-0 space-y-4 border-t animate-fade-in" style={{ borderColor: 'var(--border-primary)' }}>
                  <div className="pt-4">
                    <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
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
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
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
                      <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
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
                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => setLocalSettings((prev) => ({ ...prev, activeProviderId: provider.id }))}
                      className={`text-xs px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                        localSettings.activeProviderId === provider.id ? 'btn-primary' : 'btn-secondary'
                      }`}
                    >
                      {localSettings.activeProviderId === provider.id ? '✓ Active' : 'Set Active'}
                    </button>
                    <button
                      onClick={() => removeProvider(provider.id)}
                      className="text-xs flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all duration-200 hover:scale-105"
                      style={{ color: 'var(--error)', background: 'rgba(239, 68, 68, 0.1)' }}
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add Provider */}
          {showAddProvider ? (
            <div
              className="rounded-xl p-5 space-y-4 animate-fade-in"
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--accent-primary)',
                boxShadow: 'var(--shadow-glow)',
              }}
            >
              <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-accent)' }}>
                <Plus size={16} /> Add New Provider
              </h3>

              {/* Template Selector */}
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                  Quick Template
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_TEMPLATES.map((template, i) => (
                    <button
                      key={i}
                      onClick={() => setNewProvider(template)}
                      className={`flex items-center gap-2 p-3 rounded-xl text-left text-xs transition-all duration-200 hover:scale-[1.02] ${
                        newProvider.name === template.name ? 'btn-primary' : 'btn-secondary'
                      }`}
                    >
                      <span className="text-base">{template.icon}</span>
                      <span className="truncate font-medium">{template.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
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
                  <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
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
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
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
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
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
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
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
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowAddProvider(false)} className="btn-secondary text-sm">
                  Cancel
                </button>
                <button onClick={addProvider} className="btn-primary text-sm">
                  Add Provider
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddProvider(true)}
              className="w-full border-2 border-dashed rounded-xl p-5 transition-all duration-200 hover:scale-[1.01] flex items-center justify-center gap-2"
              style={{
                borderColor: 'var(--border-secondary)',
                color: 'var(--text-muted)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-primary)';
                e.currentTarget.style.color = 'var(--text-accent)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-secondary)';
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
            >
              <Plus size={18} /> Add AI Provider
            </button>
          )}

          {/* GitHub Token */}
          <div className="border-t pt-5 mt-5" style={{ borderColor: 'var(--border-primary)' }}>
            <label className="block text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Shield size={16} style={{ color: 'var(--success)' }} />
              GitHub Token
            </label>
            <input
              type="password"
              value={localSettings.githubToken}
              onChange={(e) => setLocalSettings({ ...localSettings, githubToken: e.target.value })}
              placeholder="ghp_..."
              className="input-field"
            />
            <p className="text-xs mt-2 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:underline"
                style={{ color: 'var(--success)' }}
              >
                Create token <ExternalLink size={10} />
              </a>
              <span>(needs repo scope)</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t" style={{ borderColor: 'var(--border-primary)' }}>
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
