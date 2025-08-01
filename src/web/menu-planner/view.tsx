import {memo, useMemo} from 'react';
import {Link, useParams} from 'react-router-dom';

import {useGameData} from '../context';
import {useUrl} from '../url';
import {Recipe} from '../recipe';
import {RecipePopup} from '../recipe-popup';
import {ArrowLeftIcon, EditIcon} from '../icons';
import {EntitySprite, ReagentSprite} from '../sprites';
import {Notice} from '../notices';
import {NeutralCollator} from '../helpers';

import {findIngredients, ingredientName} from './ingredients';
import {useStoredMenus} from './storage';

export const MenuViewer = memo((): JSX.Element => {
  const params = useParams();
  const id = params.id!;

  const {
    forkId,
    recipeMap,
    recipesBySolidResult,
    recipesByReagentResult,
    entityMap,
    reagentMap,
  } = useGameData();
  const url = useUrl();

  const storage = useStoredMenus();

  const menu = useMemo(() => storage.get(id), [id]);

  const ingredients = useMemo(() => {
    if (!menu) {
      return [];
    }
    let ingredients = findIngredients(
      menu.recipes,
      recipeMap,
      recipesBySolidResult,
      recipesByReagentResult,
      reagentMap
    );
    ingredients = ingredients.filter(ingredient =>
      ingredient.type === 'solid'
        ? menu.solidIngredients.includes(ingredient.entityId)
        : menu.reagentIngredients.includes(ingredient.reagentId)
    );
    ingredients.sort((a, b) =>
      NeutralCollator.compare(
        ingredientName(a, entityMap, reagentMap),
        ingredientName(b, entityMap, reagentMap)
      )
    );
    return ingredients;
  }, [
    menu,
    recipeMap,
    recipesBySolidResult,
    recipesByReagentResult,
    reagentMap,
  ]);

  const backButton =
    <Link to={url.menuList} className='btn floating'>
      <ArrowLeftIcon/>
      <span>Back to listing</span>
    </Link>;

  if (!menu) {
    return (
      <div className='planner_view'>
        <h2>Menu not found</h2>
        <div className='planner_view-actions'>{backButton}</div>
      </div>
    );
  }

  const unavailableRecipeCount = menu.recipes.reduce(
    (count, id) => !recipeMap.has(id) ? count + 1 : count,
    0
  );

  return (
    <div className='planner_view'>
      <h2>{menu.name.trim() || '(untitled menu)'}</h2>
      <div className='planner_view-actions'>
        {backButton}
        <Link to={url.menuEdit(id)} className='btn floating'>
          <EditIcon/>
          <span>Edit</span>
        </Link>
        <span className='spacer'/>
        <Notice kind='info'>
          Your menu is private. The web address won’t work in another browser.
        </Notice>
      </div>

      {(menu.lastFork !== forkId || unavailableRecipeCount > 0) && (
        <Notice kind='warning'>
          <p>
            {menu.lastFork !== forkId &&
              'This menu was made for a different fork. Recipes and ingredients may be different. '}
            {unavailableRecipeCount
              ? unavailableRecipeWarning(unavailableRecipeCount)
              : ''}
          </p>
        </Notice>
      )}

      {ingredients.length > 0 && <>
        <h3>Ingredients</h3>
        <ul className='planner_view-ingredients'>
          {ingredients.map(ingredient =>
            <li key={ingredient.id}>
              {ingredient.type === 'solid'
                ? <EntitySprite id={ingredient.entityId}/>
                : <ReagentSprite id={ingredient.reagentId}/>
              }
              {ingredient.recipes.length > 0 ? (
                <RecipePopup id={ingredient.recipes}>
                  <span className='planner_editor-ingredient-name more-info'>
                    {ingredientName(ingredient, entityMap, reagentMap)}
                  </span>
                </RecipePopup>
              ) : (
                <span className='planner_editor-ingredient-name'>
                  {ingredientName(ingredient, entityMap, reagentMap)}
                </span>
              )}
            </li>
          )}
        </ul>
      </>}

      <h3>Recipes</h3>
      <ul className='recipe-list'>
        {menu.recipes.map(id => recipeMap.has(id) ? (
          <li key={id}>
            <Recipe id={id} canFavorite={false}/>
          </li>
        ) : null)}
      </ul>
    </div>
  );
});

const unavailableRecipeWarning = (count: number) =>
  `${count} recipe${count > 1 ? 's are' : ' is'} unavailable.`;
