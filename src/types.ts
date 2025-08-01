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
  readonly methodSprites: Readonly<Record<Recipe['method'], SpritePoint>>;
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
}

export interface Reagent {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly sources: readonly string[];
}

export type Recipe =
  | MicrowaveRecipe
  | ReagentRecipe
  | CutRecipe
  | RollRecipe
  | HeatRecipe
  | DeepFryRecipe
  ;

interface RecipeBase {
  readonly id: string;
  readonly solidResult: string | null;
  readonly reagentResult: string | null;
  readonly solids: Readonly<Record<string, number>>;
  readonly reagents: Readonly<Record<string, ReagentIngredient>>;
}

export interface MicrowaveRecipe extends RecipeBase {
  readonly method: 'microwave';
  readonly time: number;
  readonly solidResult: string;
  readonly reagentResult: null;
  /** Frontier: some recipes can only be cooked in certain machines. */
  readonly subtype?: string | readonly string[];
}

export interface ReagentRecipe extends RecipeBase {
  readonly method: 'mix';
  readonly resultAmount: number;
  readonly minTemp: number | null;
  readonly maxTemp: number | null;
}

export interface CutRecipe extends RecipeBase {
  readonly method: 'cut';
  readonly maxCount: number;
  readonly solidResult: string;
  readonly reagentResult: null;
}

export interface RollRecipe extends RecipeBase {
  readonly method: 'roll';
  readonly solidResult: string;
  readonly reagentResult: null;
}

export interface HeatRecipe extends RecipeBase {
  readonly method: 'heat';
  readonly solidResult: string;
  readonly reagentResult: null;
  readonly minTemp: number;
}

/** Frontier: Deep-frying recipes */
export interface DeepFryRecipe extends RecipeBase {
  readonly method: 'deepFry';
  readonly solidResult: string;
  readonly reagentResult: null;
}

export interface ReagentIngredient {
  readonly amount: number;
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
