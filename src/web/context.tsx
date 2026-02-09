import {
  ReactElement,
  ReactNode,
  createContext,
  memo,
  useContext,
  useMemo,
} from 'react';
import { Entity, GameData, Reagent, Recipe } from '../types';
import { NeutralCollator } from './helpers';
import { SearchableRecipeData } from './types';

export interface GameDataProviderProps {
  forkId: string;
  raw: GameData;
  children: ReactNode;
}

const GameDataContext = createContext<SearchableRecipeData | null>(null);

export const GameDataProvider = memo(({
  forkId,
  raw,
  children,
}: GameDataProviderProps): ReactElement => {
  const value = useMemo<SearchableRecipeData>(() => {
    const entityMap = new Map<string, Entity>();
    for (const entity of raw.entities) {
      entityMap.set(entity.id, entity);
    }

    const reagentMap = new Map<string, Reagent>();
    for (const reagent of raw.reagents) {
      reagentMap.set(reagent.id, reagent);
    }

    const recipeMap = new Map<string, Recipe>();
    const recipesBySolidResult = new Map<string, string[]>();
    const recipesByReagentResult = new Map<string, string[]>();
    const recipesBySolidIngredient = new Map<string, string[]>();
    const recipesByReagentIngredient = new Map<string, string[]>();
    const searchableRecipeNames = new Map<string, string>();
    const recipeGroups = new Set<string>();
    for (const recipe of raw.recipes) {
      recipeMap.set(recipe.id, recipe);
      let name: string | null = null;
      if (recipe.solidResult) {
        appendAtKey(recipesBySolidResult, recipe.solidResult, recipe.id);
        name = entityMap.get(recipe.solidResult)!.name;
      } else if (recipe.reagentResult) {
        appendAtKey(recipesByReagentResult, recipe.reagentResult, recipe.id);
        name = reagentMap.get(recipe.reagentResult)!.name;
      }
      if (name) {
        searchableRecipeNames.set(recipe.id, name.toLowerCase());
      }

      for (const id of Object.keys(recipe.solids)) {
        appendAtKey(recipesBySolidIngredient, id, recipe.id);
      }
      for (const id of Object.keys(recipe.reagents)) {
        appendAtKey(recipesByReagentIngredient, id, recipe.id);
      }

      recipeGroups.add(recipe.group);
    }

    return {
      forkId,

      entityList: raw.entities,
      entityMap,
      reagentList: raw.reagents,
      reagentMap,
      sortingIdRewrites: raw.sortingIdRewrites,
      recipeList: raw.recipes,
      recipeMap,
      recipesBySolidResult,
      recipesByReagentResult,
      recipesBySolidIngredient,
      recipesByReagentIngredient,
      searchableRecipeNames,
      recipeGroups: Array.from(recipeGroups).sort((a, b) =>
        NeutralCollator.compare(a, b)
      ),
      ingredients: raw.ingredients,

      foodSequenceStartPoints: new Map(
        Object.entries(raw.foodSequenceStartPoints)
      ),
      foodSequenceElements: new Map(
        Object.entries(raw.foodSequenceElements)
      ),
      foodSequenceEndPoints: new Map(
        Object.entries(raw.foodSequenceEndPoints)
      ),

      methodSprites: raw.methodSprites,
      beakerFill: raw.beakerFill,
      microwaveRecipeTypes: raw.microwaveRecipeTypes,

      specialTraits: raw.specialTraits,
      renderedTraitCache: new Map(),
    };
  }, [forkId, raw]);

  return (
    <GameDataContext.Provider value={value}>
      {children}
    </GameDataContext.Provider>
  );
});

const appendAtKey = <K, V>(map: Map<K, V[]>, key: K, value: V) => {
  let values = map.get(key);
  if (!values) {
    values = [];
    map.set(key, values);
  }
  values.push(value);
};

export const useGameData = (): SearchableRecipeData => {
  const data = useContext(GameDataContext);
  if (!data) {
    throw new Error('No game data available');
  }
  return data;
};
