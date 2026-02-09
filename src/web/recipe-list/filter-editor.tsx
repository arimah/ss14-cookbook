import { Draft, produce } from 'immer';
import {
  CSSProperties,
  ChangeEvent,
  Dispatch,
  ReactElement,
  ReactNode,
  SetStateAction,
  memo,
  useCallback,
  useMemo,
  useState,
} from 'react';
import { Reagent } from '../../types';
import { Checkbox } from '../checkbox';
import { useGameData } from '../context';
import { NeutralCollator } from '../helpers';
import {
  CollapseIcon,
  ExpandIcon,
  InformationIcon,
  ResetIcon,
  SearchTextIcon,
} from '../icons';
import { InputGroup } from '../input-group';
import { EntitySprite, RawSprite, ReagentSprite } from '../sprites';
import { Tooltip } from '../tooltip';
import { DisplayMethod } from '../types';
import {
  IngredientMode,
  RecipeFilter,
  filterIngredientsByName,
  filterReagentsByName,
} from './filter';

const HideRarelyUsedTooltip = 'Hides ingredients that are only used in a single recipe. You can still find all ingredients by name.';
const GroupFilterTooltip = 'These groups are taken from the game data and are not always correct or intuitive. Each recipe belongs to exactly one group.';

export interface Props {
  open: boolean;
  filter: RecipeFilter;
  setFilter: Dispatch<SetStateAction<RecipeFilter>>;
}

type Updater = (draft: Draft<RecipeFilter>) => void;

export const FilterEditor = memo(({
  open,
  filter,
  setFilter,
}: Props): ReactElement => {
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
        <Tooltip text={HideRarelyUsedTooltip} provideLabel>
          <span className='recipe-search_help'>
            <InformationIcon/>
          </span>
        </Tooltip>
      </div>
      <ModeOption filter={filter} update={updateFilter}/>
      <GroupFilter filter={filter} update={updateFilter}/>
      <TraitFilter filter={filter} update={updateFilter}/>
    </div>
  </>;
});

interface FilterProps {
  filter: RecipeFilter;
  update: (updater: Updater) => void;
}

const MethodFilter = ({ filter, update }: FilterProps): ReactElement => {
  const { methods, subtypes } = filter;

  const { methodSprites, microwaveRecipeTypes } = useGameData();

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
      const index = draft.methods.indexOf(method as DisplayMethod);
      if (index === -1) {
        draft.methods.push(method as DisplayMethod);
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
  readonly method: Exclude<DisplayMethod, 'microwave'>;
  readonly label: string;
  readonly alt: string;
}

const SecondaryMethods: readonly SecondaryMethod[] = [
  { method: 'heat', label: 'Heat', alt: 'grill' },
  { method: 'deepFry', label: 'Deep fry', alt: 'deep fryer' },
  { method: 'mix', label: 'Mix', alt: 'beaker' },
  { method: 'cut', label: 'Cut', alt: 'knife' },
  { method: 'roll', label: 'Roll', alt: 'rolling pin' },
  { method: 'construct', label: 'General', alt: '' },
];

interface IngredientProps {
  hideRarelyUsed: boolean;
}

const IngredientFilter = ({
  filter,
  hideRarelyUsed,
  update,
}: FilterProps & IngredientProps): ReactElement => {
  const { ingredients } = filter;

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

const ReagentFilter = ({
  filter,
  hideRarelyUsed,
  update,
}: FilterProps & IngredientProps): ReactElement => {
  const { reagents } = filter;

  const {
    reagentList: allReagents,
    recipesByReagentIngredient,
  } = useGameData();

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
  }, [update]);

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

const ModeOption = ({ filter, update }: FilterProps): ReactElement => {
  const handleChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    update(draft => {
      draft.ingredientMode = e.target.value as IngredientMode;
    });
  }, [update]);

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

const GroupFilter = ({ filter, update }: FilterProps): ReactElement | null => {
  const { recipeGroups } = useGameData();

  const toggle = useCallback((group: string, newSelected: boolean) => {
    update(draft => {
      if (newSelected) {
        draft.groups.add(group);
      } else {
        draft.groups.delete(group);
      }
    });
  }, [update]);

  if (recipeGroups.length <= 1) {
    // If literally every recipe is in the same group, don't even offer
    // a filter. It's pointless.
    return null;
  }

  return <>
    <span className='recipe-search_label'>
      Group:
    </span>
    <ul className='recipe-search_options recipe-search_options--compact'>
      {recipeGroups.map(group =>
        <FilterOption
          key={group}
          selected={filter.groups.has(group)}
          value={group}
          onClick={toggle}
        >
          {group}
        </FilterOption>
      )}
      <li style={{ alignSelf: 'center' }}>
        <Tooltip text={GroupFilterTooltip} provideLabel>
          <span className='recipe-search_help'>
            <InformationIcon/>
          </span>
        </Tooltip>
      </li>
    </ul>
  </>;
};

const TraitFilter = ({ filter, update }: FilterProps): ReactElement => {
  const { specialTraits } = useGameData();

  const toggle = useCallback((trait: number) => {
    update(draft => {
      draft.specials ^= trait;
    });
  }, [update]);

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

function FilterOption<T>({
  selected,
  value,
  onClick,
  children,
}: FilterOptionProps<T>): ReactElement {
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

const IngredientToolbar = ({
  selectedCount,
  query,
  setQuery,
  expanded,
  setExpanded,
  reset,
}: IngredientToolbarProps): ReactElement =>
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
  </span>;
