import {memo, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';

import {MicrowaveRecipeType, Recipe as RecipeData} from '../../types';

import {useGameData} from '../context';
import {Recipe} from '../recipe';
import {RecipeVisibilityProvider} from '../recipe-visibility-context';
import {InputGroup} from '../input-group';
import {Dropdown, DropdownExtraItem, DropdownOption} from '../dropdown';
import {Tooltip} from '../tooltip';
import {
  ClearFilterIcon,
  FilterActiveIcon,
  FilterIcon,
  SearchIcon,
  SortIcon,
} from '../icons';
import {
  compareDefault,
  compareByName,
  compareByMethod,
  compareByFav,
  chainCompare,
} from '../sort';
import {useIsFavorite} from '../favorites';
import {joinListNatural} from '../helpers';
import {DisplayMethod} from '../types';

import {
  RecipeFilter,
  InitialFilter,
  isFilterActive,
  applyFilter,
  searchByName,
} from './filter';
import {FilterEditor} from './filter-editor';
import {IngredientSuggestions} from './ingredient-filter';

export {searchByName};

type SortOrder = 'default' | 'alpha';

const SortOptions: DropdownOption[] = [
  {value: 'default', name: 'Default order'},
  {value: 'alpha', name: 'Alphabetic'},
];

export const RecipeList = memo((): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    recipeList,
    searchableRecipeNames,
    entityMap,
    reagentMap,
    sortingIdRewrites,
  } = useGameData();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<RecipeFilter>(
    location.state ?? InitialFilter
  );
  const [order, setOrder] = useState<SortOrder>('default');
  const [groupByMethod, setGroupByMethod] = useState(true);
  const [favsFirst, setFavsFirst] = useState(true);

  const isFavorite = useIsFavorite();

  const filteredRecipes = useMemo(() => {
    let recipes = applyFilter(recipeList, filter, entityMap);
    if (/\S/.test(search)) {
      recipes = searchByName(recipes, searchableRecipeNames, search);
    }
    return recipes;
  }, [recipeList, search, filter, searchableRecipeNames]);

  const sortedRecipes = useMemo(() => {
    let compare: (a: RecipeData, b: RecipeData) => number;
    switch (order) {
      case 'default':
        compare = compareDefault(sortingIdRewrites);
        break;
      case 'alpha':
        compare = compareByName(entityMap, reagentMap);
        break;
    }
    if (groupByMethod) {
      compare = chainCompare(compareByMethod, compare);
    }
    if (favsFirst) {
      compare = chainCompare(compareByFav(isFavorite), compare);
    }
    return filteredRecipes.slice(0).sort(compare);
  }, [
    filteredRecipes,
    entityMap,
    reagentMap,
    sortingIdRewrites,
    order,
    groupByMethod,
    favsFirst,
    isFavorite,
  ]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const clearSearch = useCallback(() => {
    setSearch('');
    searchInputRef.current?.focus();
  }, []);

  const [showFilter, setShowFilter] = useState(false);
  const handleToggleFilter = useCallback(() => {
    setShowFilter(f => !f);
  }, []);

  const handleResetFilter = useCallback(() => {
    setFilter(filter => ({
      ...InitialFilter,
      // Retain this setting
      ingredientMode: filter.ingredientMode,
    }));
  }, []);

  const extraSortItems = useMemo<DropdownExtraItem[]>(() => [
    {
      name: 'Group by method',
      checked: groupByMethod,
      activate: () => setGroupByMethod(!groupByMethod),
    },
    {
      name: 'Favourites first',
      checked: favsFirst,
      activate: () => setFavsFirst(!favsFirst),
    },
  ], [groupByMethod, favsFirst]);

  // Save the current filter in the history state so we can recover it
  // if the user navigates away. Stop filters from just getting lost.
  useEffect(() => {
    navigate(location, {
      state: filter,
      replace: true,
    });
  }, [filter]);

  const hasFilter = isFilterActive(filter);

  return (
    <main hidden={!open}>
      <div className='recipe-search'>
        <InputGroup iconBefore={<SearchIcon/>}>
          <input
            type='search'
            aria-label='Search recipes by name'
            placeholder='Search recipes by name...'
            size={1}
            value={search}
            onChange={e => setSearch(e.target.value)}
            ref={searchInputRef}
          />
        </InputGroup>

        <Tooltip
          placement='below'
          text={
            hasFilter
              ? describeFilter(filter)
              : 'Filter by ingredient or method'
          }
        >
          <button
            className={
              hasFilter
                ? 'recipe-search_filter-toggle--active'
                : undefined
            }
            aria-pressed={showFilter}
            aria-expanded={showFilter}
            onClick={handleToggleFilter}
          >
            {hasFilter ? <FilterActiveIcon/> : <FilterIcon/>}
            <span>Filter</span>
          </button>
        </Tooltip>

        <Tooltip placement='below' text='Clear filter'>
          <button disabled={!hasFilter} onClick={handleResetFilter}>
            <ClearFilterIcon/>
          </button>
        </Tooltip>

        <Dropdown
          icon={<SortIcon/>}
          value={order}
          options={SortOptions}
          extraItems={extraSortItems}
          onChange={v => setOrder(v as SortOrder)}
        />

        <FilterEditor
          open={showFilter}
          filter={filter}
          setFilter={setFilter}
        />
      </div>
      <IngredientSuggestions
        search={search}
        filter={filter}
        setFilter={setFilter}
        clearSearch={clearSearch}
      />
      <ResultCount
        search={search}
        filter={filter}
        resultCount={sortedRecipes.length}
        totalCount={recipeList.length}
      />
      <RecipeVisibilityProvider>
        <ul className='recipe-list'>
          {sortedRecipes.map(recipe =>
            <li key={recipe.id}>
              <Recipe id={recipe.id}/>
            </li>
          )}
        </ul>
      </RecipeVisibilityProvider>
    </main>
  );
});

interface ResultCountProps {
  search: string;
  filter: RecipeFilter;
  resultCount: number;
  totalCount: number;
}

const ResultCount = (props: ResultCountProps): JSX.Element => {
  const {search, filter, resultCount, totalCount} = props;

  const {microwaveRecipeTypes, specialTraits} = useGameData();

  const isFiltered = isFilterActive(filter) || resultCount !== totalCount;

  if (!isFiltered) {
    return (
      <p className='recipe-count'>
        Showing all {totalCount} recipes.
      </p>
    );
  }

  if (resultCount > 0) {
    return (
      <p className='recipe-count'>
        Showing {resultCount} of {totalCount} recipes.
      </p>
    );
  }

  let message = 'Couldn’t find any ';

  if (filter.specials !== 0) {
    message += joinListNatural(
      specialTraits
        .filter(t => (t.mask & filter.specials) !== 0)
        .map(t => t.filterSummary),
      ', ',
      ' and '
    ) + ' ';
  }

  if (filter.methods.length > 0) {
    message += joinListNatural(
      filter.methods.map(m =>
        describeMethod(m, filter.subtypes, microwaveRecipeTypes)
      ),
      ', ',
      ' or '
    );
  } else {
    message += 'recipes';
  }

  if (/\S/.test(search)) {
    message += ` with ‘${search.trim()}’ in the name`;
  }

  if (filter.ingredients.size > 0 || filter.reagents.size > 0) {
    switch (filter.ingredientMode) {
      case 'all':
        message += ' that contain all the selected ingredients';
        break;
      case 'any':
        message += ' that contain any of the selected ingredients';
        break;
      case 'only':
        message += ' made from only the selected ingredients';
        break;
    }
  }

  return <p className='recipe-count'>{message}.</p>;
};

const describeMethod = (
  method: DisplayMethod,
  subtypes: readonly string[],
  microwaveSubtypes: Readonly<Record<string, MicrowaveRecipeType>> | null
): string => {
  switch (method) {
    case 'microwave':
      if (microwaveSubtypes && subtypes.length > 0) {
        return joinListNatural(
          subtypes.map(t => microwaveSubtypes[t].filterSummary),
          ', ',
          ' or '
        ) + ' recipes';
      }
      return 'microwave recipes';
    case 'heat':
      return 'heating recipes';
    case 'mix':
      return 'reactions';
    case 'cut':
      return 'cutting recipes';
    case 'roll':
      return 'rolling pin recipes';
    case 'deepFry': // Frontier
      return 'deep-frying recipes';
    case 'construct':
      return 'general recipes';
  }
};

const describeFilter = (filter: RecipeFilter): string => {
  const filters: string[] = [];

  if (filter.methods.length > 0) {
    filters.push(
      filter.methods.length === 1
        ? 'one preparation method'
        : `${filter.methods.length} preparation methods`
    );
  }

  const ingredientCount = filter.ingredients.size + filter.reagents.size;
  if (ingredientCount > 0) {
    let description: string;
    switch (filter.ingredientMode) {
      case 'all':
        description = ingredientCount === 1
          ? 'recipes using the selected ingredient'
          : `recipes using all ${ingredientCount} selected ingredients`;
        break;
      case 'any':
        description = ingredientCount === 1
          ? 'recipes using the selected ingredient'
          : `recipes using any of the ${ingredientCount} selected ingredients`;
        break;
      case 'only':
        description = ingredientCount === 1
          ? 'recipes made from only the selected ingredient'
          : `recipes made from only the ${ingredientCount} selected ingredients`;
        break;
    }
    filters.push(description);
  }

  if (filter.specials !== 0) {
    const specialsCount = countOnes(filter.specials);
    filters.push(
      specialsCount === 1
        ? 'one special property'
        : `${specialsCount} special properties`
    );
  }

  return `Filtering by ${joinListNatural(filters, ', ', ' and ')}`;
};

const countOnes = (value: number): number => {
  // https://graphics.stanford.edu/%7Eseander/bithacks.html#CountBitsSetParallel
  value = value - ((value >>> 1) & 0x55555555);
  value = (value & 0x33333333) + ((value >>> 2) & 0x33333333);
  return ((value + (value >>> 4) & 0xF0F0F0F) * 0x1010101) >> 24;
};
