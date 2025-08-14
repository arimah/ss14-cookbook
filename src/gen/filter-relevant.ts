import {DefaultRecipeGroup} from './constants';
import {RawGameData} from './read-raw';
import {getReagentResult, getSolidResult} from './reaction-helpers';
import {Solution} from './components';
import {
  ReagentPrototype,
  MicrowaveMealRecipe,
  ReactionPrototype,
  ConstructionGraphPrototype,
} from './prototypes';
import {
  ResolvedSpecialRecipe,
  ResolvedEntity,
  ResolvedConstruction,
} from './types';

export interface PrunedGameData {
  readonly entities: ReadonlyMap<string, ResolvedEntity>;
  readonly reagents: ReadonlyMap<string, ReagentPrototype>;
  readonly recipes: readonly MicrowaveMealRecipe[];
  readonly reactions: readonly ReactionPrototype[];
  readonly specialRecipes: ReadonlyMap<string, ResolvedSpecialRecipe>;
  readonly reagentSources: ReadonlyMap<string, readonly string[]>;
}

export interface FilterParams {
  ignoredRecipes: ReadonlySet<string>;
  ignoredSpecialRecipes: ReadonlySet<string>;
  ignoreSourcesOf: ReadonlySet<string>;
  forceIncludeReagentSources: ReadonlyMap<string, readonly string[]>;
}

export const filterRelevantPrototypes = (
  raw: Omit<RawGameData, 'entities'>,
  allEntities: ReadonlyMap<string, ResolvedEntity>,
  params: FilterParams
): PrunedGameData => {
  const usedEntities = new Set<string>();
  const usedReagents = new Set<string>();
  const recipes: MicrowaveMealRecipe[] = [];
  const specialRecipes = new Map<string, ResolvedSpecialRecipe>();

  for (const recipe of raw.recipes) {
    if (params.ignoredRecipes.has(recipe.id)) {
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
    for (const entity of allEntities.values()) {
      if (tryAddSpecialRecipe(
        entity,
        specialRecipes,
        usedEntities,
        raw.constructionGraphs,
        params.ignoredSpecialRecipes
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

  for (const entity of allEntities.values()) {
    const sourceOf = findGrindableProduceReagents(entity, usedReagents);
    if (sourceOf && sourceOf.length > 0) {
      usedEntities.add(entity.id);
      for (const reagentId of sourceOf) {
        if (params.ignoreSourcesOf.has(reagentId)) {
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

  for (const [reagentId, sources] of params.forceIncludeReagentSources) {
    if (!usedReagents.has(reagentId)) {
      continue;
    }
    let sourceList = reagentSources.get(reagentId);
    if (!sourceList) {
      sourceList = [];
      reagentSources.set(reagentId, sourceList);
    }

    for (const entityId of sources) {
      usedEntities.add(entityId);
      sourceList.push(entityId);
    }
  }

  const entities = new Map<string, ResolvedEntity>();
  for (const id of usedEntities) {
    const entity = allEntities.get(id);
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

const tryAddSpecialRecipe = (
  entity: ResolvedEntity,
  specialRecipes: Map<string, ResolvedSpecialRecipe>,
  usedEntities: Set<string>,
  allConstructionGraphs: ReadonlyMap<string, ConstructionGraphPrototype>,
  ignoredSpecialRecipes: ReadonlySet<string>
): boolean => {
  // NOTE: We CANNOT treat slicing and constructing as mutually exclusive!
  // FoodDough can be cut into FoodDoughSlice *or* rolled into FoodDoughFlat.
  let addedAnything = false;

  const {sliceableFood, construction, deepFryOutput} = entity;

  // If this entity can be sliced to something that's used as an ingredient
  // (e.g. cheese wheel to cheese slice), then add a special recipe for it
  // *and* mark the current entity as used so we can find recipes for it.
  //
  // Note: We ignore things that can be sliced into non-ingredients, or we'd
  // end up with totally pointless cut recipes for every single type of cake
  // and pie, etc.
  if (
    sliceableFood?.slice != null &&
    usedEntities.has(sliceableFood.slice)
  ) {
    const recipeId = `cut!${entity.id}`;
    if (!specialRecipes.has(recipeId)) {
      usedEntities.add(entity.id);
      specialRecipes.set(recipeId, {
        method: 'cut',
        solidResult: sliceableFood.slice,
        maxCount: sliceableFood.count,
        solids: {
          [entity.id]: 1,
        },
        reagentResult: null,
        reagents: {},
        group: DefaultRecipeGroup,
      });
      addedAnything = true;
    }
  }

  // If this entity can be constructed into something relevant, then add a
  // special recipe *and* mark the entity as used so we can find recipes
  // for it.
  for (const constructed of traverseConstructionGraph(
    entity.id,
    construction,
    allConstructionGraphs
  )) {
    const {method, solidResult} = constructed;
    const recipeId = `${method}!${entity.id}`;
    const shouldAddRecipe =
      !specialRecipes.has(recipeId) &&
      !ignoredSpecialRecipes.has(recipeId) &&
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
  if (deepFryOutput) {
    const recipeId = `deepFry!${entity.id}`;
    if (!specialRecipes.has(recipeId)) {
      usedEntities.add(entity.id);
      usedEntities.add(deepFryOutput);
      specialRecipes.set(recipeId, {
        method: 'deepFry',
        solidResult: deepFryOutput,
        solids: {
          [entity.id]: 1,
        },
        reagentResult: null,
        reagents: {},
        group: DefaultRecipeGroup,
      });
      addedAnything = true;
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

function* traverseConstructionGraph(
  entityId: string,
  constr: ResolvedConstruction | null,
  allConstructionGraphs: ReadonlyMap<string, ConstructionGraphPrototype>
): Generator<ResolvedSpecialRecipe> {
  if (
    !constr ||
    constr.graph == null || constr.node == null ||
    // We can't handle entities in the middle of construction
    constr.edge != null || constr.step != null
  ) {
    return;
  }

  const graph = allConstructionGraphs.get(constr.graph);
  if (!graph) {
    console.warn(
      `Entity '${entityId}': Unknown construction graph: ${constr.graph}`
    );
    return;
  }

  // This construction graph traversal is *extremely* simplified compared to
  // what the game does, because we're only really looking for simple things.
  //
  // An entity is considered rollable if the start node (state.node) has an edge
  // with one single step that uses a 'Rolling' tool with no conditions or
  // actions that leads to a target node with a different entity. That's it.
  // Nothing fancy.
  const startNode = graph.graph.find(n => n.node === constr.node);
  if (!startNode || !startNode.edges) {
    // Broken construction graph or we're at an end node with no edges
    return;
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
      steps.length !== 1 || // No support for multi-step construction
      target.entity == null ||
      target.entity === entityId
    ) {
      continue;
    }

    const step = steps[0];
    if (step.tool === 'Rolling') {
      yield {
        method: 'roll',
        solidResult: target.entity,
        solids: {
          [entityId]: 1,
        },
        reagentResult: null,
        reagents: {},
        group: DefaultRecipeGroup,
      };
    }
    if (step.minTemperature != null && step.maxTemperature == null) {
      yield {
        method: 'heat',
        minTemp: step.minTemperature,
        solidResult: target.entity,
        solids: {
          [entityId]: 1,
        },
        reagentResult: null,
        reagents: {},
        group: DefaultRecipeGroup,
      };
    }
  }
}

const findGrindableProduceReagents = (
  entity: ResolvedEntity,
  usedReagents: Set<string>
): string[] | null => {
  const {isProduce, extractable, solution} = entity;

  if (
    !extractable ||
    !solution ||
    // Don't show random grindable objects, just plants that can be grown.
    !isProduce
  ) {
    return null;
  }

  const foundSolutions: Solution[] = [];

  const grindSolution =
    extractable.grindSolutionName &&
    solution[extractable.grindSolutionName];
  if (grindSolution && grindSolution.reagents) {
    foundSolutions.push(grindSolution);
  }
  if (extractable.juiceSolution?.reagents) {
    foundSolutions.push(extractable.juiceSolution);
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
