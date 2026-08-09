import { ActiveBatch, Recipe, ConsolidatedIngredient, ConsolidatedPackaging } from '../types';
import { scaleRecipe, calculateBatchFreezerFraction, formatDuration, formatHoursToDuration } from './calculations';

export interface DaySchedule {
  dateStr: string; // YYYY-MM-DD
  dayName: string; // 'Lunes', 'Martes', etc.
  dayNumber: number; // 1 to 31
  monthName: string; // 'Ago', 'Sep', etc.
  isToday: boolean;
  isSaturday: boolean;
  isFriday: boolean;
  batches: ActiveBatch[];

  // Production Labor
  productionMinutes: number;
  productionHours: number;
  productionFormatted: string;
  productionLaborPercent: number; // calculated relative to 8 hours (480 min)
  totalUnits: number;

  // Next-Day Packaging Reservation (Pastas, Chipas, Tequeños get packaged the following day)
  hasPreviousDayPackaging: boolean;
  previousDayPackagingBatches: { recipeName: string; units: number; dateStr: string }[];
  packagingReservedMinutes: number; // 35 min if true, 0 if false
  packagingReservedHours: number; // ~0.6 if true, 0 if false
  packagingPercent: number; // calculated relative to 8 hours (480 min)

  // Daily Cleaning & Organization (20 min standard, 35-40 min on Fridays)
  hasCleaning: boolean;
  isDeepCleaning: boolean; // Friday deep clean
  cleaningReservedMinutes: number; // 20 min normal, 40 min Friday
  cleaningReservedHours: number;
  cleaningPercent: number; // calculated relative to 8 hours (480 min)

  // Total Daily Labor (Production + Packaging + Cleaning out of 8h standard workday = 480 min)
  totalMinutes: number;
  totalHours: number;
  totalLaborFormatted: string;
  totalLaborPercent: number; // calculated relative to 8 hours (480 min)

  // Freezers de Producción (Both freezers have identical capacity = 100% capacity combined)
  totalFreezerFraction: number; // freezers needed in units (e.g. 0.8, 1.5, 2.3)
  totalFreezerPercent: number; // total combined plant freezer occupancy % (e.g. 40%, 75%, 100%, max 100% unless overloaded)
  f1Trays: number;
  f2Trays: number;
  f1Percent: number; // 0 to 100%
  f2Percent: number; // 0 to 100%
  freezerStatusText: string;
  freezerWarningMessage?: string;

  // Overload Flags
  isLaborOverloaded: boolean; // totalMinutes > 480 min (exceeds 8h workday)
  isFreezerOverloaded: boolean; // totalFreezerFraction > 2.0 (totalFreezerPercent > 100%)
  isOverloaded: boolean; // isLaborOverloaded || isFreezerOverloaded
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
 * Checks if a recipe requires next-day packaging after freezing
 * Pastas, Chipas, and Tequeños are frozen on the day of production and packaged the next day.
 * Postres (individual pots) and Canelones (ready-to-pack plastic trays) do NOT require next-day packaging.
 */
export function isPackagingRequired(recipe?: Recipe): boolean {
  if (!recipe) return false;
  if (recipe.category === 'postres') return false;
  if (recipe.category === 'canelones' || recipe.id === 'canelones') return false;
  return true;
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
    const isFriday = dayOfWeekIdx === 5;

    // Find batches scheduled for this specific day
    const dayBatches = activeBatches.filter((b) => b.scheduledDate === dateStr);

    let productionMinutes = 0;
    let totalUnits = 0;
    let totalFreezerFraction = 0;
    let f1Trays = 0;
    let f2Trays = 0;

    dayBatches.forEach((batch) => {
      const recipe = recipeMap.get(batch.recipeId);
      if (recipe) {
        const scaled = scaleRecipe(recipe, batch.targetUnits, batch.selectedAlternativeIds);
        productionMinutes += scaled.estimatedMinutes;
        totalUnits += batch.targetUnits;
        totalFreezerFraction += calculateBatchFreezerFraction(recipe, batch.targetUnits);
        f1Trays += scaled.freezer.f1Trays;
        f2Trays += scaled.freezer.f2Trays;
      }
    });

    // Check if the previous day had production that needs to be packaged today (+35 min reserved)
    // For regular days (Tue-Sat), check day - 1. For Monday, check Sunday, Saturday, or Friday.
    const prevDate1 = new Date(current);
    prevDate1.setDate(current.getDate() - 1);
    const prevDate1Str = formatDateToISO(prevDate1);

    let prevDayBatches: ActiveBatch[] = activeBatches.filter(
      (b) => b.scheduledDate === prevDate1Str && isPackagingRequired(recipeMap.get(b.recipeId))
    );

    // If Monday and nothing on Sunday, check Saturday & Friday
    if (prevDayBatches.length === 0 && dayOfWeekIdx === 1) {
      const prevDateSat = new Date(current);
      prevDateSat.setDate(current.getDate() - 2);
      const prevDateSatStr = formatDateToISO(prevDateSat);
      prevDayBatches = activeBatches.filter(
        (b) => b.scheduledDate === prevDateSatStr && isPackagingRequired(recipeMap.get(b.recipeId))
      );

      if (prevDayBatches.length === 0) {
        const prevDateFri = new Date(current);
        prevDateFri.setDate(current.getDate() - 3);
        const prevDateFriStr = formatDateToISO(prevDateFri);
        prevDayBatches = activeBatches.filter(
          (b) => b.scheduledDate === prevDateFriStr && isPackagingRequired(recipeMap.get(b.recipeId))
        );
      }
    }

    const hasPreviousDayPackaging = prevDayBatches.length > 0;
    const packagingReservedMinutes = hasPreviousDayPackaging ? 35 : 0;
    const packagingReservedHours = Math.round((packagingReservedMinutes / 60) * 10) / 10;
    const packagingPercent = Math.round((packagingReservedMinutes / 480) * 100);

    // Daily cleaning: 20 min normal, 40 min Friday deep cleaning
    const hasCleaning = dayBatches.length > 0 || hasPreviousDayPackaging;
    const isDeepCleaning = isFriday && hasCleaning;
    const cleaningReservedMinutes = hasCleaning ? (isFriday ? 40 : 20) : 0;
    const cleaningReservedHours = Math.round((cleaningReservedMinutes / 60) * 10) / 10;
    const cleaningPercent = Math.round((cleaningReservedMinutes / 480) * 100);

    const previousDayPackagingBatches = prevDayBatches.map((b) => {
      const rec = recipeMap.get(b.recipeId);
      return {
        recipeName: rec ? rec.name : 'Producción previa',
        units: b.targetUnits,
        dateStr: b.scheduledDate,
      };
    });

    const productionHours = Math.round((productionMinutes / 60) * 100) / 100;
    const productionFormatted = formatDuration(productionMinutes);
    const productionLaborPercent = Math.round((productionMinutes / 480) * 100);
    const totalMinutes = productionMinutes + packagingReservedMinutes + cleaningReservedMinutes;
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
    const totalLaborFormatted = formatDuration(totalMinutes);

    // Standard workday is 8 hours = 480 minutes (100% of workday)
    const totalLaborPercent = Math.round((totalMinutes / 480) * 100);

    // Freezers de Producción:
    // Both freezers have identical capacity = 100% combined plant cold storage capacity
    // 1 full freezer = 50% of plant freezer capacity. 2 full freezers = 100% of plant freezer capacity.
    const totalFreezerPercent = Math.round((totalFreezerFraction / 2) * 100);
    let f1Percent = 0;
    let f2Percent = 0;

    if (totalFreezerFraction <= 1.0) {
      f1Percent = Math.round(totalFreezerFraction * 100);
      f2Percent = 0;
    } else if (totalFreezerFraction <= 2.0) {
      f1Percent = 100;
      f2Percent = Math.round((totalFreezerFraction - 1.0) * 100);
    } else {
      // Overloaded (> 2 freezers / > 100% plant capacity)
      f1Percent = 100;
      f2Percent = 100;
    }

    const isLaborOverloaded = totalMinutes > 480; // Exceeds 8h shift
    const isFreezerOverloaded = totalFreezerFraction > 2.0; // Exceeds both freezers (>100% plant cold storage)
    const isOverloaded = isLaborOverloaded || isFreezerOverloaded;

    let freezerStatusText = 'Freezers libres (0%)';
    let freezerWarningMessage: string | undefined;

    if (isFreezerOverloaded) {
      freezerStatusText = `⚠️ Capacidad superada (${totalFreezerPercent}% - Máx 100%)`;
      freezerWarningMessage = `¡Capacidad de los freezers superada! Se requiere el ${totalFreezerPercent}% del espacio total disponible en los 2 freezers de producción (equivale a ${totalFreezerFraction.toFixed(1)} freezers, superando los 2 de planta). Se debe fraccionar el lote o reprogramar.`;
    } else if (totalFreezerFraction > 1.0) {
      freezerStatusText = `${totalFreezerPercent}% total ocupado (F1: 100% + F2: ${f2Percent}%)`;
    } else if (totalFreezerFraction > 0) {
      freezerStatusText = `${totalFreezerPercent}% total ocupado (F1: ${f1Percent}%, F2: Libre)`;
    }

    days.push({
      dateStr,
      dayName,
      dayNumber: current.getDate(),
      monthName,
      isToday,
      isSaturday,
      isFriday,
      batches: dayBatches,
      productionMinutes,
      productionHours,
      productionFormatted,
      productionLaborPercent,
      totalUnits,
      hasPreviousDayPackaging,
      previousDayPackagingBatches,
      packagingReservedMinutes,
      packagingReservedHours,
      packagingPercent,
      hasCleaning,
      isDeepCleaning,
      cleaningReservedMinutes,
      cleaningReservedHours,
      cleaningPercent,
      totalMinutes,
      totalHours,
      totalLaborFormatted,
      totalLaborPercent,
      totalFreezerPercent,
      totalFreezerFraction: Math.round(totalFreezerFraction * 100) / 100,
      f1Trays: Math.round(f1Trays * 10) / 10,
      f2Trays: Math.round(f2Trays * 10) / 10,
      f1Percent,
      f2Percent,
      freezerStatusText,
      freezerWarningMessage,
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

    const formattedDate = batch.scheduledDate ? formatBatchDateShort(batch.scheduledDate) : '';

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
        scheduledDate: batch.scheduledDate,
        formattedDate,
        batchId: batch.id,
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
        scheduledDate: batch.scheduledDate,
        formattedDate,
        batchId: batch.id,
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

  const totalFreezerPercent = Math.round((totalFreezerFraction / 2) * 100);
  let f1Occupancy = 0;
  let f2Occupancy = 0;

  if (totalFreezerFraction <= 1.0) {
    f1Occupancy = Math.round(totalFreezerFraction * 100);
    f2Occupancy = 0;
  } else if (totalFreezerFraction <= 2.0) {
    f1Occupancy = 100;
    f2Occupancy = Math.round((totalFreezerFraction - 1.0) * 100);
  } else {
    f1Occupancy = 100;
    f2Occupancy = 100;
  }

  // Workday labor percent against 8-hour workday (480 min)
  const totalLaborPercentWorkday = Math.round(((totalHours * 60) / 480) * 100);

  return {
    ingredientsByCategory,
    packagingList: Array.from(packagingMap.values()).sort((a, b) => b.totalCount - a.totalCount),
    totalHours: Math.round(totalHours * 10) / 10,
    totalUnits,
    totalLaborPercent: totalLaborPercentWorkday,
    totalFreezerPercent,
    f1Occupancy,
    f2Occupancy,
    productSummary: Array.from(productMap.values()).sort((a, b) => b.units - a.units),
  };
}
