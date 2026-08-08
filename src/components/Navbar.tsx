import React from 'react';
import { 
  ChefHat, 
  Layers, 
  Calculator, 
  Snowflake, 
  CalendarDays, 
  ShoppingCart, 
  Scale, 
  AlertTriangle,
  FileSpreadsheet,
  Plus
} from 'lucide-react';
import { ActiveBatch } from '../types';

interface NavbarProps {
  currentTab: 'dashboard' | 'calendar' | 'recipes' | 'scaler' | 'freezers' | 'planner' | 'shopping' | 'kitchen';
  setCurrentTab: (tab: 'dashboard' | 'calendar' | 'recipes' | 'scaler' | 'freezers' | 'planner' | 'shopping' | 'kitchen') => void;
  activeBatches: ActiveBatch[];
  f1Percent: number;
  f2Percent: number;
  onOpenQuickBatch: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  activeBatches,
  f1Percent,
  f2Percent,
  onOpenQuickBatch,
}) => {
  const isF1Full = f1Percent >= 100;
  const isF2Full = f2Percent >= 100;
  const hasFreezerAlert = isF1Full || isF2Full;

  return (
    <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-md border-b border-slate-800">
      {/* Top industrial banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentTab('dashboard')}>
            <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center shadow-md shadow-amber-500/20">
              <ChefHat className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">FABRI-PLAN</span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Control de Planta
                </span>
              </div>
              <p className="text-xs text-slate-400">Recetas, Insumos, Freezers F1/F2 y Lotes</p>
            </div>
          </div>

          {/* Freezer Quick Status & Indicators */}
          <div className="hidden md:flex items-center gap-4">
            {/* F1 meter */}
            <div 
              onClick={() => setCurrentTab('freezers')}
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
                f1Percent > 100
                  ? 'bg-red-950/60 border-red-500 text-red-300 shadow-sm shadow-red-500/20'
                  : f1Percent >= 90
                  ? 'bg-amber-950/50 border-amber-500 text-amber-300'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-600'
              }`}
              title="Click para ver detalle de Freezer 1"
            >
              <Snowflake className={`w-4 h-4 ${f1Percent >= 90 ? 'text-amber-400 animate-pulse' : 'text-cyan-400'}`} />
              <div>
                <div className="flex items-center gap-1.5 font-medium">
                  <span>Freezer 1 (F1):</span>
                  <span className="font-bold text-white">{f1Percent}%</span>
                </div>
                <div className="w-20 bg-slate-700 h-1.5 rounded-full overflow-hidden mt-0.5">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      f1Percent > 100 ? 'bg-red-500' : f1Percent >= 90 ? 'bg-amber-400' : 'bg-cyan-400'
                    }`}
                    style={{ width: `${Math.min(100, f1Percent)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* F2 meter */}
            <div 
              onClick={() => setCurrentTab('freezers')}
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
                f2Percent > 100
                  ? 'bg-red-950/60 border-red-500 text-red-300 shadow-sm shadow-red-500/20'
                  : f2Percent >= 90
                  ? 'bg-amber-950/50 border-amber-500 text-amber-300'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-600'
              }`}
              title="Click para ver detalle de Freezer 2"
            >
              <Snowflake className={`w-4 h-4 ${f2Percent >= 90 ? 'text-amber-400 animate-pulse' : 'text-blue-400'}`} />
              <div>
                <div className="flex items-center gap-1.5 font-medium">
                  <span>Freezer 2 (F2):</span>
                  <span className="font-bold text-white">{f2Percent}%</span>
                </div>
                <div className="w-20 bg-slate-700 h-1.5 rounded-full overflow-hidden mt-0.5">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      f2Percent > 100 ? 'bg-red-500' : f2Percent >= 90 ? 'bg-amber-400' : 'bg-blue-400'
                    }`}
                    style={{ width: `${Math.min(100, f2Percent)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Active Batches Button */}
            <button
              onClick={() => setCurrentTab('planner')}
              className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-colors"
            >
              <CalendarDays className="w-4 h-4 text-emerald-400" />
              <span>{activeBatches.length} {activeBatches.length === 1 ? 'Lote activo' : 'Lotes activos'}</span>
            </button>

            {/* New Batch Quick Action */}
            <button
              onClick={onOpenQuickBatch}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-all shadow-md hover:shadow-amber-500/20 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Lote</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 overflow-x-auto py-2 border-t border-slate-800/80 scrollbar-thin">
          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
              currentTab === 'dashboard'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            Panel General
          </button>

          <button
            onClick={() => setCurrentTab('calendar')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
              currentTab === 'calendar'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <CalendarDays className="w-4 h-4 text-amber-400" />
            <span>Calendario Diario & Insumos</span>
            {activeBatches.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                currentTab === 'calendar' ? 'bg-slate-950 text-amber-400' : 'bg-amber-500/20 text-amber-300'
              }`}>
                {activeBatches.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setCurrentTab('recipes')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
              currentTab === 'recipes'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Recetas y Fichas (10)
          </button>

          <button
            onClick={() => setCurrentTab('scaler')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
              currentTab === 'scaler'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Calculator className="w-4 h-4" />
            Calculadora / Escalador
          </button>

          <button
            onClick={() => setCurrentTab('freezers')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
              currentTab === 'freezers'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Snowflake className="w-4 h-4" />
            Monitor Freezers (F1 & F2)
            {hasFreezerAlert && (
              <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
            )}
          </button>

          <button
            onClick={() => setCurrentTab('planner')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
              currentTab === 'planner'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            Plan de Producción
            {activeBatches.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-slate-700 text-[10px] font-bold text-white">
                {activeBatches.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setCurrentTab('shopping')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
              currentTab === 'shopping'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            Lista de Compras / Insumos
          </button>

          <button
            onClick={() => setCurrentTab('kitchen')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
              currentTab === 'kitchen'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Scale className="w-4 h-4" />
            Guía de Pesaje (Operarios)
          </button>
        </div>
      </div>
    </header>
  );
};
