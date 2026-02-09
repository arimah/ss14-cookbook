import { ReactElement, Ref, cloneElement } from 'react';
import { createPortal } from 'react-dom';
import { PopupPlacement, getPopupRoot, usePopupTrigger } from './popup-impl';

export interface Props {
  text: string;
  placement?: PopupPlacement;
  provideLabel?: boolean;
  open?: boolean;
  children: ReactElement<ChildProps>;
}

interface ChildProps {
  'aria-label'?: string;
  ref?: Ref<HTMLElement>;
}

export const Tooltip = ({
  text,
  placement = 'above',
  provideLabel = false,
  children,
  open,
}: Props): ReactElement => {
  const { visible, popupRef, parentRef } = usePopupTrigger<HTMLDivElement>(
    placement,
    text,
    { open }
  );

  const changedProps: ChildProps = { ref: parentRef };
  if (provideLabel) {
    changedProps['aria-label'] = text;
  }

  const childWithRef = cloneElement(children, changedProps);

  return <>
    {childWithRef}
    {visible && createPortal(
      <div className='popup popup--tooltip' ref={popupRef}>
        {text}
      </div>,
      getPopupRoot()
    )}
  </>;
};
