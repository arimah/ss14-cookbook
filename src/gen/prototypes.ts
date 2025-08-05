import {Component} from './components';
import {isPlainObject, PlainObject} from './types';

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
