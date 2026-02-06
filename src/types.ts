export interface ForkData {
  readonly id: string;
  readonly hash: string;
  readonly name: string;
  readonly description: string;
  readonly default: boolean;
  readonly hidden?: true;
  readonly meta: MetaData;
}

export interface GameData {
  readonly entities: readonly Entity[];
  readonly reagents: readonly Reagent[];
  /**
   * IDs of entities that are used as ingredients (excluding those that only
   * occur as the result of a recipe).
   *
   * Note: There is no corresponding list for reagents, since reagents are
   * only ever included if they occur as an ingredient in a recipe. This means
   * every reagent is in fact used as an ingredient. Reactions for reagents
   * that are *not* used as ingredients, such as mustard, must be looked up
   * through the game's guidebook.
   */
  readonly ingredients: readonly string[];
  readonly recipes: readonly Recipe[];
  readonly foodSequenceStartPoints: Readonly<Record<string, readonly string[]>>;
  readonly foodSequenceElements: Readonly<Record<string, readonly string[]>>;
  readonly foodSequenceEndPoints: Readonly<Record<string, readonly string[]>>;
  readonly methodSprites: Readonly<Record<CookingMethod, SpritePoint>>;
  readonly beakerFill: SpritePoint;
  /** Frontier */
  readonly microwaveRecipeTypes:
    Readonly<Record<string, MicrowaveRecipeType>> | null;
  readonly spriteSheet: string;
  /**
   * To get a better default sort order, we rewrite some IDs. This is *only*
   * used during sorting.
   */
  readonly sortingIdRewrites: Readonly<Record<string, string>>;

  readonly specialTraits: Trait[];

  readonly attributions: readonly SpriteAttribution[];
}

export interface Entity {
  readonly id: string;
  readonly name: string;
  readonly sprite: SpritePoint;
  readonly traits: number;
  /**
   * If present, contains the food sequence this entity is the start point of.
   */
  readonly seqStart?: FoodSeqStart;
  /**
   * If present, contains the food sequences this entity can be put in as a
   * "regular" ingredient.
   */
  readonly seqElem?: readonly string[];
  /**
   * If present, contains the food sequences this entity *ends*. No more items
   * can be added to a food sequence past the end point, and the end point can
   * be added even if the food sequence is otherwise full.
   *
   * Basically, top buns.
   */
  readonly seqEnd?: readonly string[];
}

export interface FoodSeqStart {
  readonly key: string;
  readonly maxCount: number;
}

export interface Reagent {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly sources: readonly string[];
}

export type CookingMethod =
  | 'microwave'
  | 'mix'
  | 'construct'
  | 'cut'
  | 'roll'
  | 'heat'
  | 'heatMixture'
  | 'stir'
  | 'shake'
  | 'deepFry'
  ;

export type Recipe =
  | MicrowaveRecipe
  | ReagentRecipe
  | ConstructRecipe
  | DeepFryRecipe
  ;

interface RecipeBase {
  readonly id: string;
  readonly solidResult: string | null;
  readonly reagentResult: string | null;
  /**
   * Contains the result quantity. If the recipe has a `solidResult`, it's the
   * number of entities it will spawn. If the recipe has `reagentResult`, it's
   * the number of units the recipe produces.
   *
   * If absent, defaults to 1.
   */
  readonly resultQty?: number;
  readonly solids: Readonly<Record<string, number>>;
  readonly reagents: Readonly<Record<string, ReagentIngredient>>;
  readonly group: string;
}

/**
 * The heart of the cookbook, the microwave recipe combines a number of
 * entities and/or reagents to produce an entity.
 */
export interface MicrowaveRecipe extends RecipeBase {
  readonly method: 'microwave';
  /** Cook time, in seconds. */
  readonly time: number;
  readonly solidResult: string;
  readonly reagentResult: null;
  /** Frontier: some recipes can only be cooked in certain machines. */
  readonly subtype?: string | readonly string[];
}

/**
 * A reagent recipe combines reagents (and never entities) to produce another
 * reagent or an entity.
 */
export interface ReagentRecipe extends RecipeBase {
  readonly method: 'mix';
  readonly resultQty: number;
  /** If non-null, the mixture must be heated to the indicated temperature. */
  readonly minTemp: number | null;
  /**
   * If non-null, the mixture must be *below* the indicated temperature.
   * Hilariously, the game provides no way to cool mixtures, short of adding
   * cooler reagents.
   */
  readonly maxTemp: number | null;
}

/**
 * A "construct" recipe is anything that isn't microwaving or mixing.
 * This broad category includes cutting, rolling, heating, stirring,
 * shaking, assembling, and more. It's similar to the game's construction
 * system, but obviously specialized for cooking.
 */
export interface ConstructRecipe extends RecipeBase {
  readonly method: 'construct';
  /** The main verb, shown on the side of the recipe. */
  readonly mainVerb: ConstructVerb | null;
  readonly steps: readonly ConstructionStep[];
}

export type ConstructVerb =
  // Mix in a beaker or similar (makes it look like a reaction).
  | 'mix'
  // Cut with a knife.
  | 'cut'
  // Roll with a rolling pin or other cylindrical-ish implement.
  | 'roll'
  // Fire, baby!
  | 'heat'
  ;

export type ConstructionStep =
  | StartStep
  | EndStep
  | MixStep
  | HeatStep
  | HeatMixtureStep
  | AddStep
  | AddReagentStep
  | SimpleInteractionStep
  | AlsoMakesStep
  ;

/** "Start with ..." */
export interface StartStep {
  readonly type: 'start';
  readonly entity: string;
}

/** "Finish with ..." */
export interface EndStep {
  readonly type: 'end';
  readonly entity: OneOrMoreEntities;
}

/** "Add (ingredient)" */
export interface AddStep {
  readonly type: 'add';
  readonly entity: OneOrMoreEntities;
  readonly minCount?: number;
  readonly maxCount?: number;
}

/** "Add (reagent)" */
export interface AddReagentStep {
  readonly type: 'addReagent';
  readonly reagent: string;
  readonly minCount: number;
  readonly maxCount: number;
}

/** Combine in a beaker (or similar). */
export interface MixStep {
  readonly type: 'mix';
  readonly reagents: Readonly<Record<string, ReagentIngredient>>;
}

/** "Heat to (minTemp) K", when the target is an entity. */
export interface HeatStep {
  readonly type: 'heat';
  readonly minTemp: number;
}

/**
 * "Heat to (minTemp) K" or "Heat to between (minTemp) K and (maxTemp) K",
 * when the target is a solution.
 */
export interface HeatMixtureStep {
  readonly type: 'heatMixture';
  readonly minTemp: number;
  readonly maxTemp: number | null;
}

/** Simple, single-verb interaction that doesn't need any extra data. */
export interface SimpleInteractionStep {
  readonly type: 'cut' | 'roll' | 'stir' | 'shake';
}

/** A pseudo-step that informs the user that the recipe makes other things. */
export interface AlsoMakesStep {
  readonly type: 'alsoMakes';
  readonly entity: OneOrMoreEntities;
}

export type OneOrMoreEntities = string | readonly string[];

/** Frontier: Deep-frying recipes */
export interface DeepFryRecipe extends RecipeBase {
  readonly method: 'deepFry';
  readonly solidResult: string;
  readonly reagentResult: null;
}

export interface ReagentIngredient {
  readonly amount: number;
  /** If true, the reagent is not consumed by the reaction. */
  readonly catalyst?: boolean;
}

export type SpritePoint = readonly [x: number, y: number];

/** Frontier */
export interface MicrowaveRecipeType {
  readonly sprite: SpritePoint;
  readonly verb: string;
  readonly filterSummary: string;
}

export interface Trait {
  readonly mask: number;
  readonly hint: string;
  readonly color: string;
  readonly filterName: string;
  readonly filterSummary: string;
}

export interface SpriteAttribution {
  readonly path: string;
  readonly license: string;
  readonly copyright: string;
  readonly sprites: readonly SpritePoint[];
}

export interface MetaData {
  readonly commit: string;
  readonly repo: string;
  readonly date: number;
}
