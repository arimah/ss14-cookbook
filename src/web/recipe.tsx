import {ReactElement, ReactNode, RefObject, memo, useMemo, useRef} from 'react';
import {createPortal} from 'react-dom';
import {Link} from 'react-router';

import {Entity, Recipe as RecipeData} from '../types';

import {useGameData} from './context';
import {CloseIcon, FoodSequenceIcon, NodeTreeIcon} from './icons';
import {FavoriteButton, useIsFavorite} from './favorites';
import {useExploreRecipe, useCurrentExploredRecipe} from './recipe-explorer';
import {useRecipeVisibility} from './recipe-visibility-context';
import {RecipeTraits} from './recipe-traits';
import {RecipeMethod} from './recipe-method';
import {RecipeResult} from './recipe-result';
import {RecipeIngredients} from './recipe-ingredients';
import {RecipeInstructions} from './recipe-instructions';
import {EntitySprite} from './sprites';
import {Tooltip} from './tooltip';
import {getPopupRoot, usePopupTrigger} from './popup-impl';
import {useUrl} from './url';

export interface Props {
  className?: string;
  id: string;
  canFavorite?: boolean;
  canExplore?: boolean;
  headerAction?: ReactElement;
  skipDefaultHeaderAction?: boolean;
}

export const Recipe = memo((props: Props): ReactElement => {
  const {
    className,
    id,
    canFavorite = true,
    canExplore = true,
    headerAction,
    skipDefaultHeaderAction,
  } = props;

  const {recipeMap, entityMap} = useGameData();
  const recipe = recipeMap.get(id)!;

  const isFav = useIsFavorite()(id);
  const lastIsFav = useRef(isFav);
  const isNewFav = isFav && !lastIsFav.current;
  lastIsFav.current = isFav;

  const ref = useRef<HTMLElement>(null);
  const visible = useRecipeVisibility(ref);

  const effectiveHeaderAction =
    headerAction ??
    (!skipDefaultHeaderAction && defaultHeaderAction(recipe, entityMap));

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
    (1 + +!!effectiveHeaderAction)
    -
    // right
    (+!!canFavorite + +!!canExplore);

  const title = useMemo(() => {
    return <>
      <RecipeTraits recipe={recipe}/>
      {effectiveHeaderAction}
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
      <RecipeMethod recipe={recipe}/>
    </div>
  );
});

const FoodSequenceStartTooltip =
  'You can put other foods inside this one.\n' +
  'Click to see what can be put inside it.';

const defaultHeaderAction = (
  recipe: RecipeData,
  entities: ReadonlyMap<string, Entity>
): ReactElement | null => {
  if (recipe.solidResult) {
    const entity = entities.get(recipe.solidResult)!;
    if (entity.seqStart) {
      return <SeqStartButton entityId={entity.id}/>;
    }
    if (entity.seqElem || entity.seqEnd) {
      return <SeqElemIcon seqElem={entity.seqElem} seqEnd={entity.seqEnd}/>;
    }
  }
  return null;
};

interface SeqStartButtonProps {
  entityId: string;
}

const SeqStartButton = memo((props: SeqStartButtonProps): ReactElement => {
  const {entityId} = props;

  const url = useUrl();

  // TODO: Maybe use different icons for starts and elements
  return (
    <Tooltip text={FoodSequenceStartTooltip} provideLabel>
      <Link
        className='btn'
        to={url.foodSequence}
        state={{forEntity: entityId}}
      >
        <FoodSequenceIcon/>
      </Link>
    </Tooltip>
  );
});

interface SeqElemIconProps {
  seqElem: readonly string[] | undefined;
  seqEnd: readonly string[] | undefined;
}

const SeqElemIcon = memo((props: SeqElemIconProps): ReactElement => {
  const {seqElem, seqEnd} = props;

  const tooltipContent = useMemo(() => <>
    {seqElem && <>
      <p>You can put this food inside:</p>
      <SeqElemList sequences={seqElem}/>
    </>}
    {seqEnd && <>
      <p>This food can finish off:</p>
      <SeqElemList sequences={seqEnd}/>
    </>}
  </>, [seqElem, seqEnd]);

  const {visible, popupRef, parentRef} = usePopupTrigger<HTMLDivElement>(
    'above',
    tooltipContent
  );

  return <>
    <span className='recipe_info-icon' ref={parentRef}>
      <FoodSequenceIcon/>
    </span>
    {visible && createPortal(
      <div className='popup popup--foodseq' ref={popupRef}>
        {tooltipContent}
      </div>,
      getPopupRoot()
    )}
  </>;
});

interface SeqElemListProps {
  sequences: readonly string[];
}

const SeqElemList = (props: SeqElemListProps): ReactNode => {
  const {sequences} = props;

  const {foodSequenceStartPoints, entityMap} = useGameData();
  return (
    sequences
      .flatMap(k => foodSequenceStartPoints.get(k)!)
      .map(id => {
        const startEnt = entityMap.get(id)!;
        return (
          <p key={id} className='popup_entity'>
            <EntitySprite id={startEnt.id}/>
            {startEnt.name}
          </p>
        );
      })
  );
};

interface ExploreButtonProps {
  id: string;
}

const ExploreButton = memo((props: ExploreButtonProps): ReactElement => {
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
