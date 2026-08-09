import { Recipe, Ingredient, PackagingItem, ActiveBatch, ConsolidatedIngredient, ConsolidatedPackaging } from '../types';

export interface ScaledIngredient extends Ingredient {
  scaledGrams: number;
  formattedAmount: string;
  isAlternativeApplied?: boolean;
}

export interface ScaledPackaging extends PackagingItem {
  scaledCount: number;
}

export interface ProductionTimeSpec {
  baseHours: number; // e.g. 7.5
  baseMinutes: number; // base duration in minutes (e.g. 450 min)
  prepMinutes: number; // optional fixed setup/mise-en-place time (e.g. 30 min)
  variableMinutes: number; // baseMinutes - prepMinutes
  baseYieldUnits: number; // e.g. 112 bandejas, 400 potes, 1100 tequeños, 3000 chipas, 176 docenas
  yieldUnitName: string; // e.g. 'bandejas', 'porciones', 'chipas', 'docenas', 'tequeños'
  minutesPerUnit: number; // Exact minutes per 1 unit produced
  secondsPerUnit: number; // Exact seconds per 1 unit produced
  rateFormatted: string; // e.g. "~4.0 min por bandeja", "~1.1 min por pote", "~23 seg por tequeño"
  formattedDuration: string; // e.g. "7h 30 min"
  workdayPercent: number; // (baseMinutes / 480) * 100
  timeNotes?: string;
}

export interface ScaledRecipeResult {
  recipe: Recipe;
  targetYield: number;
  ratio: number;
  laborPercent: number;
  ingredients: ScaledIngredient[];
  packaging: ScaledPackaging[];
  estimatedHours: number;
  estimatedMinutes: number;
  formattedDuration: string;
  timeSpec: ProductionTimeSpec;
  freezer: {
    singleFreezerPercent: number;
    totalFreezerOccupancyPercent: number; // % of total plant 2-freezer capacity (e.g. 50% = 1 freezer, 100% = 2 freezers)
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
 * Format total minutes into human-readable Spanish time string:
 * e.g., 161 min -> "2h 41 min", 112 min -> "1h 52 min", 420 min -> "7h", 35 min -> "35 min"
 */
export function formatDuration(totalMinutes: number): string {
  const roundedMin = Math.round(totalMinutes);
  if (roundedMin <= 0) return '0 min';
  const hours = Math.floor(roundedMin / 60);
  const mins = roundedMin % 60;
  if (hours === 0) {
    return `${mins} min`;
  }
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins} min`;
}

/**
 * Format floating-point hours (e.g., 2.68, 1.88, 7.0) to readable duration string:
 * e.g., 2.68 -> "2h 41 min", 2.7 -> "2h 42 min", 1.875 -> "1h 52 min"
 */
export function formatHoursToDuration(hours: number): string {
  if (!hours || isNaN(hours) || hours <= 0) return '0 min';
  return formatDuration(Math.round(hours * 60));
}

/**
 * Returns exact production time rules and standard rates for a recipe:
 * - Canelones: 450 min (7.5h) for 112 bandejas -> 4.02 min / bandeja
 * - Postres (Tiramisú, Cheesecake, Chocotorta): 450 min (7.5h) for 400 potes -> 1.125 min / pote
 * - Tequeños: 420 min (7.0h) for 1.100 tequeños -> 0.382 min (23 seg) / tequeño
 * - Chipa Tradicional & Salame: 420 min (7.0h) for 3.000 chipas -> 0.14 min (8.4 seg) / chipa
 * - Pastas (Sorrentinos JyQ, Raviolones): 420 min (7.0h) for 176 docenas -> 2.386 min / docena
 * - Sorrentinos Caprese: 240 min (4.0h) for 80 docenas -> 3.0 min / docena
 */
export function getProductionTimeSpec(recipe: Recipe): ProductionTimeSpec {
  // Base minutes: Prioritize explicit baseMinutes, otherwise convert baseHours to minutes
  let baseMinutes = 420;
  if (typeof recipe.baseMinutes === 'number' && recipe.baseMinutes > 0) {
    baseMinutes = Math.round(recipe.baseMinutes);
  } else if (typeof recipe.baseHours === 'number' && recipe.baseHours > 0) {
    baseMinutes = Math.round(recipe.baseHours * 60);
  }

  const baseHours = Math.round((baseMinutes / 60) * 100) / 100;
  const prepMinutes = Math.max(0, Math.min(baseMinutes - 1, recipe.prepMinutes || 0));
  const variableMinutes = Math.max(0, baseMinutes - prepMinutes);

  const baseYieldUnits = Math.max(1, recipe.baseYieldUnits || 1);
  const minutesPerUnit = baseMinutes / baseYieldUnits;
  const secondsPerUnit = (baseMinutes * 60) / baseYieldUnits;

  let unitNameSingular = recipe.yieldUnitName || 'unidad';
  if (unitNameSingular.endsWith('es')) {
    unitNameSingular = unitNameSingular.slice(0, -2);
  } else if (unitNameSingular.endsWith('s')) {
    unitNameSingular = unitNameSingular.slice(0, -1);
  }

  let rateFormatted = '';
  if (minutesPerUnit >= 1) {
    rateFormatted = `~${minutesPerUnit.toFixed(1)} min por ${unitNameSingular}`;
  } else {
    rateFormatted = `~${Math.round(secondsPerUnit)} seg por ${unitNameSingular}`;
  }

  // Workday: Standard 8h shift = 480 minutes
  const workdayPercent = Math.round((baseMinutes / 480) * 100);
  const formattedDuration = formatDuration(baseMinutes);

  return {
    baseHours,
    baseMinutes,
    prepMinutes,
    variableMinutes,
    baseYieldUnits,
    yieldUnitName: recipe.yieldUnitName || 'unidades',
    minutesPerUnit: Number(minutesPerUnit.toFixed(3)),
    secondsPerUnit: Number(secondsPerUnit.toFixed(1)),
    rateFormatted,
    formattedDuration,
    workdayPercent,
    timeNotes: recipe.timeNotes,
  };
}

/**
 * Calculates accurate production time proportional to the target units produced:
 * If a recipe has a fixed prep/setup time (prepMinutes), it uses the two-tier formula:
 *   estimatedMinutes = prepMinutes + targetUnits * ((baseMinutes - prepMinutes) / baseYieldUnits)
 * Otherwise, it uses pure proportional scaling:
 *   estimatedMinutes = targetUnits * (baseMinutes / baseYieldUnits)
 *
 * e.g., 40 bandejas of canelones = 40 * (450 min / 112) = 160.7 min = 2h 41 min (~2.7 hs)
 * e.g., 100 potes de tiramisú = 100 * (450 min / 400) = 112.5 min = 1h 52 min (~1.9 hs)
 */
export function calculateBatchTime(recipe: Recipe, targetUnits: number): {
  estimatedMinutes: number;
  estimatedHours: number;
  formattedDuration: string;
  laborPercentOfShift: number;
  ratio: number;
  spec: ProductionTimeSpec;
} {
  const spec = getProductionTimeSpec(recipe);
  const ratio = Math.max(0.001, targetUnits / spec.baseYieldUnits);

  let estimatedMinutes = 0;
  if (spec.prepMinutes > 0) {
    const varMinPerUnit = (spec.baseMinutes - spec.prepMinutes) / spec.baseYieldUnits;
    estimatedMinutes = Math.round(spec.prepMinutes + (targetUnits * varMinPerUnit));
  } else {
    estimatedMinutes = Math.round(targetUnits * (spec.baseMinutes / spec.baseYieldUnits));
  }

  const estimatedHours = Math.round((estimatedMinutes / 60) * 100) / 100;
  const formattedDuration = formatDuration(estimatedMinutes);
  const laborPercentOfShift = Math.round((estimatedMinutes / 480) * 100);

  return {
    estimatedMinutes,
    estimatedHours,
    formattedDuration,
    laborPercentOfShift,
    ratio,
    spec,
  };
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
  if (recipe.category === 'pastas' || recipe.yieldUnitName === 'docenas') {
    return {
      unitsPerFreezer: 88, // 88 docenas por freezer (11 bandejas x 8 docenas)
      unitLabel: 'docenas',
      maxTraysPerFreezer: 11,
      isDirectPotes: false,
      trayDescription: '11 bandejas pasantes (8 docenas c/u = 88 docenas máx por freezer)',
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

export function formatGrams(grams: number, unit?: string, ingredientName?: string): string {
  if (ingredientName && ingredientName.toLowerCase().trim() === 'cebolla') {
    const freshKg = (grams / 1000).toFixed(2);
    const dehydratedGrams = grams / 10;
    const dehyStr = dehydratedGrams >= 1000
      ? `${(dehydratedGrams / 1000).toFixed(2)} kg`
      : `${Math.round(dehydratedGrams)} g`;
    return `${freshKg} kg fresca (o ${dehyStr} deshidratada)`;
  }
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

export function formatSimpleKg(grams: number, unit?: string, ingredientName?: string): string {
  if (ingredientName && ingredientName.toLowerCase().trim() === 'cebolla') {
    const freshKg = (grams / 1000).toFixed(2);
    const dehydratedGrams = grams / 10;
    const dehyStr = dehydratedGrams >= 1000
      ? `${(dehydratedGrams / 1000).toFixed(2)} kg`
      : `${Math.round(dehydratedGrams)} g`;
    return `${freshKg} kg fresca (o ${dehyStr} deshidratada)`;
  }
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

  // Accurate Production Time Calculation (Rule-based rate per unit, fully proportional)
  const timeCalc = calculateBatchTime(recipe, targetYield);
  const estimatedHours = timeCalc.estimatedHours;
  const estimatedMinutes = timeCalc.estimatedMinutes;
  const formattedDuration = timeCalc.formattedDuration;
  const timeSpec = timeCalc.spec;
  const laborPercent = Math.round(ratio * 100);

  // Freezer calculation using interchangeable single-freezer 100% reference
  const freezerSpec = getFreezerCapacitySpec(recipe);
  const singleFreezerFraction = targetYield / freezerSpec.unitsPerFreezer;
  const singleFreezerPercent = Math.round(singleFreezerFraction * 100);
  const totalFreezerOccupancyPercent = Math.round((singleFreezerFraction / 2) * 100);

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
    occupancySummary = `Ocupa ${totalFreezerOccupancyPercent}% de la capacidad total de freezers (${f1Percent}% de 1 freezer, dejando el 2do libre).`;
  } else if (singleFreezerFraction <= 2.0) {
    // Requires both freezers
    f1Percent = 100;
    f2Percent = Math.round((singleFreezerFraction - 1.0) * 100);
    if (freezerSpec.maxTraysPerFreezer > 0) {
      f1Trays = freezerSpec.maxTraysPerFreezer;
      f2Trays = Math.round((singleFreezerFraction - 1.0) * freezerSpec.maxTraysPerFreezer * 10) / 10;
    }
    occupancySummary = `Ocupa ${totalFreezerOccupancyPercent}% de la capacidad total de freezers (F1: 100% + F2: ${f2Percent}%).`;
  } else {
    // Over capacity
    f1Percent = 100;
    f2Percent = 100;
    if (freezerSpec.maxTraysPerFreezer > 0) {
      f1Trays = freezerSpec.maxTraysPerFreezer;
      f2Trays = freezerSpec.maxTraysPerFreezer;
    }
    occupancySummary = `⚠️ Supera el 100% de la capacidad de los 2 freezers (${totalFreezerOccupancyPercent}% requerido).`;
  }

  const warnings: string[] = [];
  let isOverCapacity = false;
  let overCapacityMessage: string | undefined;

  if (singleFreezerFraction > 2.0) {
    isOverCapacity = true;
    overCapacityMessage = `¡ATENCIÓN! La cantidad solicitada (${targetYield} ${recipe.yieldUnitName}) excede la capacidad total de los 2 freezers de la fábrica (${totalFreezerOccupancyPercent}% de frío requerido). Se requiere fraccionar en múltiples tandas de producción.`;
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
    estimatedMinutes,
    formattedDuration,
    timeSpec,
    freezer: {
      singleFreezerPercent,
      totalFreezerOccupancyPercent,
      f1Percent: Math.min(100, f1Percent),
      f1Trays: Math.round(f1Trays * 10) / 10,
      f1MaxTrays: freezerSpec.maxTraysPerFreezer,
      f2Percent: Math.min(100, f2Percent),
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

    // Consolidate ingredients (exclude water)
    scaled.ingredients.forEach((ing) => {
      if (ing.name.toLowerCase().trim().startsWith('agua')) return;
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
