import { Draft, produce } from 'immer';
import {
  ReactElement,
  ReactNode,
  createContext,
  memo,
  useContext,
  useMemo,
  useState,
} from 'react';
import { SavedMenusKey, useStorage } from '../storage';
import { CookingMenu, SavedMenus } from './types';

export interface StoredMenuContext {
  getAll(): readonly CookingMenu[];

  get(id: string): CookingMenu | null;

  save(menu: CookingMenu): void;

  delete(id: string): boolean;
}

const EmptyMenus: SavedMenus = {
  menus: [],
};

const Context = createContext<StoredMenuContext>(null!);

export const useStoredMenus = (): StoredMenuContext => useContext(Context);

export interface StoredMenuProviderProps {
  children: ReactNode;
}

export const StoredMenuProvider = memo(({
  children,
}: StoredMenuProviderProps): ReactElement => {
  const storage = useStorage<SavedMenus>(SavedMenusKey);
  const [menus, setMenus] = useState<readonly CookingMenu[]>(() => {
    const stored = storage.read(EmptyMenus);
    return stored.menus;
  });

  const value = useMemo<StoredMenuContext>(() => {
    const update = (nextMenus: readonly CookingMenu[]) => {
      storage.write({ menus: nextMenus });
      setMenus(nextMenus);
    };
    return {
      getAll: () => menus,
      get: id => menus.find(m => m.id === id) ?? null,
      delete: id => {
        const index = menus.findIndex(m => m.id === id);
        if (index !== -1) {
          update(menus.filter(m => m.id !== id));
          return true;
        }
        return false;
      },
      save: menu => {
        const index = menus.findIndex(m => m.id === menu.id);
        update(produce(menus, draft => {
          if (index !== -1) {
            draft[index] = menu as Draft<CookingMenu>;
          } else {
            draft.push(menu as Draft<CookingMenu>);
          }
        }));
      },
    };
  }, [menus]);

  return (
    <Context.Provider value={value}>
      {children}
    </Context.Provider>
  );
});
