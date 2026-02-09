import { KeyboardEvent, ReactElement, ReactNode, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { FocusTrap } from '../focus';
import { AddIcon, CloseIcon, ImportIcon } from '../icons';
import { Overlay } from '../overlay';
import { getPopupRoot } from '../popup-impl';
import { useStoredMenus } from './storage';
import { CookingMenu, genId } from './types';

export interface ImportMenuDialogProps {
  menu: CookingMenu;
  onImport: (menu: CookingMenu) => void;
  onCancel: () => void;
}

export const ImportMenuDialog = ({
  menu,
  onImport,
  onCancel,
}: ImportMenuDialogProps): ReactElement => {
  const { getAll } = useStoredMenus();

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

const ImportAction = ({
  title,
  desc,
  icon,
  onClick,
}: ImportActionProps): ReactElement =>
  <button
    className='menu-import_action'
    onClick={() => onClick()}
  >
    {icon}
    <span className='menu-import_action-stack'>
      <strong>{title}</strong>
      <span>{desc}</span>
    </span>
  </button>;
