import React, { useState } from 'react';
import { 
  Scale, 
  CheckCircle2, 
  Clock, 
  Play, 
  Pause, 
  RotateCcw, 
  Snowflake, 
  Package, 
  FileText, 
  Sparkles,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { Recipe, ActiveBatch } from '../types';
import { scaleRecipe, formatGrams, formatSimpleKg } from '../utils/calculations';

interface KitchenWeighingGuideProps {
  recipes: Recipe[];
  activeBatches: ActiveBatch[];
  selectedBatch?: ActiveBatch | null;
  onUpdateBatchStatus?: (batchId: string, status: ActiveBatch['status']) => void;
  onNavigateTab: (tab: 'planner' | 'freezers') => void;
}

export const KitchenWeighingGuide: React.FC<KitchenWeighingGuideProps> = ({
  recipes,
  activeBatches,
  selectedBatch,
  onUpdateBatchStatus,
  onNavigateTab,
}) => {
  const [currentBatchId, setCurrentBatchId] = useState<string>(
    selectedBatch?.id || activeBatches[0]?.id || ''
  );
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});

  // Stopwatch state
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  React.useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const activeBatch = activeBatches.find((b) => b.id === currentBatchId) || activeBatches[0];
  const recipe = activeBatch ? recipes.find((r) => r.id === activeBatch.recipeId) : recipes[0];

  const scaled = recipe && activeBatch ? scaleRecipe(recipe, activeBatch.targetUnits, activeBatch.selectedAlternativeIds) : null;

  const toggleIngCheck = (ingId: string) => {
    setCheckedIngredients((prev) => ({ ...prev, [ingId]: !prev[ingId] }));
  };

  const toggleStepCheck = (stepIdx: number) => {
    setCompletedSteps((prev) => ({ ...prev, [stepIdx]: !prev[stepIdx] }));
  };

  const formatTimer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!recipe || !scaled) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-4">
        <Scale className="w-12 h-12 text-slate-400 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">No hay lote seleccionado para pesaje</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Crea un lote en el Planificador o selecciona uno existente para abrir la guía de cocina para operarios.
        </p>
        <button
          onClick={() => onNavigateTab('planner')}
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md"
        >
          Ir al Planificador
        </button>
      </div>
    );
  }

  const allIngredientsChecked = scaled.ingredients.every((ing) => checkedIngredients[ing.id]);

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner / Batch Selector */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold uppercase tracking-wider mb-2">
            <Scale className="w-3.5 h-3.5" /> Modo Operarios de Planta & Báscula
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Guía de Pesaje: {recipe.name}
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1">
            Lote actual: <strong>{activeBatch?.targetUnits.toLocaleString('es-AR')} {recipe.yieldUnitName}</strong> • Tiempo estimado: <strong>{scaled.estimatedHours} horas</strong>
          </p>
        </div>

        {/* Stopwatch & Batch Selector */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Active Batch Selector if multiple */}
          {activeBatches.length > 1 && (
            <select
              value={currentBatchId}
              onChange={(e) => {
                setCurrentBatchId(e.target.value);
                setCheckedIngredients({});
                setCompletedSteps({});
              }}
              className="bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-xl border border-slate-700 focus:outline-none"
            >
              {activeBatches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.recipeName} ({b.targetUnits} {recipe.yieldUnitName})
                </option>
              ))}
            </select>
          )}

          {/* Chronometer */}
          <div className="bg-slate-800 px-4 py-2 rounded-xl border border-slate-700 flex items-center gap-3">
            <div className="font-mono text-xl font-black text-amber-400">
              {formatTimer(timerSeconds)}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className="p-1.5 rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors"
                title={isTimerRunning ? 'Pausar' : 'Iniciar'}
              >
                {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => {
                  setIsTimerRunning(false);
                  setTimerSeconds(0);
                }}
                className="p-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                title="Reiniciar cronómetro"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Weighing Checklist with Big Typography */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Scale className="w-5 h-5 text-amber-500" />
              Paso 1: Pesaje y Preparación de Insumos ({scaled.ingredients.length})
            </h2>
            <p className="text-xs text-slate-500">Tildar cada ingrediente una vez pesado y dispuesto en mesas de trabajo.</p>
          </div>

          <div className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
            {Object.values(checkedIngredients).filter(Boolean).length} de {scaled.ingredients.length} listos
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scaled.ingredients.map((ing) => {
            const isChecked = !!checkedIngredients[ing.id];

            return (
              <div
                key={ing.id}
                onClick={() => toggleIngCheck(ing.id)}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-4 ${
                  isChecked
                    ? 'bg-emerald-50/70 border-emerald-500 text-emerald-950 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-amber-400 hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-all ${
                    isChecked
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-slate-300 bg-white'
                  }`}>
                    {isChecked && <CheckCircle2 className="w-5 h-5" />}
                  </div>
                  <div>
                    <span className="text-sm font-black text-slate-900 block">{ing.name}</span>
                    {ing.notes && <span className="text-xs text-slate-500">{ing.notes}</span>}
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-xl font-black block ${isChecked ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {formatSimpleKg(ing.scaledGrams, ing.unit)}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {Math.round(ing.scaledGrams).toLocaleString('es-AR')} {ing.unit === 'L' || ing.unit === 'ml' ? 'ml' : ing.unit === 'u' ? 'u' : 'g'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step by Step Preparation Guide */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
          <FileText className="w-5 h-5 text-slate-600" />
          Paso 2: Elaboración & Armado Continuo
        </h2>
        <p className="text-xs text-slate-500 mb-6">Sigue las instrucciones técnicas de fábrica en orden cronológico.</p>

        <div className="space-y-3">
          {recipe.preparationSteps.map((step, idx) => {
            const isDone = !!completedSteps[idx];

            return (
              <div
                key={idx}
                onClick={() => toggleStepCheck(idx)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-4 ${
                  isDone
                    ? 'bg-slate-50 border-slate-200 text-slate-400 line-through'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="font-mono text-xs font-bold px-2 py-1 rounded bg-slate-100 text-slate-700 shrink-0">
                  Paso {idx + 1}
                </span>
                <p className="text-xs font-medium text-slate-800 leading-relaxed flex-1">
                  {step}
                </p>
                <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                  isDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'
                }`}>
                  {isDone && <CheckCircle2 className="w-4 h-4" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 3: Freezer Placement & Packaging */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Freezer Placement Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 text-cyan-600 mb-3">
            <Snowflake className="w-5 h-5" />
            <h3 className="text-sm font-bold text-slate-900">Paso 3: Carga en Freezers F1 y F2</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-950">
              <span className="font-bold block mb-1">Freezer 1 (F1):</span>
              <p>Cargar {scaled.freezer.f1Trays} bandejas ({scaled.freezer.f1Percent}% de ocupación).</p>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-950">
              <span className="font-bold block mb-1">Freezer 2 (F2):</span>
              <p>
                {scaled.freezer.f2Percent === 0
                  ? 'Freezer 2 queda totalmente LIBRE para otras producciones.'
                  : `Cargar ${scaled.freezer.f2Trays} bandejas (${scaled.freezer.f2Percent}% de ocupación).`}
              </p>
            </div>
          </div>
        </div>

        {/* Packaging Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 text-amber-600 mb-3">
            <Package className="w-5 h-5" />
            <h3 className="text-sm font-bold text-slate-900">Paso 4: Empaque & Etiquetado</h3>
          </div>

          <ul className="space-y-2 text-xs text-slate-700">
            {scaled.packaging.map((pkg) => (
              <li key={pkg.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">{pkg.name}</span>
                  <span className="text-[11px] text-slate-500">{pkg.description}</span>
                </div>
                <span className="text-base font-black text-slate-900">{pkg.scaledCount} u</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
