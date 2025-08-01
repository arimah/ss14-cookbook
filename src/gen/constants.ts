import {SpritePoint} from '../types';
import {ParsedColor} from './types';

/**
 * MUST MIRROR C#! This matches the default value of the field
 * `MicrowaveMealRecipePrototype.CookTime`.
 */
export const DefaultCookTime = 5;

/**
 * MUST MIRROR C#! This matches the default value of the field
 * `SliceableFoodComponent.TotalCount`.
 */
export const DefaultTotalSliceCount = 5;

/** Special recipes to ignore. */
export const IgnoredSpecialRecipes: ReadonlySet<string> = new Set([
  // These eggs look indistinguishable from regular FoodEgg, and the recipes
  // as a result are also seemingly identical. To avoid confusing people with
  // three identical egg ingredients and three identical boiled egg recipes,
  // we ignore these recipes altogether.
  'heat!FoodEggChickenFertilized',
  'heat!FoodEggDuckFertilized',
]);

/**
 * Ignore sources of these reagents. It bloats the list without providing
 * anything especially useful.
 */
export const IgnoreSourcesOf: ReadonlySet<string> = new Set([
  'Water',
  'Blood',
  'Nutriment',
  'Vitamin',
]);

/** Hardcoded reagent sources. */
export const ForceIncludeReagentSources: ReadonlyMap<string, readonly string[]> = new Map([
  // Eggs can be trivially cracked into raw egg.
  ['Egg', ['FoodEgg']],
]);

export const GameDataPath = (id: string, hash: string) =>
  `public/data/data_${id}.${hash}.json`;

export const ForkListPath = 'public/data/index.json';

export const SpriteSheetPath = (id: string, hash: string) =>
  `public/img/${SpriteSheetFileName(id, hash)}`;

export const SpriteSheetFileName = (id: string, hash: string) =>
  `sprites_${id}.${hash}.webp`;

/**
 * (X, Y) offsets for sprites, manually curated. Some sprites are not centered
 * within the 32x32 box; these offsets aim to align them better. The key is
 * the entity prototype ID.
 *
 * This list is to be kept as small as possible, as updates to the game can
 * easily break it.
 *
 * NOTE: These offsets are *added* to the sprite's position. A positive Y offset
 * means "move the sprite down".
 */
export const SpriteOffsets: Record<string, SpritePoint> = {
  // The microwave is weirdly high up
  'KitchenMicrowave': [0, 5],

  // As is the electric grill
  'KitchenElectricGrill': [0, 5],

  // Frontier
  'KitchenAssembler': [0, 5],

  // Same with these two burgers
  'FoodBurgerSuper': [0, 5], // super bite burger
  'FoodBurgerBig': [0, 4], // big bite burger

  // Aloe is weirdly low down
  'FoodAloe': [0, -4],
  'AloeCream': [0, -2],
};

export const ColorWhite: ParsedColor = 0xFFFFFFFF;
