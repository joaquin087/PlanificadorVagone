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
  laborPercent: number;
  ingredients: ScaledIngredient[];
  packaging: ScaledPackaging[];
  estimatedHours: number;
  freezer: {
    singleFreezerPercent: number;
    f1Percent: number;
    f1Trays: number;
    f1MaxTrays: number;
    f2Percent: number;
    f2Trays: number;
    f2MaxTrays: number;
    isDirectPotes: boolean;
    trayDescription: string;
    occupancySummary: string;
    isOverCapacity: boolean;
    overCapacityMessage?: string;
  };
  warnings: string[];
}

/**
 * Exact capacity rules for ONE standard freezer (100% occupancy):
 * - Pastas: 44 paquetes de 24u = 1.056 unidades (11 bandejas pasantes de frío)
 * - Tequeños: 900 tequeños (10 bandejas x 90u)
 * - Chipas: 2.400 chipas (10 bandejas x 240u)
 * - Canelones: 72 bandejas plásticas (6 bandejas metálicas grandes x 12 bandejas plásticas c/u)
 * - Postres: 400 potes / porciones individuales (apilados directamente sin bandejas metálicas)
 */
export function getFreezerCapacitySpec(recipe: Recipe): {
  unitsPerFreezer: number;
  unitLabel: string;
  maxTraysPerFreezer: number;
  isDirectPotes: boolean;
  trayDescription: string;
} {
  if (recipe.category === 'pastas') {
    return {
      unitsPerFreezer: 1056, // 44 paquetes de 24u = 1.056 unidades
      unitLabel: 'paquetes (1.056 u)',
      maxTraysPerFreezer: 11,
      isDirectPotes: false,
      trayDescription: '11 bandejas pasantes de congelado (4 paquetes / 96 u c/u)',
    };
  }
  if (recipe.category === 'tequenos' || recipe.id === 'tequenos') {
    return {
      unitsPerFreezer: 900,
      unitLabel: 'tequeños',
      maxTraysPerFreezer: 10,
      isDirectPotes: false,
      trayDescription: '10 bandejas (90 tequeños c/u)',
    };
  }
  if (recipe.category === 'chipas' || recipe.id.startsWith('chipa')) {
    return {
      unitsPerFreezer: 2400,
      unitLabel: 'chipas',
      maxTraysPerFreezer: 10,
      isDirectPotes: false,
      trayDescription: '10 bandejas (240 chipas c/u)',
    };
  }
  if (recipe.category === 'canelones' || recipe.id === 'canelones') {
    return {
      unitsPerFreezer: 72,
      unitLabel: 'bandejas de canelones',
      maxTraysPerFreezer: 6,
      isDirectPotes: false,
      trayDescription: '6 bandejas metálicas grandes (12 bandejas plásticas c/u = 72 u)',
    };
  }
  if (recipe.category === 'postres') {
    return {
      unitsPerFreezer: 400,
      unitLabel: 'potes / porciones',
      maxTraysPerFreezer: 0,
      isDirectPotes: true,
      trayDescription: '400 potes apilados directamente (sin bandejas metálicas)',
    };
  }
  return {
    unitsPerFreezer: recipe.baseYieldUnits || 1000,
    unitLabel: recipe.yieldUnitName || 'unidades',
    maxTraysPerFreezer: 10,
    isDirectPotes: false,
    trayDescription: '10 bandejas estándar',
  };
}

/**
 * Returns fraction of ONE standard freezer required for given target units of a recipe
 */
export function calculateBatchFreezerFraction(recipe: Recipe, targetUnits: number): number {
  const spec = getFreezerCapacitySpec(recipe);
  if (spec.unitsPerFreezer <= 0) return 0;
  return targetUnits / spec.unitsPerFreezer;
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
  const laborPercent = Math.round(ratio * 100);

  // Freezer calculation using interchangeable single-freezer 100% reference
  const freezerSpec = getFreezerCapacitySpec(recipe);
  const singleFreezerFraction = targetYield / freezerSpec.unitsPerFreezer;
  const singleFreezerPercent = Math.round(singleFreezerFraction * 100);

  let f1Percent = 0;
  let f2Percent = 0;
  let f1Trays = 0;
  let f2Trays = 0;
  let occupancySummary = '';

  if (singleFreezerFraction <= 1.0) {
    // Fits inside 1 freezer (can be stored in F1 or F2 indistinguishably)
    f1Percent = singleFreezerPercent;
    f2Percent = 0;
    if (freezerSpec.maxTraysPerFreezer > 0) {
      f1Trays = Math.round(singleFreezerFraction * freezerSpec.maxTraysPerFreezer * 10) / 10;
    }
    occupancySummary = `Ocupa ${singleFreezerPercent}% de 1 freezer (se puede ubicar en F1 o F2 indistintamente, dejando 1 freezer libre).`;
  } else {
    // Requires both freezers
    f1Percent = 100;
    f2Percent = Math.round((singleFreezerFraction - 1.0) * 100);
    if (freezerSpec.maxTraysPerFreezer > 0) {
      f1Trays = freezerSpec.maxTraysPerFreezer;
      f2Trays = Math.round((singleFreezerFraction - 1.0) * freezerSpec.maxTraysPerFreezer * 10) / 10;
    }
    occupancySummary = `Ocupa 1 freezer al 100% + ${f2Percent}% en el segundo freezer (${f1Percent + f2Percent}% total de frío).`;
  }

  const warnings: string[] = [];
  let isOverCapacity = false;
  let overCapacityMessage: string | undefined;

  if (singleFreezerFraction > 2.0) {
    isOverCapacity = true;
    overCapacityMessage = `¡ATENCIÓN! La cantidad solicitada (${targetYield} ${recipe.yieldUnitName}) excede la capacidad total de los 2 freezers de la fábrica (${singleFreezerPercent}% de frío requerido). Se requiere fraccionar en múltiples tandas de producción.`;
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
    laborPercent,
    ingredients: scaledIngredients,
    packaging: scaledPackaging,
    estimatedHours,
    freezer: {
      singleFreezerPercent,
      f1Percent: Math.min(200, f1Percent),
      f1Trays: Math.round(f1Trays * 10) / 10,
      f1MaxTrays: freezerSpec.maxTraysPerFreezer,
      f2Percent: Math.min(200, f2Percent),
      f2Trays: Math.round(f2Trays * 10) / 10,
      f2MaxTrays: freezerSpec.maxTraysPerFreezer,
      isDirectPotes: freezerSpec.isDirectPotes,
      trayDescription: freezerSpec.trayDescription,
      occupancySummary,
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
  totalLaborPercent: number;
  totalFreezerPercent: number;
  f1Occupancy: number;
  f2Occupancy: number;
  freezerWarnings: string[];
} {
  const recipeMap = new Map(recipes.map((r) => [r.id, r]));
  const ingredientMap = new Map<string, ConsolidatedIngredient>();
  const packagingMap = new Map<string, ConsolidatedPackaging>();

  let totalProductionHours = 0;
  let totalLaborPercent = 0;
  let totalFreezerFraction = 0;

  batches.forEach((batch) => {
    const recipe = recipeMap.get(batch.recipeId);
    if (!recipe) return;

    const scaled = scaleRecipe(recipe, batch.targetUnits, batch.selectedAlternativeIds);
    totalProductionHours += scaled.estimatedHours;
    totalLaborPercent += scaled.laborPercent;

    if (batch.status === 'en_freezer' || batch.status === 'elaborando' || batch.status === 'pesando' || batch.status === 'planificado') {
      totalFreezerFraction += calculateBatchFreezerFraction(recipe, batch.targetUnits);
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

  // Single-freezer percentage consolidation
  const totalFreezerPercent = Math.round(totalFreezerFraction * 100);
  let f1Occupancy = 0;
  let f2Occupancy = 0;

  if (totalFreezerFraction <= 1.0) {
    f1Occupancy = totalFreezerPercent;
    f2Occupancy = 0;
  } else {
    f1Occupancy = 100;
    f2Occupancy = Math.round((totalFreezerFraction - 1.0) * 100);
  }

  const freezerWarnings: string[] = [];
  if (totalFreezerFraction > 2.0) {
    freezerWarnings.push(`¡Capacidad de frío excedida (${totalFreezerPercent}%)! Requiere ${totalFreezerFraction.toFixed(1)} freezers, superando los 2 freezers disponibles en planta.`);
  } else if (f2Occupancy > 0) {
    freezerWarnings.push(`La producción consolidada requiere ambos freezers (F1 al 100% y F2 al ${f2Occupancy}%).`);
  }

  return {
    ingredientsByCategory,
    packagingList: Array.from(packagingMap.values()).sort((a, b) => b.totalCount - a.totalCount),
    totalProductionHours: Math.round(totalProductionHours * 10) / 10,
    totalLaborPercent,
    totalFreezerPercent,
    f1Occupancy,
    f2Occupancy,
    freezerWarnings,
  };
}
