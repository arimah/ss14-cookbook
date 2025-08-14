import {createDraft, Draft, finishDraft} from 'immer';
import {RawGameData} from './read-raw';
import {EntityPrototype} from './prototypes';
import {
  Component,
  ConstructionComponent,
  ExtractableComponent,
  FoodSequenceElementComponent,
  FoodSequenceStartPointComponent,
  SliceableFoodComponent,
  Solution,
  SpriteComponent,
  StomachComponent,
} from './components';
import {DefaultFoodSequenceMaxLayers, DefaultTotalSliceCount, FoodSolutionName} from './constants';
import {entityAndAncestors} from './helpers';
import {ResolvedEntity, ResolvedSolution, ResolvedSpriteLayer} from './types';

export const resolveComponents = (
  raw: RawGameData
): ReadonlyMap<string, ResolvedEntity> => {
  const result = new Map<string, ResolvedEntity>();

  for (const entity of raw.entities.values()) {
    const resolved = resolveEntity(entity, raw.entities);
    result.set(resolved.id, resolved);
  }

  return result;
}

const InitialState: ResolvedEntity = {
  id: '',
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
  foodSequenceElement: [],
  sliceableFood: null,
  construction: null,
  deepFryOutput: null,
  stomach: null,
  tags: new Set(),
  components: new Set(),
};

const EmptyComponents: Component[] = [];

const resolveEntity = (
  entity: EntityPrototype,
  allEntities: ReadonlyMap<string, EntityPrototype>
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
          resolveFoodSequenceElement(draft, comp);
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
  comp: FoodSequenceElementComponent
): void => {
  if (comp.entries != null) {
    draft.foodSequenceElement = Object.keys(comp.entries);
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
      draft.stomach.tags = whitelist.tags as string[];
    }
    if (whitelist.components) {
      draft.stomach.components = whitelist.components as string[];
    }
  }
};
