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
  MasterCatalogModal 
} from './components/MasterCatalogModal';
import { 
  INITIAL_RECIPES 
} from './data/recipesData';
import { 
  INITIAL_MASTER_INGREDIENTS 
} from './data/masterIngredientsData';
import { 
  DEFAULT_INGREDIENT_CATEGORIES, 
  DEFAULT_PRODUCTION_CATEGORIES 
} from './data/categoriesData';
import { 
  Recipe, 
  ActiveBatch,
  MasterIngredient,
  IngredientCategoryConfig,
  ProductionCategoryConfig
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
  Cloud,
  Plus,
  Trash2,
  PlusCircle,
  Pizza,
  AlertTriangle,
  ShieldAlert,
  Loader2,
  Check
} from 'lucide-react';

const STORAGE_KEY_BATCHES = 'fabriplan_active_batches_v3';
const STORAGE_KEY_RECIPES = 'fabriplan_recipes_v3';
const STORAGE_KEY_MASTER_INGREDIENTS = 'fabriplan_master_ingredients_v1';
const STORAGE_KEY_INGREDIENT_CATEGORIES = 'fabriplan_ingredient_categories_v1';
const STORAGE_KEY_PRODUCTION_CATEGORIES = 'fabriplan_production_categories_v1';
const STORAGE_KEY_CHECKED = 'fabriplan_shopping_checked_items_v3';
const STORAGE_KEY_FACTORY_STOCK = 'fabriplan_shopping_factory_stock_v3';
const STORAGE_KEY_WEEKLY_STOCK = 'fabriplan_weekly_stock_items';

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

  // Master Ingredients state (standardized catalog with dropdowns)
  const [masterIngredients, setMasterIngredients] = useState<MasterIngredient[]>(() => {
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

  // Ingredient Categories (customizable names & icons)
  const [ingredientCategories, setIngredientCategories] = useState<IngredientCategoryConfig[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_INGREDIENT_CATEGORIES);
      if (saved) {
        const parsed: IngredientCategoryConfig[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasEmpaques = parsed.some((c) => c.id === 'empaques');
          if (!hasEmpaques) {
            parsed.push({
              id: 'empaques',
              name: 'Empaque, Bolsas y Descartables',
              icon: '🛍️',
              description: 'Bolsas, cajas, separadores, etiquetas, bandejas y descartables.',
              order: parsed.length + 1,
            });
          }
          return parsed.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        }
      }
    } catch (e) {
      console.error('Error loading ingredient categories from localStorage', e);
    }
    return DEFAULT_INGREDIENT_CATEGORIES;
  });

  // Production Categories (e.g. 'Pasta rellena', 'Pizzas', customizable names)
  const [productionCategories, setProductionCategories] = useState<ProductionCategoryConfig[]>(() => {
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

  // Checked / In-Stock items state (synchronized across Calendar and Shopping List)
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CHECKED);
      const legacy = localStorage.getItem(STORAGE_KEY_WEEKLY_STOCK);
      const parsedSaved = saved ? JSON.parse(saved) : {};
      const parsedLegacy = legacy ? JSON.parse(legacy) : {};
      return { ...parsedLegacy, ...parsedSaved };
    } catch (e) {
      console.error('Error loading checked items from localStorage', e);
      return {};
    }
  });

  // Manual Factory Stock values (e.g. grams or units available in warehouse)
  const [factoryStock, setFactoryStock] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FACTORY_STOCK);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error('Error loading factory stock from localStorage', e);
      return {};
    }
  });

  // Current Main Navigation Tab (Default to calendar)
  const [currentTab, setCurrentTab] = useState<MainTabType>('calendar');

  // Cloud status state
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(true);

  // Modal states
  const [selectedRecipeDetail, setSelectedRecipeDetail] = useState<Recipe | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [isCreatingRecipe, setIsCreatingRecipe] = useState<boolean>(false);
  const [planningRecipe, setPlanningRecipe] = useState<Recipe | null>(null);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState<boolean>(false);
  const [isResettingRecipes, setIsResettingRecipes] = useState<boolean>(false);
  const [showMasterCatalogModal, setShowMasterCatalogModal] = useState<boolean>(false);

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
    initializeFirestoreDefaults(activeBatches, recipes, masterIngredients, ingredientCategories, productionCategories);

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

    // 4. Real-time listener for master ingredients
    const unsubMaster = subscribeToMasterIngredients(
      (cloudMaster) => {
        if (cloudMaster && cloudMaster.length > 0) {
          setMasterIngredients(cloudMaster);
        }
        setIsCloudSynced(true);
      },
      (err) => {
        console.warn('Firestore master ingredients sync notice:', err);
      }
    );

    // 5. Real-time listener for ingredient categories
    const unsubIngCats = subscribeToIngredientCategories(
      (cloudIngCats) => {
        if (cloudIngCats && cloudIngCats.length > 0) {
          const hasEmpaques = cloudIngCats.some((c) => c.id === 'empaques');
          if (!hasEmpaques) {
            const merged = [
              ...cloudIngCats,
              {
                id: 'empaques',
                name: 'Empaque, Bolsas y Descartables',
                icon: '🛍️',
                description: 'Bolsas, cajas, separadores, etiquetas, bandejas y descartables.',
                order: cloudIngCats.length + 1,
              },
            ].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            setIngredientCategories(merged);
          } else {
            setIngredientCategories(cloudIngCats);
          }
        }
        setIsCloudSynced(true);
      },
      (err) => {
        console.warn('Firestore ingredient categories sync notice:', err);
      }
    );

    // 6. Real-time listener for production categories
    const unsubProdCats = subscribeToProductionCategories(
      (cloudProdCats) => {
        if (cloudProdCats && cloudProdCats.length > 0) {
          setProductionCategories(cloudProdCats);
        }
        setIsCloudSynced(true);
      },
      (err) => {
        console.warn('Firestore production categories sync notice:', err);
      }
    );

    // 7. Real-time listener for Inventory & Checked Stock state
    const unsubInventory = subscribeToInventoryState(
      (cloudInventory) => {
        if (cloudInventory) {
          if (cloudInventory.checkedItems && typeof cloudInventory.checkedItems === 'object') {
            setCheckedItems(cloudInventory.checkedItems);
          }
          if (cloudInventory.factoryStock && typeof cloudInventory.factoryStock === 'object') {
            setFactoryStock(cloudInventory.factoryStock);
          }
        }
        setIsCloudSynced(true);
      },
      (err) => {
        console.warn('Firestore inventory sync notice:', err);
      }
    );

    return () => {
      unsubBatches();
      unsubRecipes();
      unsubMaster();
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

  // Save master ingredients to localStorage as instant cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MASTER_INGREDIENTS, JSON.stringify(masterIngredients));
    } catch (e) {
      console.error('Error saving master ingredients', e);
    }
  }, [masterIngredients]);

  // Save ingredient categories to localStorage as instant cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_INGREDIENT_CATEGORIES, JSON.stringify(ingredientCategories));
    } catch (e) {
      console.error('Error saving ingredient categories', e);
    }
  }, [ingredientCategories]);

  // Save production categories to localStorage as instant cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PRODUCTION_CATEGORIES, JSON.stringify(productionCategories));
    } catch (e) {
      console.error('Error saving production categories', e);
    }
  }, [productionCategories]);

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

  // Recipe editing and creation handlers
  const handleOpenNewRecipeModal = () => {
    const newRecipeTemplate: Recipe = {
      id: `recipe-pizza-${Date.now()}`,
      name: 'Pizzas / Pre-pizzas Caseras',
      category: 'pizzas',
      subtitle: 'Rendimiento base: 500 pre-pizzas (Masa fermentada a la piedra con salsa)',
      baseYieldUnits: 500,
      yieldUnitName: 'unidades',
      baseMinutes: 420,
      prepMinutes: 30,
      baseHours: 7.0,
      color: 'from-amber-600 to-red-600',
      badgeBg: 'bg-amber-100 border-amber-300 text-amber-900',
      badgeText: 'Pizzas & Pre-pizzas',
      freezerRule: {
        f1Percent: 100,
        f1TraysOccupied: 100,
        f1MaxTrays: 100,
        f2Percent: 0,
        f2TraysOccupied: 0,
        f2MaxTrays: 100,
        f1TraysText: '100%',
        f2TraysText: 'Libre',
        ruleNotes: 'Ultracongelación en bandejas de 10 unidades o apiladas con folex.',
      },
      ingredients: [
        { id: `ing-${Date.now()}-1`, name: 'Harina 000', amountGrams: 50000, unit: 'kg', category: 'harinas_feculas', notes: 'Harina de fuerza' },
        { id: `ing-${Date.now()}-2`, name: 'Agua', amountGrams: 30000, unit: 'kg', category: 'grasas_liquidos' },
        { id: `ing-${Date.now()}-3`, name: 'Muzzarella', amountGrams: 25000, unit: 'kg', category: 'lacteos', notes: 'Rallada o en trozos' },
        { id: `ing-${Date.now()}-4`, name: 'Salsa de Tomate / Puré', amountGrams: 15000, unit: 'kg', category: 'frescos_verduras' },
        { id: `ing-${Date.now()}-5`, name: 'Aceite de Girasol', amountGrams: 2000, unit: 'kg', category: 'grasas_liquidos' },
        { id: `ing-${Date.now()}-6`, name: 'Levadura Fresca', amountGrams: 1500, unit: 'kg', category: 'otros' },
        { id: `ing-${Date.now()}-7`, name: 'Sal Fina', amountGrams: 1000, unit: 'kg', category: 'especias_condimentos' },
      ],
      packaging: [
        { id: `pkg-${Date.now()}-1`, name: 'Bolsas para Pizza / Film', type: 'bolsa', baseQuantity: 500, description: 'Bolsa transparente para envasado al vacío o film' },
        { id: `pkg-${Date.now()}-2`, name: 'Etiquetas Pizza', type: 'etiqueta', baseQuantity: 500, description: 'Etiqueta con lote y vencimiento' },
      ],
      presentationOptions: [
        {
          id: 'pizza-pack-base',
          label: 'Unidades individuales envasadas',
          unitsPerPack: 1,
          basePacksCount: 500,
          packagingDescription: '500 pre-pizzas envasadas',
        }
      ],
      operationalNotes: [
        'Fermentación en bloque y bollo individual.',
        'Estirado en mesada con sémola y precocción rápida a la piedra.',
        'Pintado con salsa, queso muzzarella y ultracongelado rápido.',
      ],
      preparationSteps: [
        'Pesar harina, agua, levadura, aceite y sal.',
        'Amasar hasta lograr masa suave y elástica. Dejar reposar.',
        'Porcionar en bollos de 200-250g y bollar.',
        'Estirar, salsar y precocinar en horno.',
        'Colocar muzzarella, enfriar y llevar al freezer de ultracongelación.',
      ]
    };
    setIsCreatingRecipe(true);
    setEditingRecipe(newRecipeTemplate);
  };

  const handleSaveRecipe = async (updatedRecipe: Recipe) => {
    setRecipes((prev) => {
      const exists = prev.some((r) => r.id === updatedRecipe.id);
      if (exists) {
        return prev.map((r) => (r.id === updatedRecipe.id ? updatedRecipe : r));
      }
      return [...prev, updatedRecipe];
    });
    if (selectedRecipeDetail?.id === updatedRecipe.id) {
      setSelectedRecipeDetail(updatedRecipe);
    }
    setEditingRecipe(null);
    setIsCreatingRecipe(false);
    try {
      await saveRecipeToFirestore(updatedRecipe);
      setIsCloudSynced(true);
    } catch (e) {
      console.error('Error saving recipe to cloud:', e);
    }
  };

  const handleDeleteRecipe = async (recipe: Recipe) => {
    if (window.confirm(`¿Estás seguro de eliminar la receta "${recipe.name}"? Esta acción removerá el producto de las fichas técnicas.`)) {
      setRecipes((prev) => prev.filter((r) => r.id !== recipe.id));
      if (selectedRecipeDetail?.id === recipe.id) {
        setSelectedRecipeDetail(null);
      }
      try {
        await deleteRecipeFromFirestore(recipe.id);
        setIsCloudSynced(true);
      } catch (e) {
        console.error('Error deleting recipe from cloud:', e);
      }
    }
  };

  const handleConfirmResetRecipes = async () => {
    setIsResettingRecipes(true);
    try {
      setRecipes(INITIAL_RECIPES);
      localStorage.removeItem(STORAGE_KEY_RECIPES);
      await resetRecipesInFirestore();
      setIsCloudSynced(true);
      setShowResetConfirmModal(false);
    } catch (e) {
      console.error('Error resetting recipes in cloud:', e);
    } finally {
      setIsResettingRecipes(false);
    }
  };

  // Master Ingredients & Categories Handlers
  const handleSaveMasterIngredient = async (item: MasterIngredient) => {
    setMasterIngredients((prev) => {
      const idx = prev.findIndex((i) => i.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = item;
        return next;
      }
      return [...prev, item];
    });

    // Synchronize recipe ingredients with updated category/unit
    setRecipes((prevRecipes) => {
      let modified = false;
      const nextRecipes = prevRecipes.map((r) => {
        const hasMatch = r.ingredients.some(
          (ing) => ing.name.toLowerCase().trim() === item.name.toLowerCase().trim()
        );
        if (!hasMatch) return r;
        modified = true;
        return {
          ...r,
          ingredients: r.ingredients.map((ing) => {
            if (ing.name.toLowerCase().trim() === item.name.toLowerCase().trim()) {
              return {
                ...ing,
                category: item.categoryId,
                unit: ing.unit || item.defaultUnit,
              };
            }
            return ing;
          }),
        };
      });

      if (modified) {
        try {
          localStorage.setItem(STORAGE_KEY_RECIPES, JSON.stringify(nextRecipes));
          nextRecipes.forEach((r) => saveRecipeToFirestore(r).catch(console.error));
        } catch (e) {
          console.error(e);
        }
        return nextRecipes;
      }
      return prevRecipes;
    });

    try {
      await saveMasterIngredientToFirestore(item);
      setIsCloudSynced(true);
    } catch (e) {
      console.error('Error saving master ingredient to cloud:', e);
    }
  };

  const handleDeleteMasterIngredient = async (itemId: string) => {
    setMasterIngredients((prev) => prev.filter((i) => i.id !== itemId));
    try {
      await deleteMasterIngredientFromFirestore(itemId);
      setIsCloudSynced(true);
    } catch (e) {
      console.error('Error deleting master ingredient from cloud:', e);
    }
  };

  const handleSaveAllMasterIngredients = async (items: MasterIngredient[]) => {
    setMasterIngredients(items);

    // Synchronize recipes with the entire updated catalog
    setRecipes((prevRecipes) => {
      const masterMap = new Map(items.map((m) => [m.name.toLowerCase().trim(), m]));
      let modified = false;
      const nextRecipes = prevRecipes.map((r) => {
        let rModified = false;
        const updatedIngredients = r.ingredients.map((ing) => {
          const master = masterMap.get(ing.name.toLowerCase().trim());
          if (master && master.categoryId !== ing.category) {
            rModified = true;
            return {
              ...ing,
              category: master.categoryId,
            };
          }
          return ing;
        });
        if (rModified) {
          modified = true;
          return { ...r, ingredients: updatedIngredients };
        }
        return r;
      });

      if (modified) {
        try {
          localStorage.setItem(STORAGE_KEY_RECIPES, JSON.stringify(nextRecipes));
          nextRecipes.forEach((r) => saveRecipeToFirestore(r).catch(console.error));
        } catch (e) {
          console.error(e);
        }
        return nextRecipes;
      }
      return prevRecipes;
    });

    try {
      await saveAllMasterIngredientsToFirestore(items);
      setIsCloudSynced(true);
    } catch (e) {
      console.error('Error saving all master ingredients to cloud:', e);
    }
  };

  const handleSaveIngredientCategory = async (cat: IngredientCategoryConfig) => {
    setIngredientCategories((prev) => {
      const idx = prev.findIndex((c) => c.id === cat.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = cat;
        return next;
      }
      return [...prev, cat];
    });
    try {
      await saveIngredientCategoryToFirestore(cat);
      setIsCloudSynced(true);
    } catch (e) {
      console.error('Error saving ingredient category to cloud:', e);
    }
  };

  const handleDeleteIngredientCategory = async (catId: string, reassignToCatId?: string) => {
    // Reassign master ingredients if needed
    if (reassignToCatId) {
      setMasterIngredients((prev) => {
        const next = prev.map((ing) => (ing.categoryId === catId ? { ...ing, categoryId: reassignToCatId } : ing));
        try {
          localStorage.setItem(STORAGE_KEY_MASTER_INGREDIENTS, JSON.stringify(next));
          saveAllMasterIngredientsToFirestore(next).catch(console.error);
        } catch (e) {
          console.error(e);
        }
        return next;
      });
    }

    setIngredientCategories((prev) => {
      const next = prev.filter((c) => c.id !== catId).map((c, idx) => ({ ...c, order: idx + 1 }));
      try {
        localStorage.setItem(STORAGE_KEY_INGREDIENT_CATEGORIES, JSON.stringify(next));
        saveAllIngredientCategoriesToFirestore(next).catch(console.error);
      } catch (e) {
        console.error(e);
      }
      return next;
    });

    try {
      await deleteIngredientCategoryFromFirestore(catId);
      setIsCloudSynced(true);
    } catch (e) {
      console.error('Error deleting ingredient category from cloud:', e);
    }
  };

  const handleSaveAllIngredientCategories = async (cats: IngredientCategoryConfig[]) => {
    setIngredientCategories(cats);
    try {
      localStorage.setItem(STORAGE_KEY_INGREDIENT_CATEGORIES, JSON.stringify(cats));
      await saveAllIngredientCategoriesToFirestore(cats);
      setIsCloudSynced(true);
    } catch (e) {
      console.error('Error saving all ingredient categories to cloud:', e);
    }
  };

  const handleSaveProductionCategory = async (pCat: ProductionCategoryConfig) => {
    setProductionCategories((prev) => {
      const idx = prev.findIndex((c) => c.id === pCat.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = pCat;
        return next;
      }
      return [...prev, pCat];
    });
    try {
      await saveProductionCategoryToFirestore(pCat);
      setIsCloudSynced(true);
    } catch (e) {
      console.error('Error saving production category to cloud:', e);
    }
  };

  const handleDeleteProductionCategory = async (pCatId: string, reassignToProdCatId?: string) => {
    // Reassign recipes if needed
    if (reassignToProdCatId) {
      setRecipes((prev) => {
        const next = prev.map((r) => (r.category === pCatId ? { ...r, category: reassignToProdCatId } : r));
        try {
          localStorage.setItem(STORAGE_KEY_RECIPES, JSON.stringify(next));
          saveAllRecipesToFirestore(next).catch(console.error);
        } catch (e) {
          console.error(e);
        }
        return next;
      });
    }

    setProductionCategories((prev) => {
      const next = prev.filter((c) => c.id !== pCatId).map((c, idx) => ({ ...c, order: idx + 1 }));
      try {
        localStorage.setItem(STORAGE_KEY_PRODUCTION_CATEGORIES, JSON.stringify(next));
        saveAllProductionCategoriesToFirestore(next).catch(console.error);
      } catch (e) {
        console.error(e);
      }
      return next;
    });

    try {
      await deleteProductionCategoryFromFirestore(pCatId);
      setIsCloudSynced(true);
    } catch (e) {
      console.error('Error deleting production category from cloud:', e);
    }
  };

  const handleSaveAllProductionCategories = async (pCats: ProductionCategoryConfig[]) => {
    setProductionCategories(pCats);
    try {
      localStorage.setItem(STORAGE_KEY_PRODUCTION_CATEGORIES, JSON.stringify(pCats));
      await saveAllProductionCategoriesToFirestore(pCats);
      setIsCloudSynced(true);
    } catch (e) {
      console.error('Error saving all production categories to cloud:', e);
    }
  };

  const handleSaveAllRecipes = async (updatedRecipes: Recipe[]) => {
    setRecipes(updatedRecipes);
    try {
      localStorage.setItem(STORAGE_KEY_RECIPES, JSON.stringify(updatedRecipes));
      await saveAllRecipesToFirestore(updatedRecipes);
      setIsCloudSynced(true);
    } catch (e) {
      console.error('Error saving all recipes to cloud:', e);
    }
  };

  const handleUpdateRecipeCategory = async (recipeId: string, newCategoryId: string) => {
    let updatedRecipe: Recipe | undefined;
    setRecipes((prev) =>
      prev.map((r) => {
        if (r.id === recipeId) {
          updatedRecipe = { ...r, category: newCategoryId };
          return updatedRecipe;
        }
        return r;
      })
    );
    if (updatedRecipe) {
      try {
        await saveRecipeToFirestore(updatedRecipe);
        setIsCloudSynced(true);
      } catch (e) {
        console.error('Error updating recipe category in cloud:', e);
      }
    }
  };

  const handleResetMasterCatalog = async () => {
    setMasterIngredients(INITIAL_MASTER_INGREDIENTS);
    setIngredientCategories(DEFAULT_INGREDIENT_CATEGORIES);
    setProductionCategories(DEFAULT_PRODUCTION_CATEGORIES);
    try {
      await saveAllMasterIngredientsToFirestore(INITIAL_MASTER_INGREDIENTS);
      await saveAllIngredientCategoriesToFirestore(DEFAULT_INGREDIENT_CATEGORIES);
      await saveAllProductionCategoriesToFirestore(DEFAULT_PRODUCTION_CATEGORIES);
      setIsCloudSynced(true);
    } catch (e) {
      console.error('Error resetting master catalog in cloud:', e);
    }
  };

  // =========================================================================
  // SHARED INVENTORY & STOCK SYNCHRONIZATION HANDLERS (CALENDAR <-> SHOPPING LIST)
  // =========================================================================
  const handleToggleCheckItem = (nameOrKey: string, category?: string, isPackaging?: boolean) => {
    setCheckedItems((prev) => {
      const cleanName = nameOrKey.toLowerCase().replace(/^(ing_[a-z0-9_]+_|pkg_)/, '').trim();
      const isCurrentlyChecked = Boolean(
        prev[nameOrKey] ||
        prev[cleanName] ||
        (category ? prev[`ing_${category}_${cleanName}`] : false) ||
        prev[`pkg_${cleanName}`]
      );
      const nextVal = !isCurrentlyChecked;

      const next = { ...prev };
      next[nameOrKey] = nextVal;
      next[cleanName] = nextVal;
      if (category) {
        next[`ing_${category}_${cleanName}`] = nextVal;
      }
      if (isPackaging || nameOrKey.startsWith('pkg_')) {
        next[`pkg_${cleanName}`] = nextVal;
      }

      try {
        localStorage.setItem(STORAGE_KEY_CHECKED, JSON.stringify(next));
        localStorage.setItem(STORAGE_KEY_WEEKLY_STOCK, JSON.stringify(next));
      } catch (e) {
        console.error('Error saving checked items', e);
      }
      saveInventoryStateToFirestore({ checkedItems: next, factoryStock }).catch(console.error);
      return next;
    });
  };

  const handleMarkAllInStock = (itemKeys: string[]) => {
    setCheckedItems((prev) => {
      const next = { ...prev };
      itemKeys.forEach((key) => {
        const cleanName = key.toLowerCase().replace(/^(ing_[a-z0-9_]+_|pkg_)/, '').trim();
        next[key] = true;
        next[cleanName] = true;
        if (key.startsWith('pkg_')) {
          next[`pkg_${cleanName}`] = true;
        }
      });

      try {
        localStorage.setItem(STORAGE_KEY_CHECKED, JSON.stringify(next));
        localStorage.setItem(STORAGE_KEY_WEEKLY_STOCK, JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      saveInventoryStateToFirestore({ checkedItems: next, factoryStock }).catch(console.error);
      return next;
    });
  };

  const handleClearAllStock = () => {
    setCheckedItems({});
    try {
      localStorage.setItem(STORAGE_KEY_CHECKED, JSON.stringify({}));
      localStorage.setItem(STORAGE_KEY_WEEKLY_STOCK, JSON.stringify({}));
    } catch (e) {
      console.error(e);
    }
    saveInventoryStateToFirestore({ checkedItems: {}, factoryStock }).catch(console.error);
  };

  const handleUpdateFactoryStock = (rowId: string, value: number) => {
    setFactoryStock((prev) => {
      const next = { ...prev, [rowId]: value };
      try {
        localStorage.setItem(STORAGE_KEY_FACTORY_STOCK, JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      saveInventoryStateToFirestore({ checkedItems, factoryStock: next }).catch(console.error);
      return next;
    });
  };

  const handleCoverStock = (
    rowId: string,
    bufferedAmount: number,
    name?: string,
    category?: string,
    isPackaging?: boolean
  ) => {
    const cleanName = (name || rowId).toLowerCase().replace(/^(ing_[a-z0-9_]+_|pkg_)/, '').trim();
    const nextFactoryStock = { ...factoryStock, [rowId]: bufferedAmount };
    const nextChecked = {
      ...checkedItems,
      [rowId]: true,
      [cleanName]: true,
      ...(category ? { [`ing_${category}_${cleanName}`]: true } : {}),
      ...(isPackaging || rowId.startsWith('pkg_') ? { [`pkg_${cleanName}`]: true } : {}),
    };

    setFactoryStock(nextFactoryStock);
    setCheckedItems(nextChecked);

    try {
      localStorage.setItem(STORAGE_KEY_FACTORY_STOCK, JSON.stringify(nextFactoryStock));
      localStorage.setItem(STORAGE_KEY_CHECKED, JSON.stringify(nextChecked));
      localStorage.setItem(STORAGE_KEY_WEEKLY_STOCK, JSON.stringify(nextChecked));
    } catch (e) {
      console.error(e);
    }
    saveInventoryStateToFirestore({ checkedItems: nextChecked, factoryStock: nextFactoryStock }).catch(console.error);
  };

  const handleClearItemStock = (
    rowId: string,
    name?: string,
    category?: string,
    isPackaging?: boolean
  ) => {
    const cleanName = (name || rowId).toLowerCase().replace(/^(ing_[a-z0-9_]+_|pkg_)/, '').trim();
    const nextFactoryStock = { ...factoryStock };
    delete nextFactoryStock[rowId];

    const nextChecked = {
      ...checkedItems,
      [rowId]: false,
      [cleanName]: false,
      ...(category ? { [`ing_${category}_${cleanName}`]: false } : {}),
      ...(isPackaging || rowId.startsWith('pkg_') ? { [`pkg_${cleanName}`]: false } : {}),
    };

    setFactoryStock(nextFactoryStock);
    setCheckedItems(nextChecked);

    try {
      localStorage.setItem(STORAGE_KEY_FACTORY_STOCK, JSON.stringify(nextFactoryStock));
      localStorage.setItem(STORAGE_KEY_CHECKED, JSON.stringify(nextChecked));
      localStorage.setItem(STORAGE_KEY_WEEKLY_STOCK, JSON.stringify(nextChecked));
    } catch (e) {
      console.error(e);
    }
    saveInventoryStateToFirestore({ checkedItems: nextChecked, factoryStock: nextFactoryStock }).catch(console.error);
  };

  const handleSelectAllVisible = (rowIds: string[], setAllInStock: boolean) => {
    setCheckedItems((prev) => {
      const next = { ...prev };
      rowIds.forEach((id) => {
        const cleanName = id.toLowerCase().replace(/^(ing_[a-z0-9_]+_|pkg_)/, '').trim();
        next[id] = setAllInStock;
        next[cleanName] = setAllInStock;
        if (id.startsWith('pkg_')) {
          next[`pkg_${cleanName}`] = setAllInStock;
        }
      });

      try {
        localStorage.setItem(STORAGE_KEY_CHECKED, JSON.stringify(next));
        localStorage.setItem(STORAGE_KEY_WEEKLY_STOCK, JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      saveInventoryStateToFirestore({ checkedItems: next, factoryStock }).catch(console.error);
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
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        activeBatches={activeBatches}
        f1Percent={f1Percent}
        f2Percent={f2Percent}
        onOpenQuickBatch={() => setPlanningRecipe(recipes[0])}
        onOpenMasterCatalog={() => setShowMasterCatalogModal(true)}
        isCloudSynced={isCloudSynced}
      />

      {/* Main Container (98% width for spacious planning) */}
      <main className="flex-1 w-[98%] mx-auto px-2 sm:px-4 lg:px-6 pt-6 sm:pt-8">
        {/* Tab 1: Production Calendar */}
        {currentTab === 'calendar' && (
          <ProductionCalendar
            recipes={recipes}
            activeBatches={activeBatches}
            checkedItems={checkedItems}
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
}
