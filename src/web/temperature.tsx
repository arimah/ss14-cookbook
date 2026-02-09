import { ReactElement, memo } from 'react';
import { useSettings } from './settings';
import { Tooltip } from './tooltip';

export interface Props {
  k: number;
}

interface Temps {
  kelvin: string;
  celsius: string;
  fahrenheit: string;
}

export const Temperature = memo(({ k }: Props): ReactElement => {
  const [settings] = useSettings();

  const temps = format(k);

  let tooltip: string;
  switch (settings.temperatureUnit) {
    case 'celsius':
      tooltip = `${temps.kelvin} / ${temps.fahrenheit}`;
      break;
    case 'fahrenheit':
      tooltip = `${temps.kelvin} / ${temps.celsius}`;
      break;
    default:
      tooltip = `${temps.celsius} / ${temps.fahrenheit}`;
      break;
  }

  return (
    <Tooltip text={tooltip}>
      <span className='more-info'>
        {temps[settings.temperatureUnit]}
      </span>
    </Tooltip>
  );
});

const format = (k: number): Temps => {
  const c = k - 273.15;
  const f = (9 * c / 5) + 32;
  return {
    // U+00A0 = No-Break Space
    kelvin: `${k.toFixed(0)}\xA0K`,
    celsius: `${c.toFixed(0)}\xA0°C`,
    fahrenheit: `${f.toFixed(0)}\xA0°F`,
  };
};
