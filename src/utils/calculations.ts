import { Recipe, Ingredient, PackagingItem, ActiveBatch, ConsolidatedIngredient, ConsolidatedPackaging } from '../types';

export interface ScaledIngredient extends Ingredient {
  scaledGrams: number;
  formattedAmount: string;
  isAlternativeApplied?: boolean;
}

export interface ScaledPackaging extends PackagingItem {
  scaledCount: number;
}

export interface ScaledRecipeResult {
  recipe: Recipe;
  targetYield: number;
  ratio: number;
  ingredients: ScaledIngredient[];
  packaging: ScaledPackaging[];
  estimatedHours: number;
  freezer: {
    f1Percent: number;
    f1Trays: number;
    f1MaxTrays: number;
    f2Percent: number;
    f2Trays: number;
    f2MaxTrays: number;
    isOverCapacity: boolean;
    overCapacityMessage?: string;
  };
  warnings: string[];
}

export function formatGrams(grams: number, unit?: string): string {
  if (unit === 'u' || unit === 'paquetes') {
    return `${Math.round(grams)} ${unit}`;
  }
  if (unit === 'L' || unit === 'ml') {
    if (grams >= 1000) {
      const liters = (grams / 1000).toFixed(grams % 1000 === 0 ? 0 : 2);
      return `${liters} L (${Math.round(grams).toLocaleString('es-AR')} ml)`;
    }
    return `${Math.round(grams).toLocaleString('es-AR')} ml`;
  }
  if (grams >= 1000) {
    const kg = (grams / 1000).toFixed(grams % 1000 === 0 ? 0 : 2);
    return `${kg} kg (${Math.round(grams).toLocaleString('es-AR')} g)`;
  }
  return `${Math.round(grams).toLocaleString('es-AR')} g`;
}

export function formatSimpleKg(grams: number, unit?: string): string {
  if (unit === 'u' || unit === 'paquetes') {
    return `${Math.round(grams)} ${unit}`;
  }
  if (unit === 'L' || unit === 'ml') {
    if (grams >= 1000) {
      return `${(grams / 1000).toFixed(2)} L`;
    }
    return `${Math.round(grams)} ml`;
  }
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(2)} kg`;
  }
  return `${Math.round(grams)} g`;
}

export function scaleRecipe(
  recipe: Recipe,
  targetYield: number,
  selectedAlternatives: string[] = []
): ScaledRecipeResult {
  const baseYield = recipe.baseYieldUnits || 1;
  const ratio = Math.max(0.01, targetYield / baseYield);

  // Scaled ingredients
  const scaledIngredients: ScaledIngredient[] = recipe.ingredients.map((ing) => {
    let grams = ing.amountGrams * ratio;
    let isAlternativeApplied = false;
    let name = ing.name;
    let category = ing.category;

    if (ing.alternative && selectedAlternatives.includes(ing.id)) {
      isAlternativeApplied = true;
      grams = ing.alternative.amountGrams * ratio;
      name = ing.alternative.name;
    }

    return {
      ...ing,
      name,
      category,
      scaledGrams: grams,
      formattedAmount: formatGrams(grams, ing.unit),
      isAlternativeApplied,
    };
  });

  // Scaled packaging
  const scaledPackaging: ScaledPackaging[] = recipe.packaging.map((pkg) => {
    const count = Math.ceil(pkg.baseQuantity * ratio);
    return {
      ...pkg,
      scaledCount: count,
    };
  });

  // Estimated hours: setup + assembly time scaled
  const setupHours = recipe.baseHours * 0.2; // fixed setup
  const variableHours = recipe.baseHours * 0.8 * ratio;
  const estimatedHours = Math.round((setupHours + variableHours) * 10) / 10;

  // Freezer calculation
  const f1Max = recipe.freezerRule.f1MaxTrays || 10;
  const f2Max = recipe.freezerRule.f2MaxTrays || 10;

  let f1Trays = 0;
  let f2Trays = 0;
  let f1Percent = 0;
  let f2Percent = 0;

  if (recipe.id === 'canelones') {
    // Canelones uses 5 racks in F1 and 5 in F2 for 112 trays
    const totalCanelonesRacks = 10 * ratio; // 5 in F1, 5 in F2
    f1Trays = Math.min(5, totalCanelonesRacks);
    f2Trays = Math.max(0, totalCanelonesRacks - 5);
    f1Percent = Math.round((f1Trays / 5) * 100);
    f2Percent = Math.round((f2Trays / 5) * 100);
  } else if (recipe.category === 'pastas' && recipe.id !== 'pasta-caprese') {
    // 11 in F1 and 11 in F2 for 2112 units (88 packs)
    const totalTrays = 22 * ratio;
    f1Trays = Math.min(11, totalTrays);
    f2Trays = Math.max(0, totalTrays - 11);
    f1Percent = Math.round((f1Trays / 11) * 100);
    f2Percent = Math.round((f2Trays / 11) * 100);
  } else if (recipe.id === 'pasta-caprese') {
    // 10 trays in F1, 0 in F2
    const totalTrays = 10 * ratio;
    f1Trays = Math.min(11, totalTrays);
    f2Trays = Math.max(0, totalTrays - 11);
    f1Percent = Math.round((f1Trays / 11) * 100);
    f2Percent = Math.round((f2Trays / 11) * 100);
  } else if (recipe.category === 'postres') {
    // 100% in F1, 0% in F2 for 400 potes
    const totalTrays = 10 * ratio;
    f1Trays = Math.min(10, totalTrays);
    f2Trays = Math.max(0, totalTrays - 10);
    f1Percent = Math.round((f1Trays / 10) * 100);
    f2Percent = Math.round((f2Trays / 10) * 100);
  } else {
    // Tequeños and Chipas: 10 trays in F1, 2-3 in F2 for base yield
    const baseF1 = recipe.freezerRule.f1TraysOccupied || 10;
    const baseF2 = recipe.freezerRule.f2TraysOccupied || 2.5;
    const totalTrays = (baseF1 + baseF2) * ratio;
    f1Trays = Math.min(10, totalTrays);
    f2Trays = Math.max(0, totalTrays - 10);
    f1Percent = Math.round((f1Trays / 10) * 100);
    f2Percent = Math.round((f2Trays / 10) * 100);
  }

  const warnings: string[] = [];
  let isOverCapacity = false;
  let overCapacityMessage: string | undefined;

  if (f1Percent > 100 || f2Percent > 100) {
    isOverCapacity = true;
    overCapacityMessage = `¡ATENCIÓN! La cantidad solicitada (${targetYield} ${recipe.yieldUnitName}) excede la capacidad total de los freezers de la fábrica (F1: ${f1Percent}%, F2: ${f2Percent}%). Se requiere fraccionar en múltiples tandas de producción.`;
    warnings.push(overCapacityMessage);
  }

  if (recipe.id === 'canelones' && targetYield > 40) {
    warnings.push(`Advertencia Operativa: Para canelones, la planta recomienda un lote máximo de 40 bandejas por ritmo de venta, insumos (64 kg espinaca) y logística de frío.`);
  }

  if (recipe.id === 'pasta-caprese' && targetYield > 40 * 24) {
    warnings.push(`Advertencia de Demanda: Por rotación comercial no es conveniente superar las 40 bolsas (960 u) de Caprese.`);
  }

  if (recipe.freezerRule.criticalLimitWarning && ratio >= 1) {
    warnings.push(recipe.freezerRule.criticalLimitWarning);
  }

  return {
    recipe,
    targetYield,
    ratio,
    ingredients: scaledIngredients,
    packaging: scaledPackaging,
    estimatedHours,
    freezer: {
      f1Percent: Math.min(200, f1Percent),
      f1Trays: Math.round(f1Trays * 10) / 10,
      f1MaxTrays: f1Max,
      f2Percent: Math.min(200, f2Percent),
      f2Trays: Math.round(f2Trays * 10) / 10,
      f2MaxTrays: f2Max,
      isOverCapacity,
      overCapacityMessage,
    },
    warnings,
  };
}

export function consolidateBatches(
  batches: ActiveBatch[],
  recipes: Recipe[]
): {
  ingredientsByCategory: Record<string, ConsolidatedIngredient[]>;
  packagingList: ConsolidatedPackaging[];
  totalProductionHours: number;
  f1Occupancy: number;
  f2Occupancy: number;
  freezerWarnings: string[];
} {
  const recipeMap = new Map(recipes.map((r) => [r.id, r]));
  const ingredientMap = new Map<string, ConsolidatedIngredient>();
  const packagingMap = new Map<string, ConsolidatedPackaging>();

  let totalProductionHours = 0;
  let totalF1Trays = 0;
  let totalF2Trays = 0;

  batches.forEach((batch) => {
    const recipe = recipeMap.get(batch.recipeId);
    if (!recipe) return;

    const scaled = scaleRecipe(recipe, batch.targetUnits, batch.selectedAlternativeIds);
    totalProductionHours += scaled.estimatedHours;

    if (batch.status === 'en_freezer' || batch.status === 'elaborando' || batch.status === 'pesando' || batch.status === 'planificado') {
      totalF1Trays += scaled.freezer.f1Trays;
      totalF2Trays += scaled.freezer.f2Trays;
    }

    // Consolidate ingredients
    scaled.ingredients.forEach((ing) => {
      const key = `${ing.name.toLowerCase().trim()}_${ing.unit || 'g'}`;
      if (!ingredientMap.has(key)) {
        ingredientMap.set(key, {
          name: ing.name,
          category: ing.category,
          totalGrams: 0,
          unit: ing.unit || 'g',
          usedInRecipes: [],
        });
      }

      const item = ingredientMap.get(key)!;
      item.totalGrams += ing.scaledGrams;
      item.usedInRecipes.push({
        recipeName: recipe.name,
        amount: ing.scaledGrams,
        unit: ing.unit || 'g',
      });
    });

    // Consolidate packaging
    scaled.packaging.forEach((pkg) => {
      const key = pkg.name.toLowerCase().trim();
      if (!packagingMap.has(key)) {
        packagingMap.set(key, {
          name: pkg.name,
          type: pkg.type,
          totalCount: 0,
          usedInRecipes: [],
        });
      }

      const item = packagingMap.get(key)!;
      item.totalCount += pkg.scaledCount;
      item.usedInRecipes.push({
        recipeName: recipe.name,
        count: pkg.scaledCount,
      });
    });
  });

  // Group ingredients by category
  const ingredientsByCategory: Record<string, ConsolidatedIngredient[]> = {
    lacteos: [],
    harinas_feculas: [],
    frescos_verduras: [],
    huevos: [],
    grasas_liquidos: [],
    especias_condimentos: [],
    otros: [],
  };

  ingredientMap.forEach((item) => {
    const cat = item.category || 'otros';
    if (!ingredientsByCategory[cat]) {
      ingredientsByCategory[cat] = [];
    }
    ingredientsByCategory[cat].push(item);
  });

  // Sort within categories by name
  Object.keys(ingredientsByCategory).forEach((cat) => {
    ingredientsByCategory[cat].sort((a, b) => a.name.localeCompare(b.name));
  });

  // Standard freezer capacity is 10 trays in F1 and 10 trays in F2
  const f1Occupancy = Math.round((totalF1Trays / 10) * 100);
  const f2Occupancy = Math.round((totalF2Trays / 10) * 100);

  const freezerWarnings: string[] = [];
  if (f1Occupancy > 100) {
    freezerWarnings.push(`Freezer 1 excedido (${f1Occupancy}% - ${totalF1Trays.toFixed(1)}/10 bandejas ocupadas). No entran todos los lotes asignados.`);
  }
  if (f2Occupancy > 100) {
    freezerWarnings.push(`Freezer 2 excedido (${f2Occupancy}% - ${totalF2Trays.toFixed(1)}/10 bandejas ocupadas). Se requiere liberar espacio.`);
  }

  return {
    ingredientsByCategory,
    packagingList: Array.from(packagingMap.values()).sort((a, b) => b.totalCount - a.totalCount),
    totalProductionHours: Math.round(totalProductionHours * 10) / 10,
    f1Occupancy,
    f2Occupancy,
    freezerWarnings,
  };
}
