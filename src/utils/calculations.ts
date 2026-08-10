import { Recipe, Ingredient, PackagingItem, ActiveBatch, ConsolidatedIngredient, ConsolidatedPackaging, MasterIngredient, IngredientCategoryConfig } from '../types';

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
 * Dynamically computes units per freezer based on recipe baseYieldUnits and configured freezerRule (f1Percent + f2Percent).
 */
export function getFreezerCapacitySpec(recipe: Recipe): {
  unitsPerFreezer: number;
  unitLabel: string;
  maxTraysPerFreezer: number;
  isDirectPotes: boolean;
  trayDescription: string;
} {
  const f1 = typeof recipe.freezerRule?.f1Percent === 'number' ? recipe.freezerRule.f1Percent : 100;
  const f2 = typeof recipe.freezerRule?.f2Percent === 'number' ? recipe.freezerRule.f2Percent : 0;
  const baseFreezers = (f1 + f2) / 100;
  const baseYield = Math.max(1, recipe.baseYieldUnits || 1);

  // Calculate how many units fit in ONE standard freezer (100% of 1 freezer)
  const unitsPerFreezer = baseFreezers > 0
    ? Math.max(1, Math.round(baseYield / baseFreezers))
    : baseYield;

  const isDirectPotes = recipe.category === 'postres' || !!recipe.freezerRule?.isDirectPotes;
  const maxTraysPerFreezer = isDirectPotes
    ? 0
    : (recipe.freezerRule?.f1MaxTrays || (recipe.category === 'pastas' ? 11 : recipe.category === 'canelones' ? 6 : 10));

  let trayDescription = recipe.freezerRule?.ruleNotes || '';
  if (!trayDescription) {
    if (isDirectPotes) {
      trayDescription = `${unitsPerFreezer} ${recipe.yieldUnitName || 'potes'} apilados directamente (sin bandejas metálicas)`;
    } else if (maxTraysPerFreezer > 0) {
      trayDescription = `${maxTraysPerFreezer} bandejas por freezer (~${Math.round(unitsPerFreezer / maxTraysPerFreezer)} ${recipe.yieldUnitName} c/u)`;
    } else {
      trayDescription = `Capacidad estándar: ${unitsPerFreezer} ${recipe.yieldUnitName} por freezer`;
    }
  }

  return {
    unitsPerFreezer,
    unitLabel: recipe.yieldUnitName || 'unidades',
    maxTraysPerFreezer,
    isDirectPotes,
    trayDescription,
  };
}

/**
 * Returns fraction of ONE standard freezer required for given target units of a recipe
 * E.g., 3000 chipas (f1=100%, f2=25%) -> 1.25 freezers (62.5% ~ 63% of 2-freezer plant capacity)
 * E.g., 88 raviolones (f1=100%, f2=100%) -> 2.0 freezers (100% of 2-freezer plant capacity)
 */
export function calculateBatchFreezerFraction(recipe: Recipe, targetUnits: number): number {
  const baseYield = Math.max(1, recipe.baseYieldUnits || 1);
  const ratio = targetUnits / baseYield;
  const f1 = typeof recipe.freezerRule?.f1Percent === 'number' ? recipe.freezerRule.f1Percent : 100;
  const f2 = typeof recipe.freezerRule?.f2Percent === 'number' ? recipe.freezerRule.f2Percent : 0;
  const baseFreezers = (f1 + f2) / 100;
  return baseFreezers * ratio;
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

  // Freezer calculation using user configured rule
  const freezerSpec = getFreezerCapacitySpec(recipe);
  const baseF1 = typeof recipe.freezerRule?.f1Percent === 'number' ? recipe.freezerRule.f1Percent : 100;
  const baseF2 = typeof recipe.freezerRule?.f2Percent === 'number' ? recipe.freezerRule.f2Percent : 0;
  const baseFreezers = (baseF1 + baseF2) / 100;

  // Single freezer fraction required for this targetYield (1.0 = 1 full freezer, 2.0 = 2 full freezers)
  const singleFreezerFraction = baseFreezers * ratio;
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
  } else if (singleFreezerFraction <= 2.001) {
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
  const isOverCapacity = singleFreezerFraction > 2.001;
  let overCapacityMessage: string | undefined;

  if (isOverCapacity) {
    overCapacityMessage = `¡ATENCIÓN! La cantidad solicitada (${targetYield.toLocaleString('es-AR')} ${recipe.yieldUnitName}) excede la capacidad total de los 2 freezers de la fábrica (${totalFreezerOccupancyPercent}% de frío requerido = ${singleFreezerFraction.toFixed(1)} freezers). Supera los 2 freezers disponibles.`;
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

/**
 * Formats a date string (YYYY-MM-DD) to a concise Spanish abbreviation: "mié 12/08"
 */
export function formatBatchDateShort(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  const d = new Date(year, month - 1, day);
  const dayNamesShort = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const dayName = dayNamesShort[d.getDay()] || '';
  const dd = String(day).padStart(2, '0');
  const mm = String(month).padStart(2, '0');
  return `${dayName} ${dd}/${mm}`;
}

/**
 * Returns recipe name paired with scheduled date in parentheses: "Tiramisú (mié 12/08)"
 */
export function formatBatchLabelWithDate(recipeName: string, dateStr?: string): string {
  if (!dateStr) return recipeName;
  const shortDate = formatBatchDateShort(dateStr);
  return shortDate ? `${recipeName} (${shortDate})` : recipeName;
}

/**
 * Canonical Ingredient Normalization for Argentine Commercial Pastas, Bakery and Food Production.
 * Maps synonyms, typos, and variations to unified names, standard categories, and standard unit types.
 */
export interface CanonicalIngredientInfo {
  canonicalName: string;
  category: string;
  unitType: 'mass' | 'volume' | 'count';
  standardUnit: string; // 'kg' | 'g' | 'L' | 'ml' | 'u' | 'paquetes'
}

export function normalizeIngredientString(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ');
}

export function getCanonicalIngredient(
  rawName: string,
  rawCategory?: string,
  rawUnit?: string,
  masterIngredients?: MasterIngredient[]
): CanonicalIngredientInfo {
  const norm = normalizeIngredientString(rawName);

  // 1. HIGHEST PRIORITY: Check Master Ingredients Catalog
  if (masterIngredients && masterIngredients.length > 0) {
    const matchedMaster = masterIngredients.find((m) => {
      if (m.name.toLowerCase().trim() === rawName.toLowerCase().trim()) return true;
      const normMaster = normalizeIngredientString(m.name);
      return normMaster === norm;
    });

    if (matchedMaster) {
      const u = (matchedMaster.defaultUnit || rawUnit || 'kg').toLowerCase().trim();
      let unitType: 'mass' | 'volume' | 'count' = 'mass';
      let standardUnit = matchedMaster.defaultUnit || rawUnit || 'kg';

      if (['u', 'unidades', 'paquetes', 'docenas', 'bandejas', 'potes', 'cajas'].includes(u)) {
        unitType = 'count';
        standardUnit = u === 'paquetes' ? 'paquetes' : 'u';
      } else if (['l', 'ml', 'litros', 'cc', 'cm3'].includes(u)) {
        unitType = 'volume';
        standardUnit = u === 'l' || u === 'litros' ? 'L' : 'ml';
      } else {
        unitType = 'mass';
        standardUnit = u === 'g' || u === 'gramos' ? 'g' : 'kg';
      }

      return {
        canonicalName: matchedMaster.name,
        category: matchedMaster.categoryId,
        unitType,
        standardUnit,
      };
    }
  }

  // 2. SECOND PRIORITY: If recipe ingredient has an explicit category assigned
  if (rawCategory && rawCategory.trim() !== '' && rawCategory !== 'otros') {
    const u = (rawUnit || '').toLowerCase().trim();
    let unitType: 'mass' | 'volume' | 'count' = 'mass';
    let standardUnit = rawUnit || 'g';

    if (['u', 'unidades', 'paquetes', 'docenas', 'bandejas', 'potes', 'cajas'].includes(u)) {
      unitType = 'count';
      standardUnit = u === 'paquetes' ? 'paquetes' : 'u';
    } else if (['l', 'ml', 'litros', 'cc', 'cm3'].includes(u)) {
      unitType = 'volume';
      standardUnit = u === 'l' || u === 'litros' ? 'L' : 'ml';
    } else {
      unitType = 'mass';
      standardUnit = u === 'kg' || u === 'kilos' ? 'kg' : 'g';
    }

    let cleanName = rawName.trim();
    if (norm.includes('dulce de leche') || norm === 'ddl' || norm.includes('dulce leche')) {
      cleanName = 'Dulce de leche';
    } else if (norm.includes('queso crema') || norm.includes('casancrem')) {
      cleanName = 'Queso crema';
    } else if (norm.includes('muzza') || norm.includes('mozzarella') || norm.includes('muzarella')) {
      cleanName = 'Muzzarella';
    } else if (norm.includes('danbo')) {
      cleanName = 'Queso Danbo';
    }

    return {
      canonicalName: cleanName,
      category: rawCategory,
      unitType,
      standardUnit,
    };
  }

  // 3. FALLBACK CANONICAL RULES (Standard factory catalog defaults)
  // 1. CHEESES & DAIRY (Lácteos)
  if (
    norm.includes('muzza') || 
    norm.includes('muza') || 
    norm.includes('mozza') || 
    norm === 'queso' || 
    norm.includes('mozzarella') ||
    norm.includes('muzarella') ||
    norm.includes('muzzarella')
  ) {
    return {
      canonicalName: 'Muzzarella',
      category: 'lacteos',
      unitType: 'mass',
      standardUnit: 'kg',
    };
  }

  if (norm.includes('danbo')) {
    return {
      canonicalName: 'Queso Danbo',
      category: 'lacteos',
      unitType: 'mass',
      standardUnit: 'kg',
    };
  }

  if (norm.includes('pategras') || norm.includes('pategras')) {
    return {
      canonicalName: 'Queso Pategrás',
      category: 'lacteos',
      unitType: 'mass',
      standardUnit: 'kg',
    };
  }

  if (norm.includes('sardo')) {
    return {
      canonicalName: 'Queso Sardo',
      category: 'lacteos',
      unitType: 'mass',
      standardUnit: 'kg',
    };
  }

  if (norm.includes('queso crema') || norm.includes('casancrem') || norm.includes('cream cheese')) {
    return {
      canonicalName: 'Queso crema',
      category: 'lacteos',
      unitType: 'mass',
      standardUnit: 'kg',
    };
  }

  if (norm.includes('crema de leche') || (norm.includes('crema') && !norm.includes('queso'))) {
    return {
      canonicalName: 'Crema de leche',
      category: 'lacteos',
      unitType: 'mass',
      standardUnit: 'kg',
    };
  }

  if (norm.includes('dulce de leche') || norm === 'ddl' || norm.includes('dulce leche')) {
    return {
      canonicalName: 'Dulce de leche',
      category: 'lacteos',
      unitType: 'mass',
      standardUnit: 'kg',
    };
  }

  if (norm.includes('queso duro') || norm.includes('queso rallado') || norm.includes('queso para rallar')) {
    return {
      canonicalName: 'Queso duro (Pategrás / Sardo / Danbo)',
      category: 'lacteos',
      unitType: 'mass',
      standardUnit: 'kg',
    };
  }

  // 2. FLOURS & STARCHES (Harinas & Féculas)
  if (norm.includes('harina') && (norm.includes('0000') || norm.includes('cuatro') || norm.includes('reposteria'))) {
    return {
      canonicalName: 'Harina 0000',
      category: 'harinas_feculas',
      unitType: 'mass',
      standardUnit: 'kg',
    };
  }

  if (norm.includes('harina') || norm === 'harina 000' || norm === 'harina comun') {
    return {
      canonicalName: 'Harina 000',
      category: 'harinas_feculas',
      unitType: 'mass',
      standardUnit: 'kg',
    };
  }

  if (norm.includes('mandioca') || norm.includes('fecula') || norm.includes('almidon')) {
    return {
      canonicalName: 'Fécula de mandioca',
      category: 'harinas_feculas',
      unitType: 'mass',
      standardUnit: 'kg',
    };
  }

  if (norm.includes('chocolina')) {
    return {
      canonicalName: 'Galletitas Chocolinas',
      category: 'harinas_feculas',
      unitType: 'mass',
      standardUnit: 'kg',
    };
  }

  if (norm.includes('lincoln')) {
    return {
      canonicalName: 'Galletitas Lincoln',
      category: 'harinas_feculas',
      unitType: 'mass',
      standardUnit: 'kg',
    };
  }

  if (norm.includes('vainilla') && !norm.includes('esencia')) {
    return {
      canonicalName: 'Vainillas',
      category: 'harinas_feculas',
      unitType: 'mass',
      standardUnit: 'kg',
    };
  }

  if (norm.includes('azucar impalpable') || norm.includes('glas')) {
    return {
      canonicalName: 'Azúcar impalpable',
      category: 'harinas_feculas',
      unitType: 'mass',
      standardUnit: 'kg',
    };
  }

  if (norm.includes('azucar') || norm.includes('azucar comun')) {
    return {
      canonicalName: 'Azúcar',
      category: 'harinas_feculas',
      unitType: 'mass',
      standardUnit: 'kg',
    };
  }

  // 3. EGGS (Huevos)
  if (norm.includes('huevo')) {
    return {
      canonicalName: 'Huevos',
      category: 'huevos',
      unitType: 'count',
      standardUnit: 'u',
    };
  }

  // 4. FATS & LIQUIDS (Grasas & Líquidos)
  if (norm.includes('aceite')) {
    return {
      canonicalName: 'Aceite de girasol',
      category: 'grasas_liquidos',
      unitType: 'volume',
      standardUnit: 'ml',
    };
  }

  if (norm.includes('margarina') || norm.includes('grasa')) {
    return {
      canonicalName: 'Margarina',
      category: 'grasas_liquidos',
      unitType: 'mass',
      standardUnit: 'kg',
    };
  }

  if (norm.includes('leche') && !norm.includes('dulce')) {
    return {
      canonicalName: 'Leche entera',
      category: 'grasas_liquidos',
      unitType: 'volume',
      standardUnit: 'L',
    };
  }

  // 5. FRESH & VEGETABLES (Frescos & Verduras)
  if (norm.includes('espinaca') || norm.includes('acelga')) {
    return {
      canonicalName: 'Espinaca congelada',
      category: 'frescos_verduras',
      unitType: 'mass',
      standardUnit: 'kg',
    };
  }

  if (norm.includes('cebolla')) {
    return {
      canonicalName: 'Cebolla deshidratada',
      category: 'frescos_verduras',
      unitType: 'mass',
      standardUnit: 'kg',
    };
  }

  if (norm.includes('salsa') || norm.includes('pure de tomate') || norm.includes('tomate triturado')) {
    return {
      canonicalName: 'Salsa de tomate',
      category: 'frescos_verduras',
      unitType: 'mass',
      standardUnit: 'kg',
    };
  }

  if (norm.includes('tomate')) {
    return {
      canonicalName: 'Tomate fresco',
      category: 'frescos_verduras',
      unitType: 'mass',
      standardUnit: 'kg',
    };
  }

  if (norm.includes('morron') || norm.includes('pimiento')) {
    return {
      canonicalName: 'Morrón rojo',
      category: 'frescos_verduras',
      unitType: 'mass',
      standardUnit: 'kg',
    };
  }

  if (norm.includes('albahaca')) {
    return {
      canonicalName: 'Albahaca fresca',
      category: 'frescos_verduras',
      unitType: 'count',
      standardUnit: 'paquetes',
    };
  }

  if (norm.includes('frutos rojos') || norm.includes('frutilla') || norm.includes('frambuesa') || norm.includes('arandano')) {
    return {
      canonicalName: 'Frutos rojos',
      category: 'frescos_verduras',
      unitType: 'mass',
      standardUnit: 'kg',
    };
  }

  // 6. SPICES & SEASONINGS (Especias & Condimentos)
  if (norm.includes('sal') && !norm.includes('salame')) {
    return {
      canonicalName: 'Sal fina',
      category: 'especias_condimentos',
      unitType: 'mass',
      standardUnit: 'g',
    };
  }

  if (norm.includes('nuez moscada')) {
    return {
      canonicalName: 'Nuez moscada',
      category: 'especias_condimentos',
      unitType: 'mass',
      standardUnit: 'g',
    };
  }

  if (norm.includes('pimienta blanca')) {
    return {
      canonicalName: 'Pimienta blanca',
      category: 'especias_condimentos',
      unitType: 'mass',
      standardUnit: 'g',
    };
  }

  if (norm.includes('pimienta')) {
    return {
      canonicalName: 'Pimienta blanca',
      category: 'especias_condimentos',
      unitType: 'mass',
      standardUnit: 'g',
    };
  }

  if (norm.includes('ajo')) {
    return {
      canonicalName: 'Ajo en polvo',
      category: 'especias_condimentos',
      unitType: 'mass',
      standardUnit: 'g',
    };
  }

  if (norm.includes('esencia de vainilla') || (norm.includes('esencia') && norm.includes('vainilla'))) {
    return {
      canonicalName: 'Esencia de vainilla',
      category: 'especias_condimentos',
      unitType: 'mass',
      standardUnit: 'g',
    };
  }

  if (norm.includes('cacao')) {
    return {
      canonicalName: 'Cacao amargo',
      category: 'especias_condimentos',
      unitType: 'mass',
      standardUnit: 'g',
    };
  }

  // 7. OTHERS (Otros)
  if (norm.includes('levadura')) {
    return {
      canonicalName: 'Levadura fresca',
      category: 'otros',
      unitType: 'mass',
      standardUnit: 'kg',
    };
  }

  if (norm.includes('salame')) {
    return {
      canonicalName: 'Salame',
      category: 'otros',
      unitType: 'mass',
      standardUnit: 'kg',
    };
  }

  if (norm.includes('jamon') || norm.includes('paleta')) {
    return {
      canonicalName: 'Jamón cocido',
      category: 'otros',
      unitType: 'mass',
      standardUnit: 'kg',
    };
  }

  if (norm.includes('cafe')) {
    return {
      canonicalName: 'Café soluble',
      category: 'otros',
      unitType: 'mass',
      standardUnit: 'g',
    };
  }

  // Fallback: Clean title casing and determine unitType
  const cleanName = rawName.trim();
  const cat = (rawCategory as CanonicalIngredientInfo['category']) || 'otros';
  const u = (rawUnit || '').toLowerCase().trim();

  let unitType: 'mass' | 'volume' | 'count' = 'mass';
  let standardUnit = rawUnit || 'g';

  if (['u', 'unidades', 'paquetes', 'docenas', 'bandejas', 'potes', 'cajas'].includes(u)) {
    unitType = 'count';
    standardUnit = u === 'paquetes' ? 'paquetes' : 'u';
  } else if (['l', 'ml', 'litros', 'cc', 'cm3'].includes(u)) {
    unitType = 'volume';
    standardUnit = u === 'l' || u === 'litros' ? 'L' : 'ml';
  } else {
    unitType = 'mass';
    standardUnit = u === 'kg' || u === 'kilos' ? 'kg' : 'g';
  }

  return {
    canonicalName: cleanName,
    category: cat,
    unitType,
    standardUnit,
  };
}

export function consolidateBatches(
  batches: ActiveBatch[],
  recipes: Recipe[],
  masterIngredients?: MasterIngredient[],
  ingredientCategories?: IngredientCategoryConfig[]
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
    // Robust recipe resolution: ID match, exact name, or partial match
    let recipe = recipeMap.get(batch.recipeId);
    if (!recipe) {
      const bName = (batch.recipeName || '').toLowerCase().trim();
      const bId = (batch.recipeId || '').toLowerCase().trim();
      recipe = recipes.find((r) => {
        const rName = r.name.toLowerCase().trim();
        const rId = r.id.toLowerCase().trim();
        return (
          rId === bId ||
          rName === bName ||
          (bId.includes('pizza') && rId.includes('pizza')) ||
          (bId.includes('jyq') && rId.includes('jyq')) ||
          (bId.includes('canelone') && rId.includes('canelone')) ||
          (bId.includes('choco') && rId.includes('choco')) ||
          (bId.includes('chipa') && rId.includes('chipa') && !bId.includes('salame') && !rId.includes('salame')) ||
          (bId.includes('salame') && rId.includes('salame')) ||
          (bId.includes('verdura') && rId.includes('verdura')) ||
          (bId.includes('caprese') && rId.includes('caprese')) ||
          (bId.includes('tiramisu') && rId.includes('tiramisu')) ||
          (bId.includes('cheesecake') && rId.includes('cheesecake')) ||
          (bId.includes('tequeno') && rId.includes('tequeno')) ||
          rName.includes(bName) ||
          bName.includes(rName)
        );
      });
    }
    if (!recipe) return;

    const scaled = scaleRecipe(recipe, batch.targetUnits, batch.selectedAlternativeIds);
    totalProductionHours += scaled.estimatedHours;
    totalLaborPercent += scaled.laborPercent;

    if (
      batch.status === 'en_freezer' || 
      batch.status === 'elaborando' || 
      batch.status === 'pesando' || 
      batch.status === 'planificado' ||
      batch.status === 'completado'
    ) {
      totalFreezerFraction += calculateBatchFreezerFraction(recipe, batch.targetUnits);
    }

    const formattedDate = batch.scheduledDate ? formatBatchDateShort(batch.scheduledDate) : '';

    // Consolidate ingredients using canonical normalization (exclude water)
    scaled.ingredients.forEach((ing) => {
      if (ing.name.toLowerCase().trim().startsWith('agua')) return;
      
      const canonical = getCanonicalIngredient(ing.name, ing.category, ing.unit, masterIngredients);
      const key = `${canonical.category}_${canonical.canonicalName.toLowerCase().trim()}_${canonical.unitType}`;

      if (!ingredientMap.has(key)) {
        ingredientMap.set(key, {
          name: canonical.canonicalName,
          category: canonical.category,
          totalGrams: 0,
          unit: canonical.standardUnit,
          usedInRecipes: [],
        });
      }

      const item = ingredientMap.get(key)!;
      item.totalGrams += ing.scaledGrams;

      // Merge usage if this batch is already tracked for this ingredient
      const existingBatchUsage = item.usedInRecipes.find((r) => r.batchId === batch.id);
      if (existingBatchUsage) {
        existingBatchUsage.amount += ing.scaledGrams;
      } else {
        item.usedInRecipes.push({
          recipeName: recipe.name,
          amount: ing.scaledGrams,
          unit: canonical.standardUnit,
          scheduledDate: batch.scheduledDate,
          formattedDate,
          batchId: batch.id,
          isBatchCompleted: batch.status === 'completado',
          batchStatus: batch.status,
        });
      }
    });

    // Consolidate packaging
    scaled.packaging.forEach((pkg) => {
      const cleanPkgName = pkg.name.trim();
      const key = cleanPkgName.toLowerCase().replace(/\s+/g, ' ');
      if (!packagingMap.has(key)) {
        packagingMap.set(key, {
          name: cleanPkgName,
          type: pkg.type,
          totalCount: 0,
          usedInRecipes: [],
        });
      }

      const item = packagingMap.get(key)!;
      item.totalCount += pkg.scaledCount;

      const existingBatchUsage = item.usedInRecipes.find((r) => r.batchId === batch.id);
      if (existingBatchUsage) {
        existingBatchUsage.count += pkg.scaledCount;
      } else {
        item.usedInRecipes.push({
          recipeName: recipe.name,
          count: pkg.scaledCount,
          scheduledDate: batch.scheduledDate,
          formattedDate,
          batchId: batch.id,
          isBatchCompleted: batch.status === 'completado',
          batchStatus: batch.status,
        });
      }
    });
  });

  // Group ingredients by category dynamically
  const ingredientsByCategory: Record<string, ConsolidatedIngredient[]> = {};
  if (ingredientCategories && ingredientCategories.length > 0) {
    ingredientCategories.forEach((c) => {
      ingredientsByCategory[c.id] = [];
    });
  } else {
    ingredientsByCategory['lacteos'] = [];
    ingredientsByCategory['harinas_feculas'] = [];
    ingredientsByCategory['frescos_verduras'] = [];
    ingredientsByCategory['huevos'] = [];
    ingredientsByCategory['grasas_liquidos'] = [];
    ingredientsByCategory['especias_condimentos'] = [];
    ingredientsByCategory['otros'] = [];
  }

  ingredientMap.forEach((item) => {
    const cat = item.category || 'otros';
    if (!ingredientsByCategory[cat]) {
      ingredientsByCategory[cat] = [];
    }
    ingredientsByCategory[cat].push(item);
  });

  // Sort within categories by name
  Object.keys(ingredientsByCategory).forEach((cat) => {
    ingredientsByCategory[cat].sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
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
