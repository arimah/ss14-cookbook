import {memo} from 'react';

import {Tooltip} from './tooltip';

export interface Props {
  k: number;
}

export const Temperature = memo((props: Props): JSX.Element => {
  const temps = convert(props.k);

  const tooltip =
    `${temps.c.toFixed(0)}\xA0°C / ` +
    `${temps.f.toFixed(0)}\xA0°F`;

  return (
    <Tooltip text={tooltip}>
      <span className='more-info'>{temps.k}&nbsp;K</span>
    </Tooltip>
  );
});

const convert = (k: number) => {
  const c = k - 273.15;
  const f = (9 * c / 5) + 32;
  return {k, c, f};
};
