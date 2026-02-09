import { ReactElement, memo } from 'react';
import { ReagentIngredient as ReagentIngredientData } from '../types';
import { useGameData } from './context';
import { RecipePopup } from './recipe-popup';
import { EntitySprite, ReagentSprite } from './sprites';
import { Tooltip } from './tooltip';

export interface RecipeIngredientsProps {
  visible: boolean;
  solids: Readonly<Record<string, number>>;
  reagents: Readonly<Record<string, ReagentIngredientData>>;
}

const IngredientSpriteHeight = 32;

export const RecipeIngredients = memo(({
  visible,
  solids,
  reagents,
}: RecipeIngredientsProps): ReactElement => {
  if (!visible) {
    const ingredientCount =
      Object.keys(solids).length +
      Object.keys(reagents).length;
    return (
      <div
        className='recipe_ingredients'
        style={{
          height: `${ingredientCount * IngredientSpriteHeight}px`,
        }}
      />
    );
  }

  return (
    <div className='recipe_ingredients'>
      {Object.entries(solids).map(([entId, qty]) =>
        <SolidIngredient key={entId} id={entId} qty={qty}/>
      )}
      {Object.entries(reagents).map(([reagentId, ingredient]) =>
        <ReagentIngredient
          key={reagentId}
          id={reagentId}
          amount={ingredient.amount}
          catalyst={ingredient.catalyst}
        />
      )}
    </div>
  );
});

export interface SolidIngredientProps {
  id: string;
  qty?: number;
}

export const SolidIngredient = ({
  id,
  qty,
}: SolidIngredientProps): ReactElement => {
  const { entityMap, recipesBySolidResult } = useGameData();
  const entity = entityMap.get(id)!;
  const relatedRecipes = recipesBySolidResult.get(id);

  return (
    <span className='recipe_ingredient'>
      <EntitySprite id={id}/>
      <span>
        {qty != null ? `${qty} ` : null}
        {relatedRecipes ? (
          <RecipePopup id={relatedRecipes}>
            <span className='more-info'>
              {entity.name}
            </span>
          </RecipePopup>
        ) : entity.name}
      </span>
    </span>
  );
};

export interface ReagentIngredientProps {
  id: string;
  /** Single amount (in units), or [min, max]. */
  amount: number | readonly [number, number];
  catalyst?: boolean;
}

export const ReagentIngredient = ({
  id,
  amount,
  catalyst = false,
}: ReagentIngredientProps): ReactElement => {
  const { reagentMap, recipesByReagentResult } = useGameData();
  const reagent = reagentMap.get(id)!;
  const relatedRecipes = recipesByReagentResult.get(id);

  const formattedAmount = typeof amount === 'number'
    ? `${amount}u `
    : `${amount[0]}–${amount[1]}u `;

  return (
    <span className='recipe_ingredient'>
      <ReagentSprite id={id}/>
      <span>
        {formattedAmount}
        {relatedRecipes ? (
          <RecipePopup id={relatedRecipes}>
            <span className='more-info'>
              {reagent.name}
            </span>
          </RecipePopup>
        ) : reagent.name}
        {catalyst && <>
          {' '}
          <Tooltip
            text={
              `You won’t lose any of the ${
                reagent.name
              } when making this recipe.`
            }
          >
            <span className='recipe_catalyst'>
              catalyst
            </span>
          </Tooltip>
        </>}
      </span>
    </span>
  );
};
