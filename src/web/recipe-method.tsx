import { ReactElement, memo } from 'react';
import { Recipe, SpritePoint } from '../types';
import { useGameData } from './context';
import { displayMethod } from './helpers';
import { RawSprite } from './sprites';
import { Temperature } from './temperature';

export interface RecipeMethodProps {
  recipe: Recipe;
}

export const RecipeMethod = memo(({
  recipe,
}: RecipeMethodProps): ReactElement | null => {
  const { methodSprites, microwaveRecipeTypes } = useGameData();

  const method = displayMethod(recipe);
  if (method === null) {
    return null;
  }

  let text: ReactElement;
  let sprite: SpritePoint = methodSprites[method]!;
  let spriteAlt: string;

  switch (recipe.method) {
    case 'microwave':
      text = <span>{recipe.time} sec</span>;
      spriteAlt = 'microwave';

      // What a mess of conditionals
      if (microwaveRecipeTypes && recipe.subtype) {
        if (typeof recipe.subtype === 'string') {
          const subtype = microwaveRecipeTypes[recipe.subtype];
          text = <>
            <span>{subtype.verb}</span>
            {text}
          </>;
          sprite = subtype.sprite;
          spriteAlt = subtype.filterSummary; // good enough
        } else {
          // *cries*
          return (
            <div className='recipe_method'>
              <span>
                {recipe.subtype.map(t => {
                  const subtype = microwaveRecipeTypes[t];
                  return (
                    <RawSprite
                      key={t}
                      position={subtype.sprite}
                      alt={subtype.filterSummary}
                    />
                  );
                })}
              </span>
              <span>Cook</span>
              {text}
            </div>
          );
        }
      }
      break;
    case 'mix':
      text = <>
        <span>Mix</span>
        {recipe.minTemp ? (
          <span>above <Temperature k={recipe.minTemp}/></span>
        ) : null}
        {recipe.maxTemp ? (
          <span>below <Temperature k={recipe.maxTemp}/></span>
        ) : null}
      </>;
      spriteAlt = 'beaker';
      break;
    case 'construct':
      switch (recipe.mainVerb) {
        case 'mix':
          text = <span>Mix</span>;
          spriteAlt = 'beaker';
          break;
        default:
          return null;
      }
      break;
    case 'deepFry': // Frontier
      text = <span>Deep fry</span>;
      spriteAlt = 'deep fry';
      break;
  }
  return (
    <div className='recipe_method'>
      <RawSprite position={sprite} alt={spriteAlt}/>
      {text}
    </div>
  );
});
