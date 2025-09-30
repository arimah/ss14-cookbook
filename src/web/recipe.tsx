import {RefObject, memo, useMemo, useRef} from 'react';

import {useGameData} from './context';
import {CloseIcon, NodeTreeIcon} from './icons';
import {FavoriteButton, useIsFavorite} from './favorites';
import {useExploreRecipe, useCurrentExploredRecipe} from './recipe-explorer';
import {useRecipeVisibility} from './recipe-visibility-context';
import {RecipeTraits} from './recipe-traits';
import {RecipeMethod} from './recipe-method';
import {RecipeIngredients} from './recipe-ingredients';
import {Tooltip} from './tooltip';
import {RecipeResult} from './recipe-result';
import {RecipeInstructions} from './recipe-instructions';

export interface Props {
  className?: string;
  id: string;
  canFavorite?: boolean;
  canExplore?: boolean;
  headerAction?: JSX.Element;
}

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
      <RecipeResult recipe={recipe}/>
      {balanceBias > 0 && <span className='recipe_spacer'/>}
      {canFavorite && <FavoriteButton id={id}/>}
      {canExplore && <ExploreButton id={id}/>}
    </>;
  }, [headerAction, balanceBias, canFavorite, canExplore, recipe]);

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
      {recipe.method === 'construct' ? (
        <RecipeInstructions visible={visible} steps={recipe.steps}/>
      ) : (
        <RecipeIngredients
          visible={visible}
          solids={recipe.solids}
          reagents={recipe.reagents}
        />
      )}
      <div className='recipe_method'>
        <RecipeMethod recipe={recipe}/>
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
