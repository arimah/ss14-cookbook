import { produce, Producer } from 'immer';
import {
  createContext,
  ReactElement,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { SettingsKey, useStorage } from '../storage';

export interface Settings {
  readonly theme: ThemeSetting;
  readonly temperatureUnit: TemperatureUnitSetting;
}

export type ThemeSetting = 'dark' | 'light';

export type TemperatureUnitSetting =
  | 'kelvin'
  | 'celsius'
  | 'fahrenheit'
  ;

export type SettingsUpdater = (f: Producer<Settings>) => void;

export const DefaultSettings: Settings = {
  theme: 'dark',
  temperatureUnit: 'kelvin',
};

const SettingsContext = createContext<[Settings, SettingsUpdater]>([
  DefaultSettings,
  () => {},
]);

export interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider = ({
  children,
}: SettingsProviderProps): ReactElement => {
  const storage = useStorage<Settings>(SettingsKey);

  const [settings, setSettings] = useState(() => storage.read(DefaultSettings));

  const update = useCallback<SettingsUpdater>((updater: Producer<Settings>) => {
    setSettings(prev => {
      const next = produce(prev, updater);
      storage.write(next);
      return next;
    });
  }, [storage]);

  // TODO: This useEffect probably shouldn't be here.
  // Move it to `<App>` or something?
  // Note: have to use DefaultSettings.theme because it's part of the HTML.
  const prevTheme = useRef(DefaultSettings.theme);
  useEffect(() => {
    if (settings.theme !== prevTheme.current) {
      const html = document.documentElement;
      html.classList.remove(`theme-${prevTheme.current}`);
      html.classList.add(`theme-${settings.theme}`);
      prevTheme.current = settings.theme;
    }
  }, [settings.theme]);

  return (
    <SettingsContext.Provider value={[settings, update]}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): [Settings, SettingsUpdater] =>
  useContext(SettingsContext);
