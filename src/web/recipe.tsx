import {CSSProperties, RefObject, memo, useMemo, useRef} from 'react';

import {Recipe as RecipeData, Entity, Reagent, SpritePoint} from '../types';

import {useGameData} from './context';
import {EntitySprite, RawSprite, ReagentSprite} from './sprites';
import {CloseIcon, NodeTreeIcon} from './icons';
import {RecipePopup} from './recipe-popup';
import {FavoriteButton, useIsFavorite} from './favorites';
import {useExploreRecipe, useCurrentExploredRecipe} from './recipe-explorer';
import {useRecipeVisibility} from './recipe-visibility-context';
import {Temperature} from './temperature';
import {Tooltip} from './tooltip';

export interface Props {
  className?: string;
  id: string;
  canFavorite?: boolean;
  canExplore?: boolean;
  headerAction?: JSX.Element;
}

const IngredientSpriteHeight = 32;

export const Recipe = memo((props: Props): JSX.Element => {
  const {
    className,
    id,
    canFavorite = true,
    canExplore = true,
    headerAction,
  } = props;

  const {recipeMap} = useGameData();
  const recipe = recipeMap.get(id)!;

  const isFav = useIsFavorite()(id);
  const lastIsFav = useRef(isFav);
  const isNewFav = isFav && !lastIsFav.current;
  lastIsFav.current = isFav;

  const ref = useRef<HTMLElement>(null);
  const visible = useRecipeVisibility(ref);

  // This is a bit ugly. In order to keep the title *text* visually centered,
  // we insert a spacer as necessary. By design, the recipe icon is exactly
  // the same size as the favourite and explore buttons, and we assume that
  // a header action is a single icon button too.
  // The amount of stuff on the left is therefore 1 (for the icon) + 1 if
  // there is a header action.
  // On the right, it's 1 if canFavorite + 1 if canExplore.
  // The balanceBias is left - right. If <0, we insert a spacer on the left;
  // if >0, spacer on the right.
  const balanceBias =
    // left
    (1 + +!!headerAction)
    -
    // right
    (+!!canFavorite + +!!canExplore);

  const title = useMemo(() => {
    return <>
      <RecipeTraits recipe={recipe}/>
      {headerAction}
      {balanceBias < 0 && <span className='recipe_spacer'/>}
      <Result recipe={recipe}/>
      {balanceBias > 0 && <span className='recipe_spacer'/>}
      {canFavorite && <FavoriteButton id={id}/>}
      {canExplore && <ExploreButton id={id}/>}
    </>;
  }, [headerAction, balanceBias, canFavorite, canExplore, recipe]);

  const ingredients = useMemo(() => {
    if (!visible) {
      const ingredientCount =
        Object.keys(recipe.solids).length +
        Object.keys(recipe.reagents).length;
      return (
        <div
          style={{
            height: `${ingredientCount * IngredientSpriteHeight}px`,
          }}
        />
      );
    }

    return <>
      {Object.entries(recipe.solids).map(([entId, qty]) =>
        <SolidIngredient key={entId} id={entId} qty={qty}/>
      )}
      {Object.entries(recipe.reagents).map(([reagentId, ingredient]) =>
        <ReagentIngredient
          key={reagentId}
          id={reagentId}
          amount={ingredient.amount}
          catalyst={ingredient.catalyst}
        />
      )}
    </>;
  }, [recipe, visible]);

  let fullClassName = 'recipe';
  if (isFav && canFavorite) {
    fullClassName += ` recipe--fav`;
    if (isNewFav) {
      fullClassName += ` recipe--new-fav`;
    }
  }
  if (className) {
    fullClassName += ` ${className}`;
  }

  return (
    <div
      className={fullClassName}
      data-recipe-id={IS_DEV ? recipe.id : undefined}
      ref={ref as RefObject<HTMLDivElement>}
    >
      <div className='recipe_title'>
        {visible && title}
      </div>
      <div className='recipe_ingredients'>
        {ingredients}
      </div>
      <div className='recipe_method'>
        <Method recipe={recipe}/>
      </div>
    </div>
  );
});

interface ExploreButtonProps {
  id: string;
}

const ExploreButton = memo((props: ExploreButtonProps): JSX.Element => {
  const {id} = props;

  const explore = useExploreRecipe();
  const currentRecipe = useCurrentExploredRecipe();

  const isCurrent = id === currentRecipe;

  return (
    <Tooltip
      text={
        isCurrent
          ? 'Close recipe explorer'
          : 'Explore related recipes'
      }
      provideLabel
    >
      <button onClick={() => explore(id)}>
        {isCurrent ? <CloseIcon/> : <NodeTreeIcon/>}
      </button>
    </Tooltip>
  );
});

interface RecipeTraitsProps {
  recipe: RecipeData;
}

const RecipeTraits = memo((
  props: RecipeTraitsProps
): JSX.Element | null => {
  const {recipe} = props;

  const {entityMap, specialTraits, renderedTraitCache} = useGameData();

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
});

interface ResultProps {
  recipe: RecipeData;
}

const Result = memo((props: ResultProps): JSX.Element => {
  const {recipe} = props;

  const {entityMap, reagentMap} = useGameData();

  let solidResult: Entity | null = null;
  let reagentResult: [Reagent, number] | null = null;
  let resultCount: number | null = null;

  switch (recipe.method) {
    case 'mix':
      if (recipe.reagentResult) {
        const reagent = reagentMap.get(recipe.reagentResult)!;
        reagentResult = [reagent, recipe.resultAmount];
      } else {
        solidResult = entityMap.get(recipe.solidResult!)!;
      }
      break;
    default:
      solidResult = entityMap.get(recipe.solidResult)!;
      if (recipe.method === 'cut') {
        resultCount = recipe.maxCount;
      }
      break;
  }

  if (solidResult) {
    return (
      <span className='recipe_result'>
        <EntitySprite id={solidResult.id}/>
        <span className='recipe_name'>{solidResult.name}</span>
        {resultCount != null && (
          <Tooltip
            text={
              `One ${
                // There must be one solid ingredient. This code is horrid.
                entityMap.get(Object.keys(recipe.solids)[0])!.name
              } yields ${
                resultCount
              } slices.`
            }
          >
            <span className='recipe_result-qty'>
              {resultCount}
            </span>
          </Tooltip>
        )}
      </span>
    );
  }
  if (reagentResult) {
    const [{id: resultId, name: resultName}, resultQty] = reagentResult;
    return (
      <span className='recipe_result'>
        <ReagentSprite id={resultId}/>
        <span className='recipe_name'>
          {resultName}
        </span>
        <Tooltip
          text={
            `The recipe makes ${
              resultQty
            }u ${
              resultName
            } with the amounts shown. You can make larger or smaller batches as long as the ratio stays the same.`
          }
        >
          <span className='recipe_result-qty'>
            {`${resultQty}u`}
          </span>
        </Tooltip>
      </span>
    );
  }
  return <span>ERROR!</span>;
});

interface SolidIngredientProps {
  id: string;
  qty: number;
}

const SolidIngredient = memo((props: SolidIngredientProps): JSX.Element => {
  const {id, qty} = props;

  const {entityMap, recipesBySolidResult} = useGameData();
  const entity = entityMap.get(id)!;
  const relatedRecipes = recipesBySolidResult.get(id);

  return (
    <span className='recipe_ingredient'>
      <EntitySprite id={id}/>
      <span>
        {qty}
        {' '}
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
});

interface ReagentIngredientProps {
  id: string;
  amount: number;
  catalyst?: boolean;
}

const ReagentIngredient = memo((props: ReagentIngredientProps): JSX.Element => {
  const {id, amount, catalyst = false} = props;

  const {reagentMap, recipesByReagentResult} = useGameData();
  const reagent = reagentMap.get(id)!;
  const relatedRecipes = recipesByReagentResult.get(id);

  return (
    <span className='recipe_ingredient'>
      <ReagentSprite id={id}/>
      <span>
        {amount}{'u '}
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
});

interface MethodProps {
  recipe: RecipeData;
}

const Method = memo((props: MethodProps): JSX.Element => {
  const {recipe} = props;

  const {methodSprites, microwaveRecipeTypes} = useGameData();

  let text: JSX.Element;
  let sprite: SpritePoint = methodSprites[recipe.method]!;
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
          return <>
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
          </>;
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
    case 'cut':
      text = <span>Cut</span>;
      spriteAlt = 'knife';
      break;
    case 'roll':
      text = <span>Roll</span>;
      spriteAlt = 'rolling pin';
      break;
    case 'heat':
      text = <>
        <span>Heat</span>
        <span>to <Temperature k={recipe.minTemp}/></span>
      </>;
      spriteAlt = 'grill';
      break;
    case 'deepFry': // Frontier
      text = <span>Deep fry</span>;
      spriteAlt = 'deep fry';
      break;
  }
  return <>
    <RawSprite position={sprite} alt={spriteAlt}/>
    {text}
  </>;
});
