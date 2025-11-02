import {
  ButtonHTMLAttributes,
  CSSProperties,
  KeyboardEvent,
  PointerEvent,
  ReactElement,
  Ref,
  useCallback,
  useEffect,
  useState,
} from 'react';
import {createPortal} from 'react-dom';

import {getPopupRoot, usePopupTrigger} from './popup-impl';

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
const DefaultUsageHint = 'Press and hold to confirm';
const ReleaseHint = 'Release to confirm';

export const ConfirmButton = (props: Props): ReactElement => {
  const {
    className,
    style,
    timeout = DefaultTimeout,
    tooltip = '',
    usageHint = DefaultUsageHint,
    onClick,
    children,
    ...rest
  } = props;

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

  const tooltipText =
    state === 'held' ? usageHint :
    state === 'ready' ? ReleaseHint :
    tooltip;
  const {
    visible: tooltipVisible,
    popupRef,
    parentRef,
  } = usePopupTrigger<HTMLDivElement>(
    'above',
    tooltipText
  );

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
      ref={parentRef as Ref<HTMLButtonElement>}
    >
      {children}
    </button>

    {tooltipVisible && tooltipText != '' && createPortal(
      <div className='popup popup--tooltip' ref={popupRef}>
        {tooltipText}
      </div>,
      getPopupRoot()
    )}
  </>;
};
