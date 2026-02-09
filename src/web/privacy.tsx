import {
  MouseEvent,
  ReactElement,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { FocusTrap } from './focus';
import { CloseIcon } from './icons';
import { Overlay } from './overlay';
import { getPopupRoot } from './popup-impl';
import { Tooltip } from './tooltip';

export const PrivacyPolicyLink = memo((): ReactElement => {
  const [open, setOpen] = useState(false);

  const handleClick = useCallback((e: MouseEvent) => {
    e.preventDefault();
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  return <>
    <a href='#' onClick={handleClick}>
      Privacy policy
    </a>
    {open && createPortal(
      <PrivacyPolicyDialog onClose={close}/>,
      getPopupRoot()
    )}
  </>;
});

interface PrivacyPolicyDialogProps {
  onClose: () => void;
}

const PrivacyPolicyDialog = memo(({
  onClose,
}: PrivacyPolicyDialogProps): ReactElement => {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    ref.current?.focus();
    document.body.classList.add('overlay-open');
    return () => {
      document.body.classList.remove('overlay-open');
    };
  }, []);

  return (
    <Overlay>
      <FocusTrap onPointerDownOutside={onClose}>
        <section className='dialog privacy' ref={ref} tabIndex={-1}>
          <h2>Privacy policy</h2>
          <div
            className='privacy_text thin-scroll'
            dangerouslySetInnerHTML={{__html: PRIVACY_POLICY_HTML}}
          />
          <Tooltip text='Close' placement='left' provideLabel>
            <button className='dialog_close' onClick={onClose}>
              <CloseIcon/>
            </button>
          </Tooltip>
        </section>
      </FocusTrap>
    </Overlay>
  );
});
