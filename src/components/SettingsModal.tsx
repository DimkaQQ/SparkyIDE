import { useState } from 'react';
import { X, Key, ExternalLink } from 'lucide-react';
import { AppSettings } from '../context';

interface SettingsModalProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  onClose: () => void;
}

export default function SettingsModal({ settings, setSettings, onClose }: SettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<AppSettings>({ ...settings });

  const handleSave = () => {
    setSettings(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#1e1e2e] border border-[#313244] rounded-2xl w-full max-w-lg p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#313244] flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-5">
          {/* Meta API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              <div className="flex items-center gap-2">
                <Key size={14} className="text-purple-400" />
                Meta / Together AI API Key
              </div>
            </label>
            <input
              type="password"
              value={localSettings.metaApiKey}
              onChange={(e) => setLocalSettings({ ...localSettings, metaApiKey: e.target.value })}
              placeholder="Enter your API key..."
              className="w-full bg-[#313244] text-white text-sm px-4 py-2.5 rounded-lg border border-[#45475a] focus:border-purple-500 focus:outline-none"
            />
            <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
              Get your key at{' '}
              <a
                href="https://api.together.xyz/settings/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 inline-flex items-center gap-0.5"
              >
                together.xyz <ExternalLink size={10} />
              </a>
              {' '}(supports Meta Llama models)
            </p>
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Model
            </label>
            <select
              value={localSettings.model}
              onChange={(e) => setLocalSettings({ ...localSettings, model: e.target.value })}
              className="w-full bg-[#313244] text-white text-sm px-4 py-2.5 rounded-lg border border-[#45475a] focus:border-purple-500 focus:outline-none"
            >
              <option value="Llama-3.3-70B-Instruct">Llama 3.3 70B Instruct</option>
              <option value="Llama-3.1-70B-Instruct">Llama 3.1 70B Instruct</option>
              <option value="Llama-3.1-405B-Instruct">Llama 3.1 405B Instruct</option>
              <option value="Llama-3.1-8B-Instruct">Llama 3.1 8B Instruct</option>
              <option value="Llama-3-70b-chat-hf">Llama 3 70B Chat</option>
              <option value="Llama-3-8b-chat-hf">Llama 3 8B Chat</option>
              <option value="llama-3.1-70b">Llama 3.1 70B (legacy)</option>
            </select>
          </div>

          {/* GitHub Token */}
          <div>
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
              Create token at{' '}
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-400 hover:text-green-300 inline-flex items-center gap-0.5"
              >
                github.com/settings/tokens <ExternalLink size={10} />
              </a>
              {' '}(needs repo scope)
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
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
