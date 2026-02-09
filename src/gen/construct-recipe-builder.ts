import {
  ConstructionStep,
  ConstructVerb,
  OneOrMoreEntities,
  ReagentIngredient,
  SimpleInteractionStep,
} from '../types';
import { DefaultRecipeGroup } from './constants';
import { EntityId, ReagentId } from './prototypes';
import { ResolvedConstructionRecipe } from './types';

// The lack of `amount` field is technically invalid, but for construct recipes
// in particular, the amount is not used.
const EmptyReagentIngredient = {} as ReagentIngredient;

const CutStep: SimpleInteractionStep = { type: 'cut' };
const RollStep: SimpleInteractionStep = { type: 'roll' };
const StirStep: SimpleInteractionStep = { type: 'stir' };
const ShakeStep: SimpleInteractionStep = { type: 'shake' };

export class ConstructRecipeBuilder {
  public readonly group: string;
  public solidResult: EntityId | null = null;
  public reagentResult: ReagentId | null = null;
  public resultQty: number | undefined = undefined;
  public solidIngredients: Record<EntityId, number> = {};
  public reagentIngredients: Record<ReagentId, ReagentIngredient> = {};
  public steps: ConstructionStep[] = [];

  public constructor(group = DefaultRecipeGroup) {
    this.group = group;
  }

  public toRecipe(): ResolvedConstructionRecipe {
    if (!this.solidResult && !this.reagentResult) {
      throw new Error(`Recipe has neither solid nor reagent result`);
    }

    return {
      method: 'construct',
      mainVerb: this.getMainVerb(),
      group: this.group,
      solidResult: this.solidResult,
      reagentResult: this.reagentResult,
      resultQty: this.resultQty,
      solids: this.solidIngredients,
      reagents: this.reagentIngredients,
      steps: this.steps,
    };
  }

  public getMainVerb(): ConstructVerb | null {
    let result: ConstructVerb | null = null;
    for (const step of this.steps) {
      let stepVerb: ConstructVerb;
      switch (step.type) {
        case 'mix':
        case 'heat':
        case 'cut':
        case 'roll':
          stepVerb = step.type;
          break;
        case 'heatMixture':
          stepVerb = 'heat';
          break;
        case 'stir':
        case 'shake':
          stepVerb = 'mix';
          break;
        default:
          continue;
      }

      if (result && result !== stepVerb) {
        // Multiple incompatible candidates; no *main* verb.
        return null;
      }
      result = stepVerb;
    }
    return result;
  }

  public withSolidResult(id: EntityId): this {
    if (this.reagentResult) {
      throw new Error(`Recipe can't have both solid and reagent result`);
    }
    this.solidResult = id;
    return this;
  }

  public withReagentResult(id: ReagentId): this {
    if (this.solidResult) {
      throw new Error(`Recipe can't have both solid and reagent result`);
    }
    this.reagentResult = id;
    return this;
  }

  public withResultQty(qty: number): this {
    this.resultQty = qty;
    return this;
  }

  public pushStep(step: ConstructionStep): this {
    this.steps.push(step);
    this.collectIngredients(step);
    return this;
  }

  public startWith(entity: EntityId): this {
    return this.pushStep({ type: 'start', entity });
  }

  public endWith(entity: OneOrMoreEntities): this {
    return this.pushStep({ type: 'end', entity });
  }

  public mix(reagents: Readonly<Record<ReagentId, ReagentIngredient>>): this {
    return this.pushStep({ type: 'mix', reagents });
  }

  public addSolid(
    entity: OneOrMoreEntities,
    minCount?: number,
    maxCount?: number
  ): this {
    return this.pushStep({ type: 'add', entity, minCount, maxCount });
  }

  public addReagent(
    reagent: string,
    minCount: number,
    maxCount: number
  ): this {
    return this.pushStep({ type: 'addReagent', reagent, minCount, maxCount });
  }

  public heat(minTemp: number): this {
    return this.pushStep({ type: 'heat', minTemp });
  }

  public heatMixture(minTemp: number, maxTemp: number | null = null): this {
    return this.pushStep({ type: 'heatMixture', minTemp, maxTemp });
  }

  public cut(): this {
    return this.pushStep(CutStep);
  }

  public roll(): this {
    return this.pushStep(RollStep);
  }

  public stir(): this {
    return this.pushStep(StirStep);
  }

  public shake(): this {
    return this.pushStep(ShakeStep);
  }

  public alsoMakes(entity: OneOrMoreEntities): this {
    return this.pushStep({ type: 'alsoMakes', entity });
  }

  private collectIngredients(step: ConstructionStep): void {
    switch (step.type) {
      case 'start':
        this.solidIngredients[step.entity as EntityId] = 1;
        break;
      case 'end':
        for (const id of eachEntity(step.entity)) {
          this.solidIngredients[id] = 1;
        }
        break;
      case 'mix':
        for (const id of Object.keys(step.reagents)) {
          this.reagentIngredients[id as ReagentId] = EmptyReagentIngredient;
        }
        break;
      case 'add':
        for (const id of eachEntity(step.entity)) {
          this.solidIngredients[id] = 1;
        }
        break;
      case 'addReagent':
        this.reagentIngredients[step.reagent as ReagentId] = EmptyReagentIngredient;
        break;
      case 'alsoMakes':
      case 'heat':
      case 'heatMixture':
      case 'cut':
      case 'roll':
      case 'stir':
      case 'shake':
        // No ingredients
        break;
    }
  }
}

function* eachEntity(entity: OneOrMoreEntities): Generator<EntityId> {
  if (typeof entity === 'string') {
    yield entity as EntityId;
  } else {
    yield* entity as EntityId[];
  }
}
