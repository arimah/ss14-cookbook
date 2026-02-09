import { Component } from './components';
import { isPlainObject, PlainObject } from './types';

declare const ProtoIdSymbol: unique symbol;

export type ProtoId<T extends string> = string & {
  [ProtoIdSymbol]: T;
};

export type ConstructionGraphId = ProtoId<'constructionGraph'>;
export type EntityId = ProtoId<'entity'>;
export type FoodSequenceElementId = ProtoId<'foodSequenceElement'>;
export type MetamorphRecipeId = ProtoId<'metamorphRecipe'>;
export type MicrowaveMealRecipeId = ProtoId<'microwaveMealRecipe'>;
export type ReactionId = ProtoId<'reaction'>;
export type ReagentId = ProtoId<'reagent'>;
export type StackId = ProtoId<'stack'>;
// We don't collect a map of tags, but this is till handy for disambiguation.
export type TagId = ProtoId<'tag'>;

export type ConstructionGraphMap = ReadonlyMap<
  ConstructionGraphId,
  ConstructionGraphPrototype
>;
export type EntityMap = ReadonlyMap<EntityId, EntityPrototype>;
export type FoodSequenceElementMap = ReadonlyMap<
  FoodSequenceElementId,
  FoodSequenceElementPrototype
>;
export type MetamorphRecipeMap = ReadonlyMap<
  MetamorphRecipeId,
  MetamorphRecipePrototype
>;
export type ReagentMap = ReadonlyMap<ReagentId, ReagentPrototype>;
export type StackMap = ReadonlyMap<StackId, StackPrototype>;

export type RelevantPrototype =
  | ConstructionGraphPrototype
  | EntityPrototype
  | FoodSequenceElementPrototype
  | MetamorphRecipePrototype
  | MicrowaveMealRecipe
  | ReactionPrototype
  | ReagentPrototype
  | StackPrototype
  ;

export interface EntityPrototype extends PlainObject {
  readonly type: 'entity';
  readonly id: EntityId;
  readonly parent?: EntityId | EntityId[];
  readonly name?: string;
  readonly abstract?: boolean;
  readonly components?: readonly Component[];
}

export interface ReagentPrototype extends PlainObject {
  readonly type: 'reagent';
  readonly id: ReagentId;
  readonly name: string; // Fluent key :(
  readonly color?: string;
  readonly group?: string;
}

export interface MicrowaveMealRecipe extends PlainObject {
  readonly type: 'microwaveMealRecipe';
  readonly id: MicrowaveMealRecipeId;
  readonly name: string;
  readonly result: EntityId;
  readonly time?: number;
  // Don't assume solids will always be set
  readonly solids?: Record<EntityId, number>;
  readonly reagents?: Record<ReagentId, number>;
  readonly group?: string;
  /** Frontier */
  readonly recipeType?: string | readonly string[];
  /** Frontier */
  readonly resultCount?: number;
}

export interface ReactionPrototype extends PlainObject {
  readonly type: 'reaction';
  readonly id: ReactionId;
  readonly reactants: Record<ReagentId, Reactant>;
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
  readonly entity: EntityId;
  readonly number?: number;
}

export interface SpawnEntityEntityEffect {
  readonly '!type': 'SpawnEntity';
  readonly entity: EntityId;
  readonly number?: number;
}

export interface StackPrototype {
  readonly type: 'stack';
  readonly id: StackId;
  readonly spawn: EntityId;
}

export interface ConstructionGraphPrototype {
  readonly type: 'constructionGraph';
  readonly id: ConstructionGraphId;
  readonly graph: readonly ConstructionGraphNode[];
}

export interface ConstructionGraphNode {
  readonly node: string;
  readonly edges?: readonly ConstructionGraphEdge[];
  readonly entity?: EntityId;
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
  readonly tag?: TagId;
}

export interface FoodSequenceElementPrototype {
  readonly type: 'foodSequenceElement';
  readonly id: FoodSequenceElementId;
  readonly tags?: readonly TagId[];
  readonly final?: boolean;
  // Food sequence elements have more fields than this, but we only care about
  // tags. Name, scale, sprites etc. aren't relevant to us.
}

export interface MetamorphRecipePrototype {
  readonly type: 'metamorphRecipe';
  readonly id: MetamorphRecipeId;
  readonly key: TagId;
  readonly result: EntityId;
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
  readonly tags: readonly TagId[];
  /** default: true */
  readonly needAll?: boolean;
}

export interface FmrElementHasTags {
  readonly '!type': 'ElementHasTags';
  readonly elementNumber: number;
  readonly tags: readonly TagId[];
  /** default: true */
  readonly needAll?: boolean;
}

export interface FmrFoodHasReagent {
  readonly '!type': 'FoodHasReagent';
  readonly reagent: ReagentId;
  readonly count: MinMax;
  // Not relevant
  // readonly solution?: string;
}

export interface FmrIngredientsWithTags {
  readonly '!type': 'IngredientsWithTags';
  readonly tags: readonly TagId[];
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
  'foodSequenceElement',
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

export const isSpawnEntityEffect = (
  node: unknown
): node is SpawnEntityEntityEffect =>
  isPlainObject(node) &&
  node['!type'] === 'SpawnEntity' &&
  typeof node.entity === 'string';
