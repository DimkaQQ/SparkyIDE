import { useState } from 'react';
import { X, Key, ExternalLink, Plus, Trash2, ChevronDown, ChevronUp, Globe, Zap } from 'lucide-react';
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
  { id: '', name: 'Cohere', baseUrl: 'https://api.cohere.ai/v1', model: 'command-r-plus', icon: '🔶', color: '#ef4444', format: 'openai' },
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1e1e2e] border border-[#313244] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#313244]">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Zap size={20} className="text-purple-400" />
              AI Providers
            </h2>
            <p className="text-xs text-gray-500 mt-1">Добавь API ключи для любого AI-сервиса</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#313244] flex items-center justify-center text-gray-400 hover:text-white transition-colors"
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
              className={`border rounded-xl overflow-hidden transition-all ${
                provider.apiKey ? 'border-[#45475a]' : 'border-[#313244] opacity-70'
              }`}
            >
              {/* Provider Header */}
              <div
                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-[#313244]/50 transition-colors"
                onClick={() => setExpandedProvider(expandedProvider === provider.id ? null : provider.id)}
              >
                <span className="text-xl">{provider.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white">{provider.name}</p>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                      style={{ backgroundColor: `${provider.color}20`, color: provider.color }}
                    >
                      {provider.format}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{provider.model}</p>
                </div>
                <div className="flex items-center gap-2">
                  {provider.apiKey ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                  )}
                  {expandedProvider === provider.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </div>
              </div>

              {/* Expanded Settings */}
              {expandedProvider === provider.id && (
                <div className="p-3 pt-0 space-y-3 border-t border-[#313244]">
                  <div className="pt-3">
                    <label className="block text-xs font-medium text-gray-400 mb-1">API Key</label>
                    <input
                      type="password"
                      value={provider.apiKey}
                      onChange={(e) => updateProvider(provider.id, { apiKey: e.target.value })}
                      placeholder="Enter API key..."
                      className="w-full bg-[#313244] text-white text-sm px-3 py-2 rounded-lg border border-[#45475a] focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Model</label>
                      <input
                        type="text"
                        value={provider.model}
                        onChange={(e) => updateProvider(provider.id, { model: e.target.value })}
                        className="w-full bg-[#313244] text-white text-sm px-3 py-2 rounded-lg border border-[#45475a] focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Base URL</label>
                      <input
                        type="text"
                        value={provider.baseUrl}
                        onChange={(e) => updateProvider(provider.id, { baseUrl: e.target.value })}
                        className="w-full bg-[#313244] text-white text-sm px-3 py-2 rounded-lg border border-[#45475a] focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => {
                        setLocalSettings((prev) => ({ ...prev, activeProviderId: provider.id }));
                      }}
                      className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                        localSettings.activeProviderId === provider.id
                          ? 'bg-purple-600 text-white'
                          : 'bg-[#313244] text-gray-400 hover:text-white'
                      }`}
                    >
                      {localSettings.activeProviderId === provider.id ? '✓ Active' : 'Set Active'}
                    </button>
                    <button
                      onClick={() => removeProvider(provider.id)}
                      className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
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
            <div className="border border-purple-500/30 bg-purple-500/5 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-medium text-purple-300 flex items-center gap-2">
                <Plus size={16} /> Add New Provider
              </h3>

              {/* Template Selector */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Quick Template</label>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_TEMPLATES.map((template, i) => (
                    <button
                      key={i}
                      onClick={() => setNewProvider(template)}
                      className={`flex items-center gap-2 p-2 rounded-lg text-left text-xs transition-colors ${
                        newProvider.name === template.name
                          ? 'bg-purple-600/20 border border-purple-500/50 text-purple-300'
                          : 'bg-[#313244] text-gray-300 hover:bg-[#45475a]'
                      }`}
                    >
                      <span>{template.icon}</span>
                      <span className="truncate">{template.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Name</label>
                  <input
                    type="text"
                    value={newProvider.name}
                    onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
                    className="w-full bg-[#313244] text-white text-sm px-3 py-2 rounded-lg border border-[#45475a] focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Format</label>
                  <select
                    value={newProvider.format}
                    onChange={(e) => setNewProvider({ ...newProvider, format: e.target.value as any })}
                    className="w-full bg-[#313244] text-white text-sm px-3 py-2 rounded-lg border border-[#45475a] focus:border-purple-500 focus:outline-none"
                  >
                    <option value="openai">OpenAI Compatible</option>
                    <option value="anthropic">Anthropic (Claude)</option>
                    <option value="gemini">Google Gemini</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Base URL</label>
                <input
                  type="text"
                  value={newProvider.baseUrl}
                  onChange={(e) => setNewProvider({ ...newProvider, baseUrl: e.target.value })}
                  className="w-full bg-[#313244] text-white text-sm px-3 py-2 rounded-lg border border-[#45475a] focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Model</label>
                <input
                  type="text"
                  value={newProvider.model}
                  onChange={(e) => setNewProvider({ ...newProvider, model: e.target.value })}
                  className="w-full bg-[#313244] text-white text-sm px-3 py-2 rounded-lg border border-[#45475a] focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">API Key</label>
                <input
                  type="password"
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  placeholder="Enter API key..."
                  className="w-full bg-[#313244] text-white text-sm px-3 py-2 rounded-lg border border-[#45475a] focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowAddProvider(false)}
                  className="text-sm text-gray-400 hover:text-white px-3 py-1.5"
                >
                  Cancel
                </button>
                <button
                  onClick={addProvider}
                  className="text-sm bg-purple-600 text-white px-4 py-1.5 rounded-lg hover:bg-purple-700"
                >
                  Add Provider
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddProvider(true)}
              className="w-full border-2 border-dashed border-[#45475a] rounded-xl p-4 text-gray-400 hover:text-purple-400 hover:border-purple-500/50 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={18} /> Add AI Provider
            </button>
          )}

          {/* GitHub Token */}
          <div className="border-t border-[#313244] pt-4 mt-4">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              <div className="flex items-center gap-2">
                <Key size={14} className="text-green-400" />
                GitHub Personal Access Token
              </div>
            </label>
            <input
              type="password"
              value={localSettings.githubToken}
              onChange={(e) => setLocalSettings({ ...localSettings, githubToken: e.target.value })}
              placeholder="ghp_..."
              className="w-full bg-[#313244] text-white text-sm px-4 py-2.5 rounded-lg border border-[#45475a] focus:border-green-500 focus:outline-none"
            />
            <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-400 hover:text-green-300 inline-flex items-center gap-0.5"
              >
                Create token <ExternalLink size={10} />
              </a>
              {' '}(needs repo scope)
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-[#313244]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
