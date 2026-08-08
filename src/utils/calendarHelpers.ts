import { ActiveBatch, Recipe, ConsolidatedIngredient, ConsolidatedPackaging } from '../types';
import { scaleRecipe, calculateBatchFreezerFraction } from './calculations';

export interface DaySchedule {
  dateStr: string; // YYYY-MM-DD
  dayName: string; // 'Lunes', 'Martes', etc.
  dayNumber: number; // 1 to 31
  monthName: string; // 'Ago', 'Sep', etc.
  isToday: boolean;
  isSaturday: boolean;
  batches: ActiveBatch[];
  totalHours: number;
  totalUnits: number;
  totalLaborPercent: number; // e.g. 50%, 100%, 150% (overloaded if > 100)
  totalFreezerPercent: number; // cold storage % of 1 freezer
  f1Trays: number;
  f2Trays: number;
  f1Percent: number;
  f2Percent: number;
  isLaborOverloaded: boolean;
  isFreezerOverloaded: boolean;
  isOverloaded: boolean;
}

export const DAYS_OF_WEEK_SPANISH = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

export const MONTHS_SPANISH = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export function formatDateToISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseISODate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

/**
 * Returns Monday of the week for any given date
 */
export function getMondayOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 is Sunday, 1 is Monday...
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Get week days starting from Monday
 * includeSaturday: if true, returns 6 days (Mon-Sat), else 5 days (Mon-Fri)
 */
export function getWeekDays(
  baseMonday: Date,
  includeSaturday: boolean = false,
  activeBatches: ActiveBatch[] = [],
  recipes: Recipe[] = []
): DaySchedule[] {
  const recipeMap = new Map(recipes.map((r) => [r.id, r]));
  const todayStr = formatDateToISO(new Date());
  const count = includeSaturday ? 6 : 5;
  const days: DaySchedule[] = [];

  for (let i = 0; i < count; i++) {
    const current = new Date(baseMonday);
    current.setDate(baseMonday.getDate() + i);

    const dateStr = formatDateToISO(current);
    const dayOfWeekIdx = current.getDay();
    const dayName = DAYS_OF_WEEK_SPANISH[dayOfWeekIdx];
    const monthName = MONTHS_SPANISH[current.getMonth()].slice(0, 3);
    const isToday = dateStr === todayStr;
    const isSaturday = dayOfWeekIdx === 6;

    // Find batches for this specific day
    const dayBatches = activeBatches.filter((b) => b.scheduledDate === dateStr);

    let totalHours = 0;
    let totalUnits = 0;
    let totalLaborPercent = 0;
    let totalFreezerFraction = 0;
    let f1Trays = 0;
    let f2Trays = 0;

    dayBatches.forEach((batch) => {
      const recipe = recipeMap.get(batch.recipeId);
      if (recipe) {
        const scaled = scaleRecipe(recipe, batch.targetUnits, batch.selectedAlternativeIds);
        totalHours += scaled.estimatedHours;
        totalUnits += batch.targetUnits;
        totalLaborPercent += scaled.laborPercent;
        totalFreezerFraction += calculateBatchFreezerFraction(recipe, batch.targetUnits);
        f1Trays += scaled.freezer.f1Trays;
        f2Trays += scaled.freezer.f2Trays;
      }
    });

    const totalFreezerPercent = Math.round(totalFreezerFraction * 100);
    let f1Percent = 0;
    let f2Percent = 0;

    if (totalFreezerFraction <= 1.0) {
      f1Percent = totalFreezerPercent;
      f2Percent = 0;
    } else {
      f1Percent = 100;
      f2Percent = Math.round((totalFreezerFraction - 1.0) * 100);
    }

    const isLaborOverloaded = totalLaborPercent > 100;
    const isFreezerOverloaded = totalFreezerFraction > 2.0;
    const isOverloaded = isLaborOverloaded || isFreezerOverloaded;

    days.push({
      dateStr,
      dayName,
      dayNumber: current.getDate(),
      monthName,
      isToday,
      isSaturday,
      batches: dayBatches,
      totalHours: Math.round(totalHours * 10) / 10,
      totalUnits,
      totalLaborPercent,
      totalFreezerPercent,
      f1Trays: Math.round(f1Trays * 10) / 10,
      f2Trays: Math.round(f2Trays * 10) / 10,
      f1Percent,
      f2Percent,
      isLaborOverloaded,
      isFreezerOverloaded,
      isOverloaded,
    });
  }

  return days;
}

/**
 * Consolidate ingredients and packaging for a specific list of batches
 */
export function getConsolidatedInsumosForBatches(
  batches: ActiveBatch[],
  recipes: Recipe[]
): {
  ingredientsByCategory: Record<string, ConsolidatedIngredient[]>;
  packagingList: ConsolidatedPackaging[];
  totalHours: number;
  totalUnits: number;
  totalLaborPercent: number;
  totalFreezerPercent: number;
  f1Occupancy: number;
  f2Occupancy: number;
  productSummary: { recipeName: string; units: number; batchesCount: number; color: string; hours: number }[];
} {
  const recipeMap = new Map(recipes.map((r) => [r.id, r]));
  const ingredientMap = new Map<string, ConsolidatedIngredient>();
  const packagingMap = new Map<string, ConsolidatedPackaging>();
  const productMap = new Map<string, { recipeName: string; units: number; batchesCount: number; color: string; hours: number }>();

  let totalHours = 0;
  let totalUnits = 0;
  let totalLaborPercent = 0;
  let totalFreezerFraction = 0;

  batches.forEach((batch) => {
    const recipe = recipeMap.get(batch.recipeId);
    if (!recipe) return;

    const scaled = scaleRecipe(recipe, batch.targetUnits, batch.selectedAlternativeIds);
    totalHours += scaled.estimatedHours;
    totalUnits += batch.targetUnits;
    totalLaborPercent += scaled.laborPercent;
    totalFreezerFraction += calculateBatchFreezerFraction(recipe, batch.targetUnits);

    // Track product summary
    if (!productMap.has(recipe.id)) {
      productMap.set(recipe.id, {
        recipeName: recipe.name,
        units: 0,
        batchesCount: 0,
        color: recipe.color || '#f59e0b',
        hours: 0,
      });
    }
    const prod = productMap.get(recipe.id)!;
    prod.units += batch.targetUnits;
    prod.batchesCount += 1;
    prod.hours += scaled.estimatedHours;

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

  return {
    ingredientsByCategory,
    packagingList: Array.from(packagingMap.values()).sort((a, b) => b.totalCount - a.totalCount),
    totalHours: Math.round(totalHours * 10) / 10,
    totalUnits,
    totalLaborPercent,
    totalFreezerPercent,
    f1Occupancy,
    f2Occupancy,
    productSummary: Array.from(productMap.values()).sort((a, b) => b.units - a.units),
  };
}
