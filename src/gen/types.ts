import {ReagentIngredient, Recipe} from '../types';

import {Component} from './components';

export type MethodEntities = Readonly<Record<Recipe['method'], string | null>>;

/** Frontier */
export type MicrowaveRecipeTypes = Readonly<Record<string, MicrowaveRecipeTypeData>>;

/** Frontier */
export interface MicrowaveRecipeTypeData {
  readonly default?: boolean;
  readonly machine: string;
  readonly verb: string;
  readonly filterSummary: string;
}

interface SpecialCommon {
  /** The CSS color used for the marker. */
  readonly color: string;
  /** A short hint text shown when hovering over the marker. */
  readonly hint: string;
  /** The name of the toggle button in the recipe filter. */
  readonly filterName: string;
  /** A short description shown in the filter summary if no recipe matches. */
  readonly filterSummary: string;
}

export interface SpecialDiet extends SpecialCommon {
  /**
   * The entity ID that defines what this special diet can consume. This entity
   * must have a `Stomach` component that filters by at least one tag or
   * component.
   */
  readonly organ: string;
  /**
   * Exclude foods containing any of the reagents in this array.
   *
   * Impstation.
   */
  readonly excludeFoodsWith?: readonly string[];
}

export interface SpecialReagent extends SpecialCommon {
  /** The reagent ID to highlight. */
  readonly id: string;
}

export interface PlainObject {
  readonly [key: string]: unknown;
}

export type RelevantPrototype =
  | ConstructionGraphPrototype
  | EntityPrototype
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

export interface ResolvedEntity {
  readonly id: string;
  readonly name: string;
  readonly color: ParsedColor;
  readonly spriteLayers: readonly ResolvedSpriteLayerState[];
  /** Set of all tags attached to this prototype. */
  readonly tags: ReadonlySet<string>;
  /** Set of reagent prototype IDs that the food contains. */
  readonly reagents: ReadonlySet<string>;
  /**
   * If this entity is a stomach, contains the tags that the stomach
   * can digest.
   */
  readonly specialDigestibleTags?: readonly string[];
  /**
   * If this entity is a stomach, contains the components that the
   * stomach can digest.
   */
  readonly specialDigestibleComponents?: readonly string[];
  /** Set of component names present on this prototype. */
  readonly components: ReadonlySet<string>;
}

export interface ResolvedSpriteLayerState {
  readonly path: string;
  readonly state: string;
  readonly color: ParsedColor;
}

/**
 * A color value parsed from a color string, in the format 0xRRGGBBAA.
 *
 * Note that this means red is the *high* byte.
 */
export type ParsedColor = number;

export interface ResolvedReagent {
  // The ID is in the owning collection.
  readonly name: string;
  readonly color: string;
}

export type ResolvedRecipe =
  | ResolvedMicrowaveRecipe
  | ResolvedReactionRecipe
  | ResolvedSpecialRecipe
  ;

interface ResolvedRecipeBase {
  // The ID is in the owning collection.
  readonly solidResult: string | null;
  readonly reagentResult: string | null;
  readonly solids: Record<string, number>;
  readonly reagents: Record<string, ReagentIngredient>;
}

export interface ResolvedMicrowaveRecipe extends ResolvedRecipeBase {
  readonly method: 'microwave';
  readonly time: number;
  readonly solidResult: string;
  readonly reagentResult: null;
  readonly subtype?: string | readonly string[];
}

export interface ResolvedReactionRecipe extends ResolvedRecipeBase {
  readonly method: 'mix';
  readonly resultAmount: number;
  readonly minTemp: number;
  readonly maxTemp: number | null;
}

export type ResolvedSpecialRecipe =
  | ResolvedCutRecipe
  | ResolvedRollRecipe
  | ResolvedHeatRecipe
  | ResolvedDeepFryRecipe
  ;

export interface ResolvedCutRecipe extends ResolvedRecipeBase {
  readonly method: 'cut';
  readonly solidResult: string;
  readonly maxCount: number;
  readonly reagentResult: null;
}

export interface ResolvedRollRecipe extends ResolvedRecipeBase {
  readonly method: 'roll';
  readonly solidResult: string;
  readonly reagentResult: null;
}

export interface ResolvedHeatRecipe extends ResolvedRecipeBase {
  readonly method: 'heat';
  readonly minTemp: number;
  readonly solidResult: string;
  readonly reagentResult: null;
}

/** Frontier: Deep-frying recipes */
export interface ResolvedDeepFryRecipe extends ResolvedRecipeBase {
  readonly method: 'deepFry';
  readonly solidResult: string;
  readonly reagentResult: null;
}

export const isPlainObject = (node: unknown): node is PlainObject =>
  typeof node === 'object' &&
  node !== null &&
  !Array.isArray(node);

export const isRelevantPrototype = (
  node: unknown
): node is RelevantPrototype => {
  if (!isPlainObject(node) || typeof node.id !== 'string') {
    return false;
  }
  switch (node.type) {
    case 'constructionGraph':
    case 'entity':
    case 'microwaveMealRecipe':
    case 'reaction':
    case 'reagent':
    case 'stack':
      return true;
    default:
      return false;
  }
};

export const isCreateEntityEffect = (
  node: unknown
): node is CreateEntityReactionEffect =>
  isPlainObject(node) &&
  node['!type'] === 'CreateEntityReactionEffect' &&
  typeof node.entity === 'string';
