import { produce } from 'immer';
import {
  Dispatch,
  MouseEvent,
  ReactElement,
  ReactNode,
  SetStateAction,
  memo,
  useCallback,
  useMemo,
} from 'react';
import { Entity, Reagent } from '../../types';
import { useGameData } from '../context';
import { EntitySprite, ReagentSprite } from '../sprites';
import { RecipeFilter, prepareSearchQuery } from './filter';

export interface Props {
  search: string;
  filter: RecipeFilter;
  setFilter: Dispatch<SetStateAction<RecipeFilter>>;
  clearSearch: () => void;
}

type SearchResult =
  | ['solid', Entity]
  | ['reagent', Reagent];

export const IngredientSuggestions = memo(({
  search,
  filter,
  setFilter,
  clearSearch,
}: Props): ReactElement | null => {
  const { entityMap, ingredients, reagentList } = useGameData();

  const results = useMemo(() => {
    const results: SearchResult[] = [];
    if (/\S/.test(search)) {
      const query = prepareSearchQuery(search);
      for (const id of ingredients) {
        const entity = entityMap.get(id)!;
        if (entity.name.toLowerCase().includes(query)) {
          results.push(['solid', entity]);
        }
      }

      for (const reagent of reagentList) {
        if (reagent.name.toLowerCase().includes(query)) {
          results.push(['reagent', reagent]);
        }
      }
    }
    return results;
  }, [entityMap, ingredients, reagentList, search]);

  const toggleIngredient = useCallback(([kind, value]: SearchResult) => {
    setFilter(produce(draft => {
      const set = kind === 'solid' ? draft.ingredients : draft.reagents;
      if (!set.delete(value.id)) {
        set.add(value.id);
      }
    }));
    clearSearch();
  }, []);

  if (results.length === 0) {
    return null;
  }

  return (
    <div className='recipe-ingredients'>
      <span>Filter by ingredient:</span>
      <ul className='recipe-ingredients_list'>
        {results.map(result =>
          <Suggestion
            key={`${result[0]}-${result[1].id}`}
            value={result}
            selected={isSuggestionSelected(result, filter)}
            onClick={toggleIngredient}
          />
        )}
      </ul>
    </div>
  );
});

const isSuggestionSelected = (
  result: SearchResult,
  filter: RecipeFilter
): boolean => {
  switch (result[0]) {
    case 'solid':
      return filter.ingredients.has(result[1].id);
    case 'reagent':
      return filter.reagents.has(result[1].id);
  }
};

interface SuggestionProps {
  value: SearchResult;
  selected: boolean;
  onClick: (value: SearchResult) => void;
}

const Suggestion = memo(({
  value,
  selected,
  onClick,
}: SuggestionProps): ReactElement => {
  let icon: ReactNode;
  switch (value[0]) {
    case 'solid':
      icon = <EntitySprite id={value[1].id}/>;
      break;
    case 'reagent':
      icon = <ReagentSprite id={value[1].id}/>;
      break;
  }

  return (
    <li>
      <button
        aria-pressed={selected}
        onMouseDown={preventFocus}
        onClick={() => onClick(value)}
      >
        {icon}
        <span>{value[1].name}</span>
      </button>
    </li>
  );
});

const preventFocus = (e: MouseEvent): void => {
  e.preventDefault();
};
