import { ReactElement, memo, useMemo } from 'react';
import { useGameData } from '../context';
import { NeutralCollator, dedupe } from '../helpers';
import { AddIcon, EyeIcon, EyeOffIcon, InformationIcon } from '../icons';
import { Popup, usePopupTrigger } from '../popup';
import { Recipe } from '../recipe';
import { getRecipeName } from '../sort';
import { EntitySprite, ReagentSprite } from '../sprites';
import { Tooltip } from '../tooltip';
import { ingredientName } from './ingredients';
import { Ingredient } from './types';

export interface Props {
  availableIngredients: readonly Ingredient[];
  visibility: ReadonlyMap<string, boolean>,
  onToggleVisible: (id: string) => void;
  onAddRecipe: (id: string) => void;
}

export const IngredientList = memo(({
  availableIngredients,
  visibility,
  onToggleVisible,
  onAddRecipe,
}: Props): ReactElement => {
  const { entityMap, reagentMap } = useGameData();

  const sortedIngredients = useMemo(() => {
    return availableIngredients.slice(0).sort((a, b) => {
      const nameA = ingredientName(a, entityMap, reagentMap);
      const nameB = ingredientName(b, entityMap, reagentMap);
      return NeutralCollator.compare(nameA, nameB);
    });
  }, [availableIngredients, entityMap, reagentMap]);

  const directIngredients = sortedIngredients.filter(x => !x.precursor);
  const precursorIngredients = sortedIngredients.filter(x => x.precursor);

  return <>
    <h3>Recipe ingredients</h3>
    {sortedIngredients.length > 0 ? <>
      <p className='text-subtle'>
        These ingredients are used by at least one selected recipe.
      </p>
      <ul className='planner_editor-ingredient-list'>
        {directIngredients.map(ingredient =>
          <Ingredient
            key={ingredient.id}
            ingredient={ingredient}
            visible={visibility.get(ingredient.id) ?? true}
            onToggleVisible={onToggleVisible}
            onAddRecipe={onAddRecipe}
          />
        )}
      </ul>

      {precursorIngredients.length > 0 && <>
        <h3>Ingredients of ingredients</h3>
        <p className='text-subtle'>
          These are ingredients for other ingredients, not directly used by any recipe in the menu.
        </p>
        <ul className='planner_editor-ingredient-list'>
          {precursorIngredients.map(ingredient =>
            <Ingredient
              key={ingredient.id}
              ingredient={ingredient}
              visible={visibility.get(ingredient.id) ?? false}
              onToggleVisible={onToggleVisible}
              onAddRecipe={onAddRecipe}
            />
          )}
        </ul>
      </>}
    </> : <>
      <p>When you add recipes to the menu, their ingredients will show up here. This list will also include ingredients used in recipes for other ingredients.</p>
      <p>You can hide ingredients you don’t want to see, and add their recipes (when available) to your menu.</p>
    </>}
  </>;
});

interface IngredientProps {
  ingredient: Ingredient;
  visible: boolean;
  onToggleVisible: (id: string) => void;
  onAddRecipe: (id: string) => void;
}

const Ingredient = memo(({
  ingredient,
  visible,
  onToggleVisible,
  onAddRecipe,
}: IngredientProps): ReactElement => {
  const { recipeMap, entityMap, reagentMap } = useGameData();

  const sourceOfText = useMemo(() => {
    if (ingredient.sourceOfReagent.size === 0) {
      return '';
    }

    const reagentNames = Array.from(ingredient.sourceOfReagent, id =>
      reagentMap.get(id)!.name
    );
    reagentNames.sort((a, b) => NeutralCollator.compare(a, b));
    return `Source of: ${reagentNames.join(', ')}`;
  }, [ingredient, reagentMap]);

  const usedByText = useMemo(() => {
    if (ingredient.usedBy.size === 0) {
      return '';
    }

    const recipeNames = dedupe(
      Array.from(ingredient.usedBy, id =>
        getRecipeName(recipeMap.get(id)!, entityMap, reagentMap)
      )
    );
    recipeNames.sort((a, b) => NeutralCollator.compare(a, b));
    return `Used by: ${recipeNames.join(', ')}`;
  }, [ingredient, recipeMap, entityMap, reagentMap]);

  const tooltipText = `${sourceOfText}\n${usedByText}`.trim();

  return (
    <li
      className={
        !visible
          ? 'planner_editor-ingredient planner_editor-ingredient--off'
          : 'planner_editor-ingredient'
      }
    >
      <Tooltip text={visible ? 'Hide this ingredient' : 'Show this ingredient'}>
        <button
          className='planner_editor-ingredient-toggle'
          aria-label='Hide this ingredient'
          aria-pressed={!visible}
          onClick={() => onToggleVisible(ingredient.id)}
        >
          {visible ? <EyeIcon/> : <EyeOffIcon/>}
        </button>
      </Tooltip>
      {ingredient.type === 'solid'
        ? <EntitySprite id={ingredient.entityId}/>
        : <ReagentSprite id={ingredient.reagentId}/>
      }
      <span className='planner_editor-ingredient-name'>
        {ingredientName(ingredient, entityMap, reagentMap)}
      </span>
      {ingredient.recipes.map((id, index) =>
        <AddRecipeButton
          key={id}
          recipeId={id}
          index={index}
          totalCount={ingredient.recipes.length}
          onAdd={onAddRecipe}
        />
      )}
      <Tooltip text={tooltipText}>
        <span className='planner_editor-ingredient-info'>
          <InformationIcon/>
        </span>
      </Tooltip>
    </li>
  );
});

interface AddRecipeButtonProps {
  recipeId: string;
  index: number;
  totalCount: number;
  onAdd: (id: string) => void;
}

const AddRecipeButton = memo(({
  recipeId,
  index,
  totalCount,
  onAdd,
}: AddRecipeButtonProps): ReactElement => {
  const popup = usePopupTrigger<HTMLButtonElement>();

  const n = index + 1;

  const ariaLabel = totalCount > 1
    ? `Add recipe ${n} for this ingredient to the menu`
    : 'Add the recipe for this ingredient to the menu';

  return <>
    <button
      className='planner_editor-ingredient-add-recipe'
      aria-label={ariaLabel}
      onClick={() => onAdd(recipeId)}
      ref={popup.triggerRef}
    >
      <AddIcon/>
      {totalCount > 1 && <span>{n}</span>}
    </button>
    <Popup {...popup} interactive>
      <div className='popup_recipe'>
        <Recipe id={recipeId} canFavorite={false} canExplore={false}/>
        <span className='popup_tooltip'>
          Add this recipe to the menu.
        </span>
      </div>
    </Popup>
  </>;
});
