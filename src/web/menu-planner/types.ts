import { customAlphabet } from 'nanoid';

export interface CookingMenu {
  /** This menu's unique, randomly generated ID.*/
  readonly id: string;
  /** The menu's display name. */
  readonly name: string;
  /** IDs of selected recipes. The user can reorder the recipes. */
  readonly recipes: readonly string[];
  /** IDs of selected entity ingredients. */
  readonly solidIngredients: readonly string[];
  /** IDs of selected reagent ingredients. */
  readonly reagentIngredients: readonly string[];
  /**
   * The ID of the last fork this recipe was saved for, so we can better
   * diagnose mismatches.
   */
  readonly lastFork: string;
}

export const genId = customAlphabet(
  'abcdefghijklmnopqrstuvwxyz0123456789',
  10
);

export interface SavedMenus {
  readonly menus: readonly CookingMenu[];
}

export type Ingredient =
  | SolidIngredient
  | ReagentIngredient;

export interface BaseIngredient {
  readonly id: string;
  readonly usedBy: ReadonlySet<string>;
  readonly sourceOfReagent: ReadonlySet<string>;
  readonly recipes: readonly string[];
}

export interface SolidIngredient extends BaseIngredient {
  readonly type: 'solid';
  readonly entityId: string;
}

export const isSolidIngredient = (
  ingredient: Ingredient
): ingredient is SolidIngredient =>
  ingredient.type === 'solid';

export interface ReagentIngredient extends BaseIngredient {
  readonly type: 'reagent';
  readonly reagentId: string;
}

export const isReagentIngredient = (
  ingredient: Ingredient
): ingredient is ReagentIngredient =>
  ingredient.type === 'reagent';
