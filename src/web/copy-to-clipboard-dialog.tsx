import { KeyboardEvent, ReactElement, useState } from 'react';
import { createPortal } from 'react-dom';
import { FocusTrap } from './focus';
import { tryCopyToClipboard } from './helpers';
import { CloseIcon, CopyIcon } from './icons';
import { Overlay } from './overlay';
import { getPopupRoot } from './popup';
import { Tooltip } from './tooltip';

export interface CopyToClipboardDialogProps {
  content: string;
  title?: string;
  onClose: () => void;
}

export const CopyToClipboardDialog = ({
  content,
  title = 'Copy to clipboard',
  onClose,
}: CopyToClipboardDialogProps): ReactElement => {
  const [copyState, setCopyState] = useState<null | 'copied' | 'failed'>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleCopy = () => {
    setCopyState(null);
    tryCopyToClipboard(content).then(success =>
      setCopyState(success ? 'copied' : 'failed')
    );
  };

  return createPortal(
    <Overlay>
      <FocusTrap onPointerDownOutside={onClose}>
        <section
          className='dialog dialog--basic copy-to-clipboard'
          tabIndex={-1}
          onKeyDown={handleKeyDown}
        >
          <h2>{title}</h2>

          <div className='dialog_body'>
            <p>The text below couldn’t be copied to your clipboard. You will need to copy it manually.</p>
            <span className='copy-to-clipboard_value-sizer'>
              {content}
            </span>
            <textarea
              className='copy-to-clipboard_value'
              readOnly
              value={content}
              onFocus={e => e.target.select()}
            />
            <p className='copy-to-clipboard_action'>
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
