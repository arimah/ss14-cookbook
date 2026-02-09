import { ReactElement } from 'react';
import {
  CookingMethod,
  Entity,
  MicrowaveRecipeType,
  Reagent,
  Recipe,
  SpritePoint,
  Trait,
} from '../types';

/**
 * The cooking method that's shown on the right-hand side of the recipe.
 * Also used by the recipe filter options.
 */
export type DisplayMethod =
  | Exclude<CookingMethod, 'shake' | 'stir' | 'heatMixture'>
  | 'construct'
  ;

export interface SearchableRecipeData {
  /** The fork ID that this game data is for. */
  readonly forkId: string;

  /** Plain list of entities in an arbitrary order. */
  readonly entityList: readonly Entity[];
  /** Entities indexed by ID. */
  readonly entityMap: ReadonlyMap<string, Entity>;

  /** Plain list of reagents in an arbitrary order. */
  readonly reagentList: readonly Reagent[];
  /** Reagents indexed by ID. */
  readonly reagentMap: ReadonlyMap<string, Reagent>;

  /** Rewrites for entity prototype IDs, for the default sort order. */
  readonly sortingIdRewrites: Readonly<Record<string, string>>;

  /** IDs of entities that are used as ingredients. */
  readonly ingredients: readonly string[];

  /** Plain list of recipes in an arbitrary order. */
  readonly recipeList: readonly Recipe[];
  /** Recipes indexed by ID. */
  readonly recipeMap: ReadonlyMap<string, Recipe>;
  /** Recipe IDs indexed by the entity they create. */
  readonly recipesBySolidResult: ReadonlyMap<string, readonly string[]>;
  /** Recipe IDs indexed by the reagent they create. */
  readonly recipesByReagentResult: ReadonlyMap<string, readonly string[]>;
  /** Recipe IDs indexed by solid ingredient. */
  readonly recipesBySolidIngredient: ReadonlyMap<string, readonly string[]>;
  /** Recipe IDs indexed by reagent ingredient. */
  readonly recipesByReagentIngredient: ReadonlyMap<string, readonly string[]>;
  /** Lowercase recipe names indexed by recipe ID. */
  readonly searchableRecipeNames: ReadonlyMap<string, string>;
  /** All available recipe groups, sorted alphabetically. */
  readonly recipeGroups: readonly string[];

  /** Food sequence start points indexed by food sequence key. */
  readonly foodSequenceStartPoints: ReadonlyMap<string, readonly string[]>;
  /** Food sequence elements indexed by food sequence key. */
  readonly foodSequenceElements: ReadonlyMap<string, readonly string[]>;
  /** Food sequence end points indexed by food sequence key. */
  readonly foodSequenceEndPoints: ReadonlyMap<string, readonly string[]>;

  readonly methodSprites: Readonly<Partial<Record<CookingMethod, SpritePoint>>>;
  readonly beakerFill: SpritePoint;
  /** Frontier */
  readonly microwaveRecipeTypes:
    Readonly<Record<string, MicrowaveRecipeType>> | null;

  readonly specialTraits: readonly Trait[];
  /**
   * Mapping from trait mask to rendered marker, populated by the RecipeTraits
   * component. This is a fantastically ugly solution that cuts down on a LOT
   * of pointless work.
   *
   * ASSUMPTION: Once a particular combination of traits has been rendered, it
   * WILL NOT CHANGE unless the game data is reloaded. Assigning to an existing
   * key WILL NOT update already rendered RecipeTraits components.
   */
  readonly renderedTraitCache: Map<number, ReactElement>;
}

export interface NoticeData {
  /** The unique ID of this notice. */
  readonly id: string;
  readonly kind?: 'info' | 'warning' | 'error';
  /** The title of this notice (unformatted text). */
  readonly title: string;
  /**
   * The paragraphs that make up the contents of the notice.
   * May contain formatting tags.
   */
  readonly content: readonly string[];
  readonly forks?: readonly string[];
  readonly icon?: NoticeIcon;
  /**
   * A date in the format YYYYMMDD. If the visitor first visited the cookbook
   * before this date, we show the notification. Otherwise, it is hidden.
   *
   * This field is used to hide notices about new features, which are not
   * meaningful to new visitors. What do I care that a feature was added a month
   * ago when it's my first time? From my perspective, everything is new!
   */
  readonly ifFirstVisitedBefore?: string;
}

export type NoticeIcon =
  | 'info'
  | 'warn'
  | 'error'
  | 'star'
  ;
