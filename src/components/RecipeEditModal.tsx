import React, { useState } from 'react';
import { 
  X, 
  Save, 
  Plus, 
  Trash2, 
  Clock, 
  Snowflake, 
  Scale, 
  Package, 
  AlertTriangle,
  RotateCcw,
  Zap,
  Activity,
  Sparkles,
  UtensilsCrossed,
  CheckSquare,
  Square,
  Box
} from 'lucide-react';
import { Recipe, Ingredient, PackagingItem, ProductCategory, MasterIngredient, IngredientCategoryConfig, ProductionCategoryConfig } from '../types';
import { formatDuration } from '../utils/calculations';
import { INITIAL_MASTER_INGREDIENTS } from '../data/masterIngredientsData';
import { DEFAULT_INGREDIENT_CATEGORIES, DEFAULT_PRODUCTION_CATEGORIES } from '../data/categoriesData';

interface RecipeEditModalProps {
  recipe: Recipe;
  onClose: () => void;
  onSave: (updatedRecipe: Recipe) => void;
  isNew?: boolean;
  masterIngredients?: MasterIngredient[];
  ingredientCategories?: IngredientCategoryConfig[];
  productionCategories?: ProductionCategoryConfig[];
  onAddNewMasterIngredient?: (item: MasterIngredient) => void;
}

const CATEGORY_DEFAULTS: Record<string, { badgeBg: string; badgeText: string; color: string }> = {
  pizzas: {
    badgeBg: 'bg-amber-100 border-amber-300 text-amber-900',
    badgeText: 'Pizzas & Pre-pizzas',
    color: 'from-amber-600 to-red-600',
  },
  pastas: {
    badgeBg: 'bg-emerald-100 border-emerald-300 text-emerald-900',
    badgeText: 'Pastas Frescas',
    color: 'from-emerald-600 to-teal-600',
  },
  empanadas: {
    badgeBg: 'bg-orange-100 border-orange-300 text-orange-900',
    badgeText: 'Empanadas & Tartas',
    color: 'from-orange-600 to-amber-600',
  },
  canelones: {
    badgeBg: 'bg-rose-100 border-rose-300 text-rose-900',
    badgeText: 'Canelones Listos',
    color: 'from-rose-600 to-red-600',
  },
  tequenos: {
    badgeBg: 'bg-yellow-100 border-yellow-300 text-yellow-900',
    badgeText: 'Tequeños Hojaldrados',
    color: 'from-yellow-500 to-amber-600',
  },
  chipas: {
    badgeBg: 'bg-blue-100 border-blue-300 text-blue-900',
    badgeText: 'Chipas Tradicionales',
    color: 'from-blue-600 to-indigo-600',
  },
  postres: {
    badgeBg: 'bg-purple-100 border-purple-300 text-purple-900',
    badgeText: 'Postres & Dulces',
    color: 'from-purple-600 to-pink-600',
  },
  panaderia: {
    badgeBg: 'bg-amber-100 border-amber-300 text-amber-900',
    badgeText: 'Panadería & Masas',
    color: 'from-amber-600 to-stone-600',
  },
  otros: {
    badgeBg: 'bg-slate-100 border-slate-300 text-slate-900',
    badgeText: 'Elaboración General',
    color: 'from-slate-600 to-zinc-600',
  },
};

export const RecipeEditModal: React.FC<RecipeEditModalProps> = ({
  recipe,
  onClose,
  onSave,
  isNew = false,
  masterIngredients = INITIAL_MASTER_INGREDIENTS,
  ingredientCategories = DEFAULT_INGREDIENT_CATEGORIES,
  productionCategories = DEFAULT_PRODUCTION_CATEGORIES,
  onAddNewMasterIngredient,
}) => {
  // Form State
  const [name, setName] = useState(recipe.name);
  const [category, setCategory] = useState<string>(recipe.category || 'pizzas');
  const [subtitle, setSubtitle] = useState(recipe.subtitle);
  const [baseYieldUnits, setBaseYieldUnits] = useState(recipe.baseYieldUnits);
  const [yieldUnitName, setYieldUnitName] = useState(recipe.yieldUnitName || 'unidades');
  
  // Minutes-first time state
  const initialBaseMinutes = recipe.baseMinutes && recipe.baseMinutes > 0 
    ? recipe.baseMinutes 
    : Math.round((recipe.baseHours || 7.0) * 60);
  const [baseMinutes, setBaseMinutes] = useState<number>(initialBaseMinutes);
  const [prepMinutes, setPrepMinutes] = useState<number>(recipe.prepMinutes || 0);
  
  // Freezer Rules (Simplified to percentages)
  const [f1Percent, setF1Percent] = useState(recipe.freezerRule?.f1Percent ?? 100);
  const [f2Percent, setF2Percent] = useState(recipe.freezerRule?.f2Percent ?? 0);
  const [ruleNotes, setRuleNotes] = useState(recipe.freezerRule?.ruleNotes || '');

  // Ingredients List
  const [ingredients, setIngredients] = useState<Ingredient[]>([...recipe.ingredients]);

  // Packaging List
  const [packaging, setPackaging] = useState<PackagingItem[]>([...recipe.packaging]);

  // Quick Create Master Ingredient state (inline)
  const [showQuickAddMaster, setShowQuickAddMaster] = useState(false);
  const [quickMasterName, setQuickMasterName] = useState('');
  const [quickMasterCat, setQuickMasterCat] = useState('lacteos');
  const [quickMasterUnit, setQuickMasterUnit] = useState<'kg' | 'g' | 'L' | 'ml' | 'u' | 'paquetes'>('kg');
  const [quickTargetRowIdx, setQuickTargetRowIdx] = useState<number | null>(null);

  // Next-day Packaging Toggle & Custom Minutes
  const [requiresNextDayPackaging, setRequiresNextDayPackaging] = useState<boolean>(() => {
    if (typeof recipe.requiresNextDayPackaging === 'boolean') {
      return recipe.requiresNextDayPackaging;
    }
    // Categories that do not require next-day packaging by default (packaged on the same day)
    if (['postres', 'canelones', 'pizzas'].includes(recipe.category || '') || (recipe.id && recipe.id.includes('pizza'))) {
      return false;
    }
    return true;
  });
  const [nextDayPackagingMinutes, setNextDayPackagingMinutes] = useState<number>(
    recipe.nextDayPackagingMinutes && recipe.nextDayPackagingMinutes > 0 ? recipe.nextDayPackagingMinutes : 35
  );

  // Quick Preset Loader (e.g. for Pizza or others)
  const loadPresetTemplate = (presetType: 'pizzas' | 'empanadas' | 'pastas' | 'blank') => {
    if (presetType === 'pizzas') {
      setName('Pizzas / Pre-pizzas Caseras');
      setCategory('pizzas');
      setSubtitle('Rendimiento base: 500 pre-pizzas (Masa fermentada a la piedra con salsa)');
      setBaseYieldUnits(500);
      setYieldUnitName('unidades');
      setBaseMinutes(420);
      setPrepMinutes(30);
      setF1Percent(100);
      setF2Percent(0);
      setRequiresNextDayPackaging(false);
      setNextDayPackagingMinutes(0);
      setRuleNotes('Ultracongelado en bandejas de 10 unidades o apiladas con folex.');
      setIngredients([
        { id: `ing-${Date.now()}-1`, name: 'Harina 000', amountGrams: 50000, unit: 'kg', category: 'harinas_feculas', notes: 'Harina de fuerza' },
        { id: `ing-${Date.now()}-2`, name: 'Agua', amountGrams: 30000, unit: 'kg', category: 'grasas_liquidos' },
        { id: `ing-${Date.now()}-3`, name: 'Muzzarella', amountGrams: 25000, unit: 'kg', category: 'lacteos', notes: 'Rallada o en trozos' },
        { id: `ing-${Date.now()}-4`, name: 'Salsa de Tomate / Puré', amountGrams: 15000, unit: 'kg', category: 'frescos_verduras' },
        { id: `ing-${Date.now()}-5`, name: 'Aceite de Girasol', amountGrams: 2000, unit: 'kg', category: 'grasas_liquidos' },
        { id: `ing-${Date.now()}-6`, name: 'Levadura Fresca', amountGrams: 1500, unit: 'kg', category: 'otros' },
        { id: `ing-${Date.now()}-7`, name: 'Sal Fina', amountGrams: 1000, unit: 'kg', category: 'especias_condimentos' },
      ]);
      setPackaging([
        { id: `pkg-${Date.now()}-1`, name: 'Bolsas para Pizza / Film', type: 'bolsa', baseQuantity: 500, description: 'Bolsa transparente para envasado al vacío o film' },
        { id: `pkg-${Date.now()}-2`, name: 'Etiquetas Pizza', type: 'etiqueta', baseQuantity: 500, description: 'Etiqueta con lote y vencimiento' },
      ]);
    } else if (presetType === 'empanadas') {
      setName('Empanadas Criollas / Especiales');
      setCategory('empanadas');
      setSubtitle('Rendimiento base: 1.200 empanadas (100 docenas)');
      setBaseYieldUnits(100);
      setYieldUnitName('docenas');
      setBaseMinutes(450);
      setPrepMinutes(30);
      setF1Percent(100);
      setF2Percent(20);
      setRequiresNextDayPackaging(true);
      setNextDayPackagingMinutes(35);
      setRuleNotes('10 bandejas en F1 y 2 en F2.');
      setIngredients([
        { id: `ing-${Date.now()}-1`, name: 'Tapas de Empanadas', amountGrams: 1200, unit: 'u', category: 'harinas_feculas' },
        { id: `ing-${Date.now()}-2`, name: 'Carne Picada Especial / Pollo', amountGrams: 30000, unit: 'kg', category: 'otros' },
        { id: `ing-${Date.now()}-3`, name: 'Cebolla', amountGrams: 20000, unit: 'kg', category: 'frescos_verduras' },
        { id: `ing-${Date.now()}-4`, name: 'Huevos', amountGrams: 40, unit: 'u', category: 'huevos' },
        { id: `ing-${Date.now()}-5`, name: 'Grasa Bovina / Aceite', amountGrams: 3000, unit: 'kg', category: 'grasas_liquidos' },
      ]);
      setPackaging([
        { id: `pkg-${Date.now()}-1`, name: 'Cajas / Bolsas x Docena', type: 'caja', baseQuantity: 100, description: 'Cajas para 12 empanadas' },
        { id: `pkg-${Date.now()}-2`, name: 'Etiquetas', type: 'etiqueta', baseQuantity: 100, description: 'Etiqueta de sabor' },
      ]);
    } else if (presetType === 'pastas') {
      setName('Sorrentinos / Ravioles Frescos');
      setCategory('pastas');
      setSubtitle('Rendimiento base: 176 docenas (2.112 unidades)');
      setBaseYieldUnits(176);
      setYieldUnitName('docenas');
      setBaseMinutes(450);
      setPrepMinutes(30);
      setF1Percent(100);
      setF2Percent(100);
      setRequiresNextDayPackaging(true);
      setNextDayPackagingMinutes(35);
      setRuleNotes('Ocupa ambos freezers (22 bandejas en total).');
      setIngredients([
        { id: `ing-${Date.now()}-1`, name: 'Harina 0000', amountGrams: 30000, unit: 'kg', category: 'harinas_feculas' },
        { id: `ing-${Date.now()}-2`, name: 'Huevos', amountGrams: 100, unit: 'u', category: 'huevos' },
        { id: `ing-${Date.now()}-3`, name: 'Muzzarella / Ricota', amountGrams: 20000, unit: 'kg', category: 'lacteos' },
        { id: `ing-${Date.now()}-4`, name: 'Jamón Cocido / Verdura', amountGrams: 15000, unit: 'kg', category: 'otros' },
      ]);
      setPackaging([
        { id: `pkg-${Date.now()}-1`, name: 'Cajas de Sorrentinos', type: 'caja', baseQuantity: 176, description: 'Cajas de 1 docena' },
      ]);
    } else if (presetType === 'blank') {
      setName('');
      setCategory('otros');
      setSubtitle('');
      setBaseYieldUnits(1000);
      setYieldUnitName('unidades');
      setBaseMinutes(420);
      setPrepMinutes(0);
      setF1Percent(100);
      setF2Percent(0);
      setRequiresNextDayPackaging(false);
      setNextDayPackagingMinutes(0);
      setRuleNotes('');
      setIngredients([
        { id: `ing-${Date.now()}-1`, name: 'Insumo Principal 1', amountGrams: 10000, unit: 'kg', category: 'harinas_feculas' },
      ]);
      setPackaging([
        { id: `pkg-${Date.now()}-1`, name: 'Bolsas / Cajas', type: 'bolsa', baseQuantity: 100, description: 'Empaque primario' },
      ]);
    }
  };

  // New Ingredient Row helper using Master List default
  const handleAddIngredient = () => {
    const firstMaster = masterIngredients[0];
    const newIng: Ingredient = {
      id: `ing-${Date.now()}`,
      name: firstMaster ? firstMaster.name : 'Harina 0000',
      amountGrams: 1000,
      unit: firstMaster ? firstMaster.defaultUnit : 'kg',
      category: firstMaster ? firstMaster.categoryId : 'harinas_feculas',
      notes: firstMaster?.notes || '',
    };
    setIngredients([...ingredients, newIng]);
  };

  const handleSelectMasterIngredient = (index: number, masterName: string) => {
    if (masterName === '__NEW__') {
      setQuickTargetRowIdx(index);
      setQuickMasterName('');
      setQuickMasterCat('lacteos');
      setQuickMasterUnit('kg');
      setShowQuickAddMaster(true);
      return;
    }

    const foundMaster = masterIngredients.find((m) => m.name === masterName);
    const next = [...ingredients];
    if (foundMaster) {
      next[index] = {
        ...next[index],
        name: foundMaster.name,
        category: foundMaster.categoryId,
        unit: foundMaster.defaultUnit,
        notes: foundMaster.notes || next[index].notes,
      };
    } else {
      next[index] = {
        ...next[index],
        name: masterName,
      };
    }
    setIngredients(next);
  };

  const handleSaveQuickMaster = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickMasterName.trim()) return;

    const newMaster: MasterIngredient = {
      id: `ing-${Date.now()}`,
      name: quickMasterName.trim(),
      categoryId: quickMasterCat,
      defaultUnit: quickMasterUnit,
    };

    if (onAddNewMasterIngredient) {
      onAddNewMasterIngredient(newMaster);
    }

    if (quickTargetRowIdx !== null && ingredients[quickTargetRowIdx]) {
      const next = [...ingredients];
      next[quickTargetRowIdx] = {
        ...next[quickTargetRowIdx],
        name: newMaster.name,
        category: newMaster.categoryId,
        unit: newMaster.defaultUnit,
      };
      setIngredients(next);
    }

    setShowQuickAddMaster(false);
    setQuickTargetRowIdx(null);
  };

  const handleUpdateIngredient = (index: number, field: keyof Ingredient, value: any) => {
    const next = [...ingredients];
    next[index] = { ...next[index], [field]: value };
    setIngredients(next);
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  // Packaging helpers
  const handleAddPackaging = () => {
    const newPkg: PackagingItem = {
      id: `pkg-${Date.now()}`,
      name: 'Nuevo Insumo Empaque',
      type: 'bolsa',
      baseQuantity: 100,
      description: 'Insumo de fraccionamiento',
    };
    setPackaging([...packaging, newPkg]);
  };

  const handleUpdatePackaging = (index: number, field: keyof PackagingItem, value: any) => {
    const next = [...packaging];
    next[index] = { ...next[index], [field]: value };
    setPackaging(next);
  };

  const handleRemovePackaging = (index: number) => {
    setPackaging(packaging.filter((_, i) => i !== index));
  };

  // Derived calculation metrics
  const validBaseMinutes = Math.max(1, Number(baseMinutes) || 420);
  const validPrepMinutes = Math.max(0, Math.min(validBaseMinutes - 1, Number(prepMinutes) || 0));
  const validYieldUnits = Math.max(1, Number(baseYieldUnits) || 1);
  const validBaseHours = Math.round((validBaseMinutes / 60) * 100) / 100;
  
  const minutesPerUnit = validBaseMinutes / validYieldUnits;
  const secondsPerUnit = (validBaseMinutes * 60) / validYieldUnits;
  
  let unitNameSingular = yieldUnitName.trim() || 'unidad';
  if (unitNameSingular.endsWith('es')) {
    unitNameSingular = unitNameSingular.slice(0, -2);
  } else if (unitNameSingular.endsWith('s')) {
    unitNameSingular = unitNameSingular.slice(0, -1);
  }

  const rateFormatted = minutesPerUnit >= 1 
    ? `~${minutesPerUnit.toFixed(2)} min / ${unitNameSingular}` 
    : `~${Math.round(secondsPerUnit)} seg / ${unitNameSingular}`;

  const workdayPercent = Math.round((validBaseMinutes / 480) * 100);

  const currentCategoryStyle = CATEGORY_DEFAULTS[category] || CATEGORY_DEFAULTS.otros;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const f1Pct = Math.max(0, Math.min(100, Number(f1Percent) || 0));
    const f2Pct = Math.max(0, Math.min(100, Number(f2Percent) || 0));

    const f1Text = f1Pct > 0 ? `${f1Pct}%` : 'Libre';
    const f2Text = f2Pct > 0 ? `${f2Pct}%` : 'Libre';

    const cleanName = name.trim() || (isNew ? 'Nueva Receta' : recipe.name);
    const recipeId = isNew && (!recipe.id || recipe.id === 'new') 
      ? `rec-${Date.now()}-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 15)}`
      : recipe.id;

    const updated: Recipe = {
      ...recipe,
      id: recipeId,
      name: cleanName,
      category: (category as ProductCategory) || 'otros',
      subtitle: subtitle.trim() || `Rendimiento base: ${validYieldUnits.toLocaleString('es-AR')} ${yieldUnitName}`,
      baseYieldUnits: validYieldUnits,
      yieldUnitName: yieldUnitName.trim() || 'unidades',
      baseMinutes: validBaseMinutes,
      baseHours: validBaseHours,
      prepMinutes: validPrepMinutes,
      color: recipe.color || currentCategoryStyle.color,
      badgeBg: currentCategoryStyle.badgeBg,
      badgeText: currentCategoryStyle.badgeText,
      presentationOptions: recipe.presentationOptions && recipe.presentationOptions.length > 0 
        ? recipe.presentationOptions 
        : [
            {
              id: `${recipeId}-pack-base`,
              label: `Lote base (${validYieldUnits} ${yieldUnitName})`,
              unitsPerPack: 1,
              basePacksCount: validYieldUnits,
              packagingDescription: `${validYieldUnits} unidades estándar`,
            }
          ],
      freezerRule: {
        ...(recipe.freezerRule || {}),
        f1Percent: f1Pct,
        f1TraysOccupied: f1Pct,
        f1MaxTrays: 100,
        f1TraysText: f1Text,
        f2Percent: f2Pct,
        f2TraysOccupied: f2Pct,
        f2MaxTrays: 100,
        f2TraysText: f2Text,
        ruleNotes: ruleNotes.trim(),
      },
      operationalNotes: recipe.operationalNotes || [
        'Amasado y pesaje según especificaciones de planta.',
        'Control de temperatura y tiempos de enfriamiento.',
      ],
      preparationSteps: recipe.preparationSteps || [
        'Pesar insumos de acuerdo a la escala requerida.',
        'Elaborar y fraccionar en unidades de despacho.',
        'Rotular y congelar en bandejas según norma de frío.',
      ],
      requiresNextDayPackaging,
      nextDayPackagingMinutes: requiresNextDayPackaging 
        ? Math.max(1, Number(nextDayPackagingMinutes) || 35) 
        : 0,
      ingredients,
      packaging,
    };

    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${currentCategoryStyle.badgeBg}`}>
                {currentCategoryStyle.badgeText}
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                {isNew ? 'Crear Nueva Receta / Ficha Técnica' : `Editar Ficha Técnica: ${name}`}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isNew 
                ? 'Ingresa los datos del nuevo producto, su lote base del 100%, insumos e impacto en freezers.'
                : 'Configuración en minutos exactos, rendimiento base (100%), insumos y ocupación de freezers.'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1">
          {/* Quick Preset Toolbar when creating a new recipe */}
          {isNew && (
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200/80 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Plantillas Rápidas Pre-cargadas (Opcional):</span>
              </div>
              <p className="text-[11px] text-amber-800">
                Puedes iniciar con una plantilla lista para personalizar con tus cantidades e insumos:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => loadPresetTemplate('pizzas')}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
                >
                  🍕 <span>Plantilla: Pizzas / Pre-pizzas</span>
                </button>
                <button
                  type="button"
                  onClick={() => loadPresetTemplate('empanadas')}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-amber-300 rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
                >
                  🥟 <span>Plantilla: Empanadas</span>
                </button>
                <button
                  type="button"
                  onClick={() => loadPresetTemplate('pastas')}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-amber-300 rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
                >
                  🍝 <span>Plantilla: Pastas Frescas</span>
                </button>
                <button
                  type="button"
                  onClick={() => loadPresetTemplate('blank')}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium transition-all"
                >
                  🧹 <span>Empezar en Blanco</span>
                </button>
              </div>
            </div>
          )}

          {/* Section 1: General Info & 100% Capacity */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
              1. Identificación y Rendimiento Base (Lote al 100%)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre del Producto:</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Pizzas Caseras / Pre-pizzas"
                  className="w-full text-xs font-bold bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Categoría de Fábrica:</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs font-bold bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                >
                  {productionCategories.map((prodCat) => (
                    <option key={prodCat.id} value={prodCat.id}>
                      {prodCat.icon} {prodCat.name}
                    </option>
                  ))}
                  {!productionCategories.some((c) => c.id === category) && (
                    <option value={category}>{category}</option>
                  )}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Subtítulo / Descripción Técnica:</label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Ej: Rendimiento base: 500 pre-pizzas a la piedra con salsa"
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cantidad Máxima a Producir al 100% (Rendimiento Base):
                </label>
                <input
                  type="number"
                  min="1"
                  value={baseYieldUnits}
                  onChange={(e) => setBaseYieldUnits(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full text-sm font-black bg-white border border-slate-300 rounded-lg px-3 py-2 text-amber-700"
                  required
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Ejemplos: 500 pizzas, 112 bandejas, 400 potes, 3.000 chipas, 176 docenas.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre de Unidad (Ej: unidades, pizzas, docenas, bandejas):</label>
                <input
                  type="text"
                  value={yieldUnitName}
                  onChange={(e) => setYieldUnitName(e.target.value)}
                  placeholder="unidades"
                  className="w-full text-xs font-bold bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: Robust Minutes-Based Production Time System */}
          <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <h3 className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-600" />
                  2. Sistema de Tiempo de Producción (en Minutos)
                </h3>
                <p className="text-[11px] text-amber-700/90 mt-0.5">
                  Carga los minutos exactos requeridos para elaborar el lote base al 100%. El sistema calcula automáticamente el ritmo por unidad y la duración exacta para cualquier cantidad fraccionada.
                </p>
              </div>

              <div className="text-xs font-bold text-amber-950 bg-white px-3 py-1 rounded-lg border border-amber-200 shadow-2xs self-start sm:self-auto">
                {formatDuration(validBaseMinutes)} ({validBaseHours} hs)
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Primary base minutes input */}
              <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Tiempo Total del Lote Base (en Minutos):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    step="1"
                    value={baseMinutes}
                    onChange={(e) => setBaseMinutes(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full text-base font-black bg-amber-50/40 border border-amber-300 rounded-lg px-3 py-2 text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                  <span className="text-xs font-extrabold text-amber-800 uppercase shrink-0">min</span>
                </div>

                {/* Quick Presets */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500 block mb-1.5">Accesos rápidos comunes:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: '4h (240 min)', val: 240 },
                      { label: '6h (360 min)', val: 360 },
                      { label: '7h (420 min)', val: 420 },
                      { label: '7.5h (450 min)', val: 450 },
                      { label: '8h (480 min)', val: 480 },
                    ].map((p) => (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => setBaseMinutes(p.val)}
                        className={`text-[11px] font-bold px-2 py-1 rounded-lg border transition-all ${
                          baseMinutes === p.val
                            ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-2xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Optional Fixed Setup / Mise en Place */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Puesta a Punto / Setup Inicial (Opcional):</span>
                  <span className="text-[10px] text-slate-400 font-normal">Fijo por lote</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max={validBaseMinutes - 1}
                    step="5"
                    value={prepMinutes}
                    onChange={(e) => setPrepMinutes(Math.max(0, Math.min(validBaseMinutes - 1, Number(e.target.value) || 0)))}
                    className="w-full text-sm font-bold bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800"
                  />
                  <span className="text-xs font-bold text-slate-500 uppercase shrink-0">min</span>
                </div>
                <p className="text-[10px] text-slate-500">
                  Tiempo fijo de preparación previa (amasado inicial, calentamiento o preparación de moldes). Si no aplica, dejar en 0 min.
                </p>
              </div>
            </div>

            {/* Live Analytics Dashboard for Production Time */}
            <div className="bg-white p-3.5 rounded-xl border border-amber-200/80 shadow-2xs space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Activity className="w-3.5 h-3.5 text-amber-600" />
                <span>Métricas de Rendimiento y Escalabilidad en Tiempo Real:</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
                  <span className="text-[10px] font-bold text-slate-500 block">Ritmo Unitario de Línea</span>
                  <span className="text-xs font-extrabold text-amber-700">{rateFormatted}</span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
                  <span className="text-[10px] font-bold text-slate-500 block">Ocupación de Turno Fábrica</span>
                  <span className="text-xs font-extrabold text-slate-900">
                    {workdayPercent}% de jornada (8 hs / 480 min)
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/70 col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold text-slate-500 block">Capacidad por Hora</span>
                  <span className="text-xs font-extrabold text-emerald-700">
                    ~{Math.round((validYieldUnits / validBaseMinutes) * 60)} {yieldUnitName} / hora
                  </span>
                </div>
              </div>

              {/* Proportional Scaling Preview */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-600 block mb-1.5">
                  Simulación de tiempos según tamaño de lote planificado:
                </span>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-lg bg-amber-50/60 border border-amber-100">
                    <span className="text-[10px] font-bold text-amber-800 block">25% del Lote</span>
                    <span className="font-extrabold text-slate-800 block mt-0.5">
                      {Math.round(validYieldUnits * 0.25)} {yieldUnitName}
                    </span>
                    <span className="text-[11px] text-amber-700 font-bold">
                      {formatDuration(Math.round(validBaseMinutes * 0.25))}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-amber-50/60 border border-amber-100">
                    <span className="text-[10px] font-bold text-amber-800 block">50% del Lote</span>
                    <span className="font-extrabold text-slate-800 block mt-0.5">
                      {Math.round(validYieldUnits * 0.5)} {yieldUnitName}
                    </span>
                    <span className="text-[11px] text-amber-700 font-bold">
                      {formatDuration(Math.round(validBaseMinutes * 0.5))}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-amber-100/70 border border-amber-200">
                    <span className="text-[10px] font-bold text-amber-900 block">100% del Lote (Base)</span>
                    <span className="font-extrabold text-slate-900 block mt-0.5">
                      {validYieldUnits} {yieldUnitName}
                    </span>
                    <span className="text-[11px] text-amber-900 font-black">
                      {formatDuration(validBaseMinutes)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Freezer Occupancy Rules (Simplified: Porcentaje de Ocupación por Freezer) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Snowflake className="w-3.5 h-3.5 text-cyan-600" />
                  3. Ocupación de Freezers de Producción (F1 & F2)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Indicá qué porcentaje de capacidad de cada freezer ocupa el lote base (100%).
                </p>
              </div>

              <div className="text-xs font-bold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200 self-start sm:self-auto shadow-2xs">
                Total planta: <span className="text-cyan-700 font-extrabold">{Math.round(((Number(f1Percent) || 0) + (Number(f2Percent) || 0)) / 2)}%</span> de capacidad de frío
              </div>
            </div>

            {/* Freezer inputs with visual progress bars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Freezer 1 Box */}
              <div className="bg-white p-3.5 rounded-xl border border-cyan-200/80 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Snowflake className="w-4 h-4 text-cyan-600" />
                    <span className="text-xs font-bold text-slate-900">Freezer 1 (F1)</span>
                  </div>
                  <span className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${
                    f1Percent > 100 
                      ? 'bg-rose-100 text-rose-800' 
                      : f1Percent >= 90 
                      ? 'bg-cyan-100 text-cyan-900' 
                      : f1Percent > 0 
                      ? 'bg-emerald-100 text-emerald-900' 
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {f1Percent > 0 ? `${f1Percent}% Ocupado` : 'Libre'}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${
                      f1Percent > 100 ? 'bg-rose-500' : f1Percent >= 90 ? 'bg-cyan-600' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, f1Percent))}%` }}
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Porcentaje de Ocupación:</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={f1Percent}
                        onChange={(e) => setF1Percent(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                        className="w-full text-xs font-black bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-cyan-950"
                      />
                      <span className="text-xs font-bold text-slate-500">%</span>
                    </div>
                  </div>

                  {/* Preset quick buttons */}
                  <div className="flex items-end gap-1">
                    {[50, 100].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setF1Percent(val)}
                        className={`text-[10px] font-bold px-2 py-1.5 rounded-lg border transition-colors ${
                          f1Percent === val
                            ? 'bg-cyan-600 text-white border-cyan-600 shadow-2xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {val}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Freezer 2 Box */}
              <div className="bg-white p-3.5 rounded-xl border border-blue-200/80 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Snowflake className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-bold text-slate-900">Freezer 2 (F2)</span>
                  </div>
                  <span className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${
                    f2Percent > 100 
                      ? 'bg-rose-100 text-rose-800' 
                      : f2Percent >= 90 
                      ? 'bg-blue-100 text-blue-900' 
                      : f2Percent > 0 
                      ? 'bg-sky-100 text-sky-900' 
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {f2Percent > 0 ? `${f2Percent}% Ocupado` : 'Libre'}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${
                      f2Percent > 100 ? 'bg-rose-500' : f2Percent >= 90 ? 'bg-blue-600' : 'bg-sky-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, f2Percent))}%` }}
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Porcentaje de Ocupación:</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={f2Percent}
                        onChange={(e) => setF2Percent(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                        className="w-full text-xs font-black bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-blue-950"
                      />
                      <span className="text-xs font-bold text-slate-500">%</span>
                    </div>
                  </div>

                  {/* Preset quick buttons */}
                  <div className="flex items-end gap-1">
                    {[50, 100].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setF2Percent(val)}
                        className={`text-[10px] font-bold px-2 py-1.5 rounded-lg border transition-colors ${
                          f2Percent === val
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {val}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Freezer Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nota de Almacenamiento en Frío:
              </label>
              <input
                type="text"
                value={ruleNotes}
                onChange={(e) => setRuleNotes(e.target.value)}
                placeholder="Ej: Bandejas pasantes de frío o apilado directo..."
                className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800"
              />
            </div>
          </div>

          {/* Section 4: Next-Day Packaging Configuration */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-indigo-600" />
                  4. Logística de Empaquetado y Fraccionamiento
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Define si este producto se envasa en la misma producción o si se congela primero y se empaqueta al día siguiente.
                </p>
              </div>

              <span className={`text-xs font-extrabold px-2.5 py-1 rounded-lg border self-start sm:self-auto ${
                requiresNextDayPackaging 
                  ? 'bg-indigo-100 text-indigo-900 border-indigo-200' 
                  : 'bg-emerald-100 text-emerald-900 border-emerald-200'
              }`}>
                {requiresNextDayPackaging ? '❄️ Empaque al día siguiente' : '📦 Empaque en misma producción'}
              </span>
            </div>

            {/* Interactive Toggle Card */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={requiresNextDayPackaging}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setRequiresNextDayPackaging(checked);
                    if (checked && (!nextDayPackagingMinutes || nextDayPackagingMinutes === 0)) {
                      setNextDayPackagingMinutes(35);
                    }
                  }}
                  className="mt-0.5 h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <div className="flex-1">
                  <span className="text-xs font-black text-slate-900 block">
                    ¿Requiere empaquetado al día siguiente tras el congelado?
                  </span>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {requiresNextDayPackaging ? (
                      <span className="text-indigo-900 font-medium">
                        <strong>Activado:</strong> La producción se coloca en bandejas al freezer y requiere tareas al inicio de la siguiente jornada laboral (desmoldar, embolsar, pesar y rotular como en Pastas, Chipas o Tequeños). El calendario reservará este tiempo al día siguiente.
                      </span>
                    ) : (
                      <span className="text-slate-600">
                        <strong>Desactivado:</strong> El producto se envasa, sella o fracciona directamente durante su propia elaboración (como Pizzas en film/bolsas, Canelones en bandejas listas o Postres en potes individuales). <strong>No ocupa tiempo al día siguiente.</strong>
                      </span>
                    )}
                  </p>
                </div>
              </label>

              {/* Timing settings when packaging is required */}
              {requiresNextDayPackaging && (
                <div className="mt-3 pt-3 border-t border-indigo-100 bg-indigo-50/50 p-3 rounded-lg space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-bold text-indigo-950">
                      Tiempo estimado de mano de obra para empaquetar al día siguiente:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="5"
                        max="240"
                        step="5"
                        value={nextDayPackagingMinutes}
                        onChange={(e) => setNextDayPackagingMinutes(Math.max(5, Number(e.target.value) || 35))}
                        className="w-24 text-xs font-black bg-white border border-indigo-300 rounded-lg px-2.5 py-1.5 text-indigo-950 text-right focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="text-xs font-extrabold text-indigo-800 uppercase">min</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-bold text-indigo-700 mr-1">Tiempos estándar:</span>
                    {[
                      { label: '20 min', val: 20 },
                      { label: '30 min', val: 30 },
                      { label: '35 min (estándar)', val: 35 },
                      { label: '45 min', val: 45 },
                      { label: '60 min (1 hora)', val: 60 },
                    ].map((p) => (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => setNextDayPackagingMinutes(p.val)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-md border transition-all ${
                          nextDayPackagingMinutes === p.val
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                            : 'bg-white text-indigo-900 border-indigo-200 hover:bg-indigo-100/70'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-indigo-700">
                    💡 Este tiempo (~{formatDuration(nextDayPackagingMinutes)}) se deducirá automáticamente de la disponibilidad de la jornada del día siguiente en el Calendario Semanal.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Section 5: Ingredients List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-amber-600" />
                  5. Fórmula de Insumos & Ingredientes Base ({ingredients.length})
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Seleccioná los insumos desde el catálogo maestro estandarizado para evitar errores de tipeo.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setQuickTargetRowIdx(null);
                    setQuickMasterName('');
                    setQuickMasterCat('lacteos');
                    setQuickMasterUnit('kg');
                    setShowQuickAddMaster(true);
                  }}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors border border-slate-300"
                  title="Crear un nuevo insumo en el catálogo maestro"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Nuevo Insumo Maestro</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddIngredient}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar a Receta</span>
                </button>
              </div>
            </div>

            {/* Quick Add Master Ingredient Modal / Card */}
            {showQuickAddMaster && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-3 shadow-sm animate-in fade-in">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Registrar Nuevo Insumo en el Catálogo Maestro</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowQuickAddMaster(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ✕ Cancelar
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nombre del Insumo:
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Queso Pategrás, Sal gruesa..."
                      value={quickMasterName}
                      onChange={(e) => setQuickMasterName(e.target.value)}
                      className="w-full text-xs font-bold bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Categoría:
                    </label>
                    <select
                      value={quickMasterCat}
                      onChange={(e) => setQuickMasterCat(e.target.value)}
                      className="w-full text-xs bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-slate-900"
                    >
                      {ingredientCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.icon} {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Unidad base:
                    </label>
                    <select
                      value={quickMasterUnit}
                      onChange={(e) => setQuickMasterUnit(e.target.value as any)}
                      className="w-full text-xs bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-slate-900"
                    >
                      <option value="kg">kg (kilogramos)</option>
                      <option value="g">g (gramos)</option>
                      <option value="L">L (litros)</option>
                      <option value="ml">ml (mililitros)</option>
                      <option value="u">u (unidades)</option>
                      <option value="paquetes">paquetes</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSaveQuickMaster}
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-xs"
                  >
                    Guardar y Usar en Receta
                  </button>
                </div>
              </div>
            )}

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 min-w-[200px]">Insumo Maestro (Desplegable)</th>
                    <th className="py-2.5 px-3 min-w-[140px]">Categoría</th>
                    <th className="py-2.5 px-3 text-right min-w-[110px]">Cantidad Base</th>
                    <th className="py-2.5 px-3 min-w-[100px]">Unidad</th>
                    <th className="py-2.5 px-3 text-center w-12">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ingredients.map((ing, idx) => {
                    const isKnownInMaster = masterIngredients.some(
                      (m) => m.name.toLowerCase().trim() === ing.name.toLowerCase().trim()
                    );

                    return (
                      <tr key={ing.id || idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3">
                          <select
                            value={ing.name}
                            onChange={(e) => handleSelectMasterIngredient(idx, e.target.value)}
                            className="w-full text-xs font-bold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:ring-2 focus:ring-amber-500"
                          >
                            <option value="__NEW__">➕ + Crear Nuevo Insumo Maestro...</option>
                            {!isKnownInMaster && (
                              <option value={ing.name}>⚠️ {ing.name} (No catalogado)</option>
                            )}
                            <optgroup label="── Insumos Maestros ──">
                              {masterIngredients
                                .slice()
                                .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))
                                .map((m) => {
                                  const cat = ingredientCategories.find((c) => c.id === m.categoryId);
                                  return (
                                    <option key={m.id} value={m.name}>
                                      {cat?.icon || '📦'} {m.name} ({m.defaultUnit})
                                    </option>
                                  );
                                })}
                            </optgroup>
                          </select>
                        </td>

                        <td className="py-2 px-3">
                          <select
                            value={ing.category}
                            onChange={(e) => handleUpdateIngredient(idx, 'category', e.target.value)}
                            className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1.5 text-slate-700"
                          >
                            {ingredientCategories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.icon} {c.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={ing.amountGrams}
                            onChange={(e) => handleUpdateIngredient(idx, 'amountGrams', Number(e.target.value))}
                            className="w-24 text-right text-xs font-bold bg-white border border-slate-200 rounded px-2 py-1.5 text-slate-900"
                            required
                          />
                        </td>

                        <td className="py-2 px-3">
                          <select
                            value={ing.unit || 'g'}
                            onChange={(e) => handleUpdateIngredient(idx, 'unit', e.target.value)}
                            className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1.5 text-slate-700"
                          >
                            <option value="kg">kg (gramos base)</option>
                            <option value="g">g</option>
                            <option value="L">L (ml base)</option>
                            <option value="ml">ml</option>
                            <option value="u">unidades</option>
                            <option value="paquetes">paquetes</option>
                          </select>
                        </td>

                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveIngredient(idx)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                            title="Eliminar insumo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 6: Packaging Items - Separate Table */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-indigo-600" />
                  6. Insumos de Empaque & Descartables ({packaging.length})
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Tabla separada para materiales de embalaje, fraccionamiento y rotulado del lote base (100%).
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddPackaging}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Insumo Empaque</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 min-w-[200px]">Insumo de Empaque / Material</th>
                    <th className="py-2.5 px-3 min-w-[130px]">Tipo de Empaque</th>
                    <th className="py-2.5 px-3 text-right min-w-[110px]">Cantidad Base</th>
                    <th className="py-2.5 px-3 min-w-[180px]">Descripción / Notas</th>
                    <th className="py-2.5 px-3 text-center w-12">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {packaging.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 px-3 text-center text-slate-400 italic">
                        No hay insumos de empaque configurados para esta receta. Hacé clic en "Agregar Insumo Empaque" para añadir bolsas, etiquetas o folex.
                      </td>
                    </tr>
                  ) : (
                    packaging.map((pkg, idx) => (
                      <tr key={pkg.id || idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={pkg.name}
                            onChange={(e) => handleUpdatePackaging(idx, 'name', e.target.value)}
                            className="w-full text-xs font-bold bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:ring-2 focus:ring-indigo-500"
                            placeholder="Ej: Bolsa Termosellable 20x30, Etiqueta Frontal..."
                            required
                          />
                        </td>

                        <td className="py-2 px-3">
                          <select
                            value={pkg.type}
                            onChange={(e) => handleUpdatePackaging(idx, 'type', e.target.value)}
                            className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1.5 text-slate-700"
                          >
                            <option value="bolsa">📦 Bolsa</option>
                            <option value="etiqueta">🏷️ Etiqueta</option>
                            <option value="folex">📄 Folex separador</option>
                            <option value="bandeja">🍱 Bandeja</option>
                            <option value="caja">📦 Caja de cartón</option>
                            <option value="pote">🥣 Pote plástico</option>
                          </select>
                        </td>

                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            min="1"
                            value={pkg.baseQuantity}
                            onChange={(e) => handleUpdatePackaging(idx, 'baseQuantity', Math.max(1, Number(e.target.value) || 1))}
                            className="w-24 text-right text-xs font-bold bg-white border border-slate-200 rounded px-2 py-1.5 text-indigo-900"
                            required
                          />
                        </td>

                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={pkg.description || ''}
                            onChange={(e) => handleUpdatePackaging(idx, 'description', e.target.value)}
                            className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1.5 text-slate-700"
                            placeholder="Detalle o uso (opcional)"
                          />
                        </td>

                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemovePackaging(idx)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                            title="Eliminar insumo de empaque"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="sticky bottom-0 bg-white border-t border-slate-200 pt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all"
            >
              {isNew ? <Plus className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{isNew ? 'Guardar y Crear Receta' : 'Guardar Ficha Técnica'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
