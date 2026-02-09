import { SimpleInteractionStep } from '../types';
import { ParsedColor } from './types';

/**
 * MUST MIRROR C#! This matches the default value of the field
 * `MicrowaveMealRecipePrototype.CookTime`.
 */
export const DefaultCookTime = 5;

/**
 * MUST MIRROR C#! This matches the default value of the field
 * `MicrowaveMealRecipePrototype.Group`.
 */
export const DefaultRecipeGroup = 'Other';

/**
 * MUST MIRROR C#! This matches the default value of the field
 * `SliceableFoodComponent.TotalCount`.
 */
export const DefaultTotalSliceCount = 5;

/**
 * MUST MIRROR C#! This matches the default value of the field
 * `FoodSequenceStartPointComponent.MaxLayers`.
 */
export const DefaultFoodSequenceMaxLayers = 10;

/**
 * MUST MIRROR C#! This matches the default value of the field
 * `Butcherable.Type`.`
 */
export const DefaultButcheringType = 'Knife';

/**
 * The name of the solution that contains all food reagents.
 * We could extract this from the `FoodComponent`, but in practice literally
 * every single food uses `food`.
 */
export const FoodSolutionName = 'food';

export const MixerCategoryToStepType: ReadonlyMap<string, SimpleInteractionStep['type']> = new Map([
  ['Stir', 'stir'],
  ['Shake', 'shake'],
]);

export const GameDataPath = (id: string, hash: string) =>
  `public/data/data_${id}.${hash}.json`;

export const ForkListPath = 'public/data/index.json';

export const SpriteSheetPath = (id: string, hash: string) =>
  `public/data/${SpriteSheetFileName(id, hash)}`;

export const SpriteSheetFileName = (id: string, hash: string) =>
  `sprites_${id}.${hash}.webp`;

export const ColorWhite: ParsedColor = 0xFFFFFFFF;
