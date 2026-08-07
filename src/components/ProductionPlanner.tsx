import React, { useState } from 'react';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Clock, 
  Snowflake, 
  CheckCircle2, 
  ArrowRight, 
  AlertTriangle, 
  Scale, 
  ShoppingCart, 
  FileSpreadsheet,
  ChevronRight,
  Filter
} from 'lucide-react';
import { Recipe, ActiveBatch } from '../types';
import { scaleRecipe } from '../utils/calculations';

interface ProductionPlannerProps {
  recipes: Recipe[];
  activeBatches: ActiveBatch[];
  onAddBatch: (batch: Partial<ActiveBatch>) => void;
  onUpdateBatchStatus: (batchId: string, status: ActiveBatch['status']) => void;
  onRemoveBatch: (batchId: string) => void;
  onNavigateTab: (tab: 'scaler' | 'shopping' | 'kitchen' | 'freezers') => void;
  onSelectBatchForKitchen: (batch: ActiveBatch) => void;
}

export const ProductionPlanner: React.FC<ProductionPlannerProps> = ({
  recipes,
  activeBatches,
  onAddBatch,
  onUpdateBatchStatus,
  onRemoveBatch,
  onNavigateTab,
  onSelectBatchForKitchen,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(recipes[0]?.id || 'tequenos');
  const [targetUnits, setTargetUnits] = useState<number>(1100);
  const [scheduledDate, setScheduledDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');

  const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId) || recipes[0];

  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipe) return;

    const scaled = scaleRecipe(selectedRecipe, targetUnits);

    onAddBatch({
      recipeId: selectedRecipe.id,
      recipeName: selectedRecipe.name,
      targetUnits,
      scheduledDate,
      status: 'planificado',
      notes,
      calculatedHours: scaled.estimatedHours,
      calculatedF1Percent: scaled.freezer.f1Percent,
      calculatedF2Percent: scaled.freezer.f2Percent,
      freezerAssigned: scaled.freezer.f2Percent > 0 ? 'AMBOS' : 'F1',
    });

    setShowAddModal(false);
    setNotes('');
  };

  // Filtered batches
  const filteredBatches = filterStatus === 'todos'
    ? activeBatches
    : activeBatches.filter((b) => b.status === filterStatus);

  const totalHours = activeBatches.reduce((acc, b) => acc + (b.calculatedHours || 0), 0);

  // Status mapping
  const statuses: { id: ActiveBatch['status']; label: string; color: string }[] = [
    { id: 'planificado', label: '1. Planificado', color: 'bg-slate-100 text-slate-700 border-slate-300' },
    { id: 'pesando', label: '2. Pesando', color: 'bg-amber-100 text-amber-900 border-amber-300' },
    { id: 'elaborando', label: '3. Elaborando', color: 'bg-orange-100 text-orange-900 border-orange-300' },
    { id: 'en_freezer', label: '4. En Freezer', color: 'bg-cyan-100 text-cyan-900 border-cyan-300' },
    { id: 'completado', label: '5. Completado', color: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Planificador de Turnos & Lotes de Fábrica</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Programa las tandas de producción, visualiza la carga horaria y controla el paso a paso hasta el congelado.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => onNavigateTab('shopping')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors"
          >
            <ShoppingCart className="w-4 h-4 text-slate-600" />
            <span>Ver Compras Consolidadas</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Lote de Producción</span>
          </button>
        </div>
      </div>

      {/* Metric summary bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Lotes Activos Programados</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{activeBatches.length}</span>
            <span className="text-xs text-slate-400">tandas en planta</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Tiempo Total Estimado</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600">{totalHours.toFixed(1)}</span>
            <span className="text-xs text-slate-400">horas hombre de trabajo</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Acceso Operarios</span>
          <p className="text-xs text-slate-600 mt-1">
            Usa el botón <strong>"Iniciar Pesaje"</strong> en cualquier lote para abrir la pantalla táctil de báscula.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterStatus('todos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              filterStatus === 'todos'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({activeBatches.length})
          </button>
          {statuses.map((st) => (
            <button
              key={st.id}
              onClick={() => setFilterStatus(st.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                filterStatus === st.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st.label} ({activeBatches.filter((b) => b.status === st.id).length})
            </button>
          ))}
        </div>
      </div>

      {/* Batches List */}
      {filteredBatches.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
          <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No hay lotes en esta categoría</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Crea una nueva orden de producción para calcular automáticamente los insumos consolidados y la ocupación de freezers.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-sm inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Planificar Primer Lote
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBatches.map((batch) => {
            const recipe = recipes.find((r) => r.id === batch.recipeId);
            const scaled = recipe ? scaleRecipe(recipe, batch.targetUnits) : null;

            return (
              <div
                key={batch.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                {/* Left details */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-base font-extrabold text-slate-900">
                      {batch.recipeName}
                    </span>
                    <span className="text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-0.5 rounded-full">
                      {batch.targetUnits.toLocaleString('es-AR')} {recipe?.yieldUnitName || 'unidades'}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {batch.calculatedHours}h estimadas
                    </span>
                  </div>

                  <p className="text-xs text-slate-500">
                    Fecha programada: <strong>{batch.scheduledDate}</strong> • Freezer asignado: F1 ({batch.calculatedF1Percent}%) {batch.calculatedF2Percent > 0 ? `+ F2 (${batch.calculatedF2Percent}%)` : ''}
                  </p>

                  {batch.notes && (
                    <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 max-w-xl">
                      Nota de planta: {batch.notes}
                    </p>
                  )}
                </div>

                {/* Pipeline State Selector */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                    {statuses.map((st) => (
                      <button
                        key={st.id}
                        onClick={() => onUpdateBatchStatus(batch.id, st.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          batch.status === st.id
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'text-slate-600 hover:bg-slate-200/70'
                        }`}
                      >
                        {st.id.replace('_', ' ')}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      onSelectBatchForKitchen(batch);
                      onNavigateTab('kitchen');
                    }}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Scale className="w-3.5 h-3.5 text-amber-400" />
                    <span>Iniciar Pesaje</span>
                  </button>

                  <button
                    onClick={() => onRemoveBatch(batch.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Eliminar lote"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create New Batch */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              Programar Nuevo Lote de Producción
            </h2>
            <p className="text-xs text-slate-500 mb-5">
              Ingresa la receta, la cantidad deseada y la fecha de elaboración.
            </p>

            <form onSubmit={handleCreateBatch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Producto a Elaborar:</label>
                <select
                  value={selectedRecipeId}
                  onChange={(e) => {
                    setSelectedRecipeId(e.target.value);
                    const r = recipes.find((item) => item.id === e.target.value);
                    if (r) setTargetUnits(r.baseYieldUnits);
                  }}
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900"
                >
                  {recipes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.baseYieldUnits} {r.yieldUnitName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cantidad a Producir ({selectedRecipe?.yieldUnitName}):
                </label>
                <input
                  type="number"
                  min="1"
                  value={targetUnits}
                  onChange={(e) => setTargetUnits(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full text-sm font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Fecha de Turno / Elaboración:</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notas / Observaciones del Lote:</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Usar queso Pategrás estacionado; preparar 88 bolsas chicas..."
                  rows={2}
                  className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl shadow-md"
                >
                  Guardar en el Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
