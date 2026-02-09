import { Draft } from 'immer';
import { Entity, Reagent, Recipe } from '../../types';
import { BaseIngredient, Ingredient } from './types';

export const findIngredients = (
  selectedRecipes: readonly string[],
  recipes: ReadonlyMap<string, Recipe>,
  bySolidResult: ReadonlyMap<string, readonly string[]>,
  byReagentResult: ReadonlyMap<string, readonly string[]>,
  reagents: ReadonlyMap<string, Reagent>
): Ingredient[] => {
  const result = new Map<string, Draft<Ingredient>>();

  const visited = new Set<string>();
  let batch = new Set(selectedRecipes);
  let nextBatch: Set<string>;
  do {
    nextBatch = new Set<string>();

    for (const recipeId of batch) {
      visited.add(recipeId);

      const recipe = recipes.get(recipeId);
      if (!recipe) {
        continue;
      }

      for (const entityId of Object.keys(recipe.solids)) {
        const ingredient = resolveIngredient(result, 'solid', entityId);
        addIngredient(
          ingredient,
          recipeId,
          bySolidResult.get(entityId),
          nextBatch,
          visited,
        );
      }
      for (const reagentId of Object.keys(recipe.reagents)) {
        const ingredient = resolveIngredient(result, 'reagent', reagentId);
        addIngredient(
          ingredient,
          recipeId,
          byReagentResult.get(reagentId),
          nextBatch,
          visited,
        );

        const reagent = reagents.get(reagentId)!;
        for (const source of reagent.sources) {
          const sourceIngredient = resolveIngredient(result, 'solid', source);
          sourceIngredient.sourceOfReagent.add(reagentId);
        }
      }
    }

    batch = nextBatch;
  } while (batch.size > 0);

  return Array.from(result.values()).filter(ingredient => {
    // If the ingredient has no recipes, we should always show it
    if (ingredient.recipes.length === 0) {
      return true;
    }
    // If the ingredient has recipes, we should filter out those that are
    // already selected. If we end up with zero recipes, it means they've
    // all been selected, so we hide the ingredient altogether.
    ingredient.recipes = ingredient.recipes.filter(id =>
      !selectedRecipes.includes(id)
    );
    return ingredient.recipes.length > 0;
  });
};

const resolveIngredient = (
  ingredients: Map<string, Draft<Ingredient>>,
  type: 'solid' | 'reagent',
  id: string
): Draft<Ingredient> => {
  const ingredientId = `${type}:${id}`;
  let ingredient = ingredients.get(ingredientId);
  if (!ingredient) {
    const baseIngredient: Draft<BaseIngredient> = {
      id: ingredientId,
      recipes: [],
      usedBy: new Set(),
      sourceOfReagent: new Set(),
    };
    ingredient = type === 'solid'
      ? { type, entityId: id, ...baseIngredient }
      : { type, reagentId: id, ...baseIngredient };
    ingredients.set(ingredientId, ingredient);
  }
  return ingredient;
};

const addIngredient = (
  ingredient: Draft<Ingredient>,
  usedBy: string,
  recipes: readonly string[] | undefined,
  newRecipes: Set<string>,
  visitedRecipes: Set<string>
) => {
  ingredient.usedBy.add(usedBy);

  if (recipes) {
    ingredient.recipes = recipes as string[];
    for (const recipeId of recipes) {
      if (!visitedRecipes.has(recipeId)) {
        newRecipes.add(recipeId);
      }
    }
  }
};

export const ingredientName = (
  ingredient: Ingredient,
  entities: ReadonlyMap<string, Entity>,
  reagents: ReadonlyMap<string, Reagent>
) => {
  switch (ingredient.type) {
    case 'solid':
      return entities.get(ingredient.entityId)!.name;
    case 'reagent':
      return reagents.get(ingredient.reagentId)!.name;
  }
};
