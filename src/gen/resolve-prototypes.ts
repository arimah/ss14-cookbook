import { FluentBundle, FluentResource } from '@fluent/bundle';
import { globSync } from 'glob';
import { resolve } from 'node:path';
import { CookingMethod } from '../types';
import {
  DefaultCookTime,
  DefaultRecipeGroup,
  MixerCategoryToStepType,
} from './constants';
import { ConstructRecipeBuilder } from './construct-recipe-builder';
import { PrunedGameData } from './filter-relevant';
import { readFileTextWithoutTheStupidBOM } from './helpers';
import {
  EntityId,
  MicrowaveMealRecipe,
  Reactant,
  ReactionPrototype,
  ReagentId,
} from './prototypes';
import { getReagentResult, getSolidResult } from './reaction-helpers';
import {
  MethodEntities,
  MicrowaveRecipeTypes,
  ResolvedEntity,
  ResolvedEntityMap,
  ResolvedReagent,
  ResolvedReagentMap,
  ResolvedRecipe,
} from './types';

export interface ResolvedGameData {
  readonly entities: ResolvedEntityMap;
  readonly reagents: ResolvedReagentMap;
  readonly recipes: ReadonlyMap<string, ResolvedRecipe>;
  readonly reagentSources: ReadonlyMap<ReagentId, readonly EntityId[]>;
  readonly methodEntities: ReadonlyMap<CookingMethod, ResolvedEntity>;
  /** Frontier */
  readonly microwaveRecipeTypeEntities: ReadonlyMap<string, ResolvedEntity> | undefined;
}

export const resolvePrototypes = (
  filtered: PrunedGameData,
  allEntities: ResolvedEntityMap,
  localeDir: string,
  methodEntities: MethodEntities,
  microwaveRecipeTypes: MicrowaveRecipeTypes | undefined
): ResolvedGameData => {
  const reagents = new Map<ReagentId, ResolvedReagent>();
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
      resultQty: recipe.resultCount, // Frontier
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

  for (const [id, recipe] of reactionRecipes(filtered.reactions)) {
    recipes.set(id, recipe);
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

  const resolvedMethodEntities = new Map<CookingMethod, ResolvedEntity>();
  for (const [method, id] of Object.entries(methodEntities)) {
    if (id === null) {
      // Unsupported cooking method on this fork, skip it.
      continue;
    }
    resolvedMethodEntities.set(
      method as CookingMethod,
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
    globSync('*/**/*.ftl', { cwd: localeDir })
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
    result[id] = { amount };
  }
  return result;
};

function* reactionRecipes(
  reactions: readonly ReactionPrototype[]
): Generator<[string, ResolvedRecipe]> {
  for (const reaction of reactions) {
    const reagentResult = getReagentResult(reaction);
    const solidResult = getSolidResult(reaction);
    // Add an arbitrary prefix to prevent collisions.
    const id = `r!${reaction.id}`;

    if (
      reaction.requiredMixerCategories &&
      reaction.requiredMixerCategories.length > 0
    ) {
      for (const category of reaction.requiredMixerCategories) {
        const type = MixerCategoryToStepType.get(category);
        if (!type) {
          continue;
        }

        const recipe = new ConstructRecipeBuilder();
        if (reagentResult) {
          recipe
            .withReagentResult(reagentResult[0])
            .withResultQty(reagentResult[1]);
        } else {
          recipe.withSolidResult(solidResult!);
        }

        recipe.mix(reaction.reactants);
        if (reaction.minTemp) {
          recipe.heatMixture(reaction.minTemp, reaction.maxTemp);
        }
        recipe.pushStep({ type });

        yield [`${id}:${type}`, recipe.toRecipe()];
      }
    } else {
      yield [id, {
        method: 'mix',
        solidResult,
        reagentResult: reagentResult?.[0] ?? null,
        resultQty: reagentResult?.[1] ?? 1,
        minTemp: reaction.minTemp ?? 0,
        maxTemp: reaction.maxTemp && isFinite(reaction.maxTemp)
          ? reaction.maxTemp
          : null,
        reagents: reaction.reactants,
        solids: {},
        group: DefaultRecipeGroup,
      }];
    }
  }
}
