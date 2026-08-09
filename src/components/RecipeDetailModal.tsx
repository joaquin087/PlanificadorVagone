import React, { useState } from 'react';
import { 
  X, 
  Clock, 
  Snowflake, 
  Package, 
  Scale, 
  AlertTriangle, 
  FileText, 
  Layers, 
  CalendarDays,
  Edit3,
  Activity,
  Zap
} from 'lucide-react';
import { Recipe } from '../types';
import { formatGrams, getProductionTimeSpec } from '../utils/calculations';

interface RecipeDetailModalProps {
  recipe: Recipe | null;
  onClose: () => void;
  onEditRecipe: (recipe: Recipe) => void;
  onAddToPlanner: (recipe: Recipe) => void;
}

export const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({
  recipe,
  onClose,
  onEditRecipe,
  onAddToPlanner,
}) => {
  const [selectedAlternatives, setSelectedAlternatives] = useState<string[]>([]);

  if (!recipe) return null;

  const timeSpec = getProductionTimeSpec(recipe);

  const toggleAlternative = (ingId: string) => {
    setSelectedAlternatives((prev) =>
      prev.includes(ingId) ? prev.filter((id) => id !== ingId) : [...prev, ingId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${recipe.badgeBg}`}>
              {recipe.badgeText}
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{recipe.name}</h2>
              <p className="text-xs text-slate-500">{recipe.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 flex-1">
          {/* Quick specs pill bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[11px] text-slate-500 font-medium block">Rendimiento Base (100%)</span>
              <span className="text-sm font-bold text-slate-900">
                {recipe.baseYieldUnits.toLocaleString('es-AR')} {recipe.yieldUnitName}
              </span>
            </div>

            <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/80">
              <span className="text-[11px] text-amber-800 font-medium block">Tiempo Base (en Minutos)</span>
              <span className="text-sm font-black text-amber-950 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                {timeSpec.formattedDuration} ({timeSpec.baseMinutes} min)
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[11px] text-slate-500 font-medium block">Ocupación F1</span>
              <span className="text-sm font-bold text-cyan-900 flex items-center gap-1">
                <Snowflake className="w-3.5 h-3.5 text-cyan-600" />
                {recipe.freezerRule.f1Percent > 0 ? `${recipe.freezerRule.f1Percent}%` : 'Libre'}
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[11px] text-slate-500 font-medium block">Ocupación F2</span>
              <span className={`text-sm font-bold flex items-center gap-1 ${
                recipe.freezerRule.f2Percent === 0 ? 'text-slate-600' : 'text-blue-900'
              }`}>
                <Snowflake className="w-3.5 h-3.5 text-blue-500" />
                {recipe.freezerRule.f2Percent > 0 ? `${recipe.freezerRule.f2Percent}%` : 'Libre'}
              </span>
            </div>
          </div>

          {/* Time & Productivity Breakdown Banner */}
          <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold text-slate-900">Ritmo de Fabricación: </span>
                <span className="font-extrabold text-amber-800">{timeSpec.rateFormatted}</span>
                <span className="text-slate-500 ml-1.5">({timeSpec.workdayPercent}% de jornada de 8h)</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-slate-500 font-medium">Capacidad de línea:</span>
              <span className="font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                ~{Math.round((timeSpec.baseYieldUnits / timeSpec.baseMinutes) * 60)} {recipe.yieldUnitName} / hora
              </span>
            </div>
          </div>

          {/* Operational Warnings if applicable */}
          {recipe.freezerRule.criticalLimitWarning && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="font-bold">Límite Crítico de Almacenamiento:</strong>
                <p className="mt-0.5">{recipe.freezerRule.criticalLimitWarning}</p>
              </div>
            </div>
          )}

          {recipe.id === 'canelones' && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="font-bold">Recomendación de Lote Óptimo:</strong>
                <p className="mt-0.5">
                  Por ritmo de ventas, logística de producción y almacenamiento de frío, el lote recomendado es de <strong>40 bandejas</strong> (240 panqueques).
                </p>
              </div>
            </div>
          )}

          {/* Ingredients Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Scale className="w-4 h-4 text-amber-600" />
                Fórmula de Insumos & Ingredientes (Base: {recipe.baseYieldUnits} {recipe.yieldUnitName})
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                {recipe.ingredients.length} insumos totales
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3.5">Ingrediente / Insumo</th>
                    <th className="py-2.5 px-3.5 text-right">Cantidad Base</th>
                    <th className="py-2.5 px-3.5 text-right">Formato / Kg</th>
                    <th className="py-2.5 px-3.5 text-center">Variante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recipe.ingredients.map((ing) => {
                    const isAltApplied = selectedAlternatives.includes(ing.id);
                    const name = isAltApplied && ing.alternative ? ing.alternative.name : ing.name;
                    const amountGrams = isAltApplied && ing.alternative ? ing.alternative.amountGrams : ing.amountGrams;

                    return (
                      <tr key={ing.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3.5">
                          <div className="font-semibold text-slate-800">{name}</div>
                          {ing.notes && <p className="text-[11px] text-slate-400">{ing.notes}</p>}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-bold text-slate-900">
                          {ing.unit === 'u' || ing.unit === 'paquetes'
                            ? `${amountGrams} ${ing.unit}`
                            : `${amountGrams.toLocaleString('es-AR')} g`}
                        </td>
                        <td className="py-2.5 px-3.5 text-right text-slate-600 font-medium">
                          {formatGrams(amountGrams, ing.unit)}
                        </td>
                        <td className="py-2.5 px-3.5 text-center">
                          {ing.alternative ? (
                            <button
                              onClick={() => toggleAlternative(ing.id)}
                              className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                                isAltApplied
                                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                              title={ing.alternative.description}
                            >
                              {isAltApplied ? '✓ Alternativa' : 'Ver Alternativa'}
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Presentation & Packaging */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Presentation formats */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-slate-600" />
                Formatos de Presentación de Venta
              </h4>
              <ul className="space-y-2 text-xs text-slate-700">
                {recipe.presentationOptions.map((opt) => (
                  <li key={opt.id} className="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="font-semibold text-slate-900 block">{opt.label}</span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">{opt.packagingDescription}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Packaging consumables */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-slate-600" />
                  Insumos de Empaque / Descartables
                </h4>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  recipe.requiresNextDayPackaging
                    ? 'bg-indigo-50 text-indigo-900 border-indigo-200'
                    : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                }`}>
                  {recipe.requiresNextDayPackaging
                    ? `❄️ Empaque día siguiente (~${recipe.nextDayPackagingMinutes || 35} min)`
                    : '📦 Empaque en misma producción'}
                </span>
              </div>
              <ul className="space-y-2 text-xs text-slate-700">
                {recipe.packaging.map((pkg) => (
                  <li key={pkg.id} className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-900 block">{pkg.name}</span>
                      <span className="text-[11px] text-slate-500">{pkg.description}</span>
                    </div>
                    <span className="font-black text-xs text-slate-800 bg-slate-100 px-2 py-1 rounded">
                      {pkg.baseQuantity} u
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Operational Notes & Quality Control */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 mb-2">Notas Operativas & Puntos Críticos de Control (HACCP)</h4>
            <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-4 space-y-1.5">
              {recipe.operationalNotes.map((note, idx) => (
                <div key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                  <span className="text-amber-600 font-bold">•</span>
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Step-by-step preparation */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-slate-600" />
              Pasos de Elaboración en Fábrica
            </h4>
            <ol className="space-y-2 text-xs text-slate-700 list-decimal list-inside bg-slate-50 p-4 rounded-xl border border-slate-200">
              {recipe.preparationSteps.map((step, idx) => (
                <li key={idx} className="leading-relaxed pl-1">
                  <span className="text-slate-800">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 px-6 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cerrar Ficha
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onEditRecipe(recipe);
              }}
              className="px-4 py-2.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition-all flex items-center gap-1.5 border border-slate-300"
            >
              <Edit3 className="w-4 h-4 text-amber-600" />
              <span>Editar Ficha Técnica</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onAddToPlanner(recipe);
              }}
              className="px-5 py-2.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl transition-all shadow-md flex items-center gap-1.5 active:scale-95"
            >
              <CalendarDays className="w-4 h-4" />
              <span>Agregar a la Planificación</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
