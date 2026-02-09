import { KeyboardEvent, ReactElement, useCallback } from 'react';
import { FocusTrap } from '../focus';
import { TemperatureUnitSetting, ThemeSetting, useSettings } from './context';
import { Option, OptionGroup } from './option-group';

export interface SettingsDialogProps {
  onClose: () => void;
}

export const SettingsDialog = ({
  onClose,
}: SettingsDialogProps): ReactElement => {
  const [settings, update] = useSettings();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (
      e.key === 'Escape' &&
      !e.shiftKey &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey
    ) {
      onClose();
    }
  }, [onClose]);

  const handleChangeTheme = useCallback((value: ThemeSetting) => {
    update(draft => {
      draft.theme = value;
    });
  }, [update]);

  const handleChangeTemperatureUnit = useCallback((
    value: TemperatureUnitSetting
  ) => {
    update(draft => {
      draft.temperatureUnit = value;
    });
  }, [update]);

  return (
    <FocusTrap onPointerDownOutside={onClose}>
      <div className='settings' tabIndex={-1} onKeyDown={handleKeyDown}>
        <div className='settings_name'>
          Colour scheme:
        </div>
        <OptionGroup
          options={ThemeOptions}
          value={settings.theme}
          onChange={handleChangeTheme}
        />

        <div className='settings_name'>
          Temperature unit:
        </div>
        <OptionGroup
          options={TemperatureUnitOptions}
          value={settings.temperatureUnit}
          onChange={handleChangeTemperatureUnit}
        />
      </div>
    </FocusTrap>
  );
};

const ThemeOptions: readonly Option<ThemeSetting>[] = [
  {
    name: 'Dark theme',
    value: 'dark',
  },
  {
    name: 'Light theme',
    value: 'light',
  },
];

const TemperatureUnitOptions: readonly Option<TemperatureUnitSetting>[] = [
  {
    name: 'Kelvin (K)',
    value: 'kelvin',
  },
  {
    name: 'Celsius (°C)',
    value: 'celsius',
  },
  {
    name: 'Fahrenheit (°F)',
    value: 'fahrenheit',
  },
];
