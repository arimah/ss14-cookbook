import {resolve} from 'path';

import Jimp from 'jimp';
import {FluentBundle, FluentResource} from '@fluent/bundle';
import {globSync} from 'glob';

import {Recipe} from '../types';

import {PrunedGameData} from './filter-relevant';
import {ColorWhite, DefaultCookTime, DefaultRecipeGroup} from './constants';
import {getReagentResult, getSolidResult} from './reaction-helpers';
import {
  SolutionContainerManagerComponent,
  SpriteComponent,
  StomachComponent,
  TagComponent,
} from './components';
import {EntityPrototype, MicrowaveMealRecipe, Reactant} from './prototypes';
import {entityAndAncestors, readFileTextWithoutTheStupidBOM} from './helpers';
import {
  MethodEntities,
  MicrowaveRecipeTypes,
  ResolvedEntity,
  ResolvedReagent,
  ResolvedRecipe,
  ResolvedSpriteLayerState,
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

interface SpriteComponentState {
  path: string | null;
  state: string | null;
  color: string | null;
  layers: {
    sprite: string | null;
    state: string;
    color: string | null;
    visible: boolean;
  }[];
}

interface FoodState {
  reagents: Set<string>;
  tags: Set<string>;
}

interface StomachState {
  specialDigestibleTags: readonly string[];
  specialDigestibleComponents: readonly string[];
}

export const resolvePrototypes = (
  filtered: PrunedGameData,
  allEntities: ReadonlyMap<string, EntityPrototype>,
  localeDir: string,
  methodEntities: MethodEntities,
  microwaveRecipeTypes: MicrowaveRecipeTypes | undefined
): ResolvedGameData => {
  const entities = new Map<string, ResolvedEntity>();
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

  for (const entity of filtered.entities.values()) {
    entities.set(entity.id, resolveEntity(entity, allEntities));
  }

  const resolvedMethodEntities = new Map<Recipe['method'], ResolvedEntity>();
  for (const [method, id] of Object.entries(methodEntities)) {
    if (id === null) {
      // Unsupported cooking method on this fork, skip it.
      continue;
    }
    const entity = allEntities.get(id)!;
    resolvedMethodEntities.set(
      method as Recipe['method'],
      resolveEntity(entity, allEntities)
    );
  }

  let microwaveRecipeTypeEntities: Map<string, ResolvedEntity> | undefined;
  if (microwaveRecipeTypes) {
    microwaveRecipeTypeEntities = new Map<string, ResolvedEntity>();
    for (const [subtype, subtypeData] of Object.entries(microwaveRecipeTypes)) {
      const entity = allEntities.get(subtypeData.machine)!;
      microwaveRecipeTypeEntities.set(
        subtype,
        resolveEntity(entity, allEntities)
      );
    }
  }

  return {
    entities,
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

const resolveEntity = (
  entity: EntityPrototype,
  allEntities: ReadonlyMap<string, EntityPrototype>
): ResolvedEntity => {
  const resolved = resolveComponents(entity, allEntities);
  const {name, sprite, food, stomach, allComponents} = resolved;

  const spriteLayers: ResolvedSpriteLayerState[] = [];
  if (sprite.state && sprite.path) {
    spriteLayers.push({
      state: sprite.state,
      path: sprite.path,
      // Base sprite is always treated as white, so we get the base color
      // through the outer `color`.
      color: ColorWhite,
    });
  }
  spriteLayers.push(
    ...sprite.layers
      .filter(s =>
        s.visible !== false &&
        (s.sprite != null || sprite.path != null)
      )
      .map(s => ({
        path: s.sprite ?? sprite.path!,
        state: s.state,
        color: s.color ? Jimp.cssColorToHex(s.color) : ColorWhite,
      }))
  );

  return {
    id: entity.id,
    name,
    color: sprite.color ? Jimp.cssColorToHex(sprite.color) : ColorWhite,
    spriteLayers,
    tags: food.tags,
    reagents: food.reagents,
    specialDigestibleTags: stomach?.specialDigestibleTags,
    specialDigestibleComponents: stomach?.specialDigestibleComponents,
    components: allComponents,
  };
};

interface ResolvedComponents {
  name: string;
  sprite: SpriteComponentState;
  food: FoodState;
  stomach?: StomachState;
  allComponents: Set<string>;
}

const resolveComponents = (
  entity: EntityPrototype,
  allEntities: ReadonlyMap<string, EntityPrototype>
): ResolvedComponents => {
  const state: ResolvedComponents = {
    name: '(name unknown)',
    sprite: {
      path: null,
      state: null,
      color: null,
      layers: [],
    },
    food: {
      tags: new Set(),
      reagents: new Set(),
    },
    allComponents: new Set(),
  };

  for (const ent of entityAndAncestors(entity, allEntities)) {
    if (ent.name) {
      state.name = ent.name;
    }

    if (ent.components) {
      for (const comp of ent.components) {
        state.allComponents.add(comp.type);
        switch (comp.type) {
          case 'Sprite':
            resolveSprite(state.sprite, comp);
            break;
          case 'SolutionContainerManager':
            resolveReagents(state.food, comp);
            break;
          case 'Tag':
            resolveTags(state.food, comp);
            break;
          case 'Stomach':
            if (!state.stomach) {
              state.stomach = {
                specialDigestibleTags: [],
                specialDigestibleComponents: [],
              };
            }
            resolveStomach(ent.id, state.stomach, comp);
            break;
        }
      }
    }
  }

  return state;
};

const resolveSprite = (
  sprite: SpriteComponentState,
  comp: SpriteComponent
) => {
  if (comp.sprite != null) {
    sprite.path = comp.sprite;
  }
  if (comp.state != null) {
    sprite.state = comp.state;
  }
  if (comp.color != null) {
    sprite.color = comp.color;
  }
  if (comp.layers != null) {
    sprite.layers = comp.layers
      .reduce((layers, layer, i) => {
        const prev = sprite.layers[i] ?? {};

        if (layer.sprite) {
          prev.sprite = layer.sprite;
        }
        if (layer.state) {
          prev.state = layer.state;
        }
        if (typeof layer.visible === 'boolean') {
          prev.visible = layer.visible;
        }
        if (layer.color) {
          prev.color = layer.color;
        }

        layers[i] = prev;
        return layers;
      }, [] as SpriteComponentState['layers']);
  }
};

const resolveReagents = (
  food: FoodState,
  comp: SolutionContainerManagerComponent
) => {
  // FIXME: Probably shouldn't assume the food solution is called `food`,
  // but in practice, it always is. Revisit if things start breaking...
  const foodSol = comp.solutions?.food;
  if (foodSol != null && foodSol.reagents != null) {
    food.reagents = new Set(foodSol.reagents.map(r => r.ReagentId));
  }
};

const resolveTags = (
  food: FoodState,
  comp: TagComponent
) => {
  if (comp.tags) {
    food.tags = new Set(comp.tags);
  }
};

const resolveStomach = (
  entityId: string,
  stomach: StomachState,
  comp: StomachComponent
) => {
  const whitelist = comp.specialDigestible;
  if (whitelist != null) {
    if (whitelist.sizes) {
      console.warn(
        `Entity '${entityId}': Stomach has unsupported size whitelist`
      );
    }

    if (whitelist.tags) {
      stomach.specialDigestibleTags = whitelist.tags;
    }
    if (whitelist.components) {
      stomach.specialDigestibleComponents = whitelist.components;
    }
  }
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
