import {MouseEvent, memo, useCallback, useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

import {getPopupRoot} from './popup-impl';
import {FocusTrap} from './focus';
import {Overlay} from './overlay';
import {Tooltip} from './tooltip';
import {CloseIcon} from './icons';

export const PrivacyPolicyLink = memo((): JSX.Element => {
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

const PrivacyPolicyDialog = memo((props: PrivacyPolicyDialogProps): JSX.Element => {
  const {onClose} = props;

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

          <div className='privacy_text thin-scroll'>
            <p>I don’t collect your personal information, don’t want it and will never ask for it. This web app has no tracking or telemetry of any kind.</p>
            <p>Anything you save through the web app (favourite recipes, menus, filters, etc.) is stored on your device and is not transferred anywhere else at any point. It is not visible to me in any way.</p>
            <p>
              The server that this website runs on logs certain information about your connection (your <a href='https://en.wikipedia.org/wiki/IP_address' target='_blank' rel='noopener'>IP address</a>), your browser (its user agent string, which may include browser name and version, operating system, and other details), and which pages are visited (from your current browser and IP address). These logs are retained for a maximum of 10 days. This information is used exclusively to detect and prevent attacks, intrusion attempts and other forms of abuse. It cannot be associated with a specific person.
            </p>
          </div>

          <Tooltip text='Close' provideLabel>
            <button className='dialog_close' onClick={onClose}>
              <CloseIcon/>
            </button>
          </Tooltip>
        </section>
      </FocusTrap>
    </Overlay>
  );
});
