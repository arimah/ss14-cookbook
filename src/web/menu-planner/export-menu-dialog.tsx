import { KeyboardEvent, ReactElement, useState } from 'react';
import { createPortal } from 'react-dom';
import { FocusTrap } from '../focus';
import { tryCopyToClipboard } from '../helpers';
import { CloseIcon, CopyIcon } from '../icons';
import { Overlay } from '../overlay';
import { getPopupRoot } from '../popup-impl';
import { Tooltip } from '../tooltip';

export interface ExportMenuDialogProps {
  menuExport: string;
  onClose: () => void;
}

export const ExportMenuDialog = ({
  menuExport,
  onClose,
}: ExportMenuDialogProps): ReactElement => {
  const [copyState, setCopyState] = useState<null | 'copied' | 'failed'>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleCopy = () => {
    setCopyState(null);
    tryCopyToClipboard(menuExport).then(success =>
      setCopyState(success ? 'copied' : 'failed')
    );
  };

  return createPortal(
    <Overlay>
      <FocusTrap onPointerDownOutside={onClose}>
        <section
          className='dialog dialog--basic menu-export'
          tabIndex={-1}
          onKeyDown={handleKeyDown}
        >
          <h2>Exported menu</h2>

          <div className='dialog_body'>
            <p>The link below couldn’t be copied to your clipboard. You will need to copy it manually.</p>
            <span className='menu-export_value-sizer'>
              {menuExport}
            </span>
            <textarea
              className='menu-export_value'
              readOnly
              value={menuExport}
              onFocus={e => e.target.select()}
            />
            <p className='menu-export_action'>
              <button onClick={handleCopy}>
                <CopyIcon/>
                <span>Copy</span>
              </button>

              {copyState === 'copied' && (
                <span>Copied to clipboard.</span>
              )}
              {copyState === 'failed' && (
                <span>Could not copy to clipboard.</span>
              )}
            </p>
          </div>

          <Tooltip text='Close' placement='left' provideLabel>
            <button className='dialog_close' onClick={onClose}>
              <CloseIcon/>
            </button>
          </Tooltip>
        </section>
      </FocusTrap>
    </Overlay>,
    getPopupRoot()
  );
};
