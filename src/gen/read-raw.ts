import {resolve} from 'path';

import {CollectionTag, YAMLMap, Scalar, parse} from 'yaml';
import {globSync} from 'glob';

import {readFileTextWithoutTheStupidBOM} from './helpers';
import {
  EntityPrototype,
  MicrowaveMealRecipe,
  ReactionPrototype,
  ReagentPrototype,
  StackPrototype,
  ConstructionGraphPrototype,
  isRelevantPrototype,
} from './prototypes';

export interface RawGameData {
  readonly entities: ReadonlyMap<string, EntityPrototype>;
  readonly reagents: ReadonlyMap<string, ReagentPrototype>;
  readonly stacks: ReadonlyMap<string, StackPrototype>;
  readonly constructionGraphs: ReadonlyMap<string, ConstructionGraphPrototype>;
  readonly recipes: readonly MicrowaveMealRecipe[];
  readonly reactions: readonly ReactionPrototype[];
}

// To cut down on YAML parsing time, we filter explicitly for files with
// the sort of prototypes we're interested in.
const RelevantFileRegex = /\btype:\s+(?:constructionGraph|entity|microwaveMealRecipe|reaction|reagent|stack)\b/;

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
];

export const findResourceFiles = (prototypeDir: string): string[] =>
  globSync('**/*.yml', {cwd: prototypeDir})
    .map(filePath => resolve(prototypeDir, filePath))

export const readRawGameData = (yamlPaths: string[]): RawGameData => {
  const entities = new Map<string, EntityPrototype>();
  const reagents = new Map<string, ReagentPrototype>();
  const stacks = new Map<string, StackPrototype>();
  const constructionGraphs = new Map<string, ConstructionGraphPrototype>();
  const recipes: MicrowaveMealRecipe[] = [];
  const reactions: ReactionPrototype[] = [];

  for (const path of yamlPaths) {
    const source = readFileTextWithoutTheStupidBOM(path);

    if (!RelevantFileRegex.test(source)) {
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
        case 'reagent':
          reagents.set(node.id, node);
          break;
        case 'stack':
          stacks.set(node.id, node);
          break;
        case 'constructionGraph':
          constructionGraphs.set(node.id, node);
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
    recipes,
    reactions,
  };
};
