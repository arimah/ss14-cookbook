import {
  DefaultTotalSliceCount,
  IgnoredSpecialRecipes,
  IgnoreSourcesOf,
  ForceIncludeReagentSources,
} from './constants';
import {RawGameData} from './read-raw';
import {getReagentResult, getSolidResult} from './reaction-helpers';
import {Solution, SolutionContainerManagerComponent} from './components';
import {entityAndAncestors} from './helpers';
import {
  SpecialDiet,
  EntityPrototype,
  ReagentPrototype,
  MicrowaveMealRecipe,
  ReactionPrototype,
  ResolvedSpecialRecipe,
  ConstructionGraphPrototype,
} from './types';

export interface PrunedGameData {
  readonly entities: ReadonlyMap<string, EntityPrototype>;
  readonly reagents: ReadonlyMap<string, ReagentPrototype>;
  readonly recipes: readonly MicrowaveMealRecipe[];
  readonly reactions: readonly ReactionPrototype[];
  readonly specialRecipes: ReadonlyMap<string, ResolvedSpecialRecipe>;
  readonly reagentSources: ReadonlyMap<string, readonly string[]>;
}

export const filterRelevantPrototypes = (
  raw: RawGameData,
  specialDiets: SpecialDiet[],
  ignoredRecipes: ReadonlySet<string>
): PrunedGameData => {
  const usedEntities = new Set<string>();
  const usedReagents = new Set<string>();
  const recipes: MicrowaveMealRecipe[] = [];
  const specialRecipes = new Map<string, ResolvedSpecialRecipe>();

  for (const recipe of raw.recipes) {
    if (ignoredRecipes.has(recipe.id)) {
      continue;
    }

    usedEntities.add(recipe.result);

    if (recipe.solids) {
      for (const id of Object.keys(recipe.solids)) {
        const stack = raw.stacks.get(id);
        if (stack) {
          usedEntities.add(stack.spawn);
        } else {
          usedEntities.add(id);
        }
      }
    }

    if (recipe.reagents) {
      for (const id of Object.keys(recipe.reagents)) {
        usedReagents.add(id);
      }
    }

    recipes.push(recipe);
  }

  const reactions = new Map<string, ReactionPrototype>();

  // And now we have to go through *every* entity to find sliceable foods
  // and other special recipes, as well as every reaction.
  let hasAnythingNew: boolean;
  do {
    hasAnythingNew = false;
    for (const entity of raw.entities.values()) {
      if (tryAddSpecialRecipe(
        entity,
        raw.entities,
        raw.constructionGraphs,
        specialRecipes,
        usedEntities
      )) {
        hasAnythingNew = true;
      }
    }
  } while (hasAnythingNew);

  do {
    hasAnythingNew = false;
    for (const reaction of raw.reactions) {
      if (tryAddReaction(
        reactions,
        reaction,
        usedEntities,
        usedReagents,
        raw.reagents
      )) {
        hasAnythingNew = true;
      }
    }
  } while (hasAnythingNew);

  const reagentSources = new Map<string, string[]>();

  for (const entity of raw.entities.values()) {
    const sourceOf = findGrindableProduceReagents(
      entity,
      raw.entities,
      usedReagents
    );
    if (sourceOf && sourceOf.length > 0) {
      usedEntities.add(entity.id);
      for (const reagentId of sourceOf) {
        if (IgnoreSourcesOf.has(reagentId)) {
          continue;
        }

        let sources = reagentSources.get(reagentId);
        if (!sources) {
          sources = [];
          reagentSources.set(reagentId, sources);
        }
        sources.push(entity.id);
      }
    }
  }

  for (const [reagentId, sources] of ForceIncludeReagentSources) {
    if (!usedReagents.has(reagentId)) {
      continue;
    }
    let sourceList = reagentSources.get(reagentId);
    if (!sourceList) {
      sourceList = [];
      reagentSources.set(reagentId, sourceList);
    }

    for (const entityId of sources) {
      if (!usedEntities.has(entityId)) {
        continue;
      }
      sourceList.push(entityId);
    }
  }

  for (const diet of specialDiets) {
    usedEntities.add(diet.organ);
  }

  const entities = new Map<string, EntityPrototype>();
  for (const id of usedEntities) {
    const entity = raw.entities.get(id);
    if (!entity) {
      throw new Error(`Could not resolve entity: ${id}`);
    }
    entities.set(id, entity);
  }

  const reagents = new Map<string, ReagentPrototype>();
  for (const id of usedReagents) {
    const reagent = raw.reagents.get(id);
    if (!reagent) {
      throw new Error(`Could not resolve reagent: ${id}`);
    }
    reagents.set(id, reagent);
  }

  return {
    entities,
    reagents,
    recipes,
    reactions: Array.from(reactions.values()),
    specialRecipes,
    reagentSources,
  };
};

interface SliceableState {
  slice?: string;
  count?: number;
}

interface ConstructionState {
  graph?: string;
  node?: string;
  edge?: number;
  step?: number;
}

/** Frontier */
interface DeepFryState {
  output?: string;
}

const tryAddSpecialRecipe = (
  entity: EntityPrototype,
  allEntities: ReadonlyMap<string, EntityPrototype>,
  allConstructionGraphs: ReadonlyMap<string, ConstructionGraphPrototype>,
  specialRecipes: Map<string, ResolvedSpecialRecipe>,
  usedEntities: Set<string>
): boolean => {
  const sliceableState: SliceableState = {};
  const constructionState: ConstructionState = {};
  const deepFryState: DeepFryState = {}; // Frontier

  for (const ent of entityAndAncestors(entity, allEntities)) {
    if (ent.components) {
      for (const comp of ent.components) {
        switch (comp.type) {
          case 'SliceableFood':
            Object.assign(sliceableState, comp);
            break;
          case 'Construction':
            Object.assign(constructionState, comp);
            break;
          case 'DeepFrySpawn':
            Object.assign(deepFryState, comp);
            break;
        }
      }
    }
  }

  // NOTE: We CANNOT treat slicing and constructing as mutually exclusive!
  // FoodDough can be cut into FoodDoughSlice *or* rolled into FoodDoughFlat.
  let addedAnything = false;

  // If this entity can be sliced to something that's used as an ingredient
  // (e.g. cheese wheel to cheese slice), then add a special recipe for it
  // *and* mark the current entity as used so we can find recipes for it.
  //
  // Note: We ignore things that can be sliced into non-ingredients, or we'd
  // end up with totally pointless cut recipes for every single type of cake
  // and pie, etc.
  if (sliceableState.slice && usedEntities.has(sliceableState.slice)) {
    const recipeId = `cut!${entity.id}`;
    if (!specialRecipes.has(recipeId)) {
      usedEntities.add(entity.id);
      specialRecipes.set(recipeId, {
        method: 'cut',
        solidResult: sliceableState.slice,
        maxCount: sliceableState.count ?? DefaultTotalSliceCount,
        solids: {
          [entity.id]: 1,
        },
        reagentResult: null,
        reagents: {},
      });
      addedAnything = true;
    }
  }

  // If this entity can be constructed into something relevant, then add a
  // special recipe *and* mark the entity as used so we can find recipes
  // for it.
  const constructed = traverseConstructionGraph(
    entity.id,
    constructionState,
    allConstructionGraphs
  );
  if (constructed) {
    const {method, solidResult} = constructed;
    const recipeId = `${method}!${entity.id}`;
    const shouldAddRecipe =
      !specialRecipes.has(recipeId) &&
      !IgnoredSpecialRecipes.has(recipeId) &&
      (
        // Rolling must produce an ingredient, e.g. dough to flat dough
        method === 'roll' && usedEntities.has(solidResult) ||
        // Heating produces things that don't have to be ingredients, e.g.
        // steak or boiled egg.
        method === 'heat'
      );
    if (shouldAddRecipe) {
      usedEntities.add(solidResult);
      usedEntities.add(entity.id);
      specialRecipes.set(recipeId, constructed);
      addedAnything = true;
    }
  }

  // Frontier: If the entity has a DeepFrySpawn, we can deep fry it. Crispy.
  if (deepFryState.output) {
    const recipeId = `deepFry!${entity.id}`;
    if (!specialRecipes.has(recipeId)) {
      usedEntities.add(entity.id);
      usedEntities.add(deepFryState.output);
      specialRecipes.set(recipeId, {
        method: 'deepFry',
        solidResult: deepFryState.output,
        solids: {
          [entity.id]: 1,
        },
        reagentResult: null,
        reagents: {},
      });
    }
  }

  return addedAnything;
};

const tryAddReaction = (
  reactions: Map<string, ReactionPrototype>,
  reaction: ReactionPrototype,
  usedEntities: Set<string>,
  usedReagents: Set<string>,
  allReagents: ReadonlyMap<string, ReagentPrototype>
): boolean => {
  if (reactions.has(reaction.id)) {
    // We already have this reaction, don't process it again
    return false;
  }

  // Some reactions can only occur in centrifuges, electrolysers and, for
  // whatever reason, by being bashed with a bible. We ignore any reaction
  // that has such prerequisites.
  if (
    reaction.requiredMixerCategories != null &&
    reaction.requiredMixerCategories.length !== 0
  ) {
    return false;
  }

  // We only add reactions that produce exactly one reagent xor
  // exactly one solid (entity). Something like the ambuzol+ reaction
  // yields two reagents (ambuzol+ and blood), so would never be included
  // by this code. To my knowledge there are no reactions that spawn
  // multiple entities, but we can't rule out the possibility that
  // such a reaction might be added in future.
  const reagentResult = getReagentResult(reaction);
  const solidResult = getSolidResult(reaction);

  if (!reagentResult === !solidResult) {
    // We have neither or both: can't do anything, just return.
    return false;
  }

  const needsReaction =
    // We need this reaction if anything uses the reagent it produces...
    (
      reagentResult &&
      usedReagents.has(reagentResult[0]) &&
      isFoodRelatedReagent(allReagents.get(reagentResult[0])!)
    ) ||
    // ... or if anything uses the *solid* it produces.
    solidResult && usedEntities.has(solidResult);
  if (!needsReaction) {
    return false;
  }

  reactions.set(reaction.id, reaction);

  // Now we must go through this reaction's reactants, and add any that haven't
  // already been added by a recipe or other reaction. If we add new reagents,
  // we must visit the entire reaction list again to find if anything makes
  // those reagents, until we run out of reactions or new reagents.
  let hasNewReagents = false;
  for (const id of Object.keys(reaction.reactants)) {
    if (!usedReagents.has(id)) {
      usedReagents.add(id);
      hasNewReagents = true;
    }
  }
  return hasNewReagents;
};

const isFoodRelatedReagent = (reagent: ReagentPrototype): boolean =>
  reagent.group !== 'Medicine' &&
  reagent.group !== 'Narcotics' &&
  reagent.group !== 'Toxins';

const traverseConstructionGraph = (
  entityId: string,
  state: ConstructionState,
  allConstructionGraphs: ReadonlyMap<string, ConstructionGraphPrototype>
): ResolvedSpecialRecipe | undefined => {
  if (
    state.graph == null || state.node == null ||
    // We can't handle entities in the middle of construction
    state.edge != null || state.step != null
  ) {
    return undefined;
  }

  const graph = allConstructionGraphs.get(state.graph);
  if (!graph) {
    console.warn(
      `Entity '${entityId}': Unknown construction graph: ${state.graph}`
    );
    return undefined;
  }

  // This construction graph traversal is *extremely* simplified compared to
  // what the game does, because we're only really looking for simple things.
  //
  // An entity is considered rollable if the start node (state.node) has an edge
  // with one single step that uses a 'Rolling' tool with no conditions or
  // actions that leads to a target node with a different entity. That's it.
  // Nothing fancy.
  const startNode = graph.graph.find(n => n.node === state.node);
  if (!startNode || !startNode.edges) {
    // Broken construction graph or we're at an end node with no edges
    return undefined;
  }

  for (const edge of startNode.edges) {
    if (edge.conditions && edge.conditions.length > 0) {
      // Can't currently handle conditions
      continue;
    }
    const target = graph.graph.find(n => n.node === edge.to);
    if (!target) {
      // Broken construction graph :(
      continue;
    }

    const {steps} = edge;
    if (
      steps.length === 1 &&
      target.entity != null &&
      target.entity !== entityId
    ) {
      const step = steps[0];
      if (step.tool === 'Rolling') {
        return {
          method: 'roll',
          solidResult: target.entity,
          solids: {
            [entityId]: 1,
          },
          reagentResult: null,
          reagents: {},
        };
      }
      if (step.minTemperature != null && step.maxTemperature == null) {
        return {
          method: 'heat',
          minTemp: step.minTemperature,
          solidResult: target.entity,
          solids: {
            [entityId]: 1,
          },
          reagentResult: null,
          reagents: {},
        };
      }
    }
  }

  return undefined;
};

const findGrindableProduceReagents = (
  entity: EntityPrototype,
  allEntities: ReadonlyMap<string, EntityPrototype>,
  usedReagents: Set<string>
): string[] | null => {
  let produce = false;
  let grindableSolutionName: string | null = null;
  let juiceableSolution: Solution | null = null;
  let solutions: SolutionContainerManagerComponent | null = null;

  for (const ent of entityAndAncestors(entity, allEntities)) {
    if (ent.components) {
      for (const comp of ent.components) {
        switch (comp.type) {
          case 'SolutionContainerManager':
            solutions = comp;
            break;
          case 'Produce':
            produce = true;
            break;
          case 'Extractable':
            grindableSolutionName = comp.grindableSolutionName ?? null;
            if (comp.juiceSolution) {
              juiceableSolution = comp.juiceSolution;
            }
            break;
        }
      }
    }
  }

  if (!produce) {
    // Don't show random grindable objects, just plants that can be grown.
    return null;
  }

  const foundSolutions: Solution[] = [];

  const grindSolution =
    grindableSolutionName &&
    solutions &&
    solutions.solutions &&
    solutions.solutions[grindableSolutionName];
  if (grindSolution && grindSolution.reagents) {
    foundSolutions.push(grindSolution);
  }
  if (juiceableSolution && juiceableSolution.reagents) {
    foundSolutions.push(juiceableSolution);
  }

  if (foundSolutions.length === 0) {
    return null;
  }

  return foundSolutions.flatMap(solution =>
    solution.reagents!
      .map(reagent => reagent.ReagentId)
      .filter(id => usedReagents.has(id))
  );
};
