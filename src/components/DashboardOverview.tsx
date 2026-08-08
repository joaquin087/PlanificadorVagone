import React, { useState } from 'react';
import { 
  Snowflake, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  Plus, 
  Scale, 
  Package, 
  Calendar,
  Layers,
  ChevronRight,
  TrendingUp,
  Info
} from 'lucide-react';
import { Recipe, ActiveBatch } from '../types';
import { scaleRecipe } from '../utils/calculations';

interface DashboardOverviewProps {
  recipes: Recipe[];
  activeBatches: ActiveBatch[];
  f1Percent: number;
  f2Percent: number;
  onSelectRecipe: (recipe: Recipe) => void;
  onQuickScale: (recipe: Recipe) => void;
  onNavigateTab: (tab: 'calendar' | 'recipes' | 'scaler' | 'freezers' | 'planner' | 'shopping' | 'kitchen') => void;
  onOpenNewBatchModal: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  recipes,
  activeBatches,
  f1Percent,
  f2Percent,
  onSelectRecipe,
  onQuickScale,
  onNavigateTab,
  onOpenNewBatchModal,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');

  const filteredRecipes = selectedCategory === 'todos'
    ? recipes
    : recipes.filter((r) => r.category === selectedCategory);

  const totalHoursPlanned = activeBatches.reduce((acc, b) => acc + (b.calculatedHours || 0), 0);

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner / Summary Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white border border-slate-700/60 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold uppercase tracking-wider mb-3">
                <Sparkles className="w-3.5 h-3.5" /> Planta de Elaboración y Congelados
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Gestión de Producción & Capacidad de Frío
              </h1>
              <p className="text-slate-300 text-sm max-w-2xl mt-1">
                Fichas técnicas de 10 productos estándar, cálculo de ingredientes al gramo, control estricto de bandejas en Freezers F1 y F2, y consolidación de insumos.
              </p>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => onNavigateTab('calendar')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-amber-500/20 active:scale-95"
              >
                <Calendar className="w-4 h-4" />
                <span>Calendario Diario & Insumos</span>
              </button>
              <button
                onClick={() => onNavigateTab('scaler')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 font-medium text-sm transition-all shadow-sm active:scale-95"
              >
                <Scale className="w-4 h-4 text-amber-400" />
                <span>Calculadora Rápida</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-700/60">
            {/* Metric 1 */}
            <div className="bg-slate-800/60 backdrop-blur rounded-xl p-4 border border-slate-700/50">
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>Catálogo de Recetas</span>
                <Layers className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">{recipes.length}</span>
                <span className="text-xs text-slate-400">productos</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Tequeños, Chipas, Pastas, Postres</p>
            </div>

            {/* Metric 2: Freezer 1 */}
            <div 
              onClick={() => onNavigateTab('freezers')}
              className="bg-slate-800/60 backdrop-blur rounded-xl p-4 border border-slate-700/50 cursor-pointer hover:border-slate-500 transition-colors"
            >
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>Ocupación Freezer 1</span>
                <Snowflake className={`w-4 h-4 ${f1Percent >= 90 ? 'text-amber-400' : 'text-cyan-400'}`} />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`text-2xl font-black ${f1Percent > 100 ? 'text-red-400' : f1Percent >= 90 ? 'text-amber-400' : 'text-white'}`}>
                  {f1Percent}%
                </span>
                <span className="text-xs text-slate-400">
                  {f1Percent > 100 ? '¡Excedido!' : f1Percent >= 100 ? '10/10 Completo' : 'Capacidad disponible'}
                </span>
              </div>
              <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden mt-2">
                <div 
                  className={`h-full rounded-full ${f1Percent > 100 ? 'bg-red-500' : f1Percent >= 90 ? 'bg-amber-400' : 'bg-cyan-400'}`}
                  style={{ width: `${Math.min(100, f1Percent)}%` }}
                />
              </div>
            </div>

            {/* Metric 3: Freezer 2 */}
            <div 
              onClick={() => onNavigateTab('freezers')}
              className="bg-slate-800/60 backdrop-blur rounded-xl p-4 border border-slate-700/50 cursor-pointer hover:border-slate-500 transition-colors"
            >
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>Ocupación Freezer 2</span>
                <Snowflake className={`w-4 h-4 ${f2Percent >= 90 ? 'text-amber-400' : 'text-blue-400'}`} />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`text-2xl font-black ${f2Percent > 100 ? 'text-red-400' : f2Percent >= 90 ? 'text-amber-400' : 'text-white'}`}>
                  {f2Percent}%
                </span>
                <span className="text-xs text-slate-400">
                  {f2Percent === 0 ? 'Totalmente LIBRE' : f2Percent <= 25 ? 'Baja ocupación' : 'Ocupado'}
                </span>
              </div>
              <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden mt-2">
                <div 
                  className={`h-full rounded-full ${f2Percent > 100 ? 'bg-red-500' : f2Percent >= 90 ? 'bg-amber-400' : 'bg-blue-400'}`}
                  style={{ width: `${Math.min(100, f2Percent)}%` }}
                />
              </div>
            </div>

            {/* Metric 4: Active Batches */}
            <div 
              onClick={() => onNavigateTab('planner')}
              className="bg-slate-800/60 backdrop-blur rounded-xl p-4 border border-slate-700/50 cursor-pointer hover:border-slate-500 transition-colors"
            >
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>Lotes en Plan</span>
                <Calendar className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">{activeBatches.length}</span>
                <span className="text-xs text-slate-400">activos</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{totalHoursPlanned.toFixed(1)} h estimadas</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Storage & Production Bottlenecks Banner */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2 bg-amber-500/20 text-amber-500 rounded-lg shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-amber-200">
              Reglas de Planta & Restricciones de Almacenamiento
            </h3>
            <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 space-y-1">
              <p>• <strong>Pastas JyQ y Pastas Verdura:</strong> Su lote estándar (88 bolsas de 24u) satura el 100% de F1 (11/11) y el 100% de F2 (11/11). No hacer más sin despacho previo.</p>
              <p>• <strong>Canelones:</strong> Se recomienda lote máx. de 40 bandejas por ritmo de venta, insumos (64 kg espinaca) y logística.</p>
              <p>• <strong>Caprese y Postres:</strong> Tienen tiempo reducido (4h / 7.5h) y dejan Freezer 2 libre para otras producciones en paralelo.</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => onNavigateTab('freezers')}
          className="whitespace-nowrap flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline shrink-0"
        >
          Ver Simulador de Freezers <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Category Tabs & Recipe Explorer */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Catálogo de Productos de Fábrica</h2>
            <p className="text-xs text-slate-500">Selecciona una receta para ver ficha completa, ajustar proporciones o calcular insumos.</p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { id: 'todos', label: 'Todos (10)' },
              { id: 'tequenos', label: 'Tequeños' },
              { id: 'chipas', label: 'Chipas (2)' },
              { id: 'pastas', label: 'Pastas (3)' },
              { id: 'canelones', label: 'Canelones' },
              { id: 'postres', label: 'Postres (3)' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Recipes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe) => {
            const baseScale = scaleRecipe(recipe, recipe.baseYieldUnits);

            return (
              <div
                key={recipe.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group hover:border-slate-300"
              >
                {/* Header */}
                <div className="p-5 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${recipe.badgeBg}`}>
                      {recipe.badgeText}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {recipe.baseHours}h estimadas
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                    {recipe.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {recipe.subtitle}
                  </p>
                </div>

                {/* Body Specs */}
                <div className="p-5 space-y-4 flex-1">
                  {/* Yield options */}
                  <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1.5 border border-slate-100">
                    <span className="font-semibold text-slate-700 block">Presentaciones estándar:</span>
                    {recipe.presentationOptions.map((opt) => (
                      <div key={opt.id} className="text-slate-600 flex items-center justify-between text-[11px]">
                        <span>• {opt.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Key ingredients count */}
                  <div className="text-xs text-slate-600 flex items-center justify-between">
                    <span className="text-slate-500">Insumos clave:</span>
                    <span className="font-medium text-slate-700">{recipe.ingredients.length} ingredientes</span>
                  </div>

                  {/* Packaging items */}
                  <div className="text-xs text-slate-600 flex items-center justify-between">
                    <span className="text-slate-500">Empaque:</span>
                    <span className="font-medium text-slate-700">
                      {recipe.packaging.map((p) => p.name).join(', ')}
                    </span>
                  </div>

                  {/* Freezer Footprint Meter */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-slate-700 flex items-center gap-1">
                        <Snowflake className="w-3.5 h-3.5 text-cyan-600" />
                        Ocupación Freezers
                      </span>
                      <span className="text-[11px] font-bold text-slate-800">
                        F1: {recipe.freezerRule.f1TraysText}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-cyan-50 text-cyan-900 px-2 py-1 rounded border border-cyan-200 text-center font-medium">
                        F1: {recipe.freezerRule.f1Percent}%
                      </div>
                      <div className={`px-2 py-1 rounded border text-center font-medium ${
                        recipe.freezerRule.f2Percent === 0 
                          ? 'bg-slate-100 text-slate-600 border-slate-200'
                          : recipe.freezerRule.f2Percent >= 100
                          ? 'bg-red-50 text-red-900 border-red-200'
                          : 'bg-blue-50 text-blue-900 border-blue-200'
                      }`}>
                        F2: {recipe.freezerRule.f2Percent === 0 ? '0% (Libre)' : `${recipe.freezerRule.f2Percent}%`}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => onSelectRecipe(recipe)}
                    className="flex-1 py-2 px-3 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 font-semibold text-xs transition-colors text-center"
                  >
                    Ver Ficha Técnica
                  </button>
                  <button
                    onClick={() => onQuickScale(recipe)}
                    className="py-2 px-3.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1 shadow-sm"
                  >
                    <Scale className="w-3.5 h-3.5" />
                    <span>Calcular</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Production Queue Section (if any batches planned) */}
      {activeBatches.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                Lotes en Plan de Producción Actual ({activeBatches.length})
              </h2>
              <p className="text-xs text-slate-500">Estado de avance de lotes programados y asignación a cámaras de frío.</p>
            </div>
            <button
              onClick={() => onNavigateTab('planner')}
              className="text-xs font-bold text-amber-600 hover:underline flex items-center gap-1"
            >
              Abrir Planificador Completo <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {activeBatches.map((batch) => (
              <div key={batch.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{batch.recipeName}</span>
                    <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium">
                      {batch.targetUnits.toLocaleString('es-AR')} unidades / bandejas
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Programado: {batch.scheduledDate} • Tiempo estimado: {batch.calculatedHours}h • Freezer: F1 ({batch.calculatedF1Percent}%) / F2 ({batch.calculatedF2Percent}%)
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                    batch.status === 'completado'
                      ? 'bg-emerald-100 text-emerald-800'
                      : batch.status === 'en_freezer'
                      ? 'bg-cyan-100 text-cyan-800'
                      : batch.status === 'elaborando'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-800'
                  }`}>
                    {batch.status === 'en_freezer' ? '❄️ En Freezer' : batch.status}
                  </span>
                  <button
                    onClick={() => onNavigateTab('kitchen')}
                    className="px-3 py-1 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    Guía de Pesaje
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
