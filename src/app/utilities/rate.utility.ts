import {
  SankeyLinkExtraProperties,
  SankeyNodeExtraProperties,
} from '~/d3-sankey/models';
import { sankey } from '~/d3-sankey/sankey';
import { coalesce, spread, toEntities } from '~/helpers';
import { Recipe } from '~/models/data/recipe';
import { AdjustedDataset } from '~/models/dataset';
import { DisplayRateInfo } from '~/models/enum/display-rate';
import { EnergyType } from '~/models/enum/energy-type';
import { Game } from '~/models/enum/game';
import { ObjectiveType } from '~/models/enum/objective-type';
import { ObjectiveUnit } from '~/models/enum/objective-unit';
import { Objective } from '~/models/objective';
import { Rational, rational } from '~/models/rational';
import { ItemSettings } from '~/models/settings/item-settings';
import { RecipeSettings } from '~/models/settings/recipe-settings';
import { SettingsComplete } from '~/models/settings/settings-complete';
import { Step } from '~/models/step';
import { Entities, Optional } from '~/models/utils';
import { ItemsState } from '~/services/items.service';

const ROOT_ID = '';

export class RateUtility {
  static objectiveNormalizedRate(
    objective: Objective,
    itemsState: ItemsState,
    beltSpeed: Entities<Rational>,
    displayRateInfo: DisplayRateInfo,
    data: AdjustedDataset,
  ): Rational {
    // Ignore unit entirely when maximizing, do not adjust if unit is Machines
    if (
      objective.unit === ObjectiveUnit.Machines ||
      objective.type === ObjectiveType.Maximize
    ) {
      return objective.value;
    }

    const rate = objective.value;
    let factor = rational.one;
    switch (objective.unit) {
      case ObjectiveUnit.Items: {
        factor = displayRateInfo.value.reciprocal();
        break;
      }
      case ObjectiveUnit.Belts: {
        const beltId = itemsState[objective.targetId].beltId;
        if (beltId) {
          factor = beltSpeed[beltId];
        }
        break;
      }
      case ObjectiveUnit.Wagons: {
        const wagonId = itemsState[objective.targetId].wagonId;
        if (wagonId) {
          const item = data.itemEntities[objective.targetId];
          const wagon = data.itemEntities[wagonId];
          if (item.stack && wagon.cargoWagon) {
            factor = item.stack
              .mul(wagon.cargoWagon.size)
              .div(displayRateInfo.value);
          } else if (wagon.fluidWagon) {
            factor = wagon.fluidWagon.capacity.div(displayRateInfo.value);
          }
        }
        break;
      }
    }

    // Adjust based on productivity for technology objectives
    const recipe =
      data.adjustedRecipe[data.itemRecipeIds[objective.targetId][0]];
    if (recipe?.isTechnology) {
      factor = factor.mul(recipe.productivity);
    }

    return rate.mul(factor);
  }

  static addEntityValue(
    step: Step,
    key: 'parents' | 'outputs',
    parentId: string,
    value: Rational,
  ): void {
    const obj = step[key];
    if (!obj) {
      step[key] = { [parentId]: value };
    } else if (obj[parentId]) {
      obj[parentId] = obj[parentId].add(value);
    } else {
      obj[parentId] = value;
    }
  }

  static adjustPowerPollution(step: Step, recipe: Recipe, game: Game): void {
    if (step.machines?.nonzero() && !recipe.part) {
      if (recipe.drain?.nonzero() || recipe.consumption?.nonzero()) {
        // Reset power
        step.power = rational.zero;

        // Calculate drain
        if (recipe.drain?.nonzero()) {
          let machines = step.machines.ceil();
          if (game === Game.DysonSphereProgram) {
            // In DSP drain is not cumulative; only add for inactive machines
            machines = machines.sub(step.machines);
          }

          step.power = step.power.add(machines.mul(recipe.drain));
        }
        // Calculate consumption
        if (recipe.consumption?.nonzero()) {
          step.power = step.power.add(step.machines.mul(recipe.consumption));
        }
      }

      // Calculate pollution
      if (recipe.pollution?.nonzero()) {
        step.pollution = step.machines.mul(recipe.pollution);
      }
    }
  }

  static normalizeSteps(
    steps: Step[],
    objectives: Objective[],
    itemsState: Entities<ItemSettings>,
    recipesState: Entities<RecipeSettings>,
    beltSpeed: Entities<Rational>,
    dispRateInfo: DisplayRateInfo,
    settings: SettingsComplete,
    data: AdjustedDataset,
  ): Step[] {
    const _steps = this.copy(steps);

    for (const step of _steps) {
      this.calculateParentsOutputs(step, _steps);
    }

    const objectiveEntities = toEntities(objectives);

    for (const step of _steps) {
      this.calculateSettings(step, objectiveEntities, recipesState);
      this.calculateBelts(step, itemsState, beltSpeed, data);
      this.calculateBeacons(step, settings.beaconReceivers, data);
      this.calculateDisplayRate(step, dispRateInfo);
      this.calculateChecked(step, settings);
    }

    this.sortBySankey(_steps);
    return this.calculateHierarchy(_steps);
  }

  static calculateParentsOutputs(step: Step, steps: Step[]): void {
    if (step.recipe && step.machines?.nonzero()) {
      const recipe = step.recipe;
      const quantity = step.machines.div(recipe.time);
      for (const itemId of Object.keys(recipe.in)) {
        if (recipe.in[itemId].nonzero()) {
          const amount = recipe.in[itemId].mul(quantity);
          const itemStep = steps.find((s) => s.itemId === itemId);
          if (itemStep != null) {
            this.addEntityValue(itemStep, 'parents', step.id, amount);
          }
        }
      }
      for (const itemId of Object.keys(recipe.out)) {
        if (recipe.out[itemId].nonzero()) {
          const amount = recipe.out[itemId].mul(quantity);
          const itemStep = steps.find((s) => s.itemId === itemId);
          if (itemStep?.items?.nonzero()) {
            this.addEntityValue(
              step,
              'outputs',
              itemId,
              amount.div(itemStep.items),
            );
          }
        }
      }
    }
  }

  static calculateSettings(
    step: Step,
    objectiveEntities: Entities<Objective>,
    recipesState: Entities<RecipeSettings>,
  ): void {
    if (step.recipeId) {
      if (step.recipeObjectiveId) {
        step.recipeSettings = objectiveEntities[step.recipeObjectiveId];
      } else {
        step.recipeSettings = recipesState[step.recipeId];
      }
    }
  }

  static calculateBelts(
    step: Step,
    itemsState: Entities<ItemSettings>,
    beltSpeed: Entities<Rational>,
    data: AdjustedDataset,
  ): void {
    let noItems = false;
    if (step.recipeId != null && step.recipeSettings != null) {
      const machineId = step.recipeSettings.machineId;
      if (machineId != null) {
        const machine = data.machineEntities[machineId];
        const recipe = data.recipeEntities[step.recipeId];
        // No belts/wagons on research rows or rocket part rows
        noItems = !!(recipe.isTechnology || (machine.silo && !recipe.part));
      }
    }
    if (noItems) {
      delete step.belts;
      delete step.wagons;
    } else if (step.itemId != null) {
      const belt = itemsState[step.itemId].beltId;
      if (step.items != null && belt != null) {
        step.belts = step.items.div(beltSpeed[belt]);
      }
      const wagon = itemsState[step.itemId].wagonId;
      if (step.items != null && wagon != null) {
        const item = data.itemEntities[step.itemId];
        if (item.stack) {
          step.wagons = step.items.div(
            data.cargoWagonEntities[wagon].size.mul(item.stack),
          );
        } else {
          step.wagons = step.items.div(data.fluidWagonEntities[wagon].capacity);
        }
      }
    }
  }

  static calculateBeacons(
    step: Step,
    beaconReceivers: Optional<Rational>,
    data: AdjustedDataset,
  ): void {
    if (
      !beaconReceivers?.nonzero() ||
      step.recipeId == null ||
      !step.machines?.nonzero() ||
      data.recipeEntities[step.recipeId].part ||
      step.recipeSettings == null
    ) {
      return;
    }

    const machines = step.machines;

    const settings = step.recipeSettings;
    if (settings.beacons == null) return;

    step.recipeSettings = spread(step.recipeSettings, {
      beacons: settings.beacons.map((b) => {
        let total = b.total;
        if (b.id != null) {
          if (b.count != null && total == null) {
            total = machines.ceil().mul(b.count).div(beaconReceivers);
            if (total.lt(b.count)) {
              // Can't be less than beacon count
              total = b.count;
            }
          }

          const beacon = data.beaconEntities[b.id];
          if (
            beacon.type === EnergyType.Electric &&
            beacon.usage != null &&
            total != null
          ) {
            step.power = (step.power ?? rational.zero).add(
              total.mul(beacon.usage),
            );
          }
        }

        return { ...b, total };
      }),
    });
  }

  static calculateDisplayRate(step: Step, dispRateInfo: DisplayRateInfo): void {
    if (step.items) {
      if (step.parents) {
        for (const key of Object.keys(step.parents)) {
          step.parents[key] = step.parents[key].div(step.items);
        }
      }
      step.items = step.items.mul(dispRateInfo.value);
    }
    if (step.surplus) {
      step.surplus = step.surplus.mul(dispRateInfo.value);
    }
    if (step.wagons) {
      step.wagons = step.wagons.mul(dispRateInfo.value);
    }
    if (step.pollution) {
      step.pollution = step.pollution.mul(dispRateInfo.value);
    }
    if (step.output) {
      step.output = step.output.mul(dispRateInfo.value);
    }
  }

  static calculateChecked(step: Step, settings: SettingsComplete): void {
    // Priority: 1) Item state, 2) Recipe objective state, 3) Recipe state
    if (step.itemId != null) {
      step.checked = settings.checkedItemIds.has(step.itemId);
    } else if (step.recipeObjectiveId != null) {
      step.checked = settings.checkedObjectiveIds.has(step.recipeObjectiveId);
    } else if (step.recipeId != null) {
      step.checked = settings.checkedRecipeIds.has(step.recipeId);
    }
  }

  /** Generates a simple sankey diagram and sorts steps by their node depth */
  static sortBySankey(steps: Step[]): void {
    interface SimpleNode extends SankeyNodeExtraProperties {
      id: string;
      stepId: string;
    }
    interface SimpleLink extends SankeyLinkExtraProperties {
      source: string;
      target: string;
      value: number;
    }

    const stepMap = steps.reduce((e: Entities<Step>, s) => {
      e[s.id] = s;
      return e;
    }, {});
    const nodes: SimpleNode[] = [];
    const links: SimpleLink[] = [];

    for (const step of steps) {
      if (step.itemId) {
        const id = `i|${step.itemId}`;
        nodes.push({ id, stepId: step.id });
        if (step.parents) {
          for (const stepId of Object.keys(step.parents)) {
            if (stepId === '') continue;
            const recipeId = stepMap[stepId].recipeId;
            if (recipeId == null) continue;
            links.push({
              source: id,
              target: `r|${recipeId}`,
              value: 1,
            });
          }
        }
      }

      if (step.recipeId) {
        const id = `r|${step.recipeId}`;
        nodes.push({ id, stepId: step.id });
        if (step.outputs) {
          for (const itemId of Object.keys(step.outputs)) {
            links.push({ source: id, target: `i|${itemId}`, value: 1 });
          }
        }
      }
    }

    if (!nodes.length || !links.length) return;

    const result = sankey<SimpleNode, SimpleLink>().nodeId((d) => d.id)({
      nodes,
      links,
    });
    for (const step of steps) {
      step.depth = result.nodes.find((n) => n.stepId === step.id)?.depth;
    }

    // Rank output steps highest, then rank by sankey depth
    function stepRank(step: Step): number {
      if (step.output) return 100000;
      return coalesce(step.depth, 0);
    }

    steps.sort((a, b) => stepRank(b) - stepRank(a));
  }

  static calculateHierarchy(steps: Step[]): Step[] {
    // Determine parents
    const parents: Entities = {};
    for (const step of steps) {
      if (
        step.parents == null ||
        step.parents[''] ||
        Object.keys(step.parents).length > 1
      ) {
        parents[step.id] = ROOT_ID;
      } else {
        const stepId = Object.keys(step.parents)[0];
        const parent = steps.find((s) => s.id === stepId);
        if (parent) {
          if (step.id === parent.id) {
            parents[step.id] = ROOT_ID;
          } else {
            parents[step.id] = parent.id;
          }
        }
      }
    }

    // Set up hierarchy groups
    const groups: Entities<Step[]> = {};
    for (const step of steps) {
      const parentId = parents[step.id];
      if (!groups[parentId]) {
        groups[parentId] = [];
      }
      groups[parentId].push(step);
    }

    // Perform recursive sort
    const sorted = this.sortRecursive(groups, ROOT_ID, []);

    // Add back any steps left out (potentially circular loops)
    sorted.push(...steps.filter((s) => !sorted.includes(s)));

    return sorted;
  }

  static sortRecursive(
    groups: Entities<Step[]>,
    id: string,
    result: Step[],
  ): Step[] {
    if (!groups[id]) {
      return [];
    }
    const group = groups[id];
    for (const s of group) {
      result.push(s);
      this.sortRecursive(groups, s.id, result);
    }

    return result;
  }

  static copy(steps: Step[]): Step[] {
    return steps.map((s) =>
      s.parents ? spread(s, { parents: spread(s.parents) }) : spread(s),
    );
  }
}
