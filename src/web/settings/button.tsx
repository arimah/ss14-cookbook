import { ReactElement, useState } from 'react';
import { SettingsIcon } from '../icons';
import { Tooltip } from '../tooltip';
import { SettingsDialog } from './dialog';

export const SettingsButton = (): ReactElement => {
  const [open, setOpen] = useState(false);

  return (
    <div className='tabs_settings'>
      <Tooltip text='Preferences' placement='below' provideLabel>
        <button aria-pressed={open} onClick={() => setOpen(true)}>
          <SettingsIcon/>
        </button>
      </Tooltip>
      {open && <SettingsDialog onClose={() => setOpen(false)}/>}
    </div>
  );
};
