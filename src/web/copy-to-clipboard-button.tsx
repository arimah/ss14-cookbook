import { ReactElement, ReactNode, useCallback, useEffect, useState } from 'react';
import { Tooltip } from './tooltip';
import { tryCopyToClipboard } from './helpers';
import { CopyToClipboardDialog } from './copy-to-clipboard-dialog';

export interface CopyToClipboardButtonProps {
  className?: string;
  getContent: () => string;
  successTooltip?: string;
  fallbackDialogTitle?: string;
  children?: ReactNode;
}

const CopySuccessTimeout = 2500;

export const CopyToClipboardButton = ({
  className,
  getContent,
  successTooltip = 'Copied to clipboard!',
  fallbackDialogTitle,
  children,
}: CopyToClipboardButtonProps): ReactElement => {
  const [failedContent, setFailedContent] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleClick = useCallback(() => {
    const content = getContent();
    tryCopyToClipboard(content).then(success => {
      if (success) {
        setCopySuccess(true);
      } else {
        // If copying fails, show the ugly dialog
        setFailedContent(content);
      }
    });
  }, [getContent]);

  useEffect(() => {
    if (copySuccess) {
      const timeoutId = setTimeout(() => {
        setCopySuccess(false);
      }, CopySuccessTimeout);
      return () => clearTimeout(timeoutId);
    }
  }, [copySuccess]);

  return <>
    <Tooltip open={copySuccess} text={successTooltip}>
      <button className={className} onClick={handleClick}>
        {children}
      </button>
    </Tooltip>
    {failedContent !== null && (
      <CopyToClipboardDialog
        content={failedContent}
        title={fallbackDialogTitle}
        onClose={() => setFailedContent(null)}
      />
    )}
  </>;
};
