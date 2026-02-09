import { Dispatch, SetStateAction } from 'react';
import { Entity, Reagent, Recipe } from '../../types';
import {
  displayMethod,
  recipeHasAllIngredients,
  recipeHasAllReagents,
  recipeHasAnyIngredient,
  recipeHasAnyReagent,
  recipeHasOnlyIngredients,
  recipeHasOnlyReagents,
} from '../helpers';
import { DisplayMethod } from '../types';

export interface RecipeFilter {
  /** Empty list = include all methods. */
  readonly methods: readonly DisplayMethod[];
  /** Frontier. Empty list = don't filter by subtype. */
  readonly subtypes: readonly string[];
  /** Empty set = include all ingredients. */
  readonly ingredients: ReadonlySet<string>;
  /** Empty set = include all reagents. */
  readonly reagents: ReadonlySet<string>;
  /**
   * Determines how ingredients are matched:
   *
   * - 'all': Must contain ALL selected ingredients and reagents.
   * - 'any': Must contain ANY of the selected ingredients and reagents (in any
   *   combination, i.e. some could be missing).
   * - 'only': Must contain ONLY the selected ingredients and reagents, in any
   *   combination. Will also include recipes that can be made indirectly using
   *   the selected ingredients and reagents.
   */
  readonly ingredientMode: IngredientMode;
  /** Empty set = include all groups. */
  readonly groups: ReadonlySet<string>;
  /**
   * A bit mask that matches against special traits.
   * 0 = match all.
   */
  readonly specials: number;
}

export type UpdateFilterFn = Dispatch<SetStateAction<RecipeFilter>>;

export type IngredientMode = 'all' | 'any' | 'only';

export const InitialFilter: RecipeFilter = {
  methods: [],
  subtypes: [],
  ingredients: new Set(),
  reagents: new Set(),
  ingredientMode: 'all',
  groups: new Set(),
  specials: 0,
};

export const searchByName = (
  recipes: readonly Recipe[],
  recipeNames: ReadonlyMap<string, string>,
  query: string
): Recipe[] => {
  query = prepareSearchQuery(query);
  return recipes.filter(recipe => {
    const name = recipeNames.get(recipe.id)!;
    return name.includes(query);
  });
};

export const isFilterActive = (filter: RecipeFilter): boolean =>
  filter.methods.length > 0 ||
  filter.subtypes.length > 0 ||
  filter.ingredients.size > 0 ||
  filter.reagents.size > 0 ||
  filter.groups.size > 0 ||
  filter.specials !== 0;

export const applyFilter = (
  recipes: readonly Recipe[],
  filter: RecipeFilter,
  entityMap: ReadonlyMap<string, Entity>
): readonly Recipe[] => {
  if (!isFilterActive(filter)) {
    return recipes;
  }

  if (filter.ingredients.size > 0 || filter.reagents.size > 0) {
    switch (filter.ingredientMode) {
      case 'all':
        recipes = filterAllIngredients(recipes, filter);
        break;
      case 'any':
        recipes = filterAnyIngredients(recipes, filter);
        break;
      case 'only':
        recipes = filterOnlyIngredients(recipes, filter);
        break;
    }
  }

  recipes = applyNonIngredientFilter(recipes, filter, entityMap);

  return recipes;
};

const applyNonIngredientFilter = (
  recipes: readonly Recipe[],
  filter: RecipeFilter,
  entityMap: ReadonlyMap<string, Entity>
): readonly Recipe[] => {
  // "Wow, this code is so inefficient!"
  // You're damned right it is.
  if (filter.methods.length > 0) {
    recipes = recipes.filter(recipe =>
      filter.methods.includes(displayMethod(recipe))
    );
  }
  if (filter.subtypes.length > 0) {
    recipes = recipes.filter(recipe =>
      recipe.method === 'microwave' &&
      recipe.subtype != null && (
        typeof recipe.subtype === 'string'
          ? filter.subtypes.includes(recipe.subtype)
          : recipe.subtype.some(t => filter.subtypes.includes(t))
      )
    );
  }
  if (filter.groups.size > 0) {
    recipes = recipes.filter(recipe =>
      filter.groups.has(recipe.group)
    );
  }
  if (filter.specials !== 0) {
    recipes = recipes.filter(recipe => {
      if (!recipe.solidResult) {
        return false;
      }
      const solid = entityMap.get(recipe.solidResult)!;
      return (solid.traits & filter.specials) === filter.specials;
    });
  }
  return recipes;
};

const filterAnyIngredients = (
  recipes: readonly Recipe[],
  filter: RecipeFilter
): readonly Recipe[] =>
  recipes.filter(recipe =>
    recipeHasAnyIngredient(recipe, filter.ingredients) ||
    recipeHasAnyReagent(recipe, filter.reagents)
  );

const filterAllIngredients = (
  recipes: readonly Recipe[],
  filter: RecipeFilter
): readonly Recipe[] =>
  recipes.filter(recipe =>
    recipeHasAllIngredients(recipe, filter.ingredients) &&
    recipeHasAllReagents(recipe, filter.reagents)
  );

const filterOnlyIngredients = (
  recipes: readonly Recipe[],
  filter: RecipeFilter
): readonly Recipe[] => {
  // The way this works is just a little bit funky.
  //
  // Let's say you search for anything that can be made with only flour,
  // water and meat. Then the starting state is:
  //
  //   ingredients = ['FoodMeatRaw']
  //   reagents    = ['Flour', 'Water']
  //
  // We search for recipes using only those ingredients, finding 'dough'
  // and 'raw cutlet'. Not too helpful. Then we re-search all the *other*
  // recipes for anything that can be made with meat, flour, water, dough
  // and raw cutlet.
  //
  //   ingredients = ['FoodMeatRaw', 'FoodMeatRawCutlet', 'FoodDough']
  //   reagents    = ['Flour', 'Water']
  //
  // Now we find bread, dough slice, sausage bread, and so on. Add those
  // to the list of ingredients (or reagents, for reagent recipe results)
  // and keep going until we find nothing new. The search space shrinks
  // for each new set of ingredients, as we only ever search recipes that
  // were NOT previously known to be possible.
  //
  // This algorithm is still far from perfect, and in particular, has a
  // decently high allocation cost. Thankfully the number of recipes is
  // pretty small.
  const matching: Recipe[] = [];

  const ingredients = new Set(filter.ingredients);
  const reagents = new Set(filter.reagents);

  // NOTE: Special case! Egg can easily be cracked into raw egg. If you
  // say you have egg, include raw egg implicitly.
  if (ingredients.has('FoodEgg')) {
    reagents.add('Egg');
  }

  let hasNewIngredients: boolean;
  let searchSpace = recipes;
  do {
    hasNewIngredients = false;
    let nextSearchSpace: Recipe[] = [];
    for (const recipe of searchSpace) {
      if (
        recipeHasOnlyIngredients(recipe, ingredients) &&
        recipeHasOnlyReagents(recipe, reagents)
      ) {
        matching.push(recipe);
        hasNewIngredients = true;
        if (recipe.solidResult) {
          ingredients.add(recipe.solidResult);
        }
        if (recipe.reagentResult) {
          reagents.add(recipe.reagentResult);
        }
      } else {
        nextSearchSpace.push(recipe);
      }
    }

    searchSpace = nextSearchSpace;
  } while (hasNewIngredients);

  return matching;
};

export const filterIngredientsByName = (
  ingredients: readonly string[],
  map: ReadonlyMap<string, Entity>,
  query: string
): string[] => {
  query = prepareSearchQuery(query);
  return ingredients.filter(id => {
    const name = map.get(id)!.name;
    return name.toLowerCase().includes(query);
  });
};

export const filterReagentsByName = (
  reagents: readonly Reagent[],
  query: string
): Reagent[] => {
  query = prepareSearchQuery(query);
  return reagents.filter(r => r.name.toLowerCase().includes(query));
};

export const prepareSearchQuery = (query: string): string =>
  query.trim().replace(/\s+/, ' ').toLowerCase();
