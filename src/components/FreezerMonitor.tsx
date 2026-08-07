import React, { useState } from 'react';
import { 
  Snowflake, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Trash2, 
  Plus, 
  RefreshCw, 
  Info, 
  Flame,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { Recipe, ActiveBatch } from '../types';
import { scaleRecipe } from '../utils/calculations';

interface FreezerMonitorProps {
  recipes: Recipe[];
  activeBatches: ActiveBatch[];
  onUpdateBatchStatus: (batchId: string, status: ActiveBatch['status']) => void;
  onRemoveBatch: (batchId: string) => void;
  onNavigateTab: (tab: 'scaler' | 'planner') => void;
}

export const FreezerMonitor: React.FC<FreezerMonitorProps> = ({
  recipes,
  activeBatches,
  onUpdateBatchStatus,
  onRemoveBatch,
  onNavigateTab,
}) => {
  // Simulator state
  const [simRecipe1, setSimRecipe1] = useState<string>('tequenos');
  const [simYield1, setSimYield1] = useState<number>(1100);
  const [simRecipe2, setSimRecipe2] = useState<string>('chipa-comun');
  const [simYield2, setSimYield2] = useState<number>(3000);
  const [includeSim2, setIncludeSim2] = useState<boolean>(true);

  // Active batches in freezer
  const freezerBatches = activeBatches.filter(
    (b) => b.status === 'en_freezer' || b.status === 'elaborando' || b.status === 'pesando'
  );

  // Calculate actual total freezer occupation from active batches
  let totalF1TraysOccupied = 0;
  let totalF2TraysOccupied = 0;

  freezerBatches.forEach((batch) => {
    const r = recipes.find((item) => item.id === batch.recipeId);
    if (r) {
      const sc = scaleRecipe(r, batch.targetUnits, batch.selectedAlternativeIds);
      totalF1TraysOccupied += sc.freezer.f1Trays;
      totalF2TraysOccupied += sc.freezer.f2Trays;
    }
  });

  const f1Percent = Math.round((totalF1TraysOccupied / 10) * 100);
  const f2Percent = Math.round((totalF2TraysOccupied / 10) * 100);

  // Simulator calculation
  const r1 = recipes.find((r) => r.id === simRecipe1) || recipes[0];
  const sc1 = scaleRecipe(r1, simYield1);

  const r2 = recipes.find((r) => r.id === simRecipe2) || recipes[1];
  const sc2 = includeSim2 ? scaleRecipe(r2, simYield2) : null;

  const simF1Total = sc1.freezer.f1Trays + (sc2 ? sc2.freezer.f1Trays : 0);
  const simF2Total = sc1.freezer.f2Trays + (sc2 ? sc2.freezer.f2Trays : 0);

  const simF1Percent = Math.round((simF1Total / 10) * 100);
  const simF2Percent = Math.round((simF2Total / 10) * 100);

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold uppercase tracking-wider mb-2">
              <Snowflake className="w-3.5 h-3.5" /> Cámaras de Congelado Rápido (-18°C)
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Monitor de Ocupación de Freezers F1 & F2
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl mt-1">
              Control en tiempo real de las bandejas ocupadas por lote, detección de saturación y simulación de combinaciones de producción simultánea.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigateTab('planner')}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md active:scale-95"
            >
              Ir al Planificador
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Freezers Visualizer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* FREEZER 1 (F1) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center font-black">
                  F1
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Freezer 1 (Principal)</h2>
                  <p className="text-xs text-slate-500">Capacidad: 10 bandejas estándar / 11 pastas / 5 canelones</p>
                </div>
              </div>

              <div className="text-right">
                <span className={`text-2xl font-black ${
                  f1Percent > 100 ? 'text-red-600' : f1Percent >= 90 ? 'text-amber-600' : 'text-cyan-600'
                }`}>
                  {f1Percent}%
                </span>
                <span className="text-[11px] text-slate-500 block font-medium">
                  {totalF1TraysOccupied.toFixed(1)} / 10 bandejas
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-4">
              <div
                className={`h-full transition-all duration-500 ${
                  f1Percent > 100 ? 'bg-red-500' : f1Percent >= 90 ? 'bg-amber-500' : 'bg-cyan-500'
                }`}
                style={{ width: `${Math.min(100, f1Percent)}%` }}
              />
            </div>
          </div>

          {/* Tray visualizer (10 slots) */}
          <div className="p-6 space-y-4 flex-1">
            <span className="text-xs font-bold text-slate-700 block">
              Distribución de Bandejas en Freezer 1:
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {Array.from({ length: 10 }).map((_, index) => {
                const isOccupied = index < Math.ceil(totalF1TraysOccupied);
                return (
                  <div
                    key={index}
                    className={`h-20 rounded-xl border p-2 flex flex-col justify-between transition-all ${
                      isOccupied
                        ? 'bg-cyan-50 border-cyan-300 text-cyan-900 shadow-sm'
                        : 'bg-slate-50/60 border-dashed border-slate-200 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold">Bandeja #{index + 1}</span>
                      <Snowflake className={`w-3 h-3 ${isOccupied ? 'text-cyan-600' : 'text-slate-300'}`} />
                    </div>

                    <div className="text-center">
                      <span className={`text-[11px] font-extrabold ${isOccupied ? 'text-cyan-900' : 'text-slate-400'}`}>
                        {isOccupied ? 'OCUPADA' : 'DISPONIBLE'}
                      </span>
                    </div>

                    <div className="text-[9px] text-right opacity-70">
                      {isOccupied ? '❄️ Congelando' : 'Libre'}
                    </div>
                  </div>
                );
              })}
            </div>

            {f1Percent > 100 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span><strong>¡SOBRECARGA DE F1!</strong> La producción excede las 10 bandejas disponibles. Despachar o diferir lote.</span>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-600">
            F1 es el congelador de choque inicial donde entran siempre las primeras 10 bandejas de cada producto.
          </div>
        </div>

        {/* FREEZER 2 (F2) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black">
                  F2
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Freezer 2 (Secundario / Pulmón)</h2>
                  <p className="text-xs text-slate-500">Capacidad: 10 bandejas estándar / 11 pastas / 5 canelones</p>
                </div>
              </div>

              <div className="text-right">
                <span className={`text-2xl font-black ${
                  f2Percent > 100 ? 'text-red-600' : f2Percent >= 90 ? 'text-amber-600' : 'text-blue-600'
                }`}>
                  {f2Percent}%
                </span>
                <span className="text-[11px] text-slate-500 block font-medium">
                  {totalF2TraysOccupied.toFixed(1)} / 10 bandejas
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-4">
              <div
                className={`h-full transition-all duration-500 ${
                  f2Percent > 100 ? 'bg-red-500' : f2Percent >= 90 ? 'bg-amber-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(100, f2Percent)}%` }}
              />
            </div>
          </div>

          {/* Tray visualizer (10 slots) */}
          <div className="p-6 space-y-4 flex-1">
            <span className="text-xs font-bold text-slate-700 block">
              Distribución de Bandejas en Freezer 2:
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {Array.from({ length: 10 }).map((_, index) => {
                const isOccupied = index < Math.ceil(totalF2TraysOccupied);
                return (
                  <div
                    key={index}
                    className={`h-20 rounded-xl border p-2 flex flex-col justify-between transition-all ${
                      isOccupied
                        ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-sm'
                        : 'bg-slate-50/60 border-dashed border-slate-200 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold">Bandeja #{index + 1}</span>
                      <Snowflake className={`w-3 h-3 ${isOccupied ? 'text-blue-600' : 'text-slate-300'}`} />
                    </div>

                    <div className="text-center">
                      <span className={`text-[11px] font-extrabold ${isOccupied ? 'text-blue-900' : 'text-slate-400'}`}>
                        {isOccupied ? 'OCUPADA' : 'DISPONIBLE'}
                      </span>
                    </div>

                    <div className="text-[9px] text-right opacity-70">
                      {isOccupied ? '❄️ Pulmón' : 'Libre'}
                    </div>
                  </div>
                );
              })}
            </div>

            {f2Percent === 0 && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>Freezer 2 totalmente disponible</strong> para ingresar lotes complementarios de Chipa, Tequeños o Caprese.</span>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-600">
            F2 recibe el remanente (2 a 3 bandejas) de Tequeños/Chipas, o el 100% de Pastas JyQ/Verdura.
          </div>
        </div>
      </div>

      {/* Production Simulator: Can we produce X and Y simultaneously? */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-800 text-[11px] font-bold uppercase tracking-wider mb-1">
              <RefreshCw className="w-3 h-3" /> Simulador de Capacidad de Planta
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              ¿Podemos producir estos dos productos el mismo día?
            </h2>
            <p className="text-xs text-slate-500">
              Prueba combinaciones de lotes para verificar si saturan los freezers F1 y F2 antes de amasar.
            </p>
          </div>
        </div>

        {/* Simulator controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-slate-50 rounded-2xl border border-slate-200">
          {/* Product 1 */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-900 block">Producto 1:</label>
            <select
              value={simRecipe1}
              onChange={(e) => {
                setSimRecipe1(e.target.value);
                const rec = recipes.find((r) => r.id === e.target.value);
                if (rec) setSimYield1(rec.baseYieldUnits);
              }}
              className="w-full text-xs font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
            >
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Cantidad:</span>
              <input
                type="number"
                value={simYield1}
                onChange={(e) => setSimYield1(Math.max(1, Number(e.target.value)))}
                className="w-28 px-2.5 py-1 text-xs font-bold bg-white border border-slate-300 rounded-lg text-right"
              />
              <span className="text-xs text-slate-600 font-bold">{r1.yieldUnitName}</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Ocupa en F1: {sc1.freezer.f1Trays} bandejas ({sc1.freezer.f1Percent}%) | F2: {sc1.freezer.f2Trays} bandejas ({sc1.freezer.f2Percent}%)
            </p>
          </div>

          {/* Product 2 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900">Producto 2 (en paralelo):</label>
              <button
                onClick={() => setIncludeSim2(!includeSim2)}
                className={`text-[11px] font-bold px-2 py-0.5 rounded transition-all ${
                  includeSim2 ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {includeSim2 ? '✓ Incluido' : '+ Agregar Producto 2'}
              </button>
            </div>

            {includeSim2 && (
              <>
                <select
                  value={simRecipe2}
                  onChange={(e) => {
                    setSimRecipe2(e.target.value);
                    const rec = recipes.find((r) => r.id === e.target.value);
                    if (rec) setSimYield2(rec.baseYieldUnits);
                  }}
                  className="w-full text-xs font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                >
                  {recipes.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Cantidad:</span>
                  <input
                    type="number"
                    value={simYield2}
                    onChange={(e) => setSimYield2(Math.max(1, Number(e.target.value)))}
                    className="w-28 px-2.5 py-1 text-xs font-bold bg-white border border-slate-300 rounded-lg text-right"
                  />
                  <span className="text-xs text-slate-600 font-bold">{r2.yieldUnitName}</span>
                </div>
                {sc2 && (
                  <p className="text-[11px] text-slate-500">
                    Ocupa en F1: {sc2.freezer.f1Trays} bandejas ({sc2.freezer.f1Percent}%) | F2: {sc2.freezer.f2Trays} bandejas ({sc2.freezer.f2Percent}%)
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Simulation Outcome Card */}
        <div className={`p-6 rounded-2xl border transition-all ${
          simF1Percent > 100 || simF2Percent > 100
            ? 'bg-red-50 border-red-200 text-red-950'
            : simF1Percent >= 90 || simF2Percent >= 90
            ? 'bg-amber-50 border-amber-200 text-amber-950'
            : 'bg-emerald-50 border-emerald-200 text-emerald-950'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider block mb-1">
                Resultado de la Simulación de Frío:
              </span>
              <h3 className="text-lg font-black">
                {simF1Percent > 100 || simF2Percent > 100
                  ? '❌ SOBRECAPACIDAD: No entran ambos lotes juntos'
                  : '✅ FACTIBLE: Ambos lotes caben en planta'}
              </h3>
              <p className="text-xs mt-1">
                Ocupación resultante: <strong>Freezer 1: {simF1Percent}% ({simF1Total.toFixed(1)} / 10 bandejas)</strong> • <strong>Freezer 2: {simF2Percent}% ({simF2Total.toFixed(1)} / 10 bandejas)</strong>
              </p>
            </div>

            {simF1Percent > 100 || simF2Percent > 100 ? (
              <div className="text-xs bg-white/80 p-3 rounded-xl border border-red-200">
                <strong>Recomendación:</strong> Elaborar el primer producto por la mañana (7h), congelar 4h y traspasar/embolsar antes de cargar el segundo producto.
              </div>
            ) : (
              <div className="text-xs bg-white/80 p-3 rounded-xl border border-emerald-200">
                <strong>Plan recomendado:</strong> Se pueden amasar y estibar en paralelo distribuyendo las bandejas según el esquema F1 y F2.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rules Summary Reference Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-600" />
          Tabla Oficial de Ocupación por Receta Base
        </h3>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white font-semibold">
              <tr>
                <th className="py-3 px-4">Producto</th>
                <th className="py-3 px-4">Lote Base</th>
                <th className="py-3 px-4 text-center">Ocupación F1</th>
                <th className="py-3 px-4 text-center">Ocupación F2</th>
                <th className="py-3 px-4">Regla Operativa de Planta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recipes.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900">{r.name}</td>
                  <td className="py-3 px-4 text-slate-600">{r.baseYieldUnits} {r.yieldUnitName}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                      {r.freezerRule.f1TraysText}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`font-bold px-2 py-0.5 rounded border ${
                      r.freezerRule.f2Percent === 0
                        ? 'bg-slate-100 text-slate-600 border-slate-200'
                        : r.freezerRule.f2Percent >= 100
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {r.freezerRule.f2TraysText}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 text-[11px]">
                    {r.freezerRule.ruleNotes || 'Ocupación regular según bandejas.'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
