import React from 'react';
import { 
  ChefHat, 
  Snowflake, 
  CalendarDays, 
  ShoppingCart, 
  FileSpreadsheet,
  Plus,
  Cloud,
  Database,
  Layers,
  LogOut,
  User
} from 'lucide-react';
import { ActiveBatch } from '../types';

export type MainTabType = 'calendar' | 'recipes' | 'shopping';

interface NavbarProps {
  currentTab: MainTabType;
  setCurrentTab: (tab: MainTabType) => void;
  activeBatches: ActiveBatch[];
  f1Percent: number;
  f2Percent: number;
  onOpenQuickBatch: () => void;
  onOpenMasterCatalog?: () => void;
  isCloudSynced?: boolean;
  currentUser?: string | null;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  activeBatches,
  f1Percent,
  f2Percent,
  onOpenQuickBatch,
  onOpenMasterCatalog,
  isCloudSynced = true,
  currentUser = 'vagone',
  onLogout,
}) => {
  return (
    <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-md border-b border-slate-800">
      {/* Top industrial banner */}
      <div className="w-[98%] mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentTab('calendar')}>
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-md shadow-amber-500/20">
              <ChefHat className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white">Planificador Vagone</span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Control de Producción
                </span>
                {/* Cloud Database Badge */}
                <span 
                  className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isCloudSynced
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                      : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                  }`}
                  title="Toda la información se guarda y sincroniza en tiempo real en la nube (Firebase Firestore) para que accedas desde cualquier PC o celular."
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <Cloud className="w-3 h-3" />
                  <span>Nube Conectada</span>
                </span>
              </div>
              <p className="text-xs text-slate-400">Planificación Semanal, Recetas e Insumos Fábrica Vagone</p>
            </div>
          </div>

          {/* Freezer Quick Status & Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {/* F1 meter */}
            <div 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs ${
                f1Percent > 100
                  ? 'bg-rose-950/60 border-rose-500 text-rose-300'
                  : f1Percent >= 90
                  ? 'bg-amber-950/50 border-amber-500 text-amber-300'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300'
              }`}
            >
              <Snowflake className={`w-3.5 h-3.5 ${f1Percent >= 90 ? 'text-amber-400' : 'text-cyan-400'}`} />
              <div>
                <div className="flex items-center gap-1 text-[11px] font-semibold">
                  <span>Freezer 1:</span>
                  <span className="font-bold text-white">{f1Percent}%</span>
                </div>
                <div className="w-16 bg-slate-700 h-1 rounded-full overflow-hidden mt-0.5">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      f1Percent > 100 ? 'bg-rose-500' : f1Percent >= 90 ? 'bg-amber-400' : 'bg-cyan-400'
                    }`}
                    style={{ width: `${Math.min(100, f1Percent)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* F2 meter */}
            <div 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs ${
                f2Percent > 100
                  ? 'bg-rose-950/60 border-rose-500 text-rose-300'
                  : f2Percent >= 90
                  ? 'bg-amber-950/50 border-amber-500 text-amber-300'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300'
              }`}
            >
              <Snowflake className={`w-3.5 h-3.5 ${f2Percent >= 90 ? 'text-amber-400' : 'text-blue-400'}`} />
              <div>
                <div className="flex items-center gap-1 text-[11px] font-semibold">
                  <span>Freezer 2:</span>
                  <span className="font-bold text-white">{f2Percent}%</span>
                </div>
                <div className="w-16 bg-slate-700 h-1 rounded-full overflow-hidden mt-0.5">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      f2Percent > 100 ? 'bg-rose-500' : f2Percent >= 90 ? 'bg-amber-400' : 'bg-blue-400'
                    }`}
                    style={{ width: `${Math.min(100, f2Percent)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Master Catalog & Categories Button */}
            {onOpenMasterCatalog && (
              <button
                onClick={onOpenMasterCatalog}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-amber-300 transition-colors"
                title="Administrar Catálogo Maestro de Insumos y Categorías de Fábrica"
              >
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Catálogo e Insumos</span>
              </button>
            )}

            {/* Active Batches Indicator */}
            <button
              onClick={() => setCurrentTab('calendar')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors"
            >
              <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
              <span>{activeBatches.length} {activeBatches.length === 1 ? 'Lote' : 'Lotes'}</span>
            </button>

            {/* New Batch Quick Action */}
            <button
              onClick={onOpenQuickBatch}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Lote</span>
            </button>

            {/* User Session & Logout */}
            {onLogout && (
              <div className="flex items-center gap-1 pl-1 border-l border-slate-800">
                <div 
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300 font-medium"
                  title={`Sesión iniciada como ${currentUser || 'vagone'}`}
                >
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center text-[10px] font-black">
                    V
                  </div>
                  <span className="font-bold text-slate-200">{currentUser || 'vagone'}</span>
                </div>
                <button
                  onClick={onLogout}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/60 hover:border-rose-700/80 border border-slate-700 text-slate-400 hover:text-rose-200 transition-colors cursor-pointer"
                  title="Cerrar Sesión"
                  aria-label="Cerrar Sesión"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Clean Navigation Tabs */}
        <div className="flex items-center justify-between py-1.5 border-t border-slate-800/80">
          <div className="flex space-x-1 overflow-x-auto">
            <button
              onClick={() => setCurrentTab('calendar')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                currentTab === 'calendar'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>Calendario de Planificación</span>
              {activeBatches.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  currentTab === 'calendar' ? 'bg-slate-950 text-amber-400' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {activeBatches.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setCurrentTab('recipes')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                currentTab === 'recipes'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Recetas y Fichas Técnicas</span>
            </button>

            <button
              onClick={() => setCurrentTab('shopping')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                currentTab === 'shopping'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Lista de Compras / Insumos</span>
            </button>
          </div>

          {/* Mobile logout action */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="md:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-rose-300 text-xs font-medium border border-slate-700"
              title="Cerrar Sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="text-[11px]">Salir</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
