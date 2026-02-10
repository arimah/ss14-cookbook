import { OneOrMoreEntities } from '../types';
import { EntitySpawnEntry, Solution } from './components';
import { DefaultRecipeGroup, MixerCategoryToStepType } from './constants';
import { ConstructRecipeBuilder } from './construct-recipe-builder';
import {
  ConstructionGraphMap,
  EntityId,
  FoodSequenceElementId,
  FoodSequenceElementMap,
  FoodSequenceElementPrototype,
  MetamorphRecipeMap,
  MicrowaveMealRecipe,
  MicrowaveMealRecipeId,
  ReactionId,
  ReactionPrototype,
  ReagentId,
  ReagentMap,
  ReagentPrototype,
  StackId,
  StackMap,
  TagId,
} from './prototypes';
import { getReagentResult, getSolidResult } from './reaction-helpers';
import { RawGameData } from './read-raw';
import {
  ResolvedConstruction,
  ResolvedConstructionRecipe,
  ResolvedEntity,
  ResolvedEntityMap,
  ResolvedSpecialRecipe,
} from './types';

export interface PrunedGameData {
  readonly entities: ResolvedEntityMap;
  readonly reagents: ReagentMap;
  readonly recipes: readonly MicrowaveMealRecipe[];
  readonly reactions: readonly ReactionPrototype[];
  readonly specialRecipes: ReadonlyMap<string, ResolvedSpecialRecipe>;
  readonly reagentSources: ReadonlyMap<ReagentId, readonly EntityId[]>;
  readonly foodSequenceStartPoints: ReadonlyMap<TagId, readonly EntityId[]>;
  readonly foodSequenceElements: ReadonlyMap<TagId, readonly EntityId[]>;
  readonly foodSequenceEndPoints: ReadonlyMap<TagId, readonly EntityId[]>;
}

export interface FilterParams {
  ignoredRecipes: ReadonlySet<MicrowaveMealRecipeId>;
  ignoredSpecialRecipes: ReadonlySet<string>;
  ignoredFoodSequenceElements: ReadonlySet<EntityId>;
  ignoreSourcesOf: ReadonlySet<ReagentId>;
  forceIncludeReagentSources: ReadonlyMap<ReagentId, readonly EntityId[]>;
}

export const filterRelevantPrototypes = (
  raw: Omit<RawGameData, 'entities'>,
  allEntities: ResolvedEntityMap,
  params: FilterParams
): PrunedGameData => {
  const usedEntities = new Set<EntityId>();
  const usedReagents = new Set<ReagentId>();
  const specialRecipes = new Map<string, ResolvedSpecialRecipe>();

  // First, collect microwave recipes. These are part of the "root set":
  // from these, we get an initial set of entities and reagents that are
  // relevant to the cookbook.
  const recipes = collectMicrowaveRecipes(
    raw.recipes,
    usedEntities,
    usedReagents,
    raw.stacks,
    params.ignoredRecipes
  );

  // Next, we'll add metamorph recipes. These are the second part of the
  // root set of relevant entities and reagents.
  addMetamorphRecipes(
    raw.metamorphRecipes,
    specialRecipes,
    usedEntities,
    usedReagents,
    allEntities,
    raw.foodSequenceElements
  );

  const reactions = new Map<ReactionId, ReactionPrototype>();

  // And now we have to go through *every* entity to find special recipes:
  // cutting, rolling, heating, construction, and more.
  let hasAnythingNew: boolean;
  do {
    hasAnythingNew = false;
    for (const entity of allEntities.values()) {
      if (tryAddSpecialRecipes(
        entity,
        specialRecipes,
        usedEntities,
        usedReagents,
        allEntities,
        raw.constructionGraphs,
        params.ignoredSpecialRecipes
      )) {
        hasAnythingNew = true;
      }
    }
  } while (hasAnythingNew);

  // Now let's find reactions for all the reagents we've collected.
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

  // And now we collect *sources* of reagents.
  const reagentSources = collectReagentSources(
    allEntities,
    usedEntities,
    usedReagents,
    params.ignoreSourcesOf,
    params.forceIncludeReagentSources
  );

  // We know the total set of relevant entities now, so we'll use that
  // to collect food sequence information, i.e. what can be put inside
  // which food sequence start point.
  const foodSequences = collectFoodSequences(
    usedEntities,
    allEntities,
    params.ignoredFoodSequenceElements
  );

  // Lastly, we'll resolve the entity and reagent IDs to actual entities
  // and reagents, respectively.
  const entities = new Map<EntityId, ResolvedEntity>();
  for (const id of usedEntities) {
    const entity = allEntities.get(id);
    if (!entity) {
      throw new Error(`Could not resolve entity: ${id}`);
    }
    entities.set(id, entity);
  }

  const reagents = new Map<ReagentId, ReagentPrototype>();
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
    foodSequenceStartPoints: foodSequences.startPoints,
    foodSequenceElements: foodSequences.elements,
    foodSequenceEndPoints: foodSequences.endPoints,
  };
};

const collectMicrowaveRecipes = (
  allRecipes: readonly MicrowaveMealRecipe[],
  usedEntities: Set<EntityId>,
  usedReagents: Set<ReagentId>,
  stacks: StackMap,
  ignoredRecipes: ReadonlySet<string>
): MicrowaveMealRecipe[] => {
  const relevantRecipes = allRecipes.filter(r => !ignoredRecipes.has(r.id));
  for (const recipe of relevantRecipes) {
    if (ignoredRecipes.has(recipe.id)) {
      continue;
    }
    usedEntities.add(recipe.result);

    if (recipe.solids) {
      for (const id of Object.keys(recipe.solids)) {
        const stack = stacks.get(id as StackId);
        if (stack) {
          usedEntities.add(stack.spawn);
        } else {
          usedEntities.add(id as EntityId);
        }
      }
    }

    if (recipe.reagents) {
      for (const id of Object.keys(recipe.reagents)) {
        usedReagents.add(id as ReagentId);
      }
    }
  }
  return relevantRecipes;
};

const addMetamorphRecipes = (
  metamorphRecipes: MetamorphRecipeMap,
  specialRecipes: Map<string, ResolvedSpecialRecipe>,
  usedEntities: Set<EntityId>,
  usedReagents: Set<ReagentId>,
  allEntities: ResolvedEntityMap,
  foodSequenceElements: FoodSequenceElementMap
): void => {
  outer: for (const recipe of metamorphRecipes.values()) {
    if (!recipe.rules || recipe.rules.length === 0) {
      console.warn(`Metamorph recipe ${recipe.id} has no rules`);
      continue;
    }

    // Metamorph recipes are built on food sequences. We need to find the start
    // point of the indicated food sequence.
    const startPoints = allEntities.values()
      .filter(ent => ent.foodSequenceStart?.key === recipe.key)
      .toArray();

    // At present, each food sequence key has exactly one start point. If we
    // can't find a single matching entity, skip the recipe.
    if (startPoints.length !== 1) {
      if (startPoints.length > 1) {
        console.warn(
          `Metamorph recipe ${
            recipe.id
          }: Multiple start points for food sequence '${
            recipe.key
          }'`
        );
      }
      continue;
    }

    const builder = new ConstructRecipeBuilder()
      .withSolidResult(recipe.result)
      .startWith(startPoints[0].id);

    // Now let's translate the rules into concrete steps.
    // Here we *could* reorder the rules so LastElementHasTags always
    // comes last, because it's weird to have a "Finish with" in the
    // middle of the instruction list, but luckily the data is already
    // ordered in a sane fashion. If this changes, well, fuck me.
    for (const rule of recipe.rules) {
      switch (rule['!type']) {
        case 'SequenceLength':
          // Can't really do anything meaningful with this - too weird and
          // complex to show in the UI.
          // TODO: Figure this out, somehow.
          break;
        case 'IngredientsWithTags': {
          const ingredients = findMetamorphIngredients(
            allEntities,
            recipe.key,
            foodSequenceElements,
            rule.tags,
            rule.needAll
          );
          if (ingredients === null) {
            console.warn(
              `Metamorph recipe ${
                recipe.id
              }: no matching ingredients: ${rule.tags.join(', ')}`
            );
            continue outer;
          }

          builder.addSolid(ingredients, rule.count.min, rule.count.max);
          break;
        }
        case 'LastElementHasTags': {
          const ingredients = findMetamorphIngredients(
            allEntities,
            recipe.key,
            foodSequenceElements,
            rule.tags,
            rule.needAll
          );
          if (ingredients === null) {
            console.warn(
              `Metamorph recipe ${
                recipe.id
              }: no matching ingredients: ${rule.tags.join(', ')}`
            );
            continue outer;
          }

          builder.endWith(ingredients);
          break;
        }
        case 'FoodHasReagent':
          builder.addReagent(rule.reagent, rule.count.min!, rule.count.max!);
          break;
        case 'ElementHasTags':
          // Not yet supported, not yet used - ignore it for now
          console.warn(
            `Metamorph recipe ${
              recipe.id
            }: unsupported rule: ${rule['!type']}`
          );
          continue outer;
        default:
          throw new Error(
            `${recipe.id}: Unknown metamorph recipe rule: ${(rule as any)['!type']}`
          );
      }
    }

    const finalRecipe = builder.toRecipe();
    collectRefs(usedEntities, usedReagents, finalRecipe);

    const recipeId = `m!${recipe.id}`;
    specialRecipes.set(recipeId, finalRecipe);
  }
};

const findMetamorphIngredients = (
  allEntities: ResolvedEntityMap,
  targetSequence: TagId,
  foodSequenceElements: FoodSequenceElementMap,
  tags: readonly TagId[],
  needAll = true
): OneOrMoreEntities | null => {
  let tagPred: (fse: FoodSequenceElementPrototype) => boolean;
  if (needAll) {
    tagPred = fse => {
      if (!fse.tags || fse.tags.length === 0) {
        return false;
      }
      for (const tag of tags) {
        if (!fse.tags.includes(tag)) {
          return false;
        }
      }
      return true;
    };
  } else {
    tagPred = fse => {
      if (!fse.tags || fse.tags.length === 0) {
        return false;
      }
      for (const tag of tags) {
        if (fse.tags?.includes(tag)) {
          return true;
        }
      }
      return false;
    };
  }

  // First, let's find all food sequence elements with matching tags.
  const elements = new Set(
    foodSequenceElements.values()
      .filter(tagPred)
      .map(fse => fse.id)
  );
  if (elements.size === 0) {
    return null;
  }

  // Second, let's find all entities that use any of the matching food
  // sequence elements in the target sequence.
  const entities = allEntities.values()
    .filter(ent => entityCanBeFoodSequenceElem(ent, elements, targetSequence))
    .map(ent => ent.id)
    .toArray();
  switch (entities.length) {
    case 0:
      return null;
    case 1:
      return entities[0];
    default:
      return entities;
  }
};

const entityCanBeFoodSequenceElem = (
  ent: ResolvedEntity,
  soughtIds: ReadonlySet<FoodSequenceElementId>,
  targetSequence: TagId
): boolean => {
  if (!ent.foodSequenceElement) {
    return false;
  }
  const elem = ent.foodSequenceElement.get(targetSequence);
  if (!elem) {
    return false;
  }
  return soughtIds.has(elem.element);
};

const tryAddSpecialRecipes = (
  entity: ResolvedEntity,
  specialRecipes: Map<string, ResolvedSpecialRecipe>,
  usedEntities: Set<EntityId>,
  usedReagents: Set<ReagentId>,
  allEntities: ResolvedEntityMap,
  allConstructionGraphs: ConstructionGraphMap,
  ignoredSpecialRecipes: ReadonlySet<string>
): boolean => {
  // NOTE: We CANNOT treat slicing and constructing as mutually exclusive!
  // FoodDough can be cut into FoodDoughSlice *or* rolled into FoodDoughFlat.
  let addedAnything = false;

  const { sliceableFood, construction, deepFryOutput } = entity;

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
      const recipe = new ConstructRecipeBuilder()
        .withSolidResult(sliceableFood.slice)
        .withResultQty(sliceableFood.count)
        .startWith(entity.id)
        .cut()
        .toRecipe();
      collectRefs(usedEntities, usedReagents, recipe);
      specialRecipes.set(recipeId, recipe);
      addedAnything = true;
    }
  }

  // If the entity can be butchered by knife, we might be able to add a
  // recipe. The *input entity* must already be used, either as an ingredient
  // or as the result of some other recipe.
  if (
    entity.butcherable &&
    entity.butcherable.tool === 'Knife' &&
    entity.butcherable.spawned &&
    usedEntities.has(entity.id)
  ) {
    const spawns = getAllGuaranteedUsableSpawns(entity.butcherable.spawned);

    const canUseAtLeastOneSpawnedEntity = spawns.some(([id]) => {
      // We can use the entity if it is a food and a non-material that is
      // either an ingredient in some other recipe or is the start of a
      // food sequence.
      //
      // Basically, we want to catch burger buns and essentially no other
      // butcherables without hardcoding burger buns. There are SO MANY
      // arbitrary entities that can be butchered.
      const entity = allEntities.get(id)!;
      return (
        isEdible(entity) &&
        !entity.components.has('Material') &&
        (
          usedEntities.has(entity.id) ||
          entity.foodSequenceStart
        )
      );
    });

    // If we can use at least one, add them all.
    if (canUseAtLeastOneSpawnedEntity) {
      for (const [spawnedId, amount] of spawns) {
        const recipeId = `butcher!${entity.id}:${spawnedId}`;
        if (specialRecipes.has(recipeId)) {
          continue;
        }

        const builder = new ConstructRecipeBuilder()
          .withSolidResult(spawnedId)
          .withResultQty(amount)
          .startWith(entity.id)
          .cut();
        const otherSpawns = spawns
          .filter(e => e[0] !== spawnedId)
          .map(e => e[0]);
        if (otherSpawns.length > 0) {
          builder.alsoMakes(
            otherSpawns.length === 1
              ? otherSpawns[0]
              : otherSpawns
          );
        }
        const recipe = builder.toRecipe();
        collectRefs(usedEntities, usedReagents, recipe);
        specialRecipes.set(recipeId, recipe);
        addedAnything = true;
      }
    }
  }

  // If this entity can be constructed into something relevant, then add
  // special recipes *and* mark the entity as used so we can find recipes
  // for it.
  for (const recipe of traverseConstructionGraph(
    entity.id,
    construction,
    allEntities,
    allConstructionGraphs
  )) {
    const { mainVerb } = recipe;
    const recipeId = mainVerb
      ? `${mainVerb}!${entity.id}`
      : `construct!${entity.id}:${recipe.solidResult}`;
    const shouldAddRecipe =
      !specialRecipes.has(recipeId) &&
      !ignoredSpecialRecipes.has(recipeId) &&
      (
        // Most methods must produce an ingredient, e.g. dough to flat dough.
        mainVerb !== 'heat' && usedEntities.has(recipe.solidResult!) ||
        // Heating produces things that don't have to be ingredients, e.g.
        // steak or boiled egg.
        mainVerb === 'heat'
      );
    if (shouldAddRecipe) {
      collectRefs(usedEntities, usedReagents, recipe);
      specialRecipes.set(recipeId, recipe);
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
        reagentResult: null,
        solids: {
          [entity.id]: 1,
        },
        reagents: {},
        group: DefaultRecipeGroup,
      });
      addedAnything = true;
    }
  }

  return addedAnything;
};

const getAllGuaranteedUsableSpawns = (
  spawned: readonly EntitySpawnEntry[]
): [EntityId, number][] => {
  return spawned
    .filter(entry =>
      entry.id != null || // We need an entity ID
      !entry.orGroup || // We can't handle OR groups
      (entry.amount ?? 1) > 0 || // We need at least one
      (entry.prob ?? 1) !== 1 // And the probability has to be 1
    )
    .map(entry => [entry.id!, entry.amount ?? 1] as const);
};

const isEdible = (entity: ResolvedEntity): boolean =>
  entity.components.has('Food') || // Legacy component
  entity.components.has('Edible'); // New thing

const collectRefs = (
  usedEntities: Set<EntityId>,
  usedReagents: Set<ReagentId>,
  recipe: ResolvedSpecialRecipe
): void => {
  if (recipe.solidResult) {
    usedEntities.add(recipe.solidResult);
  }
  if (recipe.reagentResult) {
    usedReagents.add(recipe.reagentResult);
  }
  for (const id of Object.keys(recipe.solids)) {
    usedEntities.add(id as EntityId);
  }
  for (const id of Object.keys(recipe.reagents)) {
    usedReagents.add(id as ReagentId);
  }
};

const tryAddReaction = (
  reactions: Map<ReactionId, ReactionPrototype>,
  reaction: ReactionPrototype,
  usedEntities: Set<EntityId>,
  usedReagents: Set<ReagentId>,
  allReagents: ReagentMap
): boolean => {
  if (reactions.has(reaction.id)) {
    // We already have this reaction, don't process it again
    return false;
  }

  // Some reactions can only occur in centrifuges, electrolysers and, for
  // whatever reason, by being bashed with a bible. We ignore any reaction
  // without a supported mixer category.
  if (
    reaction.requiredMixerCategories != null &&
    reaction.requiredMixerCategories.length !== 0 &&
    !reaction.requiredMixerCategories.some(c => MixerCategoryToStepType.has(c))
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
    if (!usedReagents.has(id as ReagentId)) {
      usedReagents.add(id as ReagentId);
      hasNewReagents = true;
    }
  }
  return hasNewReagents;
};

const isFoodRelatedReagent = (reagent: ReagentPrototype): boolean =>
  reagent.group === 'Foods' ||
  reagent.group === 'Drinks';

function* traverseConstructionGraph(
  entityId: EntityId,
  constr: ResolvedConstruction | null,
  allEntities: ResolvedEntityMap,
  allConstructionGraphs: ConstructionGraphMap
): Generator<ResolvedConstructionRecipe> {
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

    const { steps } = edge;
    if (
      steps.length !== 1 || // No support for multi-step construction
      target.entity == null ||
      target.entity === entityId
    ) {
      continue;
    }

    const step = steps[0];
    if (step.tool === 'Rolling') {
      yield new ConstructRecipeBuilder()
        .withSolidResult(target.entity)
        .startWith(entityId)
        .roll()
        .toRecipe();
    }
    if (step.minTemperature != null && step.maxTemperature == null) {
      yield new ConstructRecipeBuilder()
        .withSolidResult(target.entity)
        .startWith(entityId)
        .heat(step.minTemperature)
        .toRecipe();
    }
    if (step.tag) {
      const usableEntities = findTargetEntityByTag(step.tag, allEntities);
      if (usableEntities) {
        yield new ConstructRecipeBuilder()
          .withSolidResult(target.entity)
          .startWith(entityId)
          .addSolid(usableEntities)
          .toRecipe();
      }
    }
  }
}

const findTargetEntityByTag = (
  tag: TagId,
  allEntities: ResolvedEntityMap
): OneOrMoreEntities | null => {
  const matching = allEntities.values()
    .filter(ent => ent.tags.has(tag))
    .map(ent => ent.id)
    .toArray();
  switch (matching.length) {
    case 0:
      return null;
    case 1:
      return matching[0];
    default:
      return matching;
  }
};

const collectReagentSources = (
  allEntities: ResolvedEntityMap,
  usedEntities: Set<EntityId>,
  usedReagents: Set<ReagentId>,
  ignoreSourcesOf: ReadonlySet<ReagentId>,
  forceIncludeReagentSources: ReadonlyMap<ReagentId, readonly EntityId[]>
): Map<ReagentId, EntityId[]> => {
  const result = new Map<ReagentId, EntityId[]>();

  for (const entity of allEntities.values()) {
    const sourceOf = findGrindableProduceReagents(entity, usedReagents);
    if (sourceOf && sourceOf.length > 0) {
      usedEntities.add(entity.id);
      for (const reagentId of sourceOf) {
        if (ignoreSourcesOf.has(reagentId)) {
          continue;
        }

        appendAtKey(result, reagentId, entity.id);
      }
    }
  }

  for (const [reagentId, sources] of forceIncludeReagentSources) {
    if (!usedReagents.has(reagentId)) {
      continue;
    }

    for (const entityId of sources) {
      usedEntities.add(entityId);
      appendAtKey(result, reagentId, entityId);
    }
  }

  return result;
};

const findGrindableProduceReagents = (
  entity: ResolvedEntity,
  usedReagents: Set<ReagentId>
): ReagentId[] | null => {
  const { isProduce, extractable, solution } = entity;

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

interface FoodSequences {
  startPoints: Map<TagId, EntityId[]>;
  elements: Map<TagId, EntityId[]>;
  endPoints: Map<TagId, EntityId[]>;
}

const collectFoodSequences = (
  usedEntities: Set<EntityId>,
  allEntities: ResolvedEntityMap,
  ignoredFoodSequenceElements: ReadonlySet<EntityId>
): FoodSequences => {
  const startPoints = new Map<TagId, EntityId[]>();
  for (const id of usedEntities.values()) {
    const { foodSequenceStart } = allEntities.get(id)!;
    if (foodSequenceStart?.key) {
      appendAtKey(startPoints, foodSequenceStart.key, id);
    }
  }

  const elements = new Map<TagId, EntityId[]>();
  const endPoints = new Map<TagId, EntityId[]>();
  for (const entity of allEntities.values()) {
    if (
      !entity.foodSequenceElement ||
      entity.foodSequenceElement.size === 0 ||
      ignoredFoodSequenceElements.has(entity.id)
    ) {
      continue;
    }

    usedEntities.add(entity.id);

    for (const [key, elem] of entity.foodSequenceElement) {
      if (!startPoints.has(key)) {
        continue;
      }
      appendAtKey(elem.final ? endPoints : elements, key, entity.id);
    }
  }
  return { startPoints, elements, endPoints };
};

const appendAtKey = <K, V>(map: Map<K, V[]>, key: K, value: V): void => {
  let values = map.get(key);
  if (!values) {
    values = [];
    map.set(key, values);
  }
  values.push(value);
};
