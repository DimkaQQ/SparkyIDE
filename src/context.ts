import { createContext, useContext } from 'react';

export interface AIProvider {
  id: string;
  name: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  icon: string;
  color: string;
  format: 'openai' | 'anthropic' | 'gemini' | 'custom';
  headers?: Record<string, string>;
}

export interface AppSettings {
  providers: AIProvider[];
  activeProviderId: string;
  githubToken: string;
}

export const DEFAULT_PROVIDERS: AIProvider[] = [
  {
    id: 'meta-muse',
    name: 'Meta Muse',
    apiKey: '',
    baseUrl: 'https://api.meta.ai/v1',
    model: 'muse-spark-1.3',
    icon: 'M',
    color: '#0668E8',
    format: 'openai',
  },
  {
    id: 'anthropic',
    name: 'Claude (Anthropic)',
    apiKey: '',
    baseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-sonnet-4-20250514',
    icon: 'A',
    color: '#d97706',
    format: 'anthropic',
    headers: { 'anthropic-version': '2023-06-01' },
  },
  {
    id: 'openai',
    name: 'OpenAI (GPT)',
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    icon: 'O',
    color: '#10b981',
    format: 'openai',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    apiKey: '',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-2.0-flash',
    icon: 'G',
    color: '#3b82f6',
    format: 'gemini',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter (Any Model)',
    apiKey: '',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'anthropic/claude-sonnet-4-20250514',
    icon: 'R',
    color: '#06b6d4',
    format: 'openai',
    headers: { 'HTTP-Referer': window.location.origin, 'X-Title': 'MetaCode IDE' },
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    apiKey: '',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    icon: 'D',
    color: '#0ea5e9',
    format: 'openai',
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    apiKey: '',
    baseUrl: 'https://api.mistral.ai/v1',
    model: 'mistral-large-latest',
    icon: 'M',
    color: '#f97316',
    format: 'openai',
  },
];

export const AppContext = createContext<{
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}>({
  settings: { providers: DEFAULT_PROVIDERS, activeProviderId: 'meta-muse', githubToken: '' },
  setSettings: () => {},
});

export const useAppContext = () => useContext(AppContext);
