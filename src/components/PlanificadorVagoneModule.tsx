import React, { useState, useEffect } from 'react';
import { 
  Navbar, 
  MainTabType 
} from './Navbar';
import { 
  RecipeDetailModal 
} from './RecipeDetailModal';
import { 
  RecipeEditModal 
} from './RecipeEditModal';
import { 
  AddToScheduleModal 
} from './AddToScheduleModal';
import { 
  ShoppingListConsolidator 
} from './ShoppingListConsolidator';
import { 
  ProductionCalendar 
} from './ProductionCalendar';
import { 
  MasterCatalogModal 
} from './MasterCatalogModal';
import { 
  INITIAL_RECIPES 
} from '../data/recipesData';
import { 
  INITIAL_MASTER_INGREDIENTS 
} from '../data/masterIngredientsData';
import { 
  DEFAULT_INGREDIENT_CATEGORIES, 
  DEFAULT_PRODUCTION_CATEGORIES 
} from '../data/categoriesData';
import { 
  PlanificadorRecipe, 
  PlanificadorActiveBatch,
  PlanificadorMasterIngredient,
  PlanificadorIngredientCategoryConfig,
  PlanificadorProductionCategoryConfig
} from '../types';
import { 
  scaleRecipe,
  formatDuration,
  getProductionTimeSpec
} from '../utils/calculations';
import { 
  getMondayOfWeek, 
  formatDateToISO 
} from '../utils/calendarHelpers';
import {
  initializeFirestoreDefaults,
  subscribeToBatches,
  saveBatchToFirestore,
  deleteBatchFromFirestore,
  subscribeToRecipes,
  saveRecipeToFirestore,
  deleteRecipeFromFirestore,
  resetRecipesInFirestore,
  saveAllRecipesToFirestore,
  subscribeToMasterIngredients,
  saveMasterIngredientToFirestore,
  deleteMasterIngredientFromFirestore,
  saveAllMasterIngredientsToFirestore,
  subscribeToIngredientCategories,
  saveIngredientCategoryToFirestore,
  deleteIngredientCategoryFromFirestore,
  saveAllIngredientCategoriesToFirestore,
  subscribeToProductionCategories,
  saveProductionCategoryToFirestore,
  deleteProductionCategoryFromFirestore,
  saveAllProductionCategoriesToFirestore,
  subscribeToInventoryState,
  saveInventoryStateToFirestore
} from '../services/firestoreService';
import { 
  FileSpreadsheet, 
  Clock, 
  Snowflake, 
  CalendarDays,
  Edit3,
  RotateCcw,
  Sparkles,
  Layers,
  Plus,
  Trash2,
  AlertTriangle,
  Loader2
} from 'lucide-react';

const STORAGE_KEY_BATCHES = 'vagone_planificador_active_batches_v3';
const STORAGE_KEY_RECIPES = 'vagone_planificador_recipes_v3';
const STORAGE_KEY_MASTER_INGREDIENTS = 'vagone_planificador_master_ingredients_v1';
const STORAGE_KEY_INGREDIENT_CATEGORIES = 'vagone_planificador_ingredient_categories_v1';
const STORAGE_KEY_PRODUCTION_CATEGORIES = 'vagone_planificador_production_categories_v1';
const STORAGE_KEY_CHECKED = 'vagone_planificador_shopping_checked_items_v3';
const STORAGE_KEY_FACTORY_STOCK = 'vagone_planificador_shopping_factory_stock_v3';
const STORAGE_KEY_WEEKLY_STOCK = 'vagone_planificador_weekly_stock_items';
const STORAGE_KEY_DISMISSED_PACKAGING = 'vagone_planificador_dismissed_packaging_dates';
const STORAGE_KEY_SATURDAY_WEEKS = 'vagone_planificador_saturday_weeks';

export interface PlanificadorVagoneModuleProps {
  showHeaderNavbar?: boolean;
  currentUser?: string;
  onLogout?: () => void;
  onBack?: () => void;
}

export const PlanificadorVagoneModule: React.FC<PlanificadorVagoneModuleProps> = ({
  showHeaderNavbar = true,
  currentUser = 'Administrador',
  onLogout,
  onBack
}) => {
  // Editable Recipes state with LocalStorage and Firestore persistence
  const [recipes, setRecipes] = useState<PlanificadorRecipe[]>(() => {
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

  // Master Ingredients state (standardized catalog with dropdowns)
  const [masterIngredients, setMasterIngredients] = useState<PlanificadorMasterIngredient[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MASTER_INGREDIENTS);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading master ingredients from localStorage', e);
    }
    return INITIAL_MASTER_INGREDIENTS;
  });

  // Dynamic Ingredient Categories configuration
  const [ingredientCategories, setIngredientCategories] = useState<PlanificadorIngredientCategoryConfig[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_INGREDIENT_CATEGORIES);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading ingredient categories from localStorage', e);
    }
    return DEFAULT_INGREDIENT_CATEGORIES;
  });

  // Dynamic Production Categories configuration
  const [productionCategories, setProductionCategories] = useState<PlanificadorProductionCategoryConfig[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PRODUCTION_CATEGORIES);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading production categories from localStorage', e);
    }
    return DEFAULT_PRODUCTION_CATEGORIES;
  });

  // Navigation State
  const [currentTab, setCurrentTab] = useState<MainTabType>('calendar');

  // Active Batches in Production
  const [activeBatches, setActiveBatches] = useState<PlanificadorActiveBatch[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BATCHES);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading batches from localStorage', e);
    }
    
    // Initial sample batch for demonstration
    const sampleMonday = getMondayOfWeek(new Date());
    const mondayStr = formatDateToISO(sampleMonday);
    const initialRecipe = INITIAL_RECIPES[0];
    const initialCalculatedHours = initialRecipe.baseHours;
    const initialDuration = getProductionTimeSpec(initialRecipe).formattedDuration;

    return [
      {
        id: 'sample-batch-1',
        recipeId: initialRecipe.id,
        recipeName: initialRecipe.name,
        targetUnits: initialRecipe.baseYieldUnits,
        presentationId: initialRecipe.presentationOptions[0]?.id,
        selectedAlternativeIds: [],
        scheduledDate: mondayStr,
        status: 'planificado',
        createdAt: new Date().toISOString(),
        notes: 'Lote estándar de inicio de semana',
        freezerAssigned: 'AMBOS',
        calculatedHours: initialCalculatedHours,
        calculatedMinutes: initialRecipe.baseMinutes || Math.round(initialRecipe.baseHours * 60),
        calculatedFormattedDuration: initialDuration,
        calculatedLaborPercent: 100,
        calculatedF1Percent: initialRecipe.freezerRule.f1Percent,
        calculatedF2Percent: initialRecipe.freezerRule.f2Percent,
      }
    ];
  });

  // Track if connected to cloud
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(true);

  // Real-time Firestore synchronization across all devices
  useEffect(() => {
    // 1. Initialize Firestore collections if empty
    initializeFirestoreDefaults(activeBatches, recipes, masterIngredients, ingredientCategories, productionCategories);

    // 2. Real-time subscriber for batches
    const unsubBatches = subscribeToBatches(
      (remoteBatches) => {
        setActiveBatches(remoteBatches);
        setIsCloudSynced(true);
      },
      (err) => {
        console.warn('Firestore offline/sync error for batches:', err);
        setIsCloudSynced(false);
      }
    );

    // 3. Real-time subscriber for recipes
    const unsubRecipes = subscribeToRecipes(
      (remoteRecipes) => {
        setRecipes(remoteRecipes);
        setIsCloudSynced(true);
      },
      (err) => {
        console.warn('Firestore offline/sync error for recipes:', err);
        setIsCloudSynced(false);
      }
    );

    // 4. Real-time subscriber for master ingredients
    const unsubMasterIng = subscribeToMasterIngredients(
      (remoteMaster) => {
        setMasterIngredients(remoteMaster);
      },
      (err) => console.warn('Firestore sync error for master ingredients:', err)
    );

    // 5. Real-time subscriber for ingredient categories
    const unsubIngCats = subscribeToIngredientCategories(
      (remoteCats) => {
        setIngredientCategories(remoteCats);
      },
      (err) => console.warn('Firestore sync error for ingredient categories:', err)
    );

    // 6. Real-time subscriber for production categories
    const unsubProdCats = subscribeToProductionCategories(
      (remoteProdCats) => {
        setProductionCategories(remoteProdCats);
      },
      (err) => console.warn('Firestore sync error for production categories:', err)
    );

    // 7. Real-time subscriber for inventory stock and checked items
    const unsubInventory = subscribeToInventoryState(
      (remoteInventory) => {
        if (remoteInventory.checkedItems) {
          setCheckedItems(remoteInventory.checkedItems);
        }
        if (remoteInventory.factoryStock) {
          setFactoryStock(remoteInventory.factoryStock);
        }
        if (remoteInventory.dismissedPackagingDates) {
          setDismissedPackagingDates(remoteInventory.dismissedPackagingDates);
        }
        if (remoteInventory.saturdayWeeks) {
          setSaturdayWeeks(remoteInventory.saturdayWeeks);
        }
      },
      (err) => console.warn('Firestore sync error for inventory state:', err)
    );

    return () => {
      unsubBatches();
      unsubRecipes();
      unsubMasterIng();
      unsubIngCats();
      unsubProdCats();
      unsubInventory();
    };
  }, []);

  // Save batches to localStorage as instant cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_BATCHES, JSON.stringify(activeBatches));
    } catch (e) {
      console.error('Error saving batches to localStorage', e);
    }
  }, [activeBatches]);

  // Save recipes to localStorage as instant cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RECIPES, JSON.stringify(recipes));
    } catch (e) {
      console.error('Error saving recipes to localStorage', e);
    }
  }, [recipes]);

  // Save master ingredients to localStorage as instant cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MASTER_INGREDIENTS, JSON.stringify(masterIngredients));
    } catch (e) {
      console.error('Error saving master ingredients to localStorage', e);
    }
  }, [masterIngredients]);

  // Save ingredient categories to localStorage as instant cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_INGREDIENT_CATEGORIES, JSON.stringify(ingredientCategories));
    } catch (e) {
      console.error('Error saving ingredient categories to localStorage', e);
    }
  }, [ingredientCategories]);

  // Save production categories to localStorage as instant cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PRODUCTION_CATEGORIES, JSON.stringify(productionCategories));
    } catch (e) {
      console.error('Error saving production categories to localStorage', e);
    }
  }, [productionCategories]);

  // Shopping List Checked Items state (purchased or in-stock items)
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CHECKED);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading checked items from localStorage', e);
    }
    return {};
  });

  // Shopping List Factory Stock state (manual stock physically available in kitchen/deposit)
  const [factoryStock, setFactoryStock] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FACTORY_STOCK);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading factory stock from localStorage', e);
    }
    return {};
  });

  // Dates where next-day packaging was explicitly dismissed/hidden by the user
  const [dismissedPackagingDates, setDismissedPackagingDates] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DISMISSED_PACKAGING);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading dismissed packaging dates', e);
    }
    return {};
  });

  // Weeks (by Monday ISO key) where Saturday is explicitly enabled in production calendar
  const [saturdayWeeks, setSaturdayWeeks] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SATURDAY_WEEKS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading saturday weeks', e);
    }
    return {};
  });

  // Save dismissed packaging dates
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_DISMISSED_PACKAGING, JSON.stringify(dismissedPackagingDates));
    } catch (e) {
      console.error('Error saving dismissed packaging dates', e);
    }
  }, [dismissedPackagingDates]);

  // Save saturday weeks
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SATURDAY_WEEKS, JSON.stringify(saturdayWeeks));
    } catch (e) {
      console.error('Error saving saturday weeks', e);
    }
  }, [saturdayWeeks]);

  const handleDismissPackaging = (dateStr: string) => {
    setDismissedPackagingDates((prev) => {
      const next = { ...prev, [dateStr]: true };
      saveInventoryStateToFirestore({ dismissedPackagingDates: next }).catch(console.error);
      return next;
    });
  };

  const handleRestorePackaging = (dateStr: string) => {
    setDismissedPackagingDates((prev) => {
      const next = { ...prev };
      delete next[dateStr];
      saveInventoryStateToFirestore({ dismissedPackagingDates: next }).catch(console.error);
      return next;
    });
  };

  const handleToggleSaturdayWeek = (mondayKey: string) => {
    setSaturdayWeeks((prev) => {
      const currentVal = !!prev[mondayKey];
      const next = { ...prev, [mondayKey]: !currentVal };
      saveInventoryStateToFirestore({ saturdayWeeks: next }).catch(console.error);
      return next;
    });
  };

  // Modals & Active Selections
  const [selectedRecipeDetail, setSelectedRecipeDetail] = useState<PlanificadorRecipe | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<PlanificadorRecipe | null>(null);
  const [isCreatingRecipe, setIsCreatingRecipe] = useState<boolean>(false);
  const [planningRecipe, setPlanningRecipe] = useState<PlanificadorRecipe | null>(null);
  const [showMasterCatalogModal, setShowMasterCatalogModal] = useState<boolean>(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState<boolean>(false);
  const [isResettingRecipes, setIsResettingRecipes] = useState<boolean>(false);

  // Today's Freezer Occupancy Calculations (only calculates batches scheduled for today)
  const todayISO = formatDateToISO(new Date());
  const todayBatches = activeBatches.filter((b) => b.scheduledDate === todayISO && b.status !== 'cancelado');

  const f1Batches = todayBatches.filter((b) => b.freezerAssigned === 'F1' || b.freezerAssigned === 'AMBOS');
  const f2Batches = todayBatches.filter((b) => b.freezerAssigned === 'F2' || b.freezerAssigned === 'AMBOS');

  const f1Percent = f1Batches.reduce((acc, b) => acc + (b.calculatedF1Percent || 0), 0);
  const f2Percent = f2Batches.reduce((acc, b) => acc + (b.calculatedF2Percent || 0), 0);

  // Handlers for Batches
  const handleAddBatch = (batchData: Omit<PlanificadorActiveBatch, 'id' | 'createdAt'>) => {
    const newBatch: PlanificadorActiveBatch = {
      ...batchData,
      id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
    };
    
    // Save to Firestore and local state
    saveBatchToFirestore(newBatch).catch((err) => console.error('Error saving batch to Firestore:', err));
    setActiveBatches((prev) => [newBatch, ...prev]);
  };

  const handleUpdateBatchStatus = (batchId: string, newStatus: PlanificadorActiveBatch['status']) => {
    setActiveBatches((prev) =>
      prev.map((b) => {
        if (b.id === batchId) {
          const updated = { ...b, status: newStatus };
          saveBatchToFirestore(updated).catch((err) => console.error('Error updating batch in Firestore:', err));
          return updated;
        }
        return b;
      })
    );
  };

  const handleRemoveBatch = (batchId: string) => {
    deleteBatchFromFirestore(batchId).catch((err) => console.error('Error deleting batch from Firestore:', err));
    setActiveBatches((prev) => prev.filter((b) => b.id !== batchId));
  };

  // Handlers for Recipes
  const handleSaveRecipe = (updatedRecipe: PlanificadorRecipe) => {
    saveRecipeToFirestore(updatedRecipe).catch((err) => console.error('Error saving recipe to Firestore:', err));
    setRecipes((prev) => {
      const exists = prev.some((r) => r.id === updatedRecipe.id);
      if (exists) {
        return prev.map((r) => (r.id === updatedRecipe.id ? updatedRecipe : r));
      }
      return [...prev, updatedRecipe];
    });
    setEditingRecipe(null);
    setIsCreatingRecipe(false);
  };

  const handleSaveAllRecipes = (updatedRecipes: PlanificadorRecipe[]) => {
    saveAllRecipesToFirestore(updatedRecipes).catch((err) => console.error('Error saving all recipes to Firestore:', err));
    setRecipes(updatedRecipes);
  };

  const handleUpdateRecipeCategory = (recipeId: string, newCategory: string) => {
    setRecipes((prev) => {
      const updated = prev.map((r) => {
        if (r.id === recipeId) {
          const uRecipe = { ...r, category: newCategory };
          saveRecipeToFirestore(uRecipe).catch((err) => console.error('Error saving recipe category update:', err));
          return uRecipe;
        }
        return r;
      });
      return updated;
    });
  };

  const handleDeleteRecipe = (recipeToDelete: PlanificadorRecipe) => {
    const isUsedInBatches = activeBatches.some((b) => b.recipeId === recipeToDelete.id);
    const confirmMessage = isUsedInBatches
      ? `La receta "${recipeToDelete.name}" está asignada a lotes en el calendario. ¿Estás seguro de que deseas eliminarla del catálogo?`
      : `¿Estás seguro de que deseas eliminar la receta "${recipeToDelete.name}"?`;

    if (window.confirm(confirmMessage)) {
      deleteRecipeFromFirestore(recipeToDelete.id).catch((err) => console.error('Error deleting recipe from Firestore:', err));
      setRecipes((prev) => prev.filter((r) => r.id !== recipeToDelete.id));
      if (selectedRecipeDetail?.id === recipeToDelete.id) {
        setSelectedRecipeDetail(null);
      }
      if (editingRecipe?.id === recipeToDelete.id) {
        setEditingRecipe(null);
      }
    }
  };

  const handleOpenNewRecipeModal = () => {
    const newEmptyRecipe: PlanificadorRecipe = {
      id: `recipe-custom-${Date.now()}`,
      name: '',
      category: 'pastas',
      subtitle: '',
      baseYieldUnits: 100,
      yieldUnitName: 'unidades',
      presentationOptions: [
        {
          id: 'pres-1',
          label: 'Paquete Estándar',
          unitsPerPack: 1,
          basePacksCount: 100,
          packagingDescription: 'Empaque estándar'
        }
      ],
      ingredients: [],
      packaging: [],
      baseHours: 4,
      baseMinutes: 240,
      prepMinutes: 0,
      timeNotes: 'Tiempo estimado de elaboración en planta',
      freezerRule: {
        f1Percent: 50,
        f1TraysText: '5/10',
        f1MaxTrays: 10,
        f1TraysOccupied: 5,
        f2Percent: 0,
        f2TraysText: 'LIBRE',
        f2MaxTrays: 10,
        f2TraysOccupied: 0
      },
      operationalNotes: [],
      preparationSteps: [],
      color: 'border-slate-300',
      badgeBg: 'bg-slate-100 text-slate-800 border-slate-300',
      badgeText: 'NUEVA',
      requiresNextDayPackaging: true,
      nextDayPackagingMinutes: 35
    };

    setIsCreatingRecipe(true);
    setEditingRecipe(newEmptyRecipe);
  };

  const handleConfirmResetRecipes = async () => {
    setIsResettingRecipes(true);
    try {
      await resetRecipesInFirestore();
      setRecipes(INITIAL_RECIPES);
      setShowResetConfirmModal(false);
    } catch (e) {
      console.error('Error resetting recipes:', e);
      alert('Ocurrió un error al intentar restaurar las recetas en Firestore.');
    } finally {
      setIsResettingRecipes(false);
    }
  };

  // Handlers for Master Ingredients & Categories
  const handleSaveMasterIngredient = (item: PlanificadorMasterIngredient) => {
    saveMasterIngredientToFirestore(item).catch(console.error);
    setMasterIngredients((prev) => {
      const idx = prev.findIndex((i) => i.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = item;
        return next;
      }
      return [...prev, item];
    });
  };

  const handleDeleteMasterIngredient = (itemId: string) => {
    deleteMasterIngredientFromFirestore(itemId).catch(console.error);
    setMasterIngredients((prev) => prev.filter((i) => i.id !== itemId));
  };

  const handleSaveAllMasterIngredients = (items: PlanificadorMasterIngredient[]) => {
    saveAllMasterIngredientsToFirestore(items).catch(console.error);
    setMasterIngredients(items);
  };

  const handleSaveIngredientCategory = (cat: PlanificadorIngredientCategoryConfig) => {
    saveIngredientCategoryToFirestore(cat).catch(console.error);
    setIngredientCategories((prev) => {
      const idx = prev.findIndex((c) => c.id === cat.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = cat;
        return next.sort((a, b) => a.order - b.order);
      }
      return [...prev, cat].sort((a, b) => a.order - b.order);
    });
  };

  const handleDeleteIngredientCategory = (catId: string) => {
    deleteIngredientCategoryFromFirestore(catId).catch(console.error);
    setIngredientCategories((prev) => prev.filter((c) => c.id !== catId));
  };

  const handleSaveAllIngredientCategories = (cats: PlanificadorIngredientCategoryConfig[]) => {
    saveAllIngredientCategoriesToFirestore(cats).catch(console.error);
    setIngredientCategories(cats);
  };

  const handleSaveProductionCategory = (pCat: PlanificadorProductionCategoryConfig) => {
    saveProductionCategoryToFirestore(pCat).catch(console.error);
    setProductionCategories((prev) => {
      const idx = prev.findIndex((c) => c.id === pCat.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = pCat;
        return next.sort((a, b) => a.order - b.order);
      }
      return [...prev, pCat].sort((a, b) => a.order - b.order);
    });
  };

  const handleDeleteProductionCategory = (pCatId: string) => {
    deleteProductionCategoryFromFirestore(pCatId).catch(console.error);
    setProductionCategories((prev) => prev.filter((c) => c.id !== pCatId));
  };

  const handleSaveAllProductionCategories = (pCats: PlanificadorProductionCategoryConfig[]) => {
    saveAllProductionCategoriesToFirestore(pCats).catch(console.error);
    setProductionCategories(pCats);
  };

  const handleResetMasterCatalog = async () => {
    if (window.confirm('¿Restaurar el catálogo de insumos y categorías a los valores de fábrica?')) {
      try {
        await saveAllMasterIngredientsToFirestore(INITIAL_MASTER_INGREDIENTS);
        await saveAllIngredientCategoriesToFirestore(DEFAULT_INGREDIENT_CATEGORIES);
        await saveAllProductionCategoriesToFirestore(DEFAULT_PRODUCTION_CATEGORIES);
        setMasterIngredients(INITIAL_MASTER_INGREDIENTS);
        setIngredientCategories(DEFAULT_INGREDIENT_CATEGORIES);
        setProductionCategories(DEFAULT_PRODUCTION_CATEGORIES);
      } catch (e) {
        console.error('Error resetting catalog:', e);
      }
    }
  };

  // Handlers for Shopping List Checks & Stock
  const handleToggleCheckItem = (itemName: string) => {
    setCheckedItems((prev) => {
      const next = { ...prev, [itemName]: !prev[itemName] };
      saveInventoryStateToFirestore({ checkedItems: next }).catch(console.error);
      return next;
    });
  };

  const handleMarkAllInStock = (itemNames: string[]) => {
    setCheckedItems((prev) => {
      const next = { ...prev };
      itemNames.forEach((name) => {
        next[name] = true;
      });
      saveInventoryStateToFirestore({ checkedItems: next }).catch(console.error);
      return next;
    });
  };

  const handleClearAllStock = (itemNames: string[]) => {
    setCheckedItems((prev) => {
      const next = { ...prev };
      itemNames.forEach((name) => {
        delete next[name];
      });
      saveInventoryStateToFirestore({ checkedItems: next }).catch(console.error);
      return next;
    });
  };

  const handleUpdateFactoryStock = (itemName: string, amount: number) => {
    setFactoryStock((prev) => {
      const next = { ...prev, [itemName]: amount };
      saveInventoryStateToFirestore({ factoryStock: next }).catch(console.error);
      return next;
    });
  };

  const handleCoverStock = (itemName: string, neededGrams: number) => {
    const neededKg = neededGrams / 1000;
    setFactoryStock((prev) => {
      const next = { ...prev, [itemName]: neededKg };
      saveInventoryStateToFirestore({ factoryStock: next }).catch(console.error);
      return next;
    });
  };

  const handleClearItemStock = (itemName: string) => {
    setFactoryStock((prev) => {
      const next = { ...prev };
      delete next[itemName];
      saveInventoryStateToFirestore({ factoryStock: next }).catch(console.error);
      return next;
    });
  };

  const handleSelectAllVisible = (itemNames: string[]) => {
    setCheckedItems((prev) => {
      const next = { ...prev };
      itemNames.forEach((name) => {
        next[name] = true;
      });
      saveInventoryStateToFirestore({ checkedItems: next }).catch(console.error);
      return next;
    });
  };

  const handleClearAllChecksAndStock = () => {
    setCheckedItems({});
    setFactoryStock({});
    try {
      localStorage.setItem(STORAGE_KEY_CHECKED, JSON.stringify({}));
      localStorage.setItem(STORAGE_KEY_WEEKLY_STOCK, JSON.stringify({}));
      localStorage.setItem(STORAGE_KEY_FACTORY_STOCK, JSON.stringify({}));
    } catch (e) {
      console.error(e);
    }
    saveInventoryStateToFirestore({ checkedItems: {}, factoryStock: {} }).catch(console.error);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans antialiased flex flex-col selection:bg-amber-500 selection:text-slate-950">
      {/* Top Industrial Navbar */}
      {showHeaderNavbar && (
        <Navbar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          activeBatches={activeBatches}
          f1Percent={f1Percent}
          f2Percent={f2Percent}
          onOpenQuickBatch={() => setPlanningRecipe(recipes[0])}
          onOpenMasterCatalog={() => setShowMasterCatalogModal(true)}
          isCloudSynced={isCloudSynced}
          currentUser={currentUser}
          onLogout={onLogout}
        />
      )}

      {/* Main Container (98% width for spacious planning) */}
      <main className="flex-1 w-[98%] mx-auto px-2 sm:px-4 lg:px-6 pt-6 sm:pt-8">
        {/* Tab 1: Production Calendar */}
        {currentTab === 'calendar' && (
          <ProductionCalendar
            recipes={recipes}
            activeBatches={activeBatches}
            checkedItems={checkedItems}
            dismissedPackagingDates={dismissedPackagingDates}
            saturdayWeeks={saturdayWeeks}
            onDismissPackaging={handleDismissPackaging}
            onRestorePackaging={handleRestorePackaging}
            onToggleSaturdayWeek={handleToggleSaturdayWeek}
            onToggleCheckItem={handleToggleCheckItem}
            onMarkAllInStock={handleMarkAllInStock}
            onClearAllStock={handleClearAllStock}
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
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
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
                  Consulta, crea y edita los insumos estandarizados, rendimiento base (100%), horas de producción y ocupación de freezers.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Master Catalog Management Trigger */}
                <button
                  onClick={() => setShowMasterCatalogModal(true)}
                  className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  title="Administrar Catálogo Maestro de Insumos y Categorías"
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Catálogo de Insumos & Categorías</span>
                </button>

                {/* Security Confirmation Trigger for Resetting Formulas */}
                <button
                  onClick={() => setShowResetConfirmModal(true)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors border border-slate-200 cursor-pointer"
                  title="Restaurar todas las recetas a las cantidades y fórmulas estándar de fábrica"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Restaurar Fórmulas</span>
                </button>

                {/* Primary Button 1: Add New Recipe / Ficha Técnica */}
                <button
                  onClick={handleOpenNewRecipeModal}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  title="Crear una nueva receta o ficha técnica"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar Receta</span>
                </button>

                {/* Primary Button 2: Add New Production to Schedule */}
                <button
                  onClick={() => setPlanningRecipe(recipes[0] || null)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  title="Programar una nueva tanda de producción en el calendario"
                >
                  <CalendarDays className="w-4 h-4" />
                  <span>Programar Producción</span>
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

                      <div className="col-span-2 pt-1 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-medium">Logística de Empaque:</span>
                        <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                          recipe.requiresNextDayPackaging
                            ? 'bg-indigo-100 text-indigo-900'
                            : 'bg-emerald-100 text-emerald-900'
                        }`}>
                          {recipe.requiresNextDayPackaging
                            ? `❄️ Día siguiente (~${recipe.nextDayPackagingMinutes || 35}m)`
                            : '📦 Misma producción'}
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
                      onClick={() => {
                        setIsCreatingRecipe(false);
                        setEditingRecipe(recipe);
                      }}
                      className="p-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                      title="Editar receta, insumos y freezers"
                    >
                      <Edit3 className="w-4 h-4 text-amber-600" />
                    </button>

                    <button
                      onClick={() => handleDeleteRecipe(recipe)}
                      className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-xl transition-colors"
                      title="Eliminar receta"
                    >
                      <Trash2 className="w-4 h-4" />
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
            masterIngredients={masterIngredients}
            ingredientCategories={ingredientCategories}
            checkedItems={checkedItems}
            onToggleCheckItem={handleToggleCheckItem}
            onMarkAllInStock={handleMarkAllInStock}
            onClearAllStock={handleClearAllStock}
            factoryStock={factoryStock}
            onUpdateFactoryStock={handleUpdateFactoryStock}
            onCoverStock={handleCoverStock}
            onClearItemStock={handleClearItemStock}
            onSelectAllVisible={handleSelectAllVisible}
            onClearAllChecksAndStock={handleClearAllChecksAndStock}
            onUpdateBatchStatus={handleUpdateBatchStatus}
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
            setIsCreatingRecipe(false);
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
          isNew={isCreatingRecipe}
          masterIngredients={masterIngredients}
          ingredientCategories={ingredientCategories}
          productionCategories={productionCategories}
          onAddNewMasterIngredient={handleSaveMasterIngredient}
          onClose={() => {
            setEditingRecipe(null);
            setIsCreatingRecipe(false);
          }}
          onSave={handleSaveRecipe}
        />
      )}

      {/* MODAL: Master Catalog & Categories Modal */}
      {showMasterCatalogModal && (
        <MasterCatalogModal
          isOpen={showMasterCatalogModal}
          masterIngredients={masterIngredients}
          ingredientCategories={ingredientCategories}
          productionCategories={productionCategories}
          recipes={recipes}
          onSaveIngredient={handleSaveMasterIngredient}
          onDeleteIngredient={handleDeleteMasterIngredient}
          onSaveAllIngredients={handleSaveAllMasterIngredients}
          onSaveIngredientCategory={handleSaveIngredientCategory}
          onDeleteIngredientCategory={handleDeleteIngredientCategory}
          onSaveAllIngredientCategories={handleSaveAllIngredientCategories}
          onSaveProductionCategory={handleSaveProductionCategory}
          onDeleteProductionCategory={handleDeleteProductionCategory}
          onSaveAllProductionCategories={handleSaveAllProductionCategories}
          onSaveRecipe={handleSaveRecipe}
          onSaveAllRecipes={handleSaveAllRecipes}
          onUpdateRecipeCategory={handleUpdateRecipeCategory}
          onResetToDefaults={handleResetMasterCatalog}
          onClose={() => setShowMasterCatalogModal(false)}
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

      {/* MODAL: Security Confirmation for Resetting Formulas */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            {/* Warning Icon & Header */}
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                  ¿Restaurar Fórmulas de Fábrica?
                </h3>
                <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full inline-block mt-1">
                  Confirmación de Seguridad
                </span>
              </div>
            </div>

            {/* Explanation of consequences */}
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 space-y-2 text-xs text-amber-950 leading-relaxed">
              <p className="font-semibold text-slate-900">
                ⚠️ <strong>Esta acción restablecerá todas las recetas a las cantidades y fórmulas estándar originales de fábrica.</strong>
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-700 text-[11.5px]">
                <li>Se sobreescribirán los cambios o proporciones personalizadas que hayas modificado en los insumos.</li>
                <li>Se volverán a cargar las fichas técnicas por defecto (chipa, canelones, sorrentinos, tequeños, etc.).</li>
                <li>Las producciones ya programadas en el calendario conservarán sus datos agendados.</li>
              </ul>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              Por favor confirma si de verdad deseas restaurar las cantidades a los valores por defecto o si fue solo un miss-click.
            </p>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                disabled={isResettingRecipes}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer border border-slate-200"
              >
                Cancelar (Mantener mis recetas)
              </button>

              <button
                type="button"
                onClick={handleConfirmResetRecipes}
                disabled={isResettingRecipes}
                className="w-full sm:w-auto px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isResettingRecipes ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Restaurando fórmulas...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Sí, Restaurar Valores por Defecto</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanificadorVagoneModule;
