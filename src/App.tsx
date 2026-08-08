import React, { useState, useEffect } from 'react';
import { 
  Navbar 
} from './components/Navbar';
import { 
  DashboardOverview 
} from './components/DashboardOverview';
import { 
  RecipeDetailModal 
} from './components/RecipeDetailModal';
import { 
  BatchScaler 
} from './components/BatchScaler';
import { 
  FreezerMonitor 
} from './components/FreezerMonitor';
import { 
  ProductionPlanner 
} from './components/ProductionPlanner';
import { 
  ShoppingListConsolidator 
} from './components/ShoppingListConsolidator';
import { 
  KitchenWeighingGuide 
} from './components/KitchenWeighingGuide';
import { 
  ProductionCalendar 
} from './components/ProductionCalendar';
import { 
  INITIAL_RECIPES 
} from './data/recipesData';
import { 
  Recipe, 
  ActiveBatch 
} from './types';
import { 
  scaleRecipe 
} from './utils/calculations';
import { 
  getMondayOfWeek, 
  formatDateToISO 
} from './utils/calendarHelpers';
import { 
  FileSpreadsheet, 
  Clock, 
  Snowflake, 
  Scale, 
  Plus 
} from 'lucide-react';

const STORAGE_KEY_BATCHES = 'fabriplan_active_batches_v2';

export default function App() {
  const [recipes] = useState<Recipe[]>(INITIAL_RECIPES);
  const [currentTab, setCurrentTab] = useState<
    'dashboard' | 'calendar' | 'recipes' | 'scaler' | 'freezers' | 'planner' | 'shopping' | 'kitchen'
  >('calendar');

  const [selectedRecipeDetail, setSelectedRecipeDetail] = useState<Recipe | null>(null);
  const [scalerInitialRecipeId, setScalerInitialRecipeId] = useState<string>('tequenos');
  const [selectedBatchForKitchen, setSelectedBatchForKitchen] = useState<ActiveBatch | null>(null);

  // Active production batches in state & local storage
  const [activeBatches, setActiveBatches] = useState<ActiveBatch[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BATCHES);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading batches from localStorage', e);
    }
    
    // Default realistic planned batches distributed throughout the current week
    const monday = getMondayOfWeek(new Date());
    const getOffsetDateStr = (days: number) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + days);
      return formatDateToISO(d);
    };

    return [
      {
        id: 'batch-mon',
        recipeId: 'tequenos',
        recipeName: 'Tequeños de Queso',
        targetUnits: 1100,
        selectedAlternativeIds: [],
        scheduledDate: getOffsetDateStr(0), // Lunes
        status: 'en_freezer',
        createdAt: new Date().toISOString(),
        calculatedHours: 7.0,
        calculatedF1Percent: 100,
        calculatedF2Percent: 20,
        freezerAssigned: 'AMBOS',
        notes: 'Producción al 100% (10 bandejas F1, 2 en F2)',
      },
      {
        id: 'batch-tue',
        recipeId: 'sorrentinos-jyq',
        recipeName: 'Sorrentinos Jamón y Queso',
        targetUnits: 1000,
        selectedAlternativeIds: [],
        scheduledDate: getOffsetDateStr(1), // Martes
        status: 'pesando',
        createdAt: new Date().toISOString(),
        calculatedHours: 7.0,
        calculatedF1Percent: 100,
        calculatedF2Percent: 0,
        freezerAssigned: 'F1',
        notes: 'Producción al 100% (10 bandejas completas)',
      },
      {
        id: 'batch-wed',
        recipeId: 'chipa-comun',
        recipeName: 'Chipa Común Tradicional',
        targetUnits: 2250,
        selectedAlternativeIds: [],
        scheduledDate: getOffsetDateStr(2), // Miércoles
        status: 'planificado',
        createdAt: new Date().toISOString(),
        calculatedHours: 5.3,
        calculatedF1Percent: 95,
        calculatedF2Percent: 0,
        freezerAssigned: 'F1',
        notes: 'Producción al 75% (2.250 u para empaque de 187 paq)',
      },
      {
        id: 'batch-thu',
        recipeId: 'canelones-acelga-pollo',
        recipeName: 'Canelones Acelga y Pollo',
        targetUnits: 400,
        selectedAlternativeIds: [],
        scheduledDate: getOffsetDateStr(3), // Jueves
        status: 'planificado',
        createdAt: new Date().toISOString(),
        calculatedHours: 6.0,
        calculatedF1Percent: 80,
        calculatedF2Percent: 0,
        freezerAssigned: 'F1',
        notes: 'Producción al 100% (100 cajas de 4 u)',
      },
      {
        id: 'batch-fri',
        recipeId: 'postre-chocotorta',
        recipeName: 'Postre Chocotorta Individual',
        targetUnits: 600,
        selectedAlternativeIds: [],
        scheduledDate: getOffsetDateStr(4), // Viernes
        status: 'planificado',
        createdAt: new Date().toISOString(),
        calculatedHours: 4.0,
        calculatedF1Percent: 70,
        calculatedF2Percent: 0,
        freezerAssigned: 'F1',
        notes: 'Producción al 100% (600 potes individuales)',
      },
    ];
  });

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_BATCHES, JSON.stringify(activeBatches));
    } catch (e) {
      console.error('Error saving batches', e);
    }
  }, [activeBatches]);

  // Compute live freezer occupancy
  let totalF1Trays = 0;
  let totalF2Trays = 0;

  activeBatches.forEach((batch) => {
    if (batch.status === 'en_freezer' || batch.status === 'elaborando' || batch.status === 'pesando') {
      const r = recipes.find((item) => item.id === batch.recipeId);
      if (r) {
        const sc = scaleRecipe(r, batch.targetUnits, batch.selectedAlternativeIds);
        totalF1Trays += sc.freezer.f1Trays;
        totalF2Trays += sc.freezer.f2Trays;
      }
    }
  });

  const f1Percent = Math.round((totalF1Trays / 10) * 100);
  const f2Percent = Math.round((totalF2Trays / 10) * 100);

  const handleAddBatch = (batchData: Partial<ActiveBatch>) => {
    const newBatch: ActiveBatch = {
      id: `batch-${Date.now()}`,
      recipeId: batchData.recipeId || recipes[0].id,
      recipeName: batchData.recipeName || recipes[0].name,
      targetUnits: batchData.targetUnits || 1000,
      selectedAlternativeIds: batchData.selectedAlternativeIds || [],
      scheduledDate: batchData.scheduledDate || new Date().toISOString().split('T')[0],
      status: batchData.status || 'planificado',
      createdAt: new Date().toISOString(),
      notes: batchData.notes || '',
      calculatedHours: batchData.calculatedHours || 7.0,
      calculatedF1Percent: batchData.calculatedF1Percent || 100,
      calculatedF2Percent: batchData.calculatedF2Percent || 0,
      freezerAssigned: batchData.freezerAssigned || 'F1',
    };

    setActiveBatches((prev) => [newBatch, ...prev]);
  };

  const handleUpdateBatchStatus = (batchId: string, status: ActiveBatch['status']) => {
    setActiveBatches((prev) =>
      prev.map((b) => (b.id === batchId ? { ...b, status } : b))
    );
  };

  const handleRemoveBatch = (batchId: string) => {
    setActiveBatches((prev) => prev.filter((b) => b.id !== batchId));
  };

  const handleQuickScale = (recipe: Recipe) => {
    setScalerInitialRecipeId(recipe.id);
    setCurrentTab('scaler');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans antialiased flex flex-col selection:bg-amber-500 selection:text-slate-950">
      {/* Top Industrial Navbar with Live Freezer Meters */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        activeBatches={activeBatches}
        f1Percent={f1Percent}
        f2Percent={f2Percent}
        onOpenQuickBatch={() => {
          setScalerInitialRecipeId(recipes[0].id);
          setCurrentTab('scaler');
        }}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {/* Tab 1: Dashboard Overview */}
        {currentTab === 'dashboard' && (
          <DashboardOverview
            recipes={recipes}
            activeBatches={activeBatches}
            f1Percent={f1Percent}
            f2Percent={f2Percent}
            onSelectRecipe={(r) => setSelectedRecipeDetail(r)}
            onQuickScale={handleQuickScale}
            onNavigateTab={(tab) => setCurrentTab(tab)}
            onOpenNewBatchModal={() => setCurrentTab('calendar')}
          />
        )}

        {/* Tab 1.5: Production Calendar & Daily Ingredients */}
        {currentTab === 'calendar' && (
          <ProductionCalendar
            recipes={recipes}
            activeBatches={activeBatches}
            onAddBatch={handleAddBatch}
            onUpdateBatchStatus={handleUpdateBatchStatus}
            onRemoveBatch={handleRemoveBatch}
            onNavigateTab={(tab) => setCurrentTab(tab)}
            onSelectBatchForKitchen={(b) => {
              setSelectedBatchForKitchen(b);
              setCurrentTab('kitchen');
            }}
          />
        )}

        {/* Tab 2: All Recipes Catalog */}
        {currentTab === 'recipes' && (
          <div className="space-y-6 pb-12">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <h1 className="text-xl font-bold text-slate-900">
                    Fichas Técnicas & Recetas de Fábrica (10 Productos)
                  </h1>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Consulta ingredientes exactos al gramo, tiempos de producción, insumos de empaque y reglas de frío.
                </p>
              </div>

              <button
                onClick={() => setCurrentTab('scaler')}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 self-start md:self-auto"
              >
                <Scale className="w-4 h-4" />
                <span>Calculadora / Escalar Lote</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recipes.map((recipe) => (
                <div
                  key={recipe.id}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${recipe.badgeBg}`}>
                        {recipe.badgeText}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        {recipe.baseHours}h
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900">{recipe.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">{recipe.subtitle}</p>

                    {/* Quick Ingredients list */}
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                      <span className="font-bold text-slate-700 block text-[11px]">Ingredientes Base:</span>
                      {recipe.ingredients.slice(0, 4).map((ing) => (
                        <div key={ing.id} className="flex items-center justify-between text-[11px]">
                          <span className="truncate max-w-[180px]">• {ing.name}</span>
                          <span className="font-semibold text-slate-900">
                            {ing.unit === 'u' || ing.unit === 'paquetes'
                              ? `${ing.amountGrams} ${ing.unit}`
                              : `${(ing.amountGrams / 1000).toFixed(1)} kg`}
                          </span>
                        </div>
                      ))}
                      {recipe.ingredients.length > 4 && (
                        <span className="text-[10px] text-slate-400 block pt-1">
                          + {recipe.ingredients.length - 4} insumos adicionales...
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2">
                    <button
                      onClick={() => setSelectedRecipeDetail(recipe)}
                      className="flex-1 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-center"
                    >
                      Ver Ficha Técnica
                    </button>
                    <button
                      onClick={() => handleQuickScale(recipe)}
                      className="p-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl transition-colors shadow-sm"
                      title="Calcular / Escalar"
                    >
                      <Scale className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Batch Scaler & Calculator */}
        {currentTab === 'scaler' && (
          <BatchScaler
            recipes={recipes}
            initialRecipeId={scalerInitialRecipeId}
            onAddToPlanner={handleAddBatch}
            onNavigateTab={(tab) => setCurrentTab(tab)}
          />
        )}

        {/* Tab 4: Freezer Monitor */}
        {currentTab === 'freezers' && (
          <FreezerMonitor
            recipes={recipes}
            activeBatches={activeBatches}
            onUpdateBatchStatus={handleUpdateBatchStatus}
            onRemoveBatch={handleRemoveBatch}
            onNavigateTab={(tab) => setCurrentTab(tab)}
          />
        )}

        {/* Tab 5: Production Planner */}
        {currentTab === 'planner' && (
          <ProductionPlanner
            recipes={recipes}
            activeBatches={activeBatches}
            onAddBatch={handleAddBatch}
            onUpdateBatchStatus={handleUpdateBatchStatus}
            onRemoveBatch={handleRemoveBatch}
            onNavigateTab={(tab) => setCurrentTab(tab)}
            onSelectBatchForKitchen={(b) => {
              setSelectedBatchForKitchen(b);
              setCurrentTab('kitchen');
            }}
          />
        )}

        {/* Tab 6: Consolidated Shopping List */}
        {currentTab === 'shopping' && (
          <ShoppingListConsolidator
            recipes={recipes}
            activeBatches={activeBatches}
            onNavigateTab={(tab) => setCurrentTab(tab)}
          />
        )}

        {/* Tab 7: Kitchen Weighing Guide for Factory Operators */}
        {currentTab === 'kitchen' && (
          <KitchenWeighingGuide
            recipes={recipes}
            activeBatches={activeBatches}
            selectedBatch={selectedBatchForKitchen}
            onUpdateBatchStatus={handleUpdateBatchStatus}
            onNavigateTab={(tab) => setCurrentTab(tab)}
          />
        )}
      </main>

      {/* Technical Sheet Modal */}
      {selectedRecipeDetail && (
        <RecipeDetailModal
          recipe={selectedRecipeDetail}
          onClose={() => setSelectedRecipeDetail(null)}
          onOpenScaler={(r) => {
            setSelectedRecipeDetail(null);
            handleQuickScale(r);
          }}
          onAddToPlanner={(r) => {
            handleAddBatch({
              recipeId: r.id,
              recipeName: r.name,
              targetUnits: r.baseYieldUnits,
              scheduledDate: new Date().toISOString().split('T')[0],
              status: 'planificado',
              calculatedHours: r.baseHours,
              calculatedF1Percent: r.freezerRule.f1Percent,
              calculatedF2Percent: r.freezerRule.f2Percent,
            });
            setSelectedRecipeDetail(null);
            setCurrentTab('planner');
          }}
        />
      )}
    </div>
  );
}
