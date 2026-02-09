import {
  ConstructionStep,
  ConstructVerb,
  ReagentIngredient,
  Recipe,
} from '../types';
import { EntitySpawnEntry, Solution } from './components';
import {
  ConstructionGraphId,
  EntityId,
  FoodSequenceElementId,
  ReagentId,
  TagId,
} from './prototypes';

export type MethodEntities = Readonly<Record<Recipe['method'], EntityId | null>>;

/** Frontier */
export type MicrowaveRecipeTypes = Readonly<Record<string, MicrowaveRecipeTypeData>>;

/** Frontier */
export interface MicrowaveRecipeTypeData {
  readonly default?: boolean;
  readonly machine: EntityId;
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
  readonly organ: EntityId;
  /**
   * Exclude foods containing any of the reagents in this array.
   *
   * Impstation.
   */
  readonly excludeFoodsWith?: readonly ReagentId[];
}

export interface SpecialReagent extends SpecialCommon {
  /** The reagent ID to highlight. */
  readonly id: ReagentId;
}

export type ResolvedEntityMap = ReadonlyMap<EntityId, ResolvedEntity>;

/**
 * A *resolved* entity contains all the data from an entity prototype that
 * the cookbook makes use of. It's essentially processed component data.
 * Component resolution happens early, so we can manipulate entity prototypes
 * without having to traverse the prototype and its parents repeatedly.
 *
 * Note: Some component data present in this type may still require additional
 * post-processing. E.g., sprite colours have to be parsed prior to rendering.
 */
export interface ResolvedEntity {
  readonly id: EntityId;
  readonly name: string;
  /** True if the entity is produce, i.e. grown in a hydroponics tray. */
  readonly isProduce: boolean;
  /** The entity's sprite. */
  readonly sprite: ResolvedSprite;
  /** All of the entity's solution. */
  readonly solution: ResolvedSolution | null;
  /**
   * The entity's food reagent IDs, extracted from `solution.food`. If the
   * entity has no food solution, this set is empty.
   */
  readonly reagents: Set<ReagentId>;
  /**
   * If the entity can be put in a grinder, contains the resolved extractable
   * solutions.
   */
  readonly extractable: ResolvedExtractable | null;
  /**
   * If the entity can start a food sequence, contains the food sequence key
   * and maximum layer count.
   */
  readonly foodSequenceStart: ResolvedFoodSequenceStart | null;
  /**
   * If the entity is a food sequence element, contains the food sequences it
   * can participate in as well as its corresponding elements.
   */
  readonly foodSequenceElement: ReadonlyMap<TagId, ResolvedFoodSequenceElement> | null;
  /**
   * If the entity is a sliceable food, contains the resulting slice entity
   * and count.
   */
  readonly sliceableFood: ResolvedSlice | null;
  /**
   * If the entity can be butchered, contains the tool required and the
   * entities it will spawn.
   */
  readonly butcherable: ResolvedButcherable | null;
  /** The entity's construction component data, if it has one. */
  readonly construction: ResolvedConstruction | null;
  /**
   * If the entity can be deep-fried, contains the resulting entity.
   * Frontier.
   */
  readonly deepFryOutput: EntityId | null;
  /**
   * If this entity is a stomach, contains the tags and components that the
   * stomach can digest.
   */
  readonly stomach: ResolvedStomach | null;
  /** Set of all tags attached to this prototype. */
  readonly tags: ReadonlySet<TagId>;
  /** Set of component names present on this prototype. */
  readonly components: ReadonlySet<string>;
}

export interface ResolvedSprite {
  readonly path: string | null;
  readonly state: string | null;
  readonly color: string | null;
  readonly layers: readonly ResolvedSpriteLayer[];
}

export interface ResolvedSpriteLayer {
  readonly path: string | null;
  readonly state: string | null;
  readonly color: string | null;
  readonly visible: boolean;
}

/**
 * A color value parsed from a color string, in the format 0xRRGGBBAA.
 *
 * Note that this means red is the *high* byte.
 */
export type ParsedColor = number;

export type ResolvedSolution = Readonly<Record<string, Solution>>;

export interface ResolvedExtractable {
  readonly grindSolutionName: string | null;
  /**
   * For silly reasons, the juice solution is always inlined and never read
   * from the `SolutionContainerManagerComponent`.
   */
  readonly juiceSolution: Solution | null;
}

export interface ResolvedSlice {
  readonly slice: EntityId | null;
  readonly count: number;
}

export interface ResolvedButcherable {
  readonly tool: string;
  readonly spawned: readonly EntitySpawnEntry[] | null;
}

export interface ResolvedConstruction {
  readonly graph: ConstructionGraphId | null;
  readonly node: string | null;
  readonly edge: number | null;
  readonly step: number | null;
}

export interface ResolvedStomach {
  readonly tags: readonly TagId[] | null;
  readonly components: readonly string[] | null;
}

export interface ResolvedFoodSequenceStart {
  readonly key: TagId | null;
  readonly maxLayers: number;
}

export interface ResolvedFoodSequenceElement {
  readonly element: FoodSequenceElementId;
  readonly final: boolean;
}

export type ResolvedReagentMap = ReadonlyMap<ReagentId, ResolvedReagent>;

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
  readonly solidResult: EntityId | null;
  readonly reagentResult: ReagentId | null;
  readonly resultQty?: number;
  readonly solids: Record<EntityId, number>;
  readonly reagents: Record<ReagentId, ReagentIngredient>;
  readonly group: string;
}

export interface ResolvedMicrowaveRecipe extends ResolvedRecipeBase {
  readonly method: 'microwave';
  readonly time: number;
  readonly solidResult: EntityId;
  readonly reagentResult: null;
  readonly subtype?: string | readonly string[];
}

export interface ResolvedReactionRecipe extends ResolvedRecipeBase {
  readonly method: 'mix';
  readonly resultQty: number;
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
  | ResolvedDeepFryRecipe
  | ResolvedConstructionRecipe
  ;

/** Frontier: Deep-frying recipes */
export interface ResolvedDeepFryRecipe extends ResolvedRecipeBase {
  readonly method: 'deepFry';
  readonly solidResult: EntityId;
  readonly reagentResult: null;
}

export interface ResolvedConstructionRecipe extends ResolvedRecipeBase {
  readonly method: 'construct';
  readonly mainVerb: ConstructVerb | null;
  readonly steps: ConstructionStep[];
}

export interface PlainObject {
  readonly [key: string]: unknown;
}

export const isPlainObject = (node: unknown): node is PlainObject =>
  typeof node === 'object' &&
  node !== null &&
  !Array.isArray(node);
