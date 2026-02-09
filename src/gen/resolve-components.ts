import { createDraft, Draft, finishDraft } from 'immer';
import {
  ButcherableComponent,
  Component,
  ConstructionComponent,
  EntitySpawnEntry,
  ExtractableComponent,
  FoodSequenceElementComponent,
  FoodSequenceStartPointComponent,
  SliceableFoodComponent,
  Solution,
  SpriteComponent,
  StomachComponent,
} from './components';
import {
  DefaultButcheringType,
  DefaultFoodSequenceMaxLayers,
  DefaultTotalSliceCount,
  FoodSolutionName,
} from './constants';
import { entityAndAncestors } from './helpers';
import {
  EntityId,
  EntityMap,
  EntityPrototype,
  FoodSequenceElementMap,
  TagId,
} from './prototypes';
import { RawGameData } from './read-raw';
import {
  ResolvedEntity,
  ResolvedEntityMap,
  ResolvedSolution,
  ResolvedSpriteLayer,
} from './types';

export const resolveComponents = (
  raw: RawGameData
): ResolvedEntityMap => {
  const result = new Map<EntityId, ResolvedEntity>();

  for (const entity of raw.entities.values()) {
    if (entity.abstract) {
      continue;
    }

    const resolved = resolveEntity(
      entity,
      raw.entities,
      raw.foodSequenceElements
    );
    result.set(resolved.id, resolved);
  }

  return result;
}

const InitialState: ResolvedEntity = {
  id: '' as EntityId,
  name: '(unknown name)',
  isProduce: false,
  sprite: {
    path: null,
    state: null,
    color: null,
    layers: [],
  },
  solution: null,
  reagents: new Set(),
  extractable: null,
  foodSequenceStart: null,
  foodSequenceElement: null,
  sliceableFood: null,
  butcherable: null,
  construction: null,
  deepFryOutput: null,
  stomach: null,
  tags: new Set(),
  components: new Set(),
};

const EmptyComponents: Component[] = [];

const resolveEntity = (
  entity: EntityPrototype,
  allEntities: EntityMap,
  foodSequenceElements: FoodSequenceElementMap
): ResolvedEntity => {
  const draft = createDraft(InitialState);
  draft.id = entity.id;

  // First walk the entity's inheritance chain and collect component data.
  for (const ent of entityAndAncestors(entity, allEntities)) {
    if (ent.name != null) {
      draft.name = ent.name;
    }

    for (const comp of ent.components ?? EmptyComponents) {
      draft.components.add(comp.type);
      switch (comp.type) {
        case 'Butcherable':
          resolveButcherable(draft, comp);
          break;
        case 'Construction':
          resolveConstruction(draft, comp);
          break;
        case 'DeepFrySpawn':
          draft.deepFryOutput = comp.output;
          break;
        case 'Extractable':
          resolveExtractable(draft, comp);
          break;
        case 'FoodSequenceElement':
          resolveFoodSequenceElement(draft, comp, foodSequenceElements);
          break;
        case 'FoodSequenceStartPoint':
          resolveFoodSequenceStartPoint(draft, comp);
          break;
        case 'Produce':
          draft.isProduce = true;
          break;
        case 'SliceableFood':
          resolveSliceableFood(draft, comp);
          break;
        case 'SolutionContainerManager':
          draft.solution = (comp.solutions ?? null) as Draft<ResolvedSolution> | null;
          break;
        case 'Sprite':
          resolveSprite(draft, comp);
          break;
        case 'Stomach':
          resolveStomach(draft, comp, ent.id);
          break;
        case 'Tag':
          if (comp.tags) {
            draft.tags = new Set(comp.tags);
          }
          break;
      }
    }
  }

  // Then perform some useful post-processing.
  if (draft.solution?.[FoodSolutionName]?.reagents) {
    draft.reagents = new Set(
      draft.solution[FoodSolutionName].reagents.map(x => x.ReagentId)
    );
  }

  return finishDraft(draft);
};

const resolveButcherable = (
  draft: Draft<ResolvedEntity>,
  comp: ButcherableComponent
): void => {
  if (!draft.butcherable) {
    draft.butcherable = {
      tool: DefaultButcheringType,
      spawned: null,
    };
  }

  if (comp.butcheringType) {
    draft.butcherable.tool = comp.butcheringType;
  }
  if (comp.spawned) {
    draft.butcherable.spawned = comp.spawned as Draft<EntitySpawnEntry[]>;
  }
};

const resolveConstruction = (
  draft: Draft<ResolvedEntity>,
  comp: ConstructionComponent
): void => {
  if (!draft.construction) {
    draft.construction = {
      graph: null,
      node: null,
      edge: null,
      step: null,
    };
  }

  if (comp.graph != null) {
    draft.construction.graph = comp.graph;
  }
  if (comp.node != null) {
    draft.construction.node = comp.node;
  }
  if (comp.edge != null) {
    draft.construction.edge = comp.edge;
  }
  if (comp.step != null) {
    draft.construction.step = comp.step;
  }
};

const resolveExtractable = (
  draft: Draft<ResolvedEntity>,
  comp: ExtractableComponent
): void => {
  if (!draft.extractable) {
    draft.extractable = {
      grindSolutionName: null,
      juiceSolution: null,
    };
  }

  if (comp.grindableSolutionName != null) {
    draft.extractable.grindSolutionName = comp.grindableSolutionName;
  }
  if (comp.juiceSolution != null) {
    draft.extractable.juiceSolution = comp.juiceSolution as Draft<Solution>;
  }
};

const resolveFoodSequenceElement = (
  draft: Draft<ResolvedEntity>,
  comp: FoodSequenceElementComponent,
  elements: FoodSequenceElementMap
): void => {
  if (comp.entries != null) {
    draft.foodSequenceElement = new Map(
      Object.entries(comp.entries).map(([seqId, elemId]) =>
        [seqId as TagId, {
          element: elemId,
          final: elements.get(elemId)?.final ?? false,
        }]
      )
    );
  }
};

const resolveFoodSequenceStartPoint = (
  draft: Draft<ResolvedEntity>,
  comp: FoodSequenceStartPointComponent
): void => {
  if (!draft.foodSequenceStart) {
    draft.foodSequenceStart = {
      key: null,
      maxLayers: DefaultFoodSequenceMaxLayers,
    };
  }

  if (comp.key != null) {
    draft.foodSequenceStart.key = comp.key;
  }
  if (comp.maxLayers != null) {
    draft.foodSequenceStart.maxLayers = comp.maxLayers;
  }
};

const resolveSliceableFood = (
  draft: Draft<ResolvedEntity>,
  comp: SliceableFoodComponent
): void => {
  if (!draft.sliceableFood) {
    draft.sliceableFood = {
      slice: null,
      count: DefaultTotalSliceCount,
    };
  }

  if (comp.slice != null) {
    draft.sliceableFood.slice = comp.slice;
  }
  if (comp.count != null) {
    draft.sliceableFood.count = comp.count;
  }
};

const resolveSprite = (
  draft: Draft<ResolvedEntity>,
  comp: SpriteComponent
): void => {
  if (!draft.sprite) {
    draft.sprite = {
      path: null,
      state: null,
      color: null,
      layers: [],
    };
  }

  const sprite = draft.sprite;

  if (comp.sprite != null) {
    sprite.path = comp.sprite;
  }
  if (comp.state != null) {
    sprite.state = comp.state;
  }
  if (comp.color != null) {
    sprite.color = comp.color;
  }
  if (comp.layers != null) {
    sprite.layers = comp.layers
      .reduce((layers, layer, i) => {
        const prev: Draft<ResolvedSpriteLayer> = sprite.layers[i] ?? {
          path: null,
          state: null,
          color: null,
          visible: true,
        };

        if (layer.sprite != null) {
          prev.path = layer.sprite;
        }
        if (layer.state != null) {
          prev.state = layer.state;
        }
        if (layer.visible != null) {
          prev.visible = layer.visible;
        }
        if (layer.color != null) {
          prev.color = layer.color;
        }

        layers[i] = prev;
        return layers;
      }, [] as Draft<ResolvedSpriteLayer[]>);
  }
};

const resolveStomach = (
  draft: Draft<ResolvedEntity>,
  comp: StomachComponent,
  entityId: string
): void => {
  if (!draft.stomach) {
    draft.stomach = {
      components: [],
      tags: [],
    };
  }

  const whitelist = comp.specialDigestible;
  if (whitelist != null) {
    if (whitelist.sizes) {
      console.warn(
        `Entity '${entityId}': Stomach has unsupported whitelist property: size`
      );
    }

    if (whitelist.tags) {
      draft.stomach.tags = whitelist.tags as TagId[];
    }
    if (whitelist.components) {
      draft.stomach.components = whitelist.components as string[];
    }
  }
};
