import {Entity, Reagent, Recipe} from '../types';

import {NeutralCollator} from './helpers';

export type CompareFn = (a: Recipe, b: Recipe) => number;

export const compareDefault = (
  rewrites: Readonly<Record<string, string>>
): CompareFn =>
  (a, b) => {
    // Solids come before reagents.
    if ((a.solidResult === null) !== (b.solidResult === null)) {
      return +!a.solidResult - +!b.solidResult;
    }

    const solidA = a.solidResult ?? '';
    const solidB = b.solidResult ?? '';
    let r = NeutralCollator.compare(
      rewrites[solidA] ?? solidA,
      rewrites[solidB] ?? solidB
    );
    if (r !== 0) {
      return r;
    }

    r = NeutralCollator.compare(a.reagentResult ?? '', b.reagentResult ?? '');
    if (r !== 0) {
      return r;
    }

    // The two recipes make the same thing. Compare by recipe ID as the
    // final fallback.
    return NeutralCollator.compare(a.id, b.id);
};

export const compareByName = (
  entities: ReadonlyMap<string, Entity>,
  reagents: ReadonlyMap<string, Reagent>
): CompareFn =>
  (a, b) => {
    const nameA = getRecipeName(a, entities, reagents);
    const nameB = getRecipeName(b, entities, reagents);
    return NeutralCollator.compare(nameA, nameB);
  };

export const getRecipeName = (
  recipe: Recipe,
  entities: ReadonlyMap<string, Entity>,
  reagents: ReadonlyMap<string, Reagent>
): string =>
  recipe.solidResult
    ? entities.get(recipe.solidResult)!.name
    : reagents.get(recipe.reagentResult!)!.name;

const MethodOrder: Readonly<Record<Recipe['method'], number>> = {
  microwave: 0,
  heat: 1,
  deepFry: 2,
  mix: 3,
  cut: 4,
  roll: 5,
};

export const compareByMethod: CompareFn = (a, b) =>
  MethodOrder[a.method] - MethodOrder[b.method];

export const compareByFav = (isFavorite: (id: string) => boolean): CompareFn =>
  (a, b) => +isFavorite(b.id) - +isFavorite(a.id);

export const chainCompare = (
  primary: CompareFn,
  secondary: CompareFn
): CompareFn =>
  (a, b) => {
    let r = primary(a, b);
    if (r === 0) {
      r = secondary(a, b);
    }
    return r;
  };
