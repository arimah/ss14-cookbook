import {
  ConstructionGraphId,
  EntityId,
  FoodSequenceElementId,
  ReagentId,
  TagId,
} from './prototypes';

/**
 * This type is a blatant lie. The game has *hundreds* of components. However,
 * this lie lets us find components *and* narrow them by type with a `switch`
 * and no other type magic.
 *
 * Think of it less as "the only components that exist" and more like "the only
 * components we care about".
 */
export type Component =
  | ButcherableComponent
  | ConstructionComponent
  | DeepFrySpawnComponent
  | ExtractableComponent
  | FoodSequenceElementComponent
  | FoodSequenceStartPointComponent
  | ProduceComponent
  | SliceableFoodComponent
  | SolutionContainerManagerComponent
  | SpriteComponent
  | StomachComponent
  | TagComponent
  ;

export interface ButcherableComponent {
  readonly type: 'Butcherable';
  readonly butcheringType: string;
  readonly spawned: readonly EntitySpawnEntry[];
}

export interface EntitySpawnEntry {
  readonly id?: EntityId;
  readonly prob?: number;
  readonly amount?: number;
  readonly maxAmount?: number;
  readonly orGroup?: string;
}

export interface ConstructionComponent {
  readonly type: 'Construction';
  readonly graph?: ConstructionGraphId;
  readonly node?: string;
  readonly edge?: number;
  readonly step?: number;
}

/** Frontier: Deep frying */
export interface DeepFrySpawnComponent {
  readonly type: 'DeepFrySpawn';
  readonly output: EntityId;
}

export interface ExtractableComponent {
  readonly type: 'Extractable';
  readonly grindableSolutionName?: string;
  readonly juiceSolution?: Solution;
}

export interface FoodSequenceElementComponent {
  readonly type: 'FoodSequenceElement';
  readonly entries?: Readonly<Record<TagId, FoodSequenceElementId>>;
}

export interface FoodSequenceStartPointComponent {
  readonly type: 'FoodSequenceStartPoint';
  readonly key?: TagId;
  readonly maxLayers?: number;
}

export interface ProduceComponent {
  readonly type: 'Produce';
}

export interface SliceableFoodComponent {
  readonly type: 'SliceableFood';
  readonly slice?: EntityId;
  readonly count?: number;
}

export interface SolutionContainerManagerComponent {
  readonly type: 'SolutionContainerManager';
  readonly solutions?: Readonly<Record<string, Solution>>;
}

export interface Solution {
  readonly maxVol?: number;
  readonly reagents?: readonly SolutionReagent[];
}

export interface SolutionReagent {
  readonly ReagentId: ReagentId;
  readonly Quantity: number;
}

export interface SpriteComponent {
  readonly type: 'Sprite';
  readonly state?: string;
  readonly sprite?: string;
  readonly color?: string;
  readonly layers?: readonly {
    readonly sprite?: string;
    readonly state: string;
    readonly visible?: boolean;
    readonly color?: string;
  }[];
}

export interface StomachComponent {
  readonly type: 'Stomach';
  readonly specialDigestible?: EntityWhitelist;
}

export interface EntityWhitelist {
  // NOTE: We only care about tags and components here. In practice, at time
  // of writing, stomachs with special digestion ONLY whitelist by tag or
  // component.
  //
  // The C# class EntityWhitelist can also filter by size, but we don't actually
  // make use of that field. It's part of this interface's definition so we can
  // emit warnings if we encounter it.
  readonly tags?: readonly TagId[];
  readonly components?: readonly string[];
  readonly sizes?: readonly string[];
}

export interface TagComponent {
  readonly type: 'Tag';
  readonly tags?: readonly TagId[];
}
