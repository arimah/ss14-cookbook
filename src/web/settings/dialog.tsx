import {ChangeEvent, KeyboardEvent, useCallback, useId} from 'react';

import {FocusTrap} from '../focus';

import {TemperatureUnitSetting, ThemeSetting, useSettings} from './context';

export interface SettingsDialogProps {
  onClose: () => void;
}

export const SettingsDialog = (props: SettingsDialogProps): JSX.Element => {
  const {onClose} = props;

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

  const handleChangeTheme = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      update(draft => {
        draft.theme = e.target.value as ThemeSetting;
      });
    }
  }, [update]);

  const handleChangeTemperatureUnit = useCallback((
    e: ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.checked) {
      update(draft => {
        draft.temperatureUnit = e.target.value as TemperatureUnitSetting;
      });
    }
  }, [update]);

  const id = useId();

  return (
    <FocusTrap onPointerDownOutside={onClose}>
      <div className='settings' tabIndex={-1} onKeyDown={handleKeyDown}>
        <div className='settings_name'>
          Colour scheme:
        </div>
        <div className='settings_value'>
          <label className='settings_option'>
            <input
              type='radio'
              name={`${id}-theme`}
              value='dark'
              checked={settings.theme === 'dark'}
              onChange={handleChangeTheme}
            />
            Dark theme
          </label>
          <label className='settings_option'>
            <input
              type='radio'
              name={`${id}-theme`}
              value='light'
              checked={settings.theme === 'light'}
              onChange={handleChangeTheme}
            />
            Light theme
          </label>
        </div>

        <div className='settings_name'>
          Temperature unit:
        </div>
        <div className='settings_value'>
          <label className='settings_option'>
            <input
              type='radio'
              name={`${id}-temperatureUnit`}
              value='kelvin'
              checked={settings.temperatureUnit === 'kelvin'}
              onChange={handleChangeTemperatureUnit}
            />
            Kelvin (K)
          </label>
          <label className='settings_option'>
            <input
              type='radio'
              name={`${id}-temperatureUnit`}
              value='celsius'
              checked={settings.temperatureUnit === 'celsius'}
              onChange={handleChangeTemperatureUnit}
            />
            Celsius (°C)
          </label>
          <label className='settings_option'>
            <input
              type='radio'
              name={`${id}-temperatureUnit`}
              value='fahrenheit'
              checked={settings.temperatureUnit === 'fahrenheit'}
              onChange={handleChangeTemperatureUnit}
            />
            Fahrenheit (°F)
          </label>
        </div>
      </div>
    </FocusTrap>
  );
};
