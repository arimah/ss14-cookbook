import {
  ConstructionStep,
  ConstructVerb,
  OneOrMoreEntities,
  ReagentIngredient,
  SimpleInteractionStep,
} from '../types';

import {DefaultRecipeGroup} from './constants';
import {ResolvedConstructionRecipe} from './types';

// The lack of `amount` field is technically invalid, but for construct recipes
// in particular, the amount is not used.
const EmptyReagentIngredient = {} as ReagentIngredient;

const CutStep: SimpleInteractionStep = {type: 'cut'};
const RollStep: SimpleInteractionStep = {type: 'roll'};
const StirStep: SimpleInteractionStep = {type: 'stir'};
const ShakeStep: SimpleInteractionStep = {type: 'shake'};

export class ConstructRecipeBuilder {
  public readonly group: string;
  public solidResult: string | null = null;
  public reagentResult: string | null = null;
  public resultQty: number | undefined = undefined;
  public solidIngredients: Record<string, number> = {};
  public reagentIngredients: Record<string, ReagentIngredient> = {};
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

  public withSolidResult(entityId: string): this {
    if (this.reagentResult) {
      throw new Error(`Recipe can't have both solid and reagent result`);
    }
    this.solidResult = entityId;
    return this;
  }

  public withReagentResult(reagentId: string): this {
    if (this.solidResult) {
      throw new Error(`Recipe can't have both solid and reagent result`);
    }
    this.reagentResult = reagentId;
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

  public startWith(entity: string): this {
    return this.pushStep({type: 'start', entity});
  }

  public endWith(entity: string): this {
    return this.pushStep({type: 'end', entity});
  }

  public mix(reagents: Readonly<Record<string, ReagentIngredient>>): this {
    return this.pushStep({type: 'mix', reagents});
  }

  public add(
    entity: OneOrMoreEntities,
    minCount?: number,
    maxCount?: number
  ): this {
    return this.pushStep({type: 'add', entity, minCount, maxCount});
  }

  public heat(minTemp: number): this {
    return this.pushStep({type: 'heat', minTemp});
  }

  public heatMixture(minTemp: number, maxTemp: number | null = null): this {
    return this.pushStep({type: 'heatMixture', minTemp, maxTemp});
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

  private collectIngredients(step: ConstructionStep): void {
    switch (step.type) {
      case 'start':
        this.solidIngredients[step.entity] = 1;
        break;
      case 'end':
        this.solidIngredients[step.entity] = 1;
        break;
      case 'mix':
        for (const id of Object.keys(step.reagents)) {
          this.reagentIngredients[id] = EmptyReagentIngredient;
        }
        break;
      case 'add':
        if (typeof step.entity === 'string') {
          this.solidIngredients[step.entity] = 1;
        } else {
          for (const id of step.entity) {
            this.solidIngredients[id] = 1;
          }
        }
        break;
      case 'heat':
      case 'cut':
      case 'roll':
      case 'stir':
      case 'shake':
        // No ingredients
        break;
    }
  }
}
