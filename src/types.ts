export type ProductCategory = 
  | 'tequenos' 
  | 'chipas' 
  | 'pastas' 
  | 'canelones' 
  | 'postres' 
  | 'pizzas' 
  | 'empanadas' 
  | 'panaderia' 
  | 'otros' 
  | string;

export interface IngredientCategoryConfig {
  id: string; // e.g. 'lacteos', 'harinas_feculas', 'frescos_verduras', 'huevos', 'grasas_liquidos', 'especias_condimentos', 'otros'
  name: string; // e.g. 'Lácteos, Quesos y Rellenos'
  icon: string; // e.g. '🧀'
  description?: string;
  order: number;
}

export interface ProductionCategoryConfig {
  id: string; // e.g. 'pastas', 'tequenos', 'chipas', 'canelones', 'postres', 'pizzas', 'empanadas', 'panaderia', 'otros'
  name: string; // e.g. 'Pasta rellena', 'Tequeños & Snacks', etc.
  icon: string; // e.g. '🥟'
  color?: string;
  badgeBg?: string;
  badgeText?: string;
  order: number;
}

export interface MasterIngredient {
  id: string;
  name: string;
  categoryId: string;
  defaultUnit: 'kg' | 'g' | 'L' | 'ml' | 'u' | 'paquetes';
  notes?: string;
}

export interface Ingredient {
  id: string;
  name: string;
  amountGrams: number; // Base quantity in grams
  unit?: 'g' | 'kg' | 'ml' | 'L' | 'u' | 'paquetes'; // display unit
  displayUnit?: string;
  category: 'lacteos' | 'harinas_feculas' | 'frescos_verduras' | 'huevos' | 'grasas_liquidos' | 'especias_condimentos' | 'otros' | string;
  alternative?: {
    name: string;
    amountGrams: number;
    description: string;
    isDehydrated?: boolean;
    isCheeseSubstitute?: boolean;
  };
  notes?: string;
}

export interface PackagingItem {
  id: string;
  name: string;
  type: 'bolsa' | 'etiqueta' | 'folex' | 'bandeja' | 'caja' | 'pote';
  baseQuantity: number;
  description: string;
  dimensions?: string;
}

export interface PresentationOption {
  id: string;
  label: string;
  unitsPerPack: number;
  basePacksCount: number; // e.g. 137 packs of 8u or 27 packs of 40u
  packagingDescription: string;
}

export interface FreezerOccupancyRule {
  f1Percent: number; // e.g. 100 for 100%
  f1TraysText: string; // e.g. "10/10" o "11/11" o "5/5"
  f1MaxTrays: number;
  f1TraysOccupied: number;
  f2Percent: number; // e.g. 20
  f2TraysText: string; // e.g. "2/10" o "LIBRE"
  f2MaxTrays: number;
  f2TraysOccupied: number;
  isDirectPotes?: boolean;
  ruleNotes?: string;
  criticalLimitWarning?: string;
}

export interface Recipe {
  id: string;
  name: string;
  category: ProductCategory;
  subtitle: string;
  baseYieldUnits: number; // e.g. 1100, 3000, 2112, 112 (bandejas), 400
  yieldUnitName: string; // 'unidades', 'bandejas', 'porciones'
  presentationOptions: PresentationOption[];
  ingredients: Ingredient[];
  packaging: PackagingItem[];
  baseHours: number; // e.g. 7.5
  baseMinutes?: number; // e.g. 450 (base production duration in minutes)
  prepMinutes?: number; // optional fixed setup/prep time in minutes (e.g. 30)
  timeNotes?: string;
  freezerRule: FreezerOccupancyRule;
  maxRecommendedBatch?: number;
  operationalNotes: string[];
  preparationSteps: string[];
  color: string;
  badgeBg: string;
  badgeText: string;
  requiresNextDayPackaging?: boolean; // Whether product requires packaging next day after freezing
  nextDayPackagingMinutes?: number; // Minutes required for next-day packaging (default ~35 min)
}

export interface ActiveBatch {
  id: string;
  recipeId: string;
  recipeName: string;
  targetUnits: number;
  presentationId?: string;
  selectedAlternativeIds: string[]; // which alternative ingredients were enabled
  scheduledDate: string;
  status: 'planificado' | 'pesando' | 'elaborando' | 'en_freezer' | 'completado';
  createdAt: string;
  notes?: string;
  freezerAssigned?: 'F1' | 'F2' | 'AMBOS' | 'NINGUNO';
  calculatedHours: number;
  calculatedMinutes?: number;
  calculatedFormattedDuration?: string;
  calculatedLaborPercent?: number;
  calculatedF1Percent: number;
  calculatedF2Percent: number;
}

export interface ConsolidatedIngredient {
  name: string;
  category: string;
  totalGrams: number;
  totalUnits?: number;
  unit: string;
  usedInRecipes: { 
    recipeName: string; 
    amount: number; 
    unit: string;
    scheduledDate?: string;
    formattedDate?: string;
    batchId?: string;
    isBatchCompleted?: boolean;
    batchStatus?: ActiveBatch['status'];
  }[];
  isPurchased?: boolean;
}

export interface ConsolidatedPackaging {
  name: string;
  type: string;
  totalCount: number;
  usedInRecipes: { 
    recipeName: string; 
    count: number;
    scheduledDate?: string;
    formattedDate?: string;
    batchId?: string;
    isBatchCompleted?: boolean;
    batchStatus?: ActiveBatch['status'];
  }[];
  isPurchased?: boolean;
}
