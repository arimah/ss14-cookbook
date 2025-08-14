import {resolve} from 'path';

import {FluentBundle, FluentResource} from '@fluent/bundle';
import {globSync} from 'glob';

import {Recipe} from '../types';

import {PrunedGameData} from './filter-relevant';
import {
  DefaultCookTime,
  DefaultRecipeGroup,
} from './constants';
import {getReagentResult, getSolidResult} from './reaction-helpers';
import {MicrowaveMealRecipe, Reactant} from './prototypes';
import {readFileTextWithoutTheStupidBOM} from './helpers';
import {
  MethodEntities,
  MicrowaveRecipeTypes,
  ResolvedEntity,
  ResolvedReagent,
  ResolvedRecipe,
} from './types';

export interface ResolvedGameData {
  readonly entities: ReadonlyMap<string, ResolvedEntity>;
  readonly reagents: ReadonlyMap<string, ResolvedReagent>;
  readonly recipes: ReadonlyMap<string, ResolvedRecipe>;
  readonly reagentSources: ReadonlyMap<string, readonly string[]>;
  readonly methodEntities: ReadonlyMap<Recipe['method'], ResolvedEntity>;
  /** Frontier */
  readonly microwaveRecipeTypeEntities: ReadonlyMap<string, ResolvedEntity> | undefined;
}

export const resolvePrototypes = (
  filtered: PrunedGameData,
  allEntities: ReadonlyMap<string, ResolvedEntity>,
  localeDir: string,
  methodEntities: MethodEntities,
  microwaveRecipeTypes: MicrowaveRecipeTypes | undefined
): ResolvedGameData => {
  const reagents = new Map<string, ResolvedReagent>();
  const recipes = new Map<string, ResolvedRecipe>();

  const fluentBundle = createFluentBundle(localeDir);

  const defaultMicrowaveRecipeType = microwaveRecipeTypes &&
    Object.entries(microwaveRecipeTypes)
      .find(([k, v]) => v.default)
      ?.[0];

  for (const recipe of filtered.recipes) {
    recipes.set(recipe.id, {
      method: 'microwave',
      time: recipe.time ?? DefaultCookTime,
      solidResult: recipe.result,
      reagentResult: null,
      solids: recipe.solids ?? {},
      reagents: recipe.reagents
        ? convertMicrowaveReagents(recipe.reagents)
        : {},
      subtype: resolveRecipeSubtype(recipe, defaultMicrowaveRecipeType),
      group: recipe.group ?? DefaultRecipeGroup,
    });
  }

  for (const [id, recipe] of filtered.specialRecipes) {
    recipes.set(id, recipe);
  }

  for (const reaction of filtered.reactions) {
    const reagentResult = getReagentResult(reaction);
    // Add an arbitrary prefix to prevent collisions.
    const id = `r!${reaction.id}`;
    recipes.set(id, {
      method: 'mix',
      reagentResult: reagentResult?.[0] ?? null,
      resultAmount: reagentResult?.[1] ?? 0,
      solidResult: getSolidResult(reaction),
      minTemp: reaction.minTemp ?? 0,
      maxTemp: reaction.maxTemp && isFinite(reaction.maxTemp)
        ? reaction.maxTemp
        : null,
      reagents: reaction.reactants,
      solids: {},
      group: DefaultRecipeGroup,
    });
  }

  for (const reagent of filtered.reagents.values()) {
    const nameMessage = fluentBundle.getMessage(reagent.name);
    const name = nameMessage?.value
      ? fluentBundle.formatPattern(nameMessage.value)
      : reagent.id;
    reagents.set(reagent.id, {
      name,
      color: reagent.color ?? '#ffffff',
    });
  }

  const resolvedMethodEntities = new Map<Recipe['method'], ResolvedEntity>();
  for (const [method, id] of Object.entries(methodEntities)) {
    if (id === null) {
      // Unsupported cooking method on this fork, skip it.
      continue;
    }
    resolvedMethodEntities.set(
      method as Recipe['method'],
      allEntities.get(id)!
    );
  }

  let microwaveRecipeTypeEntities: Map<string, ResolvedEntity> | undefined;
  if (microwaveRecipeTypes) {
    microwaveRecipeTypeEntities = new Map<string, ResolvedEntity>();
    for (const [subtype, subtypeData] of Object.entries(microwaveRecipeTypes)) {
      microwaveRecipeTypeEntities.set(
        subtype,
        allEntities.get(subtypeData.machine)!
      );
    }
  }

  return {
    entities: filtered.entities,
    reagents,
    recipes,
    reagentSources: filtered.reagentSources,
    methodEntities: resolvedMethodEntities,
    microwaveRecipeTypeEntities,
  };
};

const resolveRecipeSubtype = (
  recipe: MicrowaveMealRecipe,
  defaultSubtype: string | undefined
): string | readonly string[] | undefined => {
  const subtype = recipe.recipeType;
  if (Array.isArray(subtype)) {
    switch (subtype.length) {
      case 0:
        return defaultSubtype;
      case 1:
        return subtype[0];
      default:
        return subtype;
    }
  }
  return subtype ?? defaultSubtype;
};

const createFluentBundle = (localeDir: string): FluentBundle => {
  const ftlPaths =
    globSync('*/**/*.ftl', {cwd: localeDir})
      .map(filePath => resolve(localeDir, filePath))

  const bundle = new FluentBundle('en-US', {
    useIsolating: false,
  });

  for (const path of ftlPaths) {
    const source = readFileTextWithoutTheStupidBOM(path);
    const resource = new FluentResource(source);
    bundle.addResource(resource);
  }

  return bundle;
};

const convertMicrowaveReagents = (
  reagents: Readonly<Record<string, number>>
): Record<string, Reactant> => {
  const result: Record<string, Reactant> = {};
  for (const [id, amount] of Object.entries(reagents)) {
    result[id] = {amount};
  }
  return result;
};
