import { createContext, useContext } from 'react';

export interface AIProvider {
  id: string;
  name: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  icon: string;
  color: string;
  // Format: 'openai' means {messages, model} body, 'anthropic' means {messages, model, system, max_tokens}, 'gemini' means Google format
  format: 'openai' | 'anthropic' | 'gemini' | 'custom';
  // Custom headers if needed
  headers?: Record<string, string>;
}

export interface AppSettings {
  providers: AIProvider[];
  activeProviderId: string;
  githubToken: string;
}

export const DEFAULT_PROVIDERS: AIProvider[] = [
  {
    id: 'anthropic',
    name: 'Claude (Anthropic)',
    apiKey: '',
    baseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-sonnet-4-20250514',
    icon: '🟠',
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
    icon: '🟢',
    color: '#10b981',
    format: 'openai',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    apiKey: '',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-2.0-flash',
    icon: '🔵',
    color: '#3b82f6',
    format: 'gemini',
  },
  {
    id: 'meta-together',
    name: 'Meta Llama (Together)',
    apiKey: '',
    baseUrl: 'https://api.together.xyz/v1',
    model: 'meta-llama/Llama-3.3-70B-Instruct',
    icon: '🟣',
    color: '#8b5cf6',
    format: 'openai',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter (Any Model)',
    apiKey: '',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'anthropic/claude-sonnet-4-20250514',
    icon: '🌐',
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
    icon: '🐋',
    color: '#0ea5e9',
    format: 'openai',
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    apiKey: '',
    baseUrl: 'https://api.mistral.ai/v1',
    model: 'mistral-large-latest',
    icon: '🌊',
    color: '#f97316',
    format: 'openai',
  },
];

export const AppContext = createContext<{
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}>({
  settings: { providers: DEFAULT_PROVIDERS, activeProviderId: 'anthropic', githubToken: '' },
  setSettings: () => {},
});

export const useAppContext = () => useContext(AppContext);
