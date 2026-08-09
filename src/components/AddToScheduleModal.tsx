import React, { useState } from 'react';
import { 
  X, 
  CalendarDays, 
  Clock, 
  Snowflake, 
  Package, 
  Check, 
  Layers,
  Sparkles
} from 'lucide-react';
import { Recipe, ActiveBatch } from '../types';
import { scaleRecipe } from '../utils/calculations';
import { getMondayOfWeek, formatDateToISO } from '../utils/calendarHelpers';

interface AddToScheduleModalProps {
  recipe: Recipe;
  recipes: Recipe[];
  onClose: () => void;
  onAddBatch: (batchData: Partial<ActiveBatch>) => void;
  onNavigateToCalendar?: () => void;
}

export const AddToScheduleModal: React.FC<AddToScheduleModalProps> = ({
  recipe,
  recipes,
  onClose,
  onAddBatch,
  onNavigateToCalendar,
}) => {
  const monday = getMondayOfWeek(new Date());
  const weekdays = [
    { label: 'Lunes', offset: 0 },
    { label: 'Martes', offset: 1 },
    { label: 'Miércoles', offset: 2 },
    { label: 'Jueves', offset: 3 },
    { label: 'Viernes', offset: 4 },
  ].map((d) => {
    const dateObj = new Date(monday);
    dateObj.setDate(monday.getDate() + d.offset);
    return {
      ...d,
      dateStr: formatDateToISO(dateObj),
      dayNum: dateObj.getDate(),
    };
  });

  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(recipe.id);
  const [selectedDate, setSelectedDate] = useState<string>(weekdays[0].dateStr);
  const [percentage, setPercentage] = useState<number>(100);
  const [targetUnits, setTargetUnits] = useState<number>(recipe.baseYieldUnits);
  const [notes, setNotes] = useState<string>('');

  const currentRecipe = recipes.find((r) => r.id === selectedRecipeId) || recipe;

  // Handle recipe change
  const handleRecipeChange = (id: string) => {
    setSelectedRecipeId(id);
    const found = recipes.find((r) => r.id === id);
    if (found) {
      const units = Math.round(found.baseYieldUnits * (percentage / 100));
      setTargetUnits(units);
    }
  };

  // Handle preset percentage click
  const handlePercentageClick = (pct: number) => {
    setPercentage(pct);
    const units = Math.round(currentRecipe.baseYieldUnits * (pct / 100));
    setTargetUnits(units);
  };

  // Handle direct unit change
  const handleUnitsChange = (units: number) => {
    setTargetUnits(units);
    const pct = Math.round((units / currentRecipe.baseYieldUnits) * 100);
    setPercentage(pct);
  };

  const scaled = scaleRecipe(currentRecipe, targetUnits, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const isBothFreezers = scaled.freezer.f2Percent > 0;
    const freezerAssigned: ActiveBatch['freezerAssigned'] = isBothFreezers ? 'AMBOS' : 'F1';

    onAddBatch({
      recipeId: currentRecipe.id,
      recipeName: currentRecipe.name,
      targetUnits,
      scheduledDate: selectedDate,
      status: 'planificado',
      calculatedHours: scaled.estimatedHours,
      calculatedF1Percent: scaled.freezer.f1Percent,
      calculatedF2Percent: scaled.freezer.f2Percent,
      freezerAssigned,
      notes: notes.trim() || `Producción al ${percentage}% (${targetUnits.toLocaleString('es-AR')} ${currentRecipe.yieldUnitName})`,
    });

    onClose();
    if (onNavigateToCalendar) {
      onNavigateToCalendar();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Agregar a la Planificación</h2>
              <p className="text-xs text-slate-500">Selecciona el día y el volumen a elaborar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Producto a Producir:</label>
            <select
              value={selectedRecipeId}
              onChange={(e) => handleRecipeChange(e.target.value)}
              className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:border-amber-500"
            >
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} (Base 100%: {r.baseYieldUnits.toLocaleString('es-AR')} {r.yieldUnitName})
                </option>
              ))}
            </select>
          </div>

          {/* Weekday quick buttons */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Día de Producción en el Calendario:
            </label>
            <div className="grid grid-cols-5 gap-1.5 mb-2">
              {weekdays.map((w) => (
                <button
                  key={w.dateStr}
                  type="button"
                  onClick={() => setSelectedDate(w.dateStr)}
                  className={`py-2 rounded-xl text-center border transition-all ${
                    selectedDate === w.dateStr
                      ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-[10px] font-bold block opacity-80">{w.label}</span>
                  <span className="text-xs font-black">{w.dayNum}</span>
                </button>
              ))}
            </div>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700"
              required
            />
          </div>

          {/* Scale presets */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Escala de Producción:
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handlePercentageClick(pct)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                    percentage === pct
                      ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {pct}% {pct === 100 && '(Lote Completo)'}
                </button>
              ))}
            </div>
          </div>

          {/* Target units & live calculation */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Cantidad a Elaborar:
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  value={targetUnits}
                  onChange={(e) => handleUnitsChange(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full text-sm font-black bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 pr-16"
                  required
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">
                  {currentRecipe.yieldUnitName}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Porcentaje Exacto:</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={percentage}
                  onChange={(e) => handlePercentageClick(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full text-sm font-black bg-white border border-slate-300 rounded-xl px-3 py-2 text-amber-700"
                />
                <span className="font-bold text-slate-500 text-sm">%</span>
              </div>
            </div>
          </div>

          {/* Live Summary Preview */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-700">
              <span className="flex items-center gap-1 font-semibold">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Tiempo de producción: <strong>{scaled.formattedDuration} ({scaled.estimatedHours} hs)</strong>
              </span>
              <span className="flex items-center gap-1 font-semibold">
                <Snowflake className="w-3.5 h-3.5 text-cyan-600" />
                Ocupación de freezers: <strong>{scaled.freezer.totalFreezerOccupancyPercent}%</strong>
              </span>
            </div>

            <p className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200">
              ❄️ F1: {scaled.freezer.f1Percent}% | F2: {scaled.freezer.f2Percent > 0 ? `${scaled.freezer.f2Percent}%` : 'Libre'} ({scaled.freezer.trayDescription})
            </p>

            <div className="text-[10.5px] text-slate-500 flex items-center justify-between px-1">
              <span>Ritmo de planta: <strong>{scaled.timeSpec.rateFormatted}</strong></span>
              <span>Ocupación de turno: <strong>{Math.round((scaled.estimatedMinutes / 480) * 100)}% de 8h</strong></span>
            </div>

            {!['postres', 'canelones'].includes(currentRecipe.category) && (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200">
                <Package className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>Empaquetado reservado: <strong>35 min</strong> al inicio de la jornada siguiente.</span>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl shadow-md flex items-center gap-1.5 transition-all active:scale-95"
            >
              <CalendarDays className="w-4 h-4" />
              <span>Guardar en Calendario</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
