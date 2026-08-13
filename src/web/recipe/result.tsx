import { ReactElement, memo } from 'react';
import { Recipe } from '../../types';
import { useGameData } from '../context';
import { EntitySprite, ReagentSprite } from '../sprites';
import { Tooltip } from '../tooltip';

export interface RecipeResultProps {
  recipe: Recipe;
}

export const RecipeResult = memo(({
  recipe,
}: RecipeResultProps): ReactElement => {
  const { entityMap, reagentMap } = useGameData();

  const solidResult = recipe.solidResult
    ? entityMap.get(recipe.solidResult)
    : undefined;
  const reagentResult = recipe.reagentResult
    ? reagentMap.get(recipe.reagentResult)
    : undefined;
  const resultQty = recipe.resultQty ?? 1;

  if (solidResult) {
    return (
      <span className='recipe_result'>
        <EntitySprite id={solidResult.id}/>
        <span className='recipe_name'>{solidResult.name}</span>
        {resultQty > 1 && (
          <Tooltip text={`Ten przepis tworzy ${resultQty}.`}>
            <span className='recipe_result-qty'>
              {resultQty}
            </span>
          </Tooltip>
        )}
      </span>
    );
  }
  if (reagentResult) {
    const { id: resultId, name: resultName } = reagentResult;
    return (
      <span className='recipe_result'>
        <ReagentSprite id={resultId}/>
        <span className='recipe_name'>
          {resultName}
        </span>
        <Tooltip
          text={
            `Ten przepis daje ${
              resultQty
            }u ${
              resultName
            } z podanymi ilościami. Możesz zrobić większe lub mniejsze partie, o ile proporcje pozostaną takie same.`
          }
        >
          <span className='recipe_result-qty'>
            {`${resultQty}u`}
          </span>
        </Tooltip>
      </span>
    );
  }
  return <span>BŁĄD!</span>;
});
