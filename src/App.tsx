import React, { useState, useEffect } from 'react';
import { 
  Navbar, 
  MainTabType 
} from './components/Navbar';
import { 
  RecipeDetailModal 
} from './components/RecipeDetailModal';
import { 
  RecipeEditModal 
} from './components/RecipeEditModal';
import { 
  AddToScheduleModal 
} from './components/AddToScheduleModal';
import { 
  ShoppingListConsolidator 
} from './components/ShoppingListConsolidator';
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
  scaleRecipe,
  formatDuration,
  getProductionTimeSpec
} from './utils/calculations';
import { 
  getMondayOfWeek, 
  formatDateToISO 
} from './utils/calendarHelpers';
import {
  initializeFirestoreDefaults,
  subscribeToBatches,
  saveBatchToFirestore,
  deleteBatchFromFirestore,
  subscribeToRecipes,
  saveRecipeToFirestore,
  resetRecipesInFirestore
} from './services/firestoreService';
import { 
  FileSpreadsheet, 
  Clock, 
  Snowflake, 
  CalendarDays,
  Edit3,
  RotateCcw,
  Sparkles,
  Layers,
  Cloud
} from 'lucide-react';

const STORAGE_KEY_BATCHES = 'fabriplan_active_batches_v3';
const STORAGE_KEY_RECIPES = 'fabriplan_recipes_v3';

export default function App() {
  // Editable Recipes state with LocalStorage and Firestore persistence
  const [recipes, setRecipes] = useState<Recipe[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RECIPES);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading recipes from localStorage', e);
    }
    return INITIAL_RECIPES;
  });

  // Current Main Navigation Tab (Default to calendar)
  const [currentTab, setCurrentTab] = useState<MainTabType>('calendar');

  // Cloud status state
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(true);

  // Modal states
  const [selectedRecipeDetail, setSelectedRecipeDetail] = useState<Recipe | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [planningRecipe, setPlanningRecipe] = useState<Recipe | null>(null);

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
        recipeName: 'Chipa Tradicional',
        targetUnits: 3000,
        selectedAlternativeIds: [],
        scheduledDate: getOffsetDateStr(2), // Miércoles
        status: 'planificado',
        createdAt: new Date().toISOString(),
        calculatedHours: 7.0,
        calculatedF1Percent: 100,
        calculatedF2Percent: 25,
        freezerAssigned: 'AMBOS',
        notes: 'Producción al 100% (3.000 chipas tradicionales)',
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
        targetUnits: 400,
        selectedAlternativeIds: [],
        scheduledDate: getOffsetDateStr(4), // Viernes
        status: 'planificado',
        createdAt: new Date().toISOString(),
        calculatedHours: 4.0,
        calculatedF1Percent: 100,
        calculatedF2Percent: 0,
        freezerAssigned: 'F1',
        notes: 'Producción al 100% (400 potes individuales)',
      },
    ];
  });

  // Real-time Firestore synchronization across all devices
  useEffect(() => {
    // 1. Initialize Firestore collections if empty
    initializeFirestoreDefaults(activeBatches, recipes);

    // 2. Real-time listener for batches (syncs updates from any device)
    const unsubBatches = subscribeToBatches(
      (cloudBatches) => {
        if (cloudBatches && cloudBatches.length > 0) {
          setActiveBatches(cloudBatches);
        }
        setIsCloudSynced(true);
      },
      (err) => {
        console.warn('Firestore batches sync notice:', err);
      }
    );

    // 3. Real-time listener for recipes
    const unsubRecipes = subscribeToRecipes(
      (cloudRecipes) => {
        if (cloudRecipes && cloudRecipes.length > 0) {
          setRecipes(cloudRecipes);
        }
        setIsCloudSynced(true);
      },
      (err) => {
        console.warn('Firestore recipes sync notice:', err);
      }
    );

    return () => {
      unsubBatches();
      unsubRecipes();
    };
  }, []);

  // Save batches to localStorage as instant cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_BATCHES, JSON.stringify(activeBatches));
    } catch (e) {
      console.error('Error saving batches', e);
    }
  }, [activeBatches]);

  // Save recipes to localStorage as instant cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RECIPES, JSON.stringify(recipes));
    } catch (e) {
      console.error('Error saving recipes', e);
    }
  }, [recipes]);

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

  // Batch management handlers (Writes to Firestore & updates local state)
  const handleAddBatch = async (batchData: Partial<ActiveBatch>) => {
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
    try {
      await saveBatchToFirestore(newBatch);
      setIsCloudSynced(true);
    } catch (e) {
      console.error('Error persisting batch to cloud:', e);
    }
  };

  const handleUpdateBatchStatus = async (batchId: string, status: ActiveBatch['status']) => {
    let updatedBatch: ActiveBatch | undefined;
    setActiveBatches((prev) =>
      prev.map((b) => {
        if (b.id === batchId) {
          updatedBatch = { ...b, status };
          return updatedBatch;
        }
        return b;
      })
    );

    if (updatedBatch) {
      try {
        await saveBatchToFirestore(updatedBatch);
        setIsCloudSynced(true);
      } catch (e) {
        console.error('Error updating batch in cloud:', e);
      }
    }
  };

  const handleRemoveBatch = async (batchId: string) => {
    setActiveBatches((prev) => prev.filter((b) => b.id !== batchId));
    try {
      await deleteBatchFromFirestore(batchId);
      setIsCloudSynced(true);
    } catch (e) {
      console.error('Error removing batch from cloud:', e);
    }
  };

  // Recipe editing handlers
  const handleSaveRecipe = async (updatedRecipe: Recipe) => {
    setRecipes((prev) =>
      prev.map((r) => (r.id === updatedRecipe.id ? updatedRecipe : r))
    );
    if (selectedRecipeDetail?.id === updatedRecipe.id) {
      setSelectedRecipeDetail(updatedRecipe);
    }
    try {
      await saveRecipeToFirestore(updatedRecipe);
      setIsCloudSynced(true);
    } catch (e) {
      console.error('Error saving recipe to cloud:', e);
    }
  };

  const handleResetRecipes = async () => {
    if (window.confirm('¿Deseas restaurar todas las recetas a las fórmulas originales de fábrica? Se perderán las modificaciones personalizadas.')) {
      setRecipes(INITIAL_RECIPES);
      try {
        localStorage.removeItem(STORAGE_KEY_RECIPES);
        await resetRecipesInFirestore();
        setIsCloudSynced(true);
      } catch (e) {
        console.error('Error resetting recipes in cloud:', e);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans antialiased flex flex-col selection:bg-amber-500 selection:text-slate-950">
      {/* Top Industrial Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        activeBatches={activeBatches}
        f1Percent={f1Percent}
        f2Percent={f2Percent}
        onOpenQuickBatch={() => setPlanningRecipe(recipes[0])}
        isCloudSynced={isCloudSynced}
      />

      {/* Main Container (98% width for spacious planning) */}
      <main className="flex-1 w-[98%] mx-auto px-2 sm:px-4 lg:px-6 pt-6 sm:pt-8">
        {/* Tab 1: Production Calendar */}
        {currentTab === 'calendar' && (
          <ProductionCalendar
            recipes={recipes}
            activeBatches={activeBatches}
            onAddBatch={handleAddBatch}
            onUpdateBatchStatus={handleUpdateBatchStatus}
            onRemoveBatch={handleRemoveBatch}
            onNavigateTab={(tab) => setCurrentTab(tab as MainTabType)}
            onSelectBatchForKitchen={() => {}}
          />
        )}

        {/* Tab 2: Recipes & Technical Sheets */}
        {currentTab === 'recipes' && (
          <div className="space-y-6 pb-12">
            {/* Header Banner */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <h1 className="text-xl font-bold text-slate-900">
                    Recetas y Fichas Técnicas ({recipes.length} Productos)
                  </h1>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Consulta y edita los insumos, rendimiento base (100%), horas de producción y ocupación de freezers de cada producto.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetRecipes}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors border border-slate-200"
                  title="Restaurar recetas originales"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Restaurar Fórmulas</span>
                </button>

                <button
                  onClick={() => setPlanningRecipe(recipes[0])}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <CalendarDays className="w-4 h-4" />
                  <span>Planificar Producción</span>
                </button>
              </div>
            </div>

            {/* Recipes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recipes.map((recipe) => (
                <div
                  key={recipe.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Top badging & time */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${recipe.badgeBg}`}>
                        {recipe.badgeText}
                      </span>
                      <span 
                        className="flex items-center gap-1 text-xs text-slate-700 font-bold bg-amber-50/80 px-2 py-0.5 rounded-lg border border-amber-200/60"
                        title={`${recipe.baseMinutes || Math.round(recipe.baseHours * 60)} min para lote base del 100%`}
                      >
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        {getProductionTimeSpec(recipe).formattedDuration}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900">{recipe.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{recipe.subtitle}</p>
                    </div>

                    {/* Base Capacity and Freezer specs */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block font-semibold">Rendimiento 100%:</span>
                        <span className="font-bold text-slate-900">
                          {recipe.baseYieldUnits.toLocaleString('es-AR')} {recipe.yieldUnitName}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-500 block font-semibold flex items-center gap-1">
                          <Snowflake className="w-3 h-3 text-cyan-600" />
                          Ocupación Frío:
                        </span>
                        <span className="font-bold text-cyan-950">
                          F1: {recipe.freezerRule.f1Percent}% {recipe.freezerRule.f2Percent > 0 && `| F2: ${recipe.freezerRule.f2Percent}%`}
                        </span>
                      </div>
                    </div>

                    {/* Quick Ingredients preview */}
                    <div className="pt-2 border-t border-slate-100 space-y-1 text-xs text-slate-600">
                      <span className="font-bold text-slate-700 block text-[11px]">Insumos Principales:</span>
                      {recipe.ingredients.slice(0, 3).map((ing) => (
                        <div key={ing.id} className="flex items-center justify-between text-[11px]">
                          <span className="truncate max-w-[170px]">• {ing.name}</span>
                          <span className="font-semibold text-slate-800">
                            {ing.unit === 'u' || ing.unit === 'paquetes'
                              ? `${ing.amountGrams} ${ing.unit}`
                              : `${(ing.amountGrams / 1000).toFixed(1)} kg`}
                          </span>
                        </div>
                      ))}
                      {recipe.ingredients.length > 3 && (
                        <span className="text-[10px] text-slate-400 block pt-0.5">
                          + {recipe.ingredients.length - 3} insumos más...
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Action Buttons */}
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-1.5">
                    <button
                      onClick={() => setSelectedRecipeDetail(recipe)}
                      className="flex-1 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-center"
                    >
                      Ver Ficha
                    </button>

                    <button
                      onClick={() => setEditingRecipe(recipe)}
                      className="p-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                      title="Editar receta, insumos y freezers"
                    >
                      <Edit3 className="w-4 h-4 text-amber-600" />
                    </button>

                    <button
                      onClick={() => setPlanningRecipe(recipe)}
                      className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-xs transition-all shadow-sm flex items-center gap-1"
                      title="Agregar a la Planificación"
                    >
                      <CalendarDays className="w-3.5 h-3.5" />
                      <span>Planificar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Shopping List */}
        {currentTab === 'shopping' && (
          <ShoppingListConsolidator
            recipes={recipes}
            activeBatches={activeBatches}
            onNavigateTab={(tab) => setCurrentTab(tab as MainTabType)}
          />
        )}
      </main>

      {/* MODAL: Technical Sheet Detail Modal */}
      {selectedRecipeDetail && (
        <RecipeDetailModal
          recipe={selectedRecipeDetail}
          onClose={() => setSelectedRecipeDetail(null)}
          onEditRecipe={(r) => {
            setSelectedRecipeDetail(null);
            setEditingRecipe(r);
          }}
          onAddToPlanner={(r) => {
            setSelectedRecipeDetail(null);
            setPlanningRecipe(r);
          }}
        />
      )}

      {/* MODAL: Edit Recipe & Technical Sheet Modal */}
      {editingRecipe && (
        <RecipeEditModal
          recipe={editingRecipe}
          onClose={() => setEditingRecipe(null)}
          onSave={handleSaveRecipe}
        />
      )}

      {/* MODAL: Add Recipe to Planning Schedule Modal */}
      {planningRecipe && (
        <AddToScheduleModal
          recipe={planningRecipe}
          recipes={recipes}
          onClose={() => setPlanningRecipe(null)}
          onAddBatch={handleAddBatch}
          onNavigateToCalendar={() => setCurrentTab('calendar')}
        />
      )}
    </div>
  );
}
