import { createContext, useContext } from 'react';

export interface AppSettings {
  metaApiKey: string;
  githubToken: string;
  model: string;
}

export const AppContext = createContext<{
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}>({
  settings: { metaApiKey: '', githubToken: '', model: 'llama-3.1-70b' },
  setSettings: () => {},
});

export const useAppContext = () => useContext(AppContext);
