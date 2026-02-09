import { KeyboardEvent, ReactElement, useCallback } from 'react';
import { FocusTrap } from '../focus';
import { Overlay } from '../overlay';

export interface Props {
  onStay: () => void;
  onSave: () => void;
  onDiscard: () => void;
}

export const DiscardChangesDialog = ({
  onStay,
  onSave,
  onDiscard,
}: Props): ReactElement => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onStay();
    }
  }, [onStay]);

  return (
    <Overlay>
      <FocusTrap onPointerDownOutside={onStay}>
        <div
          className='dialog dialog--basic'
          tabIndex={-1}
          onKeyDown={handleKeyDown}
        >
          <h2>Unsaved changes</h2>
          <div className='dialog_body thin-scroll'>
            What do you want to do with your changes?
          </div>
          <div className='dialog_actions'>
            <button onClick={onStay}>
              Stay here
            </button>
            <span className='spacer'/>
            <button onClick={onSave}>
              Save changes
            </button>
            <button onClick={onDiscard}>
              Discard
            </button>
          </div>
        </div>
      </FocusTrap>
    </Overlay>
  );
};
