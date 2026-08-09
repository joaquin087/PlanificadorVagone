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
  Activity
} from 'lucide-react';
import { Recipe, Ingredient, PackagingItem } from '../types';
import { formatDuration } from '../utils/calculations';

interface RecipeEditModalProps {
  recipe: Recipe;
  onClose: () => void;
  onSave: (updatedRecipe: Recipe) => void;
}

export const RecipeEditModal: React.FC<RecipeEditModalProps> = ({
  recipe,
  onClose,
  onSave,
}) => {
  // Form State
  const [name, setName] = useState(recipe.name);
  const [subtitle, setSubtitle] = useState(recipe.subtitle);
  const [baseYieldUnits, setBaseYieldUnits] = useState(recipe.baseYieldUnits);
  const [yieldUnitName, setYieldUnitName] = useState(recipe.yieldUnitName);
  
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

  // New Ingredient Row helper
  const handleAddIngredient = () => {
    const newIng: Ingredient = {
      id: `ing-${Date.now()}`,
      name: 'Nuevo Insumo',
      amountGrams: 1000,
      unit: 'kg',
      category: 'otros',
      notes: '',
    };
    setIngredients([...ingredients, newIng]);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const f1Pct = Math.max(0, Math.min(100, Number(f1Percent) || 0));
    const f2Pct = Math.max(0, Math.min(100, Number(f2Percent) || 0));

    const f1Text = f1Pct > 0 ? `${f1Pct}%` : 'Libre';
    const f2Text = f2Pct > 0 ? `${f2Pct}%` : 'Libre';

    const updated: Recipe = {
      ...recipe,
      name: name.trim(),
      subtitle: subtitle.trim(),
      baseYieldUnits: validYieldUnits,
      yieldUnitName: yieldUnitName.trim() || 'unidades',
      baseMinutes: validBaseMinutes,
      baseHours: validBaseHours,
      prepMinutes: validPrepMinutes,
      freezerRule: {
        ...recipe.freezerRule,
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
              <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${recipe.badgeBg}`}>
                {recipe.badgeText}
              </span>
              <h2 className="text-lg font-bold text-slate-900">Editar Ficha Técnica Normalizada</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Configuración en minutos exactos, rendimiento base (100%), insumos y ocupación de freezers.
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
                  className="w-full text-xs font-bold bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Subtítulo / Descripción:</label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
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
                  Ejemplos: 112 bandejas (Canelones), 400 potes (Postres), 3.000 chipas, 176 docenas (Pastas).
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre de Unidad (Ej: bandejas, potes, chipas, docenas):</label>
                <input
                  type="text"
                  value={yieldUnitName}
                  onChange={(e) => setYieldUnitName(e.target.value)}
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

          {/* Section 4: Ingredients List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-amber-600" />
                4. Fórmula de Insumos & Ingredientes Base ({ingredients.length})
              </h3>

              <button
                type="button"
                onClick={handleAddIngredient}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Insumo</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Ingrediente / Insumo</th>
                    <th className="py-2.5 px-3">Categoría</th>
                    <th className="py-2.5 px-3 text-right">Cantidad Base</th>
                    <th className="py-2.5 px-3">Unidad</th>
                    <th className="py-2.5 px-3 text-center w-12">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ingredients.map((ing, idx) => (
                    <tr key={ing.id || idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={ing.name}
                          onChange={(e) => handleUpdateIngredient(idx, 'name', e.target.value)}
                          className="w-full text-xs font-semibold bg-white border border-slate-200 rounded px-2 py-1 text-slate-900"
                          placeholder="Nombre del insumo"
                          required
                        />
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={ing.category}
                          onChange={(e) => handleUpdateIngredient(idx, 'category', e.target.value)}
                          className="text-xs bg-white border border-slate-200 rounded px-2 py-1 text-slate-700"
                        >
                          <option value="lacteos">Lácteos / Quesos</option>
                          <option value="harinas_feculas">Harinas / Féculas</option>
                          <option value="frescos_verduras">Verduras / Frescos</option>
                          <option value="huevos">Huevos</option>
                          <option value="grasas_liquidos">Grasas / Líquidos</option>
                          <option value="especias_condimentos">Especias / Condimentos</option>
                          <option value="otros">Otros Insumos</option>
                        </select>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={ing.amountGrams}
                          onChange={(e) => handleUpdateIngredient(idx, 'amountGrams', Number(e.target.value))}
                          className="w-24 text-right text-xs font-bold bg-white border border-slate-200 rounded px-2 py-1 text-slate-900"
                          required
                        />
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={ing.unit || 'g'}
                          onChange={(e) => handleUpdateIngredient(idx, 'unit', e.target.value)}
                          className="text-xs bg-white border border-slate-200 rounded px-2 py-1 text-slate-700"
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
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                          title="Eliminar insumo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Packaging Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-slate-600" />
                4. Insumos de Empaque & Descartables ({packaging.length})
              </h3>

              <button
                type="button"
                onClick={handleAddPackaging}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Insumo Empaque</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {packaging.map((pkg, idx) => (
                <div key={pkg.id || idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={pkg.name}
                      onChange={(e) => handleUpdatePackaging(idx, 'name', e.target.value)}
                      className="text-xs font-bold bg-white border border-slate-200 rounded px-2 py-1 text-slate-900 flex-1"
                      placeholder="Nombre del envase / bolsa"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePackaging(idx)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <span className="text-[10px] text-slate-500 block">Cantidad Base:</span>
                      <input
                        type="number"
                        min="1"
                        value={pkg.baseQuantity}
                        onChange={(e) => handleUpdatePackaging(idx, 'baseQuantity', Number(e.target.value))}
                        className="w-full text-xs font-black bg-white border border-slate-200 rounded px-2 py-1 text-amber-800"
                      />
                    </div>

                    <div className="flex-1">
                      <span className="text-[10px] text-slate-500 block">Tipo:</span>
                      <select
                        value={pkg.type}
                        onChange={(e) => handleUpdatePackaging(idx, 'type', e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1 text-slate-700"
                      >
                        <option value="bolsa">Bolsa</option>
                        <option value="etiqueta">Etiqueta</option>
                        <option value="folex">Folex</option>
                        <option value="bandeja">Bandeja</option>
                        <option value="caja">Caja</option>
                        <option value="pote">Pote</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
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
              <Save className="w-4 h-4" />
              <span>Guardar Ficha Técnica</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
