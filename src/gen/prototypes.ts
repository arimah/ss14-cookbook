import {Component} from './components';
import {isPlainObject, PlainObject} from './types';

export type RelevantPrototype =
  | ConstructionGraphPrototype
  | EntityPrototype
  | MetamorphRecipePrototype
  | MicrowaveMealRecipe
  | ReactionPrototype
  | ReagentPrototype
  | StackPrototype
  ;

export interface EntityPrototype extends PlainObject {
  readonly type: 'entity';
  readonly id: string;
  readonly parent?: string | string[];
  readonly name?: string;
  readonly components?: readonly Component[];
}

export interface ReagentPrototype extends PlainObject {
  readonly type: 'reagent';
  readonly id: string;
  readonly name: string; // Fluent key :(
  readonly color?: string;
  readonly group?: string;
}

export interface MicrowaveMealRecipe extends PlainObject {
  readonly type: 'microwaveMealRecipe';
  readonly id: string;
  readonly name: string;
  readonly result: string;
  readonly time?: number;
  // Don't assume solids will always be set
  readonly solids?: Record<string, number>;
  readonly reagents?: Record<string, number>;
  readonly group?: string;
  /** Frontier */
  readonly recipeType?: string | readonly string[];
  /** Frontier */
  readonly resultCount?: number;
}

export interface ReactionPrototype extends PlainObject {
  readonly type: 'reaction';
  readonly id: string;
  readonly reactants: Record<string, Reactant>;
  readonly requiredMixerCategories?: string[];
  readonly minTemp?: number;
  readonly maxTemp?: number;
  readonly products?: Record<string, number>;
  readonly effects?: unknown[];
}

export interface Reactant {
  readonly amount: number;
  readonly catalyst?: boolean;
}

export interface CreateEntityReactionEffect {
  readonly '!type': 'CreateEntityReactionEffect';
  readonly entity: string;
}

export interface StackPrototype {
  readonly type: 'stack';
  readonly id: string;
  readonly spawn: string;
}

export interface ConstructionGraphPrototype {
  readonly type: 'constructionGraph';
  readonly id: string;
  readonly graph: readonly ConstructionGraphNode[];
}

export interface ConstructionGraphNode {
  readonly node: string;
  readonly edges?: readonly ConstructionGraphEdge[];
  readonly entity?: string;
}

export interface ConstructionGraphEdge {
  readonly to: string;
  readonly steps: ConstructionGraphStep[];
  /** Need to verify that it is empty. */
  readonly conditions?: readonly unknown[];
}

export interface ConstructionGraphStep {
  readonly tool?: string;
  readonly minTemperature?: number;
  readonly maxTemperature?: number;
}

export interface MetamorphRecipePrototype {
  readonly type: 'metamorphRecipe';
  readonly id: string;
  readonly key: string;
  readonly result: string;
  // Annoyingly, the DataField is not marked as required, so we have to assume
  // this can be omitted. In that case, we just ignore it; what are we even
  // supposed to do with an empty rule set?
  readonly rules?: readonly FoodMetamorphRule[];
}

export type FoodMetamorphRule =
  | FmrSequenceLength
  | FmrLastElementHasTags
  | FmrElementHasTags
  | FmrFoodHasReagent
  | FmrIngredientsWithTags
  ;

export interface FmrSequenceLength {
  readonly '!type': 'SequenceLength';
  readonly range: MinMax;
}

export interface FmrLastElementHasTags {
  readonly '!type': 'LastElementHasTags';
  readonly tags: readonly string[];
  /** default: true */
  readonly needAll?: boolean;
}

export interface FmrElementHasTags {
  readonly '!type': 'ElementHasTags';
  readonly elementNumber: number;
  readonly tags: readonly string[];
  /** default: true */
  readonly needAll?: boolean;
}

export interface FmrFoodHasReagent {
  readonly '!type': 'FoodHasReagent';
  readonly reagent: string;
  readonly count: MinMax;
  // Not relevant
  // readonly solution?: string;
}

export interface FmrIngredientsWithTags {
  readonly '!type': 'IngredientsWithTags';
  readonly tags: readonly string[];
  readonly count: MinMax;
  /** default: true */
  readonly needAll?: boolean;
}

export interface MinMax {
  // Neither field is marked as required, defaulting to 0.
  readonly min?: number;
  readonly max?: number;
}

const RelevantPrototypeTypes: ReadonlySet<string> = new Set([
  'constructionGraph',
  'entity',
  'metamorphRecipe',
  'microwaveMealRecipe',
  'reaction',
  'reagent',
  'stack',
]);

/**
 * A regular expression that matches `type:` followed by any of the prototypes
 * we actually care about. This allows us to cut down on YAML parsing time by
 * ignoring files without relevant prototype definitions.
 */
export const RelevantPrototypeRegex = new RegExp(
  `\\btype:\\s+(?:${Array.from(RelevantPrototypeTypes).join('|')})\\b`
);

export const isRelevantPrototype = (
  node: unknown
): node is RelevantPrototype =>
  isPlainObject(node) &&
  typeof node.id === 'string' &&
  typeof node.type === 'string' &&
  RelevantPrototypeTypes.has(node.type);

export const isCreateEntityEffect = (
  node: unknown
): node is CreateEntityReactionEffect =>
  isPlainObject(node) &&
  node['!type'] === 'CreateEntityReactionEffect' &&
  typeof node.entity === 'string';
