import {
  ReactElement,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Link, useParams } from 'react-router';
import { useGameData } from '../context';
import { NeutralCollator, tryCopyToClipboard } from '../helpers';
import { ArrowLeftIcon, EditIcon, ExportIcon } from '../icons';
import { Notice } from '../notices';
import { Recipe } from '../recipe';
import { RecipePopup } from '../recipe-popup';
import { EntitySprite, ReagentSprite } from '../sprites';
import { Tooltip } from '../tooltip';
import { useUrl } from '../url';
import { ExportMenuDialog } from './export-menu-dialog';
import { findIngredients, ingredientName } from './ingredients';
import { useStoredMenus } from './storage';
import { exportMenu } from './transfer';
import { MenuWarning } from './warning';

const CopySuccessTimeout = 2500;

export const MenuViewer = memo((): ReactElement => {
  const params = useParams();
  const id = params.id!;

  const {
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

  const [exportData, setExportData] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);
  const handleExport = useCallback(() => {
    if (!menu) {
      return;
    }
    const exported = exportMenu(menu);
    const importUrl = location.origin + url.menuImport(exported);
    tryCopyToClipboard(importUrl).then(success => {
      if (success) {
        setExportSuccess(true);
      } else {
        // If copying fails, show the ugly dialog
        setExportData(importUrl);
      }
    });
  }, [menu, url]);
  useEffect(() => {
    if (exportSuccess) {
      const timeoutId = setTimeout(() => {
        setExportSuccess(false);
      }, CopySuccessTimeout);
      return () => clearTimeout(timeoutId);
    }
  }, [exportSuccess]);

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
    (count, id) => count + +!recipeMap.has(id),
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

        <Tooltip open={exportSuccess} text='Link copied to clipboard!'>
          <button className='floating' onClick={handleExport}>
            <ExportIcon/>
            <span>Export</span>
          </button>
        </Tooltip>
        <Notice kind='info'>
          Your menu is private. Export to share it with others.
        </Notice>
      </div>

      <MenuWarning
        menuFork={menu.lastFork}
        unavailableRecipeCount={unavailableRecipeCount}
      />

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

      {exportData != null && (
        <ExportMenuDialog
          menuExport={exportData}
          onClose={() => setExportData(null)}
        />
      )}
    </div>
  );
});
