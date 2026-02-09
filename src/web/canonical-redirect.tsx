import { ReactElement, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router';
import { FocusTrap } from './focus';
import { ArrowRightIcon, CloseIcon, InformationIcon } from './icons';
import { getPopupRoot } from './popup-impl';
import { hasImportantStoredData } from './storage';
import { Tooltip } from './tooltip';
import { useUrl } from './url';

export const CanonicalRedirect = (): ReactElement | null => {
  if (!CANONICAL_URL) {
    // No canonical URL to redirect to.
    return null;
  }

  const currentUrl = new URL(window.location.href);
  const canonicalUrl = new URL(CANONICAL_URL);

  // We assume the cookbook won't be hosted in more than one place per origin.
  // If there is a canonical URL and the origin is different, then we show the
  // notice. Otherwise, don't.
  if (currentUrl.origin === canonicalUrl.origin) {
    return null;
  }

  return <CanonicalRedirectDialog/>;
};

const CanonicalRedirectDialog = (): ReactElement | null => {
  const [open, setOpen] = useState(true);

  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);

  if (!open) {
    return null;
  }

  return createPortal(
    <div className='overlay'>
      <FocusTrap>
        <section
          className='dialog dialog--basic redirect'
          tabIndex={-1}
          ref={ref}
        >
          <h2>The Cookbook Has Moved!</h2>

          <div className='dialog_body redirect_body thin-scroll'>
            <p>It’s about time the cookbook got a proper domain name, isn’t it? That’s why it’s been moved to a new URL! From now on, you can find the cookbook here:</p>
            <p className='redirect_canonical'>
              <ArrowRightIcon/>
              <a href={CANONICAL_URL!} rel='noopener'>
                {CANONICAL_URL}
              </a>
            </p>
            <p>Don’t forget to update your bookmark!</p>
            <p><strong>The old version will no longer be updated.</strong></p>
            <DataMigrationNotice onClose={() => setOpen(false)}/>
          </div>

          <Tooltip text='Close' placement='left' provideLabel>
            <button className='dialog_close' onClick={() => setOpen(false)}>
              <CloseIcon/>
            </button>
          </Tooltip>
        </section>
      </FocusTrap>
    </div>,
    getPopupRoot()
  );
};

interface DataMigrationNoticeProps {
  onClose: () => void;
}

const DataMigrationNotice = ({
  onClose,
}: DataMigrationNoticeProps): ReactElement | null => {
  const url = useUrl();

  if (!hasImportantStoredData()) {
    return null;
  }

  return (
    <div className='redirect_data'>
      <InformationIcon/>
      <div className='redirect_data-body'>
        <p>It looks like you’ve used the cookbook before. You have some saved data (menus and/or favourite recipes). Would you like to migrate your data now?</p>
        <Link
          to={url.migrateExport}
          className='btn'
          onClick={onClose}
        >
          Migrate my data
        </Link>
      </div>
    </div>
  );
};
