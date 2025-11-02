import {ReactElement, ReactNode, memo, useContext} from 'react';

import {Tooltip} from '../tooltip';
import {InformationIcon, WarningIcon, ErrorIcon, CloseIcon} from '../icons';

import {NoticesContext} from './context';

export interface Props {
  id?: string;
  kind?: 'info' | 'warning' | 'error';
  icon?: ReactNode;
  children: ReactNode;
}

const Icons = {
  info: <InformationIcon/>,
  warning: <WarningIcon/>,
  error: <ErrorIcon/>,
} as const;

export const Notice = memo((props: Props): ReactElement | null => {
  const {id, kind = 'info', icon, children} = props;

  const context = useContext(NoticesContext);
  if (id != null && context.isDismissed(id)) {
    return null;
  }

  return (
    <section className={`notice notice--${kind}`}>
      <span className='notice_icon'>{icon ?? Icons[kind]}</span>

      <div className='notice_content'>
        {children}
      </div>

      {id != null && (
        <Tooltip provideLabel text='Dismiss' placement='left'>
          <button
            className='notice_dismiss'
            onClick={() => context.dismiss(id)}
          >
            <CloseIcon/>
          </button>
        </Tooltip>
      )}
    </section>
  );
});
