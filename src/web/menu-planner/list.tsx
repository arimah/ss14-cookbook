import {memo, useMemo} from 'react';
import {Link} from 'react-router-dom';

import {useGameData} from '../context';
import {useUrl} from '../url';
import {AddIcon, EditIcon} from '../icons';
import {Tooltip} from '../tooltip';

import {useStoredMenus} from './storage';
import {CookingMenu} from './types';

export const MenuList = memo((): JSX.Element => {
  const storage = useStoredMenus();
  const url = useUrl();

  const allMenus = storage.getAll();

  if (allMenus.length === 0) {
    return (
      <div className='planner_empty-list'>
        <h3>No saved menus</h3>
        <p>A menu is a collection of recipes and ingredients. Plan your food around a theme, gather up your favourite recipes, or just get a list of produce to grow.</p>
        <p>
          <Link to={url.menuNew} className='btn'>
            <AddIcon/>
            <span>Create your first menu</span>
          </Link>
        </p>
      </div>
    );
  }

  return <>
    <div className='planner_list'>
      {allMenus.map(menu =>
        <Item key={menu.id} menu={menu}/>
      )}
    </div>
    <div>
      <Link to={url.menuNew} className='btn floating'>
        <AddIcon/>
        <span>Create new menu</span>
      </Link>
    </div>
  </>;
});

const MaxRecipesInSummary = 10;

interface ItemProps {
  menu: CookingMenu;
}

const Item = memo((props: ItemProps): JSX.Element => {
  const {menu} = props;

  const {recipeMap, entityMap, reagentMap} = useGameData();
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
