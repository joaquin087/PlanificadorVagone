import React, { useState, useEffect } from 'react';
import { 
  Scale, 
  Clock, 
  Snowflake, 
  Package, 
  AlertTriangle, 
  Plus, 
  Check, 
  Copy, 
  Printer, 
  Layers, 
  ArrowRight,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { Recipe, ActiveBatch } from '../types';
import { scaleRecipe, formatGrams, formatSimpleKg } from '../utils/calculations';

interface BatchScalerProps {
  recipes: Recipe[];
  initialRecipeId?: string;
  onAddToPlanner: (batch: Partial<ActiveBatch>) => void;
  onNavigateTab?: (tab: 'planner' | 'kitchen' | 'shopping') => void;
}

export const BatchScaler: React.FC<BatchScalerProps> = ({
  recipes,
  initialRecipeId,
  onAddToPlanner,
  onNavigateTab,
}) => {
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(
    initialRecipeId || recipes[0]?.id || 'tequenos'
  );

  const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId) || recipes[0];

  const [targetYield, setTargetYield] = useState<number>(
    selectedRecipe?.baseYieldUnits || 1000
  );

  const [selectedAlternatives, setSelectedAlternatives] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [addedNotification, setAddedNotification] = useState(false);

  // When recipe changes, reset yield to base yield
  useEffect(() => {
    if (selectedRecipe) {
      setTargetYield(selectedRecipe.baseYieldUnits);
      setSelectedAlternatives([]);
    }
  }, [selectedRecipeId]);

  if (!selectedRecipe) {
    return <div>No hay recetas disponibles</div>;
  }

  const scaled = scaleRecipe(selectedRecipe, targetYield, selectedAlternatives);

  const toggleAlternative = (ingId: string) => {
    setSelectedAlternatives((prev) =>
      prev.includes(ingId) ? prev.filter((id) => id !== ingId) : [...prev, ingId]
    );
  };

  const handleCopySummary = () => {
    let text = `📋 ORDEN DE PRODUCCIÓN - ${selectedRecipe.name.toUpperCase()}\n`;
    text += `🎯 Cantidad a producir: ${targetYield.toLocaleString('es-AR')} ${selectedRecipe.yieldUnitName}\n`;
    text += `⏱️ Tiempo estimado: ${scaled.estimatedHours} horas\n`;
    text += `❄️ Ocupación: F1 (${scaled.freezer.f1Percent}%) | F2 (${scaled.freezer.f2Percent}%)\n\n`;
    text += `⚖️ INGREDIENTES A PESAR:\n`;
    scaled.ingredients.forEach((ing) => {
      text += `• ${ing.name}: ${formatGrams(ing.scaledGrams, ing.unit)}\n`;
    });
    text += `\n📦 INSUMOS DE EMPAQUE:\n`;
    scaled.packaging.forEach((pkg) => {
      text += `• ${pkg.name}: ${pkg.scaledCount} unidades\n`;
    });
    if (scaled.warnings.length > 0) {
      text += `\n⚠️ ADVERTENCIAS:\n${scaled.warnings.join('\n')}\n`;
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleAddBatch = () => {
    onAddToPlanner({
      recipeId: selectedRecipe.id,
      recipeName: selectedRecipe.name,
      targetUnits: targetYield,
      selectedAlternativeIds: selectedAlternatives,
      scheduledDate: new Date().toISOString().split('T')[0],
      status: 'planificado',
      calculatedHours: scaled.estimatedHours,
      calculatedF1Percent: scaled.freezer.f1Percent,
      calculatedF2Percent: scaled.freezer.f2Percent,
      freezerAssigned: scaled.freezer.f2Percent > 0 ? 'AMBOS' : 'F1',
    });

    setAddedNotification(true);
    setTimeout(() => setAddedNotification(false), 3000);
  };

  // Recipe specific presets
  const getPresets = () => {
    const base = selectedRecipe.baseYieldUnits;
    if (selectedRecipe.id === 'canelones') {
      return [
        { label: '20 bandejas (120u)', value: 20 },
        { label: '⭐ 40 bandejas (Lote Óptimo)', value: 40 },
        { label: '60 bandejas (360u)', value: 60 },
        { label: '112 bandejas (Base 100% F1/F2)', value: 112 },
      ];
    }
    if (selectedRecipe.id === 'pasta-caprese') {
      return [
        { label: '20 bolsas (480u)', value: 480 },
        { label: '⭐ 40 bolsas (Lote Máx)', value: 960 },
        { label: '60 bolsas (1440u)', value: 1440 },
      ];
    }
    if (selectedRecipe.category === 'pastas') {
      return [
        { label: '44 bolsas x24 (1056u)', value: 1056 },
        { label: '88 bolsas x24 (Base 2112u)', value: 2112 },
        { label: '132 bolsas (3168u)', value: 3168 },
      ];
    }
    if (selectedRecipe.category === 'postres') {
      return [
        { label: '100 potes (0.25x)', value: 100 },
        { label: '200 potes (0.5x)', value: 200 },
        { label: '400 potes (Base 100% F1)', value: 400 },
        { label: '600 potes (1.5x)', value: 600 },
      ];
    }
    return [
      { label: `0.5x (${Math.round(base * 0.5)})`, value: Math.round(base * 0.5) },
      { label: `1.0x Base (${base})`, value: base },
      { label: `1.5x (${Math.round(base * 1.5)})`, value: Math.round(base * 1.5) },
      { label: `2.0x (${Math.round(base * 2)})`, value: Math.round(base * 2) },
    ];
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Calculadora & Escalador Dinámico de Lotes</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Modifica la cantidad de producción deseada para obtener al instante los ingredientes al gramo, insumos de empaque y ocupación precisa en Freezer 1 y Freezer 2.
          </p>
        </div>

        {/* Recipe Picker */}
        <div className="w-full md:w-72">
          <label className="block text-xs font-semibold text-slate-700 mb-1">Seleccionar Receta de Fábrica:</label>
          <select
            value={selectedRecipeId}
            onChange={(e) => setSelectedRecipeId(e.target.value)}
            className="w-full text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-amber-500 focus:outline-none"
          >
            {recipes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.baseYieldUnits} {r.yieldUnitName})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Target Yield Slider & Presets */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
              Paso 1: Definir Volumen de Producción
            </span>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">
              {selectedRecipe.name}
            </h2>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 font-medium">Cantidad deseada:</span>
            <input
              type="number"
              min="1"
              max="20000"
              value={targetYield}
              onChange={(e) => setTargetYield(Math.max(1, Number(e.target.value) || 1))}
              className="w-24 px-2 py-1 text-base font-black text-slate-900 bg-white border border-slate-300 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <span className="text-xs font-bold text-slate-700">{selectedRecipe.yieldUnitName}</span>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 font-medium mr-1">Preajustes rápidos:</span>
          {getPresets().map((preset, idx) => (
            <button
              key={idx}
              onClick={() => setTargetYield(preset.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                targetYield === preset.value
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
          <button
            onClick={() => setTargetYield(selectedRecipe.baseYieldUnits)}
            className="text-xs text-slate-500 hover:text-slate-900 underline ml-auto flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Restaurar Base ({selectedRecipe.baseYieldUnits})
          </button>
        </div>

        {/* Production Impact Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
          {/* Hours */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Tiempo de Elaboración</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{scaled.formattedDuration}</span>
              <span className="text-xs text-slate-500 font-bold">({scaled.estimatedHours} hs)</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Ritmo: <strong>{scaled.timeSpec.rateFormatted}</strong>
            </p>
          </div>

          {/* Freezer 1 */}
          <div className={`p-4 rounded-xl border ${
            scaled.freezer.f1Percent > 100
              ? 'bg-red-50 border-red-200 text-red-950'
              : scaled.freezer.f1Percent >= 90
              ? 'bg-amber-50 border-amber-200 text-amber-950'
              : 'bg-cyan-50/60 border-cyan-200 text-cyan-950'
          }`}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold">Ocupación Freezer 1</span>
              <Snowflake className="w-4 h-4 text-cyan-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black">{scaled.freezer.f1Percent}%</span>
              <span className="text-xs font-semibold">({scaled.freezer.f1Trays} / {scaled.freezer.f1MaxTrays} bandejas)</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-2">
              <div 
                className={`h-full rounded-full ${
                  scaled.freezer.f1Percent > 100 ? 'bg-red-500' : scaled.freezer.f1Percent >= 90 ? 'bg-amber-500' : 'bg-cyan-500'
                }`}
                style={{ width: `${Math.min(100, scaled.freezer.f1Percent)}%` }}
              />
            </div>
          </div>

          {/* Freezer 2 */}
          <div className={`p-4 rounded-xl border ${
            scaled.freezer.f2Percent > 100
              ? 'bg-red-50 border-red-200 text-red-950'
              : scaled.freezer.f2Percent >= 90
              ? 'bg-amber-50 border-amber-200 text-amber-950'
              : 'bg-blue-50/60 border-blue-200 text-blue-950'
          }`}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold">Ocupación Freezer 2</span>
              <Snowflake className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black">{scaled.freezer.f2Percent}%</span>
              <span className="text-xs font-semibold">({scaled.freezer.f2Trays} / {scaled.freezer.f2MaxTrays} bandejas)</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-2">
              <div 
                className={`h-full rounded-full ${
                  scaled.freezer.f2Percent > 100 ? 'bg-red-500' : scaled.freezer.f2Percent >= 90 ? 'bg-amber-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(100, scaled.freezer.f2Percent)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Warnings callout */}
        {scaled.warnings.length > 0 && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-red-800">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span>Advertencias para esta cantidad de lote:</span>
            </div>
            {scaled.warnings.map((warn, i) => (
              <p key={i} className="pl-6">• {warn}</p>
            ))}
          </div>
        )}
      </div>

      {/* Scaled Ingredients Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Scale className="w-4 h-4 text-amber-500" />
              Pesaje Exacto de Ingredientes ({scaled.ingredients.length} insumos)
            </h3>
            <p className="text-xs text-slate-500">Valores calculados proporcionalmente para {targetYield.toLocaleString('es-AR')} {selectedRecipe.yieldUnitName}.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySummary}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '¡Copiado!' : 'Copiar Orden'}</span>
            </button>
            <button
              onClick={handleAddBatch}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{addedNotification ? '✓ Agregado al Plan' : 'Agregar al Plan de Producción'}</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white font-semibold">
              <tr>
                <th className="py-3 px-4">Ingrediente / Insumo</th>
                <th className="py-3 px-4 text-right">Peso Total (Gramos / ml)</th>
                <th className="py-3 px-4 text-right">Formato Fábrica (Kg / L)</th>
                <th className="py-3 px-4 text-center">Variante / Alternativa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {scaled.ingredients.map((ing) => (
                <tr key={ing.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{ing.name}</div>
                    {ing.notes && <p className="text-[11px] text-slate-400 mt-0.5">{ing.notes}</p>}
                  </td>
                  <td className="py-3 px-4 text-right font-black text-slate-900">
                    {ing.unit === 'u' || ing.unit === 'paquetes'
                      ? `${Math.round(ing.scaledGrams)} ${ing.unit}`
                      : `${Math.round(ing.scaledGrams).toLocaleString('es-AR')} ${ing.unit === 'L' || ing.unit === 'ml' ? 'ml' : 'g'}`}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-amber-700">
                    {formatSimpleKg(ing.scaledGrams, ing.unit)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {ing.alternative ? (
                      <button
                        onClick={() => toggleAlternative(ing.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          ing.isAlternativeApplied
                            ? 'bg-amber-500 text-slate-950 shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        title={ing.alternative.description}
                      >
                        {ing.isAlternativeApplied ? '✓ Alternativa activa' : 'Cambiar a deshidratada/sustituto'}
                      </button>
                    ) : (
                      <span className="text-slate-300 text-[11px]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Packaging & Consumables Required */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
          <Package className="w-4 h-4 text-slate-600" />
          Insumos de Empaque Necesarios para este Lote
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {scaled.packaging.map((pkg) => (
            <div key={pkg.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 text-xs block">{pkg.name}</span>
                <span className="text-[11px] text-slate-500">{pkg.description}</span>
                {pkg.dimensions && (
                  <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-700 font-medium inline-block mt-1">
                    Medida: {pkg.dimensions}
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-slate-900">{pkg.scaledCount}</span>
                <span className="text-[10px] text-slate-500 block">unidades</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
