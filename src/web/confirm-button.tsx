import {
  ButtonHTMLAttributes,
  CSSProperties,
  KeyboardEvent,
  PointerEvent,
  ReactElement,
  useCallback,
  useEffect,
  useState
} from 'react';
import { Popup, usePopupTrigger } from './popup';

export type Props = {
  timeout?: number;
  tooltip?: string;
  usageHint?: string;
  onClick: () => void;
} & Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  | 'title'
  | 'onClick'
  | 'onPointerDown'
  | 'onPointerUp'
  | 'onMouseOut'
  | 'onKeyDown'
  | 'onKeyUp'
  | 'onBlur'
>;

type State = 'up' | 'held' | 'ready';

const DefaultTimeout = 750; // ms
const DefaultUsageHint = 'Kliknij i przytrzymaj, aby potwierdzić';
const ReleaseHint = 'Zwolnij, aby potwierdzić';

export const ConfirmButton = ({
  className,
  style,
  timeout = DefaultTimeout,
  tooltip = '',
  usageHint = DefaultUsageHint,
  onClick,
  children,
  ...rest
}: Props): ReactElement => {
  const [state, setState] = useState<State>('up');

  const startHold = useCallback(() => {
    if (state !== 'up') {
      // Already holding.
      return;
    }
    setState('held');
  }, [state]);

  const endHold = useCallback(() => {
    if (state === 'up') {
      // Not holding.
      return;
    }
    setState('up');
    if (state === 'ready') {
      onClick();
    }
  }, [state, onClick]);

  const cancelHold = useCallback(() => {
    setState('up');
  }, []);

  const handlePointerDown = useCallback((e: PointerEvent) => {
    if (e.isPrimary) {
      startHold();
    }
  }, [startHold]);

  const handlePointerUp = useCallback((e: PointerEvent) => {
    if (e.isPrimary) {
      e.preventDefault();
      endHold();
    }
  }, [endHold]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      startHold();
    }
  }, [startHold]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      endHold();
    }
  }, [endHold]);

  const popup = usePopupTrigger<HTMLButtonElement>();

  useEffect(() => {
    if (state === 'held') {
      const id = setTimeout(() => setState('ready'), timeout);
      return () => clearTimeout(id);
    }
  }, [state]);

  let realClassName = state !== 'up' ? 'confirm confirm--held' : 'confirm';
  if (className) {
    realClassName = `${realClassName} ${className}`;
  }

  const tooltipText =
    state === 'held' ? usageHint :
    state === 'ready' ? ReleaseHint :
    tooltip;

  return <>
    <button
      {...rest}
      className={realClassName}
      style={{
        ...style,
        '--confirm-time': `${timeout}ms`,
      } as CSSProperties}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onMouseOut={cancelHold}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onBlur={cancelHold}
      ref={popup.triggerRef}
    >
      {children}
    </button>
    <Popup
      {...popup}
      open={popup.open && tooltipText !== ''}
    >
      <div className='popup_tooltip'>
        {tooltipText}
      </div>
    </Popup>
  </>;
};
