import {memo, useMemo} from 'react';

import {useGameData} from '../context';
import {Recipe} from '../recipe';
import {Tooltip} from '../tooltip';
import {getPopupRoot, usePopupTrigger} from '../popup-impl';
import {getRecipeName} from '../sort';
import {AddIcon, EyeIcon, EyeOffIcon, InformationIcon} from '../icons';
import {EntitySprite, ReagentSprite} from '../sprites';
import {NeutralCollator, dedupe} from '../helpers';

import {ingredientName} from './ingredients';
import {Ingredient} from './types';
import {createPortal} from 'react-dom';

export interface Props {
  availableIngredients: readonly Ingredient[];
  hiddenIngredients: ReadonlySet<string>,
  onToggleVisible: (id: string) => void;
  onAddRecipe: (id: string) => void;
}

export const IngredientList = memo((props: Props): JSX.Element => {
  const {
    availableIngredients,
    hiddenIngredients,
    onToggleVisible,
    onAddRecipe,
  } = props;

  const {entityMap, reagentMap} = useGameData();

  const sortedIngredients = useMemo(() => {
    return availableIngredients.slice(0).sort((a, b) => {
      const nameA = ingredientName(a, entityMap, reagentMap);
      const nameB = ingredientName(b, entityMap, reagentMap);
      return NeutralCollator.compare(nameA, nameB);
    });
  }, [availableIngredients, entityMap, reagentMap]);

  return <>
    <h3>Ingredients</h3>
    {sortedIngredients.length > 0 ? (
      <ul className='planner_editor-ingredient-list'>
        {sortedIngredients.map(ingredient =>
          <Ingredient
            key={ingredient.id}
            ingredient={ingredient}
            visible={!hiddenIngredients.has(ingredient.id)}
            onToggleVisible={onToggleVisible}
            onAddRecipe={onAddRecipe}
          />
        )}
      </ul>
    ) : <>
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

const Ingredient = memo((props: IngredientProps): JSX.Element => {
  const {ingredient, visible, onToggleVisible, onAddRecipe} = props;

  const {recipeMap, entityMap, reagentMap} = useGameData();

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

const AddRecipeButton = memo((props: AddRecipeButtonProps): JSX.Element => {
  const {recipeId, index, totalCount, onAdd} = props;

  const {parentRef, popupRef, visible} = usePopupTrigger<
    HTMLDivElement,
    HTMLButtonElement
  >('above');

  const n = index + 1;

  const ariaLabel = totalCount > 1
    ? `Add recipe ${n} for this ingredient to the menu`
    : 'Add the recipe for this ingredient to the menu';

  return <>
    <button
      className='planner_editor-ingredient-add-recipe'
      aria-label={ariaLabel}
      onClick={() => onAdd(recipeId)}
      ref={parentRef}
    >
      <AddIcon/>
      {totalCount > 1 && <span>{n}</span>}
    </button>
    {visible && createPortal(
      <div className='popup popup--recipe' ref={popupRef}>
        <Recipe id={recipeId} canFavorite={false} canExplore={false}/>
        <span className='popup--tooltip'>
          Add this recipe to the menu.
        </span>
      </div>,
      getPopupRoot()
    )}
  </>;
});
