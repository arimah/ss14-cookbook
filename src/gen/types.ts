import {ReagentIngredient, Recipe} from '../types';

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
  readonly group: string;
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

/**
 * A "special" recipe is a non-microwave, non-reaction recipe.
 *
 * Originally these were only cut and roll recipes, which were identical in
 * all ways except for the `method`. Over time more methods were introduced,
 * with various unique features. The term "special recipe" just kinda stuck.
 */
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

export interface PlainObject {
  readonly [key: string]: unknown;
}

export const isPlainObject = (node: unknown): node is PlainObject =>
  typeof node === 'object' &&
  node !== null &&
  !Array.isArray(node);
