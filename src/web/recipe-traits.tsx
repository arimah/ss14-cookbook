import { CSSProperties, ReactElement } from 'react';
import { Recipe } from '../types';
import { useGameData } from './context';
import { Tooltip } from './tooltip';

export interface RecipeTraitsProps {
  recipe: Recipe;
}

export const RecipeTraits = ({
  recipe,
}: RecipeTraitsProps): ReactElement | null => {
  const { entityMap, specialTraits, renderedTraitCache } = useGameData();

  if (!recipe.solidResult) {
    return null;
  }
  const solidResult = entityMap.get(recipe.solidResult)!;
  const traits = solidResult.traits;
  if (traits === 0) {
    // No traits, nothing to show!
    return null;
  }

  let cached = renderedTraitCache.get(traits);
  if (!cached) {
    const matching = specialTraits.filter(t => (t.mask & traits) === t.mask);
    const hint = matching.map(t => t.hint).join('\n');

    let background: string;
    if (matching.length > 1) {
      // 53° is atan(24/18), designed to match the angle of the wedge
      const stride = 1 / matching.length;
      background = `linear-gradient(53deg, ${
        matching.map((t, i) => {
          const start = (i * stride * 100).toFixed(2);
          const end = ((i + 1) * stride * 100 - 2.5).toFixed(2);
          return `${t.color} ${start}%, ${t.color} ${end}%`;
        }).join(', ')
      })`;
    } else {
      background = matching[0].color;
    }

    cached =
      <Tooltip text={hint}>
        <span
          className='recipe_trait'
          style={{'--trait-color': background} as CSSProperties}
        />
      </Tooltip>;
    renderedTraitCache.set(traits, cached);
  }

  return cached;
};
