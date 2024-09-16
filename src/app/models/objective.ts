import { AdjustedRecipe } from './data/recipe';
import { ObjectiveType } from './enum/objective-type';
import { ObjectiveUnit } from './enum/objective-unit';
import { Rational } from './rational';
import { RecipeSettings } from './settings/recipe-settings';

export function isRecipeObjective(obj: Objective): obj is RecipeObjective {
  return obj.unit === ObjectiveUnit.Machines;
}

export interface ObjectiveBase {
  /** If unit is ObjectiveUnit.Machines, a recipe id; otherwise an item id */
  targetId: string;
  unit: ObjectiveUnit;
  type?: ObjectiveType;
}

export interface Objective extends ObjectiveBase, RecipeSettings {
  id: string;
  /** If unit is ObjectiveUnit.Machines, a recipe id; otherwise an item id */
  targetId: string;
  value: Rational;
  unit: ObjectiveUnit;
  type: ObjectiveType;
  recipe?: AdjustedRecipe;
}

export interface RecipeObjective extends Objective {
  unit: ObjectiveUnit.Machines;
  recipe: AdjustedRecipe;
}
