import { customAlphabet } from 'nanoid';
import { Ref, RefObject, useMemo } from 'react';
import { Recipe } from '../types';
import { DisplayMethod } from './types';

export const NeutralCollator = new Intl.Collator('en-US');

export const displayMethod = (recipe: Recipe): DisplayMethod => {
  switch (recipe.method) {
    case 'microwave':
    case 'mix':
    case 'deepFry':
      return recipe.method;
    case 'construct':
      return recipe.mainVerb ?? 'construct';
  }
};

/**
 * Tests whether a recipe contains ANY solid ingredient from the
 * specified set.
 *
 * If the recipe has no solid ingredients, it will NOT match.
 */
export const recipeHasAnyIngredient = (
  recipe: Recipe,
  ingredients: ReadonlySet<string>
): boolean => {
  for (const id in recipe.solids) {
    if (ingredients.has(id)) {
      return true;
    }
  }
  return false;
};

/**
 * Tests whether a recipe contains ALL the solid ingredients in the
 * specified set.
 *
 * If the recipe has no solid ingredients, it will NOT match.
  */
export const recipeHasAllIngredients = (
  recipe: Recipe,
  ingredients: ReadonlySet<string>
): boolean => {
  if (ingredients.size === 0) {
    return true;
  }

  let matching = 0;
  for (const id in recipe.solids) {
    if (ingredients.has(id)) {
      matching++;
    }
  }
  return matching === ingredients.size;
};

/**
 * Tests whether a recipe contains ONLY solid ingredients from the
 * specified set. Put differently, ensures that the recipe does NOT
 * contain any solid ingredients that are NOT in the set.
 *
 * Note: If the recipe has no solid ingredients, it will MATCH.
 */
export const recipeHasOnlyIngredients = (
  recipe: Recipe,
  ingredients: ReadonlySet<string>
): boolean => {
  for (const id in recipe.solids) {
    if (!ingredients.has(id)) {
      return false;
    }
  }
  return true;
};

/**
 * Tests whether a recipe contains ANY reagents from the specified
 * set.
 *
 * If the recipe has no reagents, it will NOT match.
 */
export const recipeHasAnyReagent = (
  recipe: Recipe,
  reagents: ReadonlySet<string>
): boolean => {
  for (const id in recipe.reagents) {
    if (reagents.has(id)) {
      return true;
    }
  }
  return false;
};

/**
 * Tests whether a recipe contains ALL the reagents in the specified
 * set.
 *
 * If the recipe has no reagents, it will NOT match.
  */
export const recipeHasAllReagents = (
  recipe: Recipe,
  reagents: ReadonlySet<string>
): boolean => {
  if (reagents.size === 0) {
    return true;
  }

  let matching = 0;
  for (const id in recipe.reagents) {
    if (reagents.has(id)) {
      matching++;
    }
  }
  return matching === reagents.size;
};

/**
 * Tests whether a recipe contains ONLY reagents from the specified
 * set. Put differently, ensures that the recipe does NOT contain any
 * reagents that are NOT in the set.
 *
 * Note: If the recipe has no reagents, then null is returned.
 */
export const recipeHasOnlyReagents = (
  recipe: Recipe,
  reagents: ReadonlySet<string>
): boolean | null => {
  for (const id in recipe.reagents) {
    if (!reagents.has(id)) {
      return false;
    }
  }
  return true;
};

export const joinListNatural = (
  values: readonly string[],
  sep: string,
  lastSep: string
): string => {
  if (values.length === 1) {
    return values[0];
  }

  let lastIndex = values.length - 1;
  let result = '';
  for (let i = 0; i < values.length; i++) {
    if (i > 0) {
      if (i === lastIndex) {
        result += lastSep;
      } else {
        result += sep;
      }
    }
    result += values[i];
  }

  return result;
};

export const intersperse = <T>(values: readonly T[], sep: T): T[] => {
  const result: T[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i > 0) {
      result.push(sep);
    }
    result.push(values[i]);
  }
  return result;
};

/**
 * Deduplicates an array, keeping the *first* occurrence of each value.
 * This algorithm is O(n^2) and only suitable for small values of n.
 */
export const dedupe = <T>(values: readonly T[]): T[] =>
  values.filter((x, i, all) => all.indexOf(x) === i)

type ValidRef<T> =
  { bivarianceHack(instance: T | null): void }['bivarianceHack'] |
  RefObject<T>;

export const combineRefs = <T>(
  ...refs: (Ref<T> | undefined)[]
): Ref<T> => {
  const validRefs = refs.filter(Boolean) as ValidRef<T>[];

  switch (validRefs.length) {
    case 0:
      return null;
    case 1:
      return validRefs[0];
    default:
      return elem => {
        validRefs.forEach(ref => {
          if (typeof ref === 'function') {
            ref(elem);
          } else {
            ref.current = elem as T;
          }
        });
      };
  }
}

// HTML IDs can technically contain any character, but all ASCII is safest, and
// you should avoid starting the ID with a digit. Hence, just letters here.
//
// 10 letters gives us 144,555,105,949,057,024 combinations, which is probably
// more than enough.
const genId = customAlphabet(
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  10
);

/**
 * Returns a unique, random string value that is suitable for use as a generic
 * ID value. The returned value is consistent between renders (using `useMemo`).
 * The returned value contains only letters A-Z and a-z.
 * @return The generate ID.
 */
export const useUniqueId = (): string => useMemo(genId, []);

export const GitHubCommitUrl = (repo: string, commit: string): string =>
  `https://github.com/${repo}/tree/${commit}`;

export const GitHubFolderUrl = (
  repo: string,
  commit: string,
  path: string
): string =>
  `https://github.com/${repo}/tree/${commit}/${path}`;

export const tryCopyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    console.warn('navigator.clipboard.writeText() failed:', e);
    return false;
  }
};

export const tryPasteFromClipboard = async (): Promise<string | null> => {
  try {
    return await navigator.clipboard.readText();
  } catch (e) {
    console.warn('navigator.clipboard.readText() failed:', e);
    return null;
  }
};
