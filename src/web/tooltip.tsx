import { ReactElement, Ref, cloneElement } from 'react';
import { Popup, PopupPlacement, usePopupTrigger } from './popup';

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
  const popup = usePopupTrigger();

  const changedProps: ChildProps = { ref: popup.triggerRef };
  if (provideLabel) {
    changedProps['aria-label'] = text;
  }

  const childWithRef = cloneElement(children, changedProps);

  return <>
    {childWithRef}
    <Popup
      {...popup}
      open={open ?? popup.open}
      placement={placement}
    >
      <div className='popup_tooltip'>
        {text}
      </div>
    </Popup>
  </>;
};
