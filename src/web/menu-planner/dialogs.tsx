import {KeyboardEvent, ReactElement, ReactNode, useMemo, useState} from 'react';
import {createPortal} from 'react-dom';

import {Overlay} from '../overlay';
import {FocusTrap} from '../focus';
import {AddIcon, CloseIcon, CopyIcon, ImportIcon} from '../icons';
import {Tooltip} from '../tooltip';
import {getPopupRoot} from '../popup-impl';
import {tryCopyToClipboard} from '../helpers';

import {useStoredMenus} from './storage';
import {CookingMenu, genId} from './types';

export interface ExportMenuDialogProps {
  menuExport: string;
  onClose: () => void;
}

export const ExportMenuDialog = (
  props: ExportMenuDialogProps
): ReactElement => {
  const {menuExport, onClose} = props;

  const [copyState, setCopyState] = useState<null | 'copied' | 'failed'>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleCopy = () => {
    setCopyState(null);
    tryCopyToClipboard(menuExport).then(
      () => setCopyState('copied'),
      () => setCopyState('failed')
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

export interface ImportMenuDialogProps {
  menu: CookingMenu;
  onImport: (menu: CookingMenu) => void;
  onCancel: () => void;
}

export const ImportMenuDialog = (
  props: ImportMenuDialogProps
): ReactElement => {
  const {menu, onImport, onCancel} = props;

  const {getAll} = useStoredMenus();

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  const newName = useMemo(() => {
    // We want to append a counter to the name so the user can identify the
    // newly imported menu. It's impossible to tell at a glance which menu
    // is which if you have several just called "Cakes". Instead we want
    // something like "Cakes", "Cakes (2)", "Cakes (3)", with a counter that
    // automatically increments.
    const counter = getAll()
      .map(m => {
        // See if the name already has a counter suffix - something like "(1)"
        // or " (21039)". It's not perfect, but good enough.
        const match = m.name.match(/\s*\((\d+)\)$/);
        const nameWithoutCounter = match
          ? m.name.slice(0, match.index)
          : m.name;
        if (nameWithoutCounter !== menu.name) {
          // This menu appears to be unrelated.
          return 0;
        }
        return match ? +match[1] : 1;
      })
      .reduce((a, b) => Math.max(a, b), 1);
    return `${menu.name} (${counter + 1})`;
  }, [menu]);

  const handleImportNew = () => {
    onImport({
      ...menu,
      id: genId(),
      name: newName,
    });
  };

  return createPortal(
    <Overlay>
      <FocusTrap onPointerDownOutside={onCancel}>
        <section
          className='dialog dialog--basic menu-import'
          tabIndex={-1}
          onKeyDown={handleKeyDown}
        >
          <h2>Import menu</h2>

          <div className='dialog_body'>
            <p>It looks like you already have this menu. How would you like to proceed?</p>
            <ul className='menu-import_actions'>
              <li>
                <ImportAction
                  title='Create a new menu'
                  desc={<>The menu will be imported as <i>{newName}</i>.</>}
                  icon={<AddIcon/>}
                  onClick={handleImportNew}
                />
              </li>
              <li>
                <ImportAction
                  title='Overwrite the existing menu'
                  desc={<>
                    The existing menu will be completely replaced.
                    {' '}
                    <strong>This cannot be undone.</strong>
                  </>}
                  icon={<ImportIcon/>}
                  onClick={() => onImport(menu)}
                />
              </li>
              <li>
                <ImportAction
                  title='Do nothing'
                  desc='Close this dialog and don’t import the menu.'
                  icon={<CloseIcon/>}
                  onClick={onCancel}
                />
              </li>
            </ul>
          </div>
        </section>
      </FocusTrap>
    </Overlay>,
    getPopupRoot()
  );
};

interface ImportActionProps {
  title: string;
  desc: ReactNode;
  icon: ReactNode;
  onClick: () => void;
}

const ImportAction = (props: ImportActionProps): ReactElement => {
  const {title, desc, icon, onClick} = props;
  return (
    <button
      className='menu-import_action'
      onClick={() => onClick()}
    >
      {icon}
      <span className='menu-import_action-stack'>
        <strong>{title}</strong>
        <span>{desc}</span>
      </span>
    </button>
  );
};
