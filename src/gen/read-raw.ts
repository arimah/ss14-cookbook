import { globSync } from 'glob';
import { resolve } from 'node:path';
import { CollectionTag, Scalar, YAMLMap, parse } from 'yaml';
import { readFileTextWithoutTheStupidBOM } from './helpers';
import {
  ConstructionGraphId,
  ConstructionGraphMap,
  ConstructionGraphPrototype,
  EntityId,
  EntityMap,
  EntityPrototype,
  FoodSequenceElementId,
  FoodSequenceElementMap,
  FoodSequenceElementPrototype,
  MetamorphRecipeId,
  MetamorphRecipeMap,
  MetamorphRecipePrototype,
  MicrowaveMealRecipe,
  ReactionPrototype,
  ReagentId,
  ReagentMap,
  ReagentPrototype,
  RelevantPrototypeRegex,
  StackId,
  StackMap,
  StackPrototype,
  isRelevantPrototype,
} from './prototypes';

export interface RawGameData {
  readonly entities: EntityMap;
  readonly reagents: ReagentMap;
  readonly stacks: StackMap;
  readonly constructionGraphs: ConstructionGraphMap;
  readonly metamorphRecipes: MetamorphRecipeMap;
  readonly foodSequenceElements: FoodSequenceElementMap;
  readonly recipes: readonly MicrowaveMealRecipe[];
  readonly reactions: readonly ReactionPrototype[];
}

// SS14 uses `!type:T` tags to create values of type `T`.
// The yaml library we're using provides no way to create tags dynamically,
// hence we have to specify all *relevant* type tags ourselves.
// We implement `!type:T` tags by assigning 'T' to the object's '!type' key.

const typeTag = (name: string): CollectionTag => ({
  tag: `!type:${name}`,
  collection: 'map',
  identify: () => false,
  resolve(value) {
    if (!(value instanceof YAMLMap)) {
      throw new Error(`Expected YAMLMap, got ${value}`);
    }
    value.add({
      key: new Scalar('!type') as Scalar.Parsed,
      value: new Scalar(name) as Scalar.Parsed,
    });
  },
});

const customTags: CollectionTag[] = [
  // Add more tags here as necessary
  typeTag('CreateEntityReactionEffect'),
  typeTag('SpawnEntity'),
  typeTag('SequenceLength'),
  typeTag('LastElementHasTags'),
  typeTag('ElementHasTags'),
  typeTag('FoodHasReagent'),
  typeTag('IngredientsWithTags'),
];

export const findResourceFiles = (prototypeDir: string): string[] =>
  globSync('**/*.yml', { cwd: prototypeDir })
    .map(filePath => resolve(prototypeDir, filePath))

export const readRawGameData = (yamlPaths: string[]): RawGameData => {
  const entities = new Map<EntityId, EntityPrototype>();
  const reagents = new Map<ReagentId, ReagentPrototype>();
  const stacks = new Map<StackId, StackPrototype>();
  const constructionGraphs = new Map<ConstructionGraphId, ConstructionGraphPrototype>();
  const metamorphRecipes = new Map<MetamorphRecipeId, MetamorphRecipePrototype>();
  const foodSequenceElements = new Map<FoodSequenceElementId, FoodSequenceElementPrototype>();
  const recipes: MicrowaveMealRecipe[] = [];
  const reactions: ReactionPrototype[] = [];

  for (const path of yamlPaths) {
    const source = readFileTextWithoutTheStupidBOM(path);

    if (!RelevantPrototypeRegex.test(source)) {
      // The file does not seem to contain anything relevant, skip it
      continue;
    }

    const doc = parse(source, {
      // I don't care about unresolved tags
      logLevel: 'silent',
      customTags,
    });

    if (!Array.isArray(doc)) {
      // Top-level structure should be an array
      console.warn(`${path}: top-level structure is not an array, ignoring`);
      continue;
    }

    for (const node of doc) {
      if (!isRelevantPrototype(node)) {
        continue;
      }
      switch (node.type) {
        case 'entity':
          entities.set(node.id, node);
          break;
        case 'foodSequenceElement':
          foodSequenceElements.set(node.id, node);
          break;
        case 'reagent':
          reagents.set(node.id, node);
          break;
        case 'stack':
          stacks.set(node.id, node);
          break;
        case 'constructionGraph':
          constructionGraphs.set(node.id, node);
          break;
        case 'metamorphRecipe':
          metamorphRecipes.set(node.id, node);
          break;
        case 'microwaveMealRecipe':
          recipes.push(node);
          break;
        case 'reaction':
          reactions.push(node);
          break;
      }
    }
  }
  return {
    entities,
    reagents,
    stacks,
    constructionGraphs,
    metamorphRecipes,
    foodSequenceElements,
    recipes,
    reactions,
  };
};
