/**
 * This type is a blatant lie. The game has *hundreds* of components. However,
 * this lie lets us find components *and* narrow them by type with a `switch`
 * and no other type magic.
 *
 * Think of it less as "the only components that exist" and more like "the only
 * components we care about".
 */
export type Component =
  | SpriteComponent
  | SolutionContainerManagerComponent
  | SliceableFoodComponent
  | ExtractableComponent
  | ProduceComponent
  | ConstructionComponent
  | TagComponent
  | StomachComponent
  | DeepFrySpawnComponent
  | FoodSequenceStartPointComponent
  | FoodSequenceElementComponent
  ;

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

export interface SolutionContainerManagerComponent {
  readonly type: 'SolutionContainerManager';
  readonly solutions?: Readonly<Record<string, Solution>>;
}

export interface Solution {
  readonly maxVol?: number;
  readonly reagents?: readonly SolutionReagent[];
}

export interface SolutionReagent {
  readonly ReagentId: string;
  readonly Quantity: number;
}

export interface SliceableFoodComponent {
  readonly type: 'SliceableFood';
  readonly slice?: string;
  readonly count?: number;
}

export interface ExtractableComponent {
  readonly type: 'Extractable';
  readonly grindableSolutionName?: string;
  readonly juiceSolution?: Solution;
}

export interface ProduceComponent {
  readonly type: 'Produce';
}

export interface ConstructionComponent {
  readonly type: 'Construction';
  readonly graph?: string;
  readonly node?: string;
  readonly edge?: number;
  readonly step?: number;
}

export interface TagComponent {
  readonly type: 'Tag';
  readonly tags?: readonly string[];
}

export interface FoodSequenceStartPointComponent {
  readonly type: 'FoodSequenceStartPoint';
  readonly key?: string;
  readonly maxLayers?: number;
}

export interface FoodSequenceElementComponent {
  readonly type: 'FoodSequenceElement';
  readonly entries?: Readonly<Record<string, string>>;
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
  readonly tags?: readonly string[];
  readonly components?: readonly string[];
  readonly sizes?: readonly string[];
}

/** Frontier: Deep frying */
export interface DeepFrySpawnComponent {
  readonly type: 'DeepFrySpawn';
  readonly output: string;
}
