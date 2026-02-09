import {
  ReactElement,
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useGameData } from '../context';
import { ArrowDownIcon, ArrowUpIcon, SearchIcon } from '../icons';
import { InputGroup } from '../input-group';
import { Recipe } from '../recipe';
import { searchByName } from '../recipe-list';
import { compareByName } from '../sort';
import { Tooltip } from '../tooltip';
import { RecipeAction } from './edit-recipe-action';

export interface Props {
  recipes: readonly string[];
  onAddRecipe: (id: string) => void;
  onRemoveRecipe: (id: string) => void;
  onMoveRecipe: (fromIndex: number, delta: 1 | -1) => void;
}

export const SelectedRecipes = memo(({
  recipes,
  onAddRecipe,
  onRemoveRecipe,
  onMoveRecipe,
}: Props): ReactElement => {
  const { recipeMap } = useGameData();

  const [query, setQuery] = useState('');

  const availableRecipeCount = recipes.reduce(
    (count, id) => recipeMap.has(id) ? count + 1 : count,
     0
  );

  return (
    <div className='planner_editor-recipes'>
      <h3>Selected Recipes</h3>
      <div className='planner_editor-search'>
        <InputGroup className='planner_editor-query' iconBefore={<SearchIcon/>}>
          <input
            type='search'
            placeholder='Find new recipes by name'
            size={1}
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </InputGroup>
        <SearchResults
          query={query}
          selectedRecipes={recipes}
          onAddRecipe={onAddRecipe}
        />
      </div>

      {availableRecipeCount > 0 ? (
        <ul className='recipe-list'>
          {recipes.map((id, index) => recipeMap.has(id) ? (
            <MenuRecipe
              key={id}
              id={id}
              index={index}
              total={recipes.length}
              onRemove={onRemoveRecipe}
              onMove={onMoveRecipe}
            />
          ) : null)}
        </ul>
      ) : (
        <p>The menu is currently empty. Search for recipes above to add them!</p>
      )}
    </div>
  );
});

interface MenuRecipeProps {
  id: string;
  index: number;
  total: number;
  onRemove: (id: string) => void;
  onMove: (fromIndex: number, delta: 1 | -1) => void;
}

const MenuRecipe = memo(({
  id,
  index,
  total,
  onRemove,
  onMove,
}: MenuRecipeProps): ReactElement => {
  return (
    <li key={id} className='planner_editor-recipe'>
      <div className='planner_editor-recipe-header'>
        <Tooltip text='Move up' provideLabel>
          <button
            disabled={index === 0}
            onClick={() => onMove(index, -1)}
          >
            <ArrowUpIcon/>
          </button>
        </Tooltip>
        <Tooltip text='Move down' provideLabel>
          <button
            disabled={index === total - 1}
            onClick={() => onMove(index, 1)}
          >
            <ArrowDownIcon/>
          </button>
        </Tooltip>
      </div>
      <Recipe
        id={id}
        canFavorite={false}
        headerAction={
          <RecipeAction id={id} isSelected onRemove={onRemove}/>
        }
      />
    </li>
  );
});

interface SearchResultsProps {
  query: string;
  selectedRecipes: readonly string[];
  onAddRecipe: (id: string) => void;
}

interface PageInfo {
  readonly limit: number;
  readonly query: string;
}

const RecipesPerPage = 8;

const DefaultPage: PageInfo = {
  limit: RecipesPerPage,
  query: '',
};

const SearchResults = memo(({
  query,
  selectedRecipes,
  onAddRecipe,
}: SearchResultsProps): ReactElement | null => {
  const {
    recipeList: allRecipes,
    searchableRecipeNames,
    entityMap,
    reagentMap,
  } = useGameData();

  const compare = useMemo(
    () => compareByName(entityMap, reagentMap),
    [entityMap, reagentMap]
  );

  const results = useMemo(() => {
    if (/\S/.test(query)) {
      let results = searchByName(allRecipes, searchableRecipeNames, query);
      // Exclude already selected recipes
      results = results.filter(res => !selectedRecipes.includes(res.id));
      results.sort(compare);
      return results;
    }
    return null;
  }, [query, selectedRecipes, searchableRecipeNames, compare]);

  const [page, setPage] = useState(DefaultPage);

  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTo(0, 0);
    }
  }, [query]);

  if (results === null) {
    return null;
  }

  const limit = getLimit(page, query);

  const showMore = () => {
    setPage({
      limit: limit + RecipesPerPage,
      query,
    });
  };

  return (
    <div className='planner_editor-results-wrapper'>
      <ul className='planner_editor-results thin-scroll' ref={listRef}>
        {results.slice(0, limit).map(recipe =>
          <li key={recipe.id}>
            <Recipe
              id={recipe.id}
              canFavorite={false}
              headerAction={
                <RecipeAction id={recipe.id} onAdd={onAddRecipe}/>
              }
            />
          </li>
        )}
        {results.length > limit && (
          <li>
            <button onClick={showMore}>
              More results...
            </button>
          </li>
        )}
        {results.length === 0 && (
          <li className='planner_editor-no-matches'>
            Couldn’t find any new recipes with <i>{query}</i> in the name.
          </li>
        )}
      </ul>
    </div>
  );
});

const getLimit = (page: PageInfo, currentQuery: string): number =>
  page.query === currentQuery
    ? page.limit
    : DefaultPage.limit;
