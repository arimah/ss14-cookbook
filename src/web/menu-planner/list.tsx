import { ReactElement, ReactNode, memo, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useGameData } from '../context';
import { AddIcon, EditIcon } from '../icons';
import { Notice } from '../notices';
import { Tooltip } from '../tooltip';
import { useUrl } from '../url';
import { ImportMenuDialog } from './import-menu-dialog';
import { useStoredMenus } from './storage';
import { importMenu } from './transfer';
import { CookingMenu } from './types';

type ImportState =
  | ImmediateImportState
  | ConfirmImportState
  | ErrorImportState
  | NoImportState
  ;

interface ImmediateImportState {
  readonly type: 'immediate';
  readonly menu: CookingMenu;
}

interface ConfirmImportState {
  readonly type: 'confirm';
  readonly menu: CookingMenu;
}

interface ErrorImportState {
  readonly type: 'error';
}

interface NoImportState {
  readonly type: 'none';
}

export const MenuList = memo((): ReactElement => {
  const navigate = useNavigate();
  const [query, setQuery] = useSearchParams();

  const storage = useStoredMenus();
  const url = useUrl();

  const importParam = query.get('import');
  const importState = useMemo((): ImportState => {
    if (!importParam) {
      return { type: 'none' };
    }

    const menu = importMenu(importParam);
    if (!menu) {
      return { type: 'error' };
    }

    const existingMenu = storage.get(menu.id);
    if (existingMenu) {
      return { type: 'confirm', menu };
    }
    return { type: 'immediate', menu };
  }, [importParam, storage]);

  const handleImport = (menu: CookingMenu) => {
    storage.save(menu);

    // Remove the `import` parameter from the URL, to stop it from triggering
    // multiple times when the user navigates back.
    setQuery(q => {
      q.delete('import');
      return q;
    }, { replace: true });

    navigate(url.menuView(menu.id));
  };

  const handleCancelImport = () => {
    setQuery(q => {
      q.delete('import');
      return q;
    }, { replace: true });
  };

  useEffect(() => {
    if (importState.type === 'immediate') {
      handleImport(importState.menu);
    }
  }, [importState]);

  const allMenus = storage.getAll();

  let menuList: ReactNode;
  if (allMenus.length === 0) {
    menuList =
      <div className='planner_empty-list'>
        <h3>No saved menus</h3>
        <p>A menu is a collection of recipes and ingredients. Plan your food around a theme, gather up your favourite recipes, or just get a list of produce to grow.</p>
        <p>
          <Link to={url.menuNew} className='btn'>
            <AddIcon/>
            <span>Create your first menu</span>
          </Link>
        </p>
      </div>;
  } else {
    menuList = <>
      <div className='planner_list'>
        {allMenus.map(menu =>
          <Item key={menu.id} menu={menu} />
        )}
      </div>
      <div>
        <Link to={url.menuNew} className='btn floating'>
          <AddIcon />
          <span>Create new menu</span>
        </Link>
      </div>
    </>;
  }

  return (
    <div className='planner'>
      {importState.type === 'error' && (
        <Notice kind='error'>
          The page address contains a menu to import, but something went wrong when reading it.
          {' '}
          Please make sure you have the <em>entire</em> address.
          {' '}
          If it still doesn’t work, please report the error!
        </Notice>
      )}
      {menuList}
      {importState.type === 'confirm' && (
        <ImportMenuDialog
          menu={importState.menu}
          onImport={handleImport}
          onCancel={handleCancelImport}
        />
      )}
    </div>
  );
});

const MaxRecipesInSummary = 10;

interface ItemProps {
  menu: CookingMenu;
}

const Item = memo(({ menu }: ItemProps): ReactElement => {
  const { recipeMap, entityMap, reagentMap } = useGameData();
  const url = useUrl();

  const recipeSummary = useMemo(() => {
    let recipeNames = menu.recipes
      .filter(id => recipeMap.has(id))
      .map(id => {
        const recipe = recipeMap.get(id)!;
        const name = recipe.reagentResult
          ? reagentMap.get(recipe.reagentResult)!.name
          : entityMap.get(recipe.solidResult!)!.name;
        return name;
      });

    if (recipeNames.length > MaxRecipesInSummary) {
      const remaining = recipeNames.length - MaxRecipesInSummary + 1;
      recipeNames = recipeNames.slice(0, MaxRecipesInSummary - 1);
      recipeNames = recipeNames.concat(
        `and ${remaining} more recipes`
      );
    }
    if (recipeNames.length === 0) {
      recipeNames.push('(No recipes)');
    }
    return recipeNames.join(', ');
  }, [menu, recipeMap, entityMap, reagentMap]);

  return (
    <div className='planner_list-menu'>
      <Link
        to={url.menuView(menu.id)}
        className='btn planner_view-menu-button'
      >
        <b>{menu.name.trim() || '(untitled menu)'}</b>
        {' '}
        <span>{recipeSummary}</span>
      </Link>
      <Tooltip provideLabel text='Edit menu'>
        <Link to={url.menuEdit(menu.id)} className='btn'>
          <EditIcon/>
        </Link>
      </Tooltip>
    </div>
  );
});
