import {
  CSSProperties,
  ChangeEvent,
  Dispatch,
  ReactNode,
  SetStateAction,
  memo,
  useCallback,
  useMemo,
  useState,
} from 'react';
import {Draft, produce} from 'immer';

import {Reagent, Recipe} from '../../types';

import {useGameData} from '../context';
import {EntitySprite, RawSprite, ReagentSprite} from '../sprites';
import {
  CollapseIcon,
  ExpandIcon,
  ResetIcon,
  SearchTextIcon,
  InformationIcon,
  SaveIcon,
  OpenIcon,
} from '../icons';
import {InputGroup} from '../input-group';
import {Checkbox} from '../checkbox';
import {DropdownList, DropdownListItem} from '../dropdown-list';
import {Tooltip} from '../tooltip';
import {NeutralCollator} from '../helpers';

import {
  RecipeFilter,
  Method,
  IngredientMode,
  filterIngredientsByName,
  filterReagentsByName,
} from './filter';
import {useSavedFilters} from './saved-filters';

export interface Props {
  open: boolean;
  filter: RecipeFilter;
  setFilter: Dispatch<SetStateAction<RecipeFilter>>;
}

type Updater = (draft: Draft<RecipeFilter>) => void;

export const FilterEditor = memo((props: Props): JSX.Element => {
  const {open, filter, setFilter} = props;

  const updateFilter = useCallback((updater: Updater) => {
    setFilter(filter => produce(filter, updater));
  }, []);

  const [hideRarelyUsed, setHideRarelyUsed] = useState(true);

  return <>
    {open && <div className='recipe-search_filter-wedge'/>}
    <div
      className={
        open
          ? 'recipe-search_filter recipe-search_filter--open'
          : 'recipe-search_filter'
      }
    >
      <MethodFilter filter={filter} update={updateFilter}/>
      <IngredientFilter
        filter={filter}
        hideRarelyUsed={hideRarelyUsed}
        update={updateFilter}
      />
      <ReagentFilter
        filter={filter}
        hideRarelyUsed={hideRarelyUsed}
        update={updateFilter}
      />
      <div className='recipe-search_row'>
        <Checkbox
          checked={hideRarelyUsed}
          onChange={e => setHideRarelyUsed(e.target.checked)}
        >
          Hide rarely used ingredients
        </Checkbox>
        <Tooltip
          text='Hides ingredients that are only used in a single recipe. You can still find all ingredients by name.'
          provideLabel
        >
          <span className='recipe-search_help'>
            <InformationIcon/>
          </span>
        </Tooltip>
      </div>
      <ModeOption filter={filter} update={updateFilter}/>
      <TraitFilter
        filter={filter}
        update={updateFilter}
      />
      {/*<FilterActions filter={filter} setFilter={setFilter}/>*/}
    </div>
  </>;
});

interface FilterProps {
  filter: RecipeFilter;
  update: (updater: Updater) => void;
}

const MethodFilter = (props: FilterProps): JSX.Element => {
  const {filter, update} = props;

  const {methods, subtypes} = filter;

  const {methodSprites, microwaveRecipeTypes} = useGameData();

  const microwaveSubtypes = useMemo(() => {
    if (!microwaveRecipeTypes) {
      return null;
    }

    return Object.entries(microwaveRecipeTypes)
      .map(([key, value]) => ({
        key,
        verb: value.verb,
        sprite: value.sprite,
      }));
  }, [microwaveRecipeTypes]);

  const toggle = useCallback((method: string) => {
    update(draft => {
      const index = draft.methods.indexOf(method as Method);
      if (index === -1) {
        draft.methods.push(method as Method);
      } else {
        draft.methods.splice(index, 1);
      }
    });
  }, []);

  const toggleSubtype = useCallback((subtype: string) => {
    update(draft => {
      const index = draft.subtypes.indexOf(subtype);
      if (index === -1) {
        draft.subtypes.push(subtype);
      } else {
        draft.subtypes.splice(index, 1);
      }

      const methodIndex = draft.methods.indexOf('microwave');
      if (index === -1 && methodIndex === -1) {
        // Subtype was added and 'microwave' is not selected: select 'microwave'
        draft.methods.push('microwave');
      } else if (
        index !== -1 &&
        methodIndex !== -1 &&
        draft.subtypes.length === 0
      ) {
        // The last subtype was removed and 'microwave' is selected: remove it
        draft.methods.splice(methodIndex, 1);
      }
    });
  }, []);

  return <>
    <span className='recipe-search_label'>Preparation method:</span>
    <ul className='recipe-search_options recipe-search_options--compact'>
      {microwaveSubtypes ? (
        microwaveSubtypes.map(subtype =>
          <FilterOption
            key={subtype.key}
            value={subtype.key}
            selected={subtypes.includes(subtype.key)}
            onClick={toggleSubtype}
          >
            <RawSprite position={subtype.sprite} alt={subtype.verb}/>
            <span>{subtype.verb}</span>
          </FilterOption>
        )
      ) : (
        <FilterOption
          value='microwave'
          selected={methods.includes('microwave')}
          onClick={toggle}
        >
          <RawSprite position={methodSprites.microwave!} alt='microwave'/>
          <span>Microwave</span>
        </FilterOption>
      )}
      {SecondaryMethods.map(({method, label, alt}) =>
        methodSprites[method] ? (
          <FilterOption
            key={method}
            value={method}
            selected={methods.includes(method)}
            onClick={toggle}
          >
            <RawSprite position={methodSprites[method]} alt={alt}/>
            <span>{label}</span>
          </FilterOption>
        ) : null
      )}
    </ul>
  </>;
};

interface SecondaryMethod {
  readonly method: Exclude<Recipe['method'], 'microwave'>;
  readonly label: string;
  readonly alt: string;
}

const SecondaryMethods: readonly SecondaryMethod[] = [
  {method: 'heat', label: 'Heat', alt: 'grill'},
  {method: 'deepFry', label: 'Deep fry', alt: 'deep fryer'},
  {method: 'mix', label: 'Mix', alt: 'beaker'},
  {method: 'cut', label: 'Cut', alt: 'knife'},
  {method: 'roll', label: 'Roll', alt: 'rolling pin'},
];

interface IngredientProps {
  hideRarelyUsed: boolean;
}

const IngredientFilter = (props: FilterProps & IngredientProps): JSX.Element => {
  const {filter, hideRarelyUsed, update} = props;

  const {ingredients} = filter;

  const {
    ingredients: allIngredients,
    entityMap,
    recipesBySolidIngredient,
  } = useGameData();

  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');

  const sortedIngredients = useMemo(() => {
    let filteredIngredients: string[];
    if (/\S/.test(query)) {
      filteredIngredients = filterIngredientsByName(
        allIngredients,
        entityMap,
        query
      );
    } else if (hideRarelyUsed) {
      filteredIngredients = allIngredients.filter(id => {
        const recipes = recipesBySolidIngredient.get(id);
        return (
          recipes != null && recipes.length > 1 ||
          // Include selected ingredients too
          ingredients.has(id)
        );
      });
    } else {
      filteredIngredients = allIngredients.slice(0);
    }

    return filteredIngredients.sort((a, b) => {
      const nameA = entityMap.get(a)!.name;
      const nameB = entityMap.get(b)!.name;
      return NeutralCollator.compare(nameA, nameB);
    });
  }, [
    allIngredients,
    entityMap,
    recipesBySolidIngredient,
    hideRarelyUsed,
    ingredients,
    expanded,
    query,
  ]);

  const toggle = useCallback((ingredient: string, selected: boolean) => {
    update(draft => {
      if (selected) {
        draft.ingredients.add(ingredient);
      } else {
        draft.ingredients.delete(ingredient);
      }
    });
  }, []);

  const reset = useCallback(() => {
    update(draft => {
      draft.ingredients = new Set();
    });
  }, []);

  return <>
    <span className='recipe-search_label'>Solid ingredients:</span>
    <IngredientToolbar
      selectedCount={ingredients.size}
      query={query}
      setQuery={setQuery}
      expanded={expanded}
      setExpanded={setExpanded}
      reset={reset}
    />
    <ul
      className={
        expanded
          ? 'recipe-search_options recipe-search_options--expanded'
          : 'recipe-search_options'
      }
    >
      {sortedIngredients.length === 0 && (
        <li className='recipe-search_no-match'>
          Couldn’t find any ingredients matching <i>{query}</i>
        </li>
      )}
      {sortedIngredients.map(id =>
        <FilterOption
          key={id}
          value={id}
          selected={ingredients.has(id)}
          onClick={toggle}
        >
          <EntitySprite id={id}/>
          <span>{entityMap.get(id)!.name}</span>
        </FilterOption>
      )}
    </ul>
  </>;
};

const ReagentFilter = (props: FilterProps & IngredientProps): JSX.Element => {
  const {filter, hideRarelyUsed, update} = props;

  const {reagents} = filter;

  const {reagentList: allReagents, recipesByReagentIngredient} = useGameData();

  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');

  const sortedReagents = useMemo(() => {
    let filteredReagents: Reagent[];
    if (/\S/.test(query)) {
      filteredReagents = filterReagentsByName(allReagents, query);
    } else if (hideRarelyUsed) {
      filteredReagents = allReagents.filter(r => {
        const recipes = recipesByReagentIngredient.get(r.id);
        return (
          recipes != null && recipes.length > 1 ||
          // Include selected reagents too
          reagents.has(r.id)
        );
      });
    } else {
      filteredReagents = allReagents.slice(0);
    }

    return filteredReagents.sort((a, b) =>
      NeutralCollator.compare(a.name, b.name)
    );
  }, [
    allReagents,
    recipesByReagentIngredient,
    hideRarelyUsed,
    reagents,
    query,
  ]);

  const toggle = useCallback((reagent: string, selected: boolean) => {
    update(draft => {
      if (selected) {
        draft.reagents.add(reagent);
      } else {
        draft.reagents.delete(reagent);
      }
    });
  }, []);

  const reset = useCallback(() => {
    update(draft => {
      draft.reagents = new Set();
    });
  }, []);

  return <>
    <span className='recipe-search_label'>Reagent ingredients:</span>
    <IngredientToolbar
      selectedCount={reagents.size}
      query={query}
      setQuery={setQuery}
      expanded={expanded}
      setExpanded={setExpanded}
      reset={reset}
    />
    <ul
      className={
        expanded
          ? 'recipe-search_options recipe-search_options--expanded'
          : 'recipe-search_options'
      }
    >
      {sortedReagents.length === 0 && (
        <li className='recipe-search_no-match'>
          Couldn’t find any reagents matching <i>{query}</i>
        </li>
      )}
      {sortedReagents.map(reagent =>
        <FilterOption
          key={reagent.id}
          value={reagent.id}
          selected={reagents.has(reagent.id)}
          onClick={toggle}
        >
          <ReagentSprite id={reagent.id}/>
          <span>{reagent.name}</span>
        </FilterOption>
      )}
    </ul>
  </>;
};

const ModeOption = (props: FilterProps): JSX.Element => {
  const {filter, update} = props;

  const handleChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    update(draft => {
      draft.ingredientMode = e.target.value as IngredientMode;
    });
  }, []);

  return <>
    <label
      className='recipe-search_label'
      htmlFor='recipe-filter-mode'
    >
      Show recipes with:
    </label>
    <div className='recipe-search_mode'>
      <select
        id='recipe-filter-mode'
        value={filter.ingredientMode}
        onChange={handleChange}
      >
        <option value='all'>All of the selected ingredients</option>
        <option value='any'>Any of the selected ingredients</option>
        <option value='only'>Only the selected ingredients</option>
      </select>
    </div>
  </>;
};

const TraitFilter = (props: FilterProps): JSX.Element => {
  const {filter, update} = props;

  const {specialTraits} = useGameData();

  const toggle = useCallback((trait: number) => {
    update(draft => {
      draft.specials ^= trait;
    });
  }, []);

  return <>
    <span className='recipe-search_label'>
      Special property:
    </span>
    <ul className='recipe-search_options recipe-search_options--compact'>
      {specialTraits.map(trait =>
        <FilterOption
          key={trait.mask}
          selected={(trait.mask & filter.specials) !== 0}
          value={trait.mask}
          onClick={toggle}
        >
          <span
            className='recipe_trait'
            style={{'--trait-color': trait.color} as CSSProperties}
          />
          <span/>
          <span>{trait.filterName}</span>
        </FilterOption>
      )}
    </ul>
  </>;
};

interface FilterOptionProps<T> {
  selected: boolean;
  value: T;
  onClick: (value: T, newSelected: boolean) => void;
  children: ReactNode;
}

function FilterOption<T>(props: FilterOptionProps<T>): JSX.Element {
  const {selected, value, onClick, children} = props;
  return (
    <li>
      <button
        className='recipe-search_opt'
        aria-pressed={selected}
        onClick={() => onClick(value, !selected)}
      >
        {children}
      </button>
    </li>
  );
};

interface IngredientToolbarProps {
  selectedCount: number;
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  expanded: boolean;
  setExpanded: Dispatch<SetStateAction<boolean>>;
  reset: () => void;
}

const IngredientToolbar = (props: IngredientToolbarProps): JSX.Element => {
  const {
    selectedCount,
    query,
    setQuery,
    expanded,
    setExpanded,
    reset,
  } = props;
  return (
    <span className='recipe-search_opt-filter'>
      {selectedCount > 0 && <span>{selectedCount} selected</span>}
      <InputGroup iconBefore={<SearchTextIcon/>}>
        <input
          type='search'
          placeholder='Search ingredients...'
          size={1}
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </InputGroup>
      <Tooltip
        text={expanded ? 'Collapse list' : 'Expand list'}
        provideLabel
      >
        <button onClick={() => setExpanded(x => !x)}>
          {expanded ? <CollapseIcon/> : <ExpandIcon/>}
        </button>
      </Tooltip>
      <Tooltip text='Clear selected ingredients' provideLabel>
        <button disabled={selectedCount === 0} onClick={reset}>
          <ResetIcon/>
        </button>
      </Tooltip>
    </span>
  );
};

interface FilterActionsProps {
  filter: RecipeFilter;
  setFilter: Dispatch<SetStateAction<RecipeFilter>>;
}

const FilterActions = (props: FilterActionsProps): JSX.Element => {
  const {filter, setFilter} = props;

  const storage = useSavedFilters();

  const [loadDropdown, setLoadDropdown] = useState<JSX.Element | null>(null);
  const handleLoad = useCallback(() => {
    const filters = storage.loadAll();

    let items: DropdownListItem[] = [];
    if (filters.length > 0) {
      items = filters.map((filter, i) => ({
        name: filter.name,
        activate: close => {
          setFilter(storage.load(i));
          close();
        },
      }));
    } else {
      items = [{
        name: 'Save a filter to load it here',
        activate: close => close(),
      }];
    }

    setLoadDropdown(
      <DropdownList
        className='dropdown_list--above'
        initialIndex={0}
        items={items}
        onClose={() => setLoadDropdown(null)}
      />
    );
  }, []);

  return (
    <div className='recipe-search_row recipe-search_row--actions'>
      <button>
        <SaveIcon/>
        <span>Save filter</span>
      </button>

      <div className='dropdown'>
        <button aria-haspopup='menu' onClick={handleLoad}>
          <OpenIcon/>
          <span>Load filter</span>
        </button>
        {loadDropdown}
      </div>
    </div>
  );
};
