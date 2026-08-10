import React, { useState, useMemo } from 'react';
import {
  MasterIngredient,
  IngredientCategoryConfig,
  ProductionCategoryConfig,
  Recipe
} from '../types';
import {
  X,
  Plus,
  Edit2,
  Trash2,
  Check,
  Search,
  Layers,
  Sparkles,
  RefreshCw,
  FolderPlus,
  PackageCheck,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  Info,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  ListPlus,
  Tag,
  ArrowRightLeft,
  Filter,
  SlidersHorizontal,
  CheckSquare,
  Square
} from 'lucide-react';
import { INITIAL_MASTER_INGREDIENTS } from '../data/masterIngredientsData';
import { DEFAULT_INGREDIENT_CATEGORIES, DEFAULT_PRODUCTION_CATEGORIES } from '../data/categoriesData';

export interface MasterCatalogModalProps {
  isOpen?: boolean;
  onClose: () => void;
  masterIngredients?: MasterIngredient[];
  ingredientCategories?: IngredientCategoryConfig[];
  productionCategories?: ProductionCategoryConfig[];
  recipes?: Recipe[];
  onSaveIngredient?: (item: MasterIngredient) => void;
  onDeleteIngredient?: (itemId: string) => void;
  onSaveAllIngredients?: (items: MasterIngredient[]) => void;
  onSaveMasterIngredients?: (items: MasterIngredient[]) => void;
  onSaveIngredientCategory?: (cat: IngredientCategoryConfig) => void;
  onDeleteIngredientCategory?: (catId: string, reassignToCatId?: string) => void;
  onSaveAllIngredientCategories?: (cats: IngredientCategoryConfig[]) => void;
  onSaveIngredientCategories?: (cats: IngredientCategoryConfig[]) => void;
  onSaveProductionCategory?: (pCat: ProductionCategoryConfig) => void;
  onDeleteProductionCategory?: (pCatId: string, reassignToProdCatId?: string) => void;
  onSaveAllProductionCategories?: (pCats: ProductionCategoryConfig[]) => void;
  onSaveProductionCategories?: (pCats: ProductionCategoryConfig[]) => void;
  onSaveRecipe?: (recipe: Recipe) => void;
  onSaveAllRecipes?: (recipes: Recipe[]) => void;
  onUpdateRecipeCategory?: (recipeId: string, newCategoryId: string) => void;
  onResetToDefaults?: () => void;
}

type TabType = 'ingredients' | 'ing_categories' | 'prod_categories' | 'maintenance';

export const MasterCatalogModal: React.FC<MasterCatalogModalProps> = ({
  isOpen = true,
  onClose,
  masterIngredients = INITIAL_MASTER_INGREDIENTS,
  ingredientCategories = DEFAULT_INGREDIENT_CATEGORIES,
  productionCategories = DEFAULT_PRODUCTION_CATEGORIES,
  recipes = [],
  onSaveIngredient,
  onDeleteIngredient,
  onSaveAllIngredients,
  onSaveMasterIngredients,
  onSaveIngredientCategory,
  onDeleteIngredientCategory,
  onSaveAllIngredientCategories,
  onSaveIngredientCategories,
  onSaveProductionCategory,
  onDeleteProductionCategory,
  onSaveAllProductionCategories,
  onSaveProductionCategories,
  onSaveRecipe,
  onSaveAllRecipes,
  onUpdateRecipeCategory,
  onResetToDefaults,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('prod_categories');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Edit / New Ingredient state
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null);
  const [ingName, setIngName] = useState('');
  const [ingCategory, setIngCategory] = useState(ingredientCategories[0]?.id || 'lacteos');
  const [ingUnit, setIngUnit] = useState<'kg' | 'g' | 'L' | 'ml' | 'u' | 'paquetes'>('kg');
  const [ingNotes, setIngNotes] = useState('');
  const [showAddIngForm, setShowAddIngForm] = useState(false);
  const [deletingIngItem, setDeletingIngItem] = useState<MasterIngredient | null>(null);

  // Edit Ingredient Category state
  const [editingIngCatId, setEditingIngCatId] = useState<string | null>(null);
  const [ingCatName, setIngCatName] = useState('');
  const [ingCatIcon, setIngCatIcon] = useState('📦');
  const [ingCatDesc, setIngCatDesc] = useState('');
  const [showAddIngCatForm, setShowAddIngCatForm] = useState(false);
  const [deletingIngCat, setDeletingIngCat] = useState<IngredientCategoryConfig | null>(null);
  const [reassignIngCatTargetId, setReassignIngCatTargetId] = useState<string>('otros');

  // Edit Production Category state
  const [editingProdCatId, setEditingProdCatId] = useState<string | null>(null);
  const [prodCatName, setProdCatName] = useState('');
  const [prodCatIcon, setProdCatIcon] = useState('🏭');
  const [prodCatBadgeText, setProdCatBadgeText] = useState('');
  const [selectedRecipeIdsForProdCat, setSelectedRecipeIdsForProdCat] = useState<string[]>([]);
  const [showAddProdCatForm, setShowAddProdCatForm] = useState(false);
  const [deletingProdCat, setDeletingProdCat] = useState<ProductionCategoryConfig | null>(null);
  const [reassignProdCatTargetId, setReassignProdCatTargetId] = useState<string>('otros');

  // Dedicated "Manage Recipes for Production Line" Modal state
  const [managingRecipesProdCat, setManagingRecipesProdCat] = useState<ProductionCategoryConfig | null>(null);
  const [managingRecipeIds, setManagingRecipeIds] = useState<string[]>([]);
  const [recipeSearchInManageModal, setRecipeSearchInManageModal] = useState('');

  // Reset confirmation state
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Safe arrays
  const safeMasterIngredients = masterIngredients || [];
  const safeIngredientCategories = ingredientCategories || [];
  const safeProductionCategories = productionCategories || [];
  const safeRecipes = recipes || [];

  // Calculate usage of ingredients across current recipes
  const ingredientUsageMap = useMemo(() => {
    const map = new Map<string, string[]>();
    safeRecipes.forEach((r) => {
      if (r && Array.isArray(r.ingredients)) {
        r.ingredients.forEach((ing) => {
          if (ing && ing.name) {
            const normName = ing.name.toLowerCase().trim();
            const list = map.get(normName) || [];
            if (!list.includes(r.name)) {
              list.push(r.name);
            }
            map.set(normName, list);
          }
        });
      }
    });
    return map;
  }, [safeRecipes]);

  // Filtered ingredients
  const filteredIngredients = useMemo(() => {
    return safeMasterIngredients.filter((ing) => {
      if (!ing || !ing.name) return false;
      const matchesSearch =
        ing.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ing.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat =
        selectedCategoryFilter === 'all' || ing.categoryId === selectedCategoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [safeMasterIngredients, searchTerm, selectedCategoryFilter]);

  // ==========================================
  // HANDLERS FOR MASTER INGREDIENTS
  // ==========================================
  const handleSaveIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingName.trim()) return;

    if (editingIngredientId) {
      // Update existing
      const updatedItem: MasterIngredient = {
        id: editingIngredientId,
        name: ingName.trim(),
        categoryId: ingCategory,
        defaultUnit: ingUnit,
        notes: ingNotes.trim() || undefined,
      };

      if (onSaveIngredient) {
        onSaveIngredient(updatedItem);
      } else {
        const nextList = safeMasterIngredients.map((item) =>
          item.id === editingIngredientId ? updatedItem : item
        );
        if (onSaveAllIngredients) onSaveAllIngredients(nextList);
        if (onSaveMasterIngredients) onSaveMasterIngredients(nextList);
      }

      showToast(`Insumo "${updatedItem.name}" actualizado correctamente.`);
      setEditingIngredientId(null);
      setShowAddIngForm(false);
    } else {
      // Create new
      const newId = `ing-${Date.now()}`;
      const newItem: MasterIngredient = {
        id: newId,
        name: ingName.trim(),
        categoryId: ingCategory,
        defaultUnit: ingUnit,
        notes: ingNotes.trim() || undefined,
      };

      if (onSaveIngredient) {
        onSaveIngredient(newItem);
      } else {
        const nextList = [...safeMasterIngredients, newItem];
        if (onSaveAllIngredients) onSaveAllIngredients(nextList);
        if (onSaveMasterIngredients) onSaveMasterIngredients(nextList);
      }

      showToast(`Insumo "${newItem.name}" agregado al catálogo maestro.`);
      setShowAddIngForm(false);
    }

    // Reset form
    setIngName('');
    setIngNotes('');
  };

  const startEditIngredient = (item: MasterIngredient) => {
    setEditingIngredientId(item.id);
    setIngName(item.name);
    setIngCategory(item.categoryId);
    setIngUnit(item.defaultUnit);
    setIngNotes(item.notes || '');
    setShowAddIngForm(true);
  };

  const confirmDeleteIngredient = () => {
    if (!deletingIngItem) return;
    const itemId = deletingIngItem.id;
    const itemName = deletingIngItem.name;

    if (onDeleteIngredient) {
      onDeleteIngredient(itemId);
    } else {
      const nextList = safeMasterIngredients.filter((item) => item.id !== itemId);
      if (onSaveAllIngredients) onSaveAllIngredients(nextList);
      if (onSaveMasterIngredients) onSaveMasterIngredients(nextList);
    }

    showToast(`Insumo "${itemName}" eliminado del catálogo.`);
    setDeletingIngItem(null);
  };

  // Re-export / auto-sync all ingredients from all recipes into master catalog
  const handleSyncFromRecipes = () => {
    const existingNormNames = new Set(
      safeMasterIngredients.map((item) => item.name.toLowerCase().trim())
    );
    const newItems: MasterIngredient[] = [...safeMasterIngredients];
    let addedCount = 0;

    safeRecipes.forEach((recipe) => {
      if (recipe && Array.isArray(recipe.ingredients)) {
        recipe.ingredients.forEach((ing) => {
          if (ing && ing.name) {
            const norm = ing.name.toLowerCase().trim();
            if (norm && !norm.startsWith('agua') && !existingNormNames.has(norm)) {
              existingNormNames.add(norm);
              newItems.push({
                id: `ing-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                name: ing.name.trim(),
                categoryId: ing.category || 'otros',
                defaultUnit: ing.unit || 'kg',
                notes: ing.notes,
              });
              addedCount++;
            }
          }
        });
      }
    });

    if (addedCount > 0) {
      newItems.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
      if (onSaveAllIngredients) onSaveAllIngredients(newItems);
      if (onSaveMasterIngredients) onSaveMasterIngredients(newItems);
      showToast(`¡Se sincronizaron y agregaron ${addedCount} insumos desde las recetas!`);
    } else {
      showToast('Todos los insumos de las recetas ya están presentes en el catálogo maestro.', 'info');
    }
  };

  // ==========================================
  // HANDLERS FOR INGREDIENT CATEGORIES
  // ==========================================
  const handleSaveIngCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingCatName.trim()) return;

    if (editingIngCatId) {
      const updatedCat: IngredientCategoryConfig = {
        id: editingIngCatId,
        name: ingCatName.trim(),
        icon: ingCatIcon.trim() || '📦',
        description: ingCatDesc.trim() || undefined,
        order: safeIngredientCategories.find((c) => c.id === editingIngCatId)?.order || 1,
      };

      if (onSaveIngredientCategory) {
        onSaveIngredientCategory(updatedCat);
      } else {
        const nextList = safeIngredientCategories.map((c) =>
          c.id === editingIngCatId ? updatedCat : c
        );
        if (onSaveAllIngredientCategories) onSaveAllIngredientCategories(nextList);
        if (onSaveIngredientCategories) onSaveIngredientCategories(nextList);
      }

      showToast(`Categoría "${updatedCat.name}" guardada.`);
      setEditingIngCatId(null);
      setShowAddIngCatForm(false);
    } else {
      const newId = `cat-${Date.now()}`;
      const newCat: IngredientCategoryConfig = {
        id: newId,
        name: ingCatName.trim(),
        icon: ingCatIcon.trim() || '📦',
        description: ingCatDesc.trim() || undefined,
        order: safeIngredientCategories.length + 1,
      };

      if (onSaveIngredientCategory) {
        onSaveIngredientCategory(newCat);
      } else {
        const nextList = [...safeIngredientCategories, newCat];
        if (onSaveAllIngredientCategories) onSaveAllIngredientCategories(nextList);
        if (onSaveIngredientCategories) onSaveIngredientCategories(nextList);
      }

      showToast(`Nueva categoría "${newCat.name}" creada.`);
      setShowAddIngCatForm(false);
    }
    setIngCatName('');
    setIngCatDesc('');
  };

  const startEditIngCat = (cat: IngredientCategoryConfig) => {
    setEditingIngCatId(cat.id);
    setIngCatName(cat.name);
    setIngCatIcon(cat.icon);
    setIngCatDesc(cat.description || '');
    setShowAddIngCatForm(true);
  };

  const handleMoveIngCategory = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= safeIngredientCategories.length) return;

    const list = [...safeIngredientCategories];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const reordered = list.map((item, idx) => ({ ...item, order: idx + 1 }));

    if (onSaveAllIngredientCategories) {
      onSaveAllIngredientCategories(reordered);
    } else if (onSaveIngredientCategories) {
      onSaveIngredientCategories(reordered);
    }
    showToast('Orden de categorías de insumos actualizado.');
  };

  const handleStartDeleteIngCat = (cat: IngredientCategoryConfig) => {
    setDeletingIngCat(cat);
    // Find default remaining target
    const remaining = safeIngredientCategories.filter((c) => c.id !== cat.id);
    const defaultTarget = remaining.find((c) => c.id === 'otros') || remaining[0];
    setReassignIngCatTargetId(defaultTarget ? defaultTarget.id : 'otros');
  };

  const confirmDeleteIngCat = () => {
    if (!deletingIngCat) return;
    const catId = deletingIngCat.id;
    const catName = deletingIngCat.name;
    const assignedCount = safeMasterIngredients.filter((i) => i.categoryId === catId).length;

    // 1. Reassign master ingredients if there are any
    if (assignedCount > 0 && reassignIngCatTargetId) {
      const updatedIngredients = safeMasterIngredients.map((ing) =>
        ing.categoryId === catId ? { ...ing, categoryId: reassignIngCatTargetId } : ing
      );
      if (onSaveAllIngredients) onSaveAllIngredients(updatedIngredients);
      if (onSaveMasterIngredients) onSaveMasterIngredients(updatedIngredients);
    }

    // 2. Delete the category
    if (onDeleteIngredientCategory) {
      onDeleteIngredientCategory(catId, reassignIngCatTargetId);
    } else {
      const nextList = safeIngredientCategories
        .filter((c) => c.id !== catId)
        .map((c, idx) => ({ ...c, order: idx + 1 }));
      if (onSaveAllIngredientCategories) onSaveAllIngredientCategories(nextList);
      if (onSaveIngredientCategories) onSaveIngredientCategories(nextList);
    }

    showToast(`Categoría "${catName}" eliminada correctamente.`);
    setDeletingIngCat(null);
  };

  // ==========================================
  // HANDLERS FOR PRODUCTION CATEGORIES / LINES
  // ==========================================
  const handleSaveProdCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodCatName.trim()) return;

    let targetCatId = editingProdCatId;

    if (editingProdCatId) {
      // Edit existing
      const updatedCat: ProductionCategoryConfig = {
        id: editingProdCatId,
        name: prodCatName.trim(),
        icon: prodCatIcon.trim() || '🏭',
        badgeText: prodCatBadgeText.trim() || prodCatName.trim(),
        order: safeProductionCategories.find((c) => c.id === editingProdCatId)?.order || 1,
      };

      if (onSaveProductionCategory) {
        onSaveProductionCategory(updatedCat);
      } else {
        const nextList = safeProductionCategories.map((c) =>
          c.id === editingProdCatId ? updatedCat : c
        );
        if (onSaveAllProductionCategories) onSaveAllProductionCategories(nextList);
        if (onSaveProductionCategories) onSaveProductionCategories(nextList);
      }
      targetCatId = editingProdCatId;
    } else {
      // Create new
      // Generate clean ID from name
      const cleanSlug = prodCatName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '_')
        .replace(/^_+|_+$/g, '') || `prod_${Date.now()}`;
      
      const newId = safeProductionCategories.some((c) => c.id === cleanSlug)
        ? `${cleanSlug}_${Date.now()}`
        : cleanSlug;

      const newCat: ProductionCategoryConfig = {
        id: newId,
        name: prodCatName.trim(),
        icon: prodCatIcon.trim() || '🏭',
        badgeText: prodCatBadgeText.trim() || prodCatName.trim(),
        order: safeProductionCategories.length + 1,
      };

      if (onSaveProductionCategory) {
        onSaveProductionCategory(newCat);
      } else {
        const nextList = [...safeProductionCategories, newCat];
        if (onSaveAllProductionCategories) onSaveAllProductionCategories(nextList);
        if (onSaveProductionCategories) onSaveProductionCategories(nextList);
      }
      targetCatId = newId;
    }

    // Now update assigned recipes
    if (targetCatId) {
      let recipesChanged = false;
      const updatedRecipes = safeRecipes.map((r) => {
        const isSelected = selectedRecipeIdsForProdCat.includes(r.id);
        const wasInThisCat = r.category === targetCatId;

        if (isSelected && !wasInThisCat) {
          recipesChanged = true;
          return { ...r, category: targetCatId };
        } else if (!isSelected && wasInThisCat) {
          recipesChanged = true;
          return { ...r, category: 'otros' };
        }
        return r;
      });

      if (recipesChanged) {
        if (onSaveAllRecipes) {
          onSaveAllRecipes(updatedRecipes);
        } else if (onSaveRecipe) {
          updatedRecipes.forEach((r) => onSaveRecipe(r));
        }
      }
    }

    showToast(
      editingProdCatId
        ? `Línea de producción "${prodCatName}" actualizada.`
        : `Nueva línea "${prodCatName}" creada con ${selectedRecipeIdsForProdCat.length} receta(s) asignada(s).`
    );

    setEditingProdCatId(null);
    setShowAddProdCatForm(false);
    setProdCatName('');
    setProdCatBadgeText('');
    setSelectedRecipeIdsForProdCat([]);
  };

  const startEditProdCat = (cat: ProductionCategoryConfig) => {
    setEditingProdCatId(cat.id);
    setProdCatName(cat.name);
    setProdCatIcon(cat.icon);
    setProdCatBadgeText(cat.badgeText || cat.name);
    // Preload recipes currently assigned to this category
    const assignedIds = safeRecipes
      .filter((r) => r.category === cat.id || r.category?.toLowerCase() === cat.id.toLowerCase())
      .map((r) => r.id);
    setSelectedRecipeIdsForProdCat(assignedIds);
    setShowAddProdCatForm(true);
  };

  const handleMoveProdCategory = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= safeProductionCategories.length) return;

    const list = [...safeProductionCategories];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const reordered = list.map((item, idx) => ({ ...item, order: idx + 1 }));

    if (onSaveAllProductionCategories) {
      onSaveAllProductionCategories(reordered);
    } else if (onSaveProductionCategories) {
      onSaveProductionCategories(reordered);
    }
    showToast('Orden de líneas de producción actualizado.');
  };

  const handleStartDeleteProdCat = (cat: ProductionCategoryConfig) => {
    setDeletingProdCat(cat);
    const remaining = safeProductionCategories.filter((c) => c.id !== cat.id);
    const defaultTarget = remaining.find((c) => c.id === 'otros') || remaining[0];
    setReassignProdCatTargetId(defaultTarget ? defaultTarget.id : 'otros');
  };

  const confirmDeleteProdCat = () => {
    if (!deletingProdCat) return;
    const catId = deletingProdCat.id;
    const catName = deletingProdCat.name;
    const assignedRecipes = safeRecipes.filter((r) => r.category === catId);

    // 1. Reassign recipes if there are any
    if (assignedRecipes.length > 0 && reassignProdCatTargetId) {
      const updatedRecipes = safeRecipes.map((r) =>
        r.category === catId ? { ...r, category: reassignProdCatTargetId } : r
      );
      if (onSaveAllRecipes) {
        onSaveAllRecipes(updatedRecipes);
      } else if (onSaveRecipe) {
        updatedRecipes.forEach((r) => onSaveRecipe(r));
      }
    }

    // 2. Delete production category
    if (onDeleteProductionCategory) {
      onDeleteProductionCategory(catId, reassignProdCatTargetId);
    } else {
      const nextList = safeProductionCategories
        .filter((c) => c.id !== catId)
        .map((c, idx) => ({ ...c, order: idx + 1 }));
      if (onSaveAllProductionCategories) onSaveAllProductionCategories(nextList);
      if (onSaveProductionCategories) onSaveProductionCategories(nextList);
    }

    showToast(`Línea de producción "${catName}" eliminada correctamente.`);
    setDeletingProdCat(null);
  };

  // Quick single recipe category transfer
  const handleQuickUnassignRecipe = (recipeId: string, recipeName: string) => {
    if (onUpdateRecipeCategory) {
      onUpdateRecipeCategory(recipeId, 'otros');
    } else if (onSaveRecipe) {
      const r = safeRecipes.find((item) => item.id === recipeId);
      if (r) onSaveRecipe({ ...r, category: 'otros' });
    } else if (onSaveAllRecipes) {
      const updated = safeRecipes.map((r) => (r.id === recipeId ? { ...r, category: 'otros' } : r));
      onSaveAllRecipes(updated);
    }
    showToast(`"${recipeName}" movida a 'Otros / General'.`, 'info');
  };

  // Dedicated "Manage Recipes" Modal Open/Save
  const openManageRecipesModal = (cat: ProductionCategoryConfig) => {
    setManagingRecipesProdCat(cat);
    const assignedIds = safeRecipes
      .filter((r) => r.category === cat.id || r.category?.toLowerCase() === cat.id.toLowerCase())
      .map((r) => r.id);
    setManagingRecipeIds(assignedIds);
    setRecipeSearchInManageModal('');
  };

  const handleSaveManagingRecipes = () => {
    if (!managingRecipesProdCat) return;
    const catId = managingRecipesProdCat.id;

    let changed = false;
    const updatedRecipes = safeRecipes.map((r) => {
      const shouldBeInThisCat = managingRecipeIds.includes(r.id);
      const isCurrentlyInThisCat = r.category === catId;

      if (shouldBeInThisCat && !isCurrentlyInThisCat) {
        changed = true;
        return { ...r, category: catId };
      } else if (!shouldBeInThisCat && isCurrentlyInThisCat) {
        changed = true;
        return { ...r, category: 'otros' };
      }
      return r;
    });

    if (changed) {
      if (onSaveAllRecipes) {
        onSaveAllRecipes(updatedRecipes);
      } else if (onSaveRecipe) {
        updatedRecipes.forEach((r) => onSaveRecipe(r));
      }
    }

    showToast(`Se actualizaron las recetas asociadas a "${managingRecipesProdCat.name}".`);
    setManagingRecipesProdCat(null);
  };

  const handleExecuteReset = () => {
    if (onResetToDefaults) {
      onResetToDefaults();
      showToast('Se restablecieron todos los insumos y categorías de fábrica.', 'info');
      setShowResetConfirm(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 leading-none">
                Catálogo Maestro & Líneas de Producción
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Estandarización de insumos, categorización, líneas de fábrica y asignación de recetas.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-6 pt-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('prod_categories')}
              className={`px-3.5 py-2 text-xs font-black rounded-t-xl transition-all flex items-center gap-2 cursor-pointer border-t border-x ${
                activeTab === 'prod_categories'
                  ? 'bg-white text-slate-900 border-slate-200 shadow-2xs font-extrabold'
                  : 'bg-transparent text-slate-500 hover:text-slate-900 border-transparent'
              }`}
            >
              <span>🏭</span>
              <span>Líneas de Producción ({safeProductionCategories.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('ingredients')}
              className={`px-3.5 py-2 text-xs font-black rounded-t-xl transition-all flex items-center gap-2 cursor-pointer border-t border-x ${
                activeTab === 'ingredients'
                  ? 'bg-white text-slate-900 border-slate-200 shadow-2xs font-extrabold'
                  : 'bg-transparent text-slate-500 hover:text-slate-900 border-transparent'
              }`}
            >
              <span>📦</span>
              <span>Insumos Maestros ({safeMasterIngredients.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('ing_categories')}
              className={`px-3.5 py-2 text-xs font-black rounded-t-xl transition-all flex items-center gap-2 cursor-pointer border-t border-x ${
                activeTab === 'ing_categories'
                  ? 'bg-white text-slate-900 border-slate-200 shadow-2xs font-extrabold'
                  : 'bg-transparent text-slate-500 hover:text-slate-900 border-transparent'
              }`}
            >
              <span>🏷️</span>
              <span>Categorías de Insumos ({safeIngredientCategories.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('maintenance')}
              className={`px-3.5 py-2 text-xs font-black rounded-t-xl transition-all flex items-center gap-2 cursor-pointer border-t border-x ${
                activeTab === 'maintenance'
                  ? 'bg-white text-slate-900 border-slate-200 shadow-2xs font-extrabold'
                  : 'bg-transparent text-slate-500 hover:text-slate-900 border-transparent'
              }`}
            >
              <span>⚙️</span>
              <span>Mantenimiento</span>
            </button>
          </div>

          {activeTab === 'ingredients' && (
            <button
              onClick={handleSyncFromRecipes}
              title="Importa y consolida automáticamente todos los insumos utilizados en tus recetas"
              className="mb-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Sincronizar desde Recetas</span>
            </button>
          )}
        </div>

        {/* Notifications Toast */}
        {notification && (
          <div className={`px-6 py-2.5 text-xs font-bold flex items-center justify-between border-b animate-in fade-in ${
            notification.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : notification.type === 'info'
              ? 'bg-blue-50 text-blue-800 border-blue-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ========================================================================= */}
          {/* TAB 1: PRODUCTION CATEGORIES / LINES & RECIPE ASSIGNMENT */}
          {/* ========================================================================= */}
          {activeTab === 'prod_categories' && (
            <div className="space-y-5">
              {/* Top Banner & Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-emerald-50 to-teal-50/50 p-4 rounded-2xl border border-emerald-200/80">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <span>🏭</span>
                    <span>Líneas de Producción & Asignación de Recetas</span>
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                    Organiza las secciones de fábrica, reordena su jerarquía, elimina líneas obsoletas y <strong>asigna o transfiere qué recetas pertenecen a cada línea</strong>.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setEditingProdCatId(null);
                    setProdCatName('');
                    setProdCatIcon('🏭');
                    setProdCatBadgeText('');
                    setSelectedRecipeIdsForProdCat([]);
                    setShowAddProdCatForm(!showAddProdCatForm);
                  }}
                  className="px-4 py-2.5 text-xs font-black text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nueva Línea de Producción</span>
                </button>
              </div>

              {/* Form: Add or Edit Production Category */}
              {showAddProdCatForm && (
                <form
                  onSubmit={handleSaveProdCategory}
                  className="p-5 bg-white border-2 border-emerald-500/40 rounded-2xl space-y-4 shadow-lg animate-in fade-in"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>{editingProdCatId ? 'Editar Línea de Producción' : 'Crear Nueva Línea de Producción'}</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddProdCatForm(false);
                        setEditingProdCatId(null);
                        setSelectedRecipeIdsForProdCat([]);
                      }}
                      className="text-xs font-bold text-slate-400 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nombre de la Línea *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Pasta Rellena, Tequeños, Repostería..."
                        value={prodCatName}
                        onChange={(e) => setProdCatName(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Icono / Emoji *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: 🥟, 🥯, 🍰, 🍕"
                        value={prodCatIcon}
                        onChange={(e) => setProdCatIcon(e.target.value)}
                        className="w-full px-3 py-2 text-xs text-center bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Etiqueta / Badge (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Pastas Frescas"
                        value={prodCatBadgeText}
                        onChange={(e) => setProdCatBadgeText(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Recipe Selection Section inside Add/Edit Form */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Asignar Fichas / Recetas a esta Línea ({selectedRecipeIdsForProdCat.length} seleccionadas):</span>
                      </label>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedRecipeIdsForProdCat(safeRecipes.map((r) => r.id))}
                          className="text-[11px] font-bold text-emerald-700 hover:underline"
                        >
                          Seleccionar todas
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setSelectedRecipeIdsForProdCat([])}
                          className="text-[11px] font-bold text-slate-500 hover:underline"
                        >
                          Limpiar
                        </button>
                      </div>
                    </div>

                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2.5 bg-slate-50 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {safeRecipes.length === 0 ? (
                        <p className="text-xs text-slate-400 italic col-span-2 text-center py-4">
                          No hay recetas cargadas en el sistema todavía.
                        </p>
                      ) : (
                        safeRecipes.map((recipe) => {
                          const isChecked = selectedRecipeIdsForProdCat.includes(recipe.id);
                          const currentProdCat = safeProductionCategories.find((c) => c.id === recipe.category);

                          return (
                            <label
                              key={recipe.id}
                              className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                                isChecked
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedRecipeIdsForProdCat((prev) => [...prev, recipe.id]);
                                  } else {
                                    setSelectedRecipeIdsForProdCat((prev) => prev.filter((id) => id !== recipe.id));
                                  }
                                }}
                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="truncate text-xs">{recipe.name}</p>
                                {currentProdCat && currentProdCat.id !== editingProdCatId && (
                                  <span className="text-[10px] text-slate-400">
                                    Línea actual: {currentProdCat.icon} {currentProdCat.name}
                                  </span>
                                )}
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddProdCatForm(false);
                        setEditingProdCatId(null);
                      }}
                      className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-black text-white bg-emerald-700 hover:bg-emerald-600 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>{editingProdCatId ? 'Guardar Cambios' : 'Crear Línea'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Production Categories List & Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-xs font-bold uppercase text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-3 w-14 text-center">Orden</th>
                      <th className="px-3 py-3 w-12 text-center">Icono</th>
                      <th className="px-4 py-3 min-w-[140px]">Línea de Producción</th>
                      <th className="px-4 py-3">Fichas / Recetas Asociadas</th>
                      <th className="px-3 py-3 text-right min-w-[180px]">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {safeProductionCategories.map((cat, index) => {
                      const associatedRecipes = safeRecipes.filter(
                        (r) => r.category === cat.id || r.category?.toLowerCase() === cat.id.toLowerCase()
                      );

                      return (
                        <tr key={cat.id} className="hover:bg-slate-50/80 transition-colors group">
                          {/* Reorder Buttons */}
                          <td className="px-2 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => handleMoveProdCategory(index, 'up')}
                                title="Mover arriba"
                                className="p-1 rounded text-slate-400 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer disabled:cursor-default transition-colors"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={index === safeProductionCategories.length - 1}
                                onClick={() => handleMoveProdCategory(index, 'down')}
                                title="Mover abajo"
                                className="p-1 rounded text-slate-400 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer disabled:cursor-default transition-colors"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                          {/* Icon */}
                          <td className="px-3 py-3 text-center text-xl">
                            {cat.icon}
                          </td>

                          {/* Line Name */}
                          <td className="px-4 py-3">
                            <div className="font-extrabold text-slate-900 flex items-center gap-2">
                              <span>{cat.name}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              ID: {cat.id}
                            </div>
                          </td>

                          {/* Associated Recipes Tags & Quick Manager */}
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {associatedRecipes.length > 0 ? (
                                associatedRecipes.map((r) => (
                                  <span
                                    key={r.id}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 hover:border-slate-300 transition-colors"
                                  >
                                    <span>{r.name}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleQuickUnassignRecipe(r.id, r.name)}
                                      title="Desasignar de esta línea (mover a Otros)"
                                      className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full p-0.5 transition-colors cursor-pointer"
                                    >
                                      <X className="w-2.5 h-2.5" />
                                    </button>
                                  </span>
                                ))
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">
                                  Sin recetas asignadas
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => openManageRecipesModal(cat)}
                                className="text-[10.5px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer ml-1"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Asignar / Gestionar Recetas</span>
                              </button>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-3 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => startEditProdCat(cat)}
                                className="px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-amber-600" />
                                <span>Editar</span>
                              </button>

                              <button
                                onClick={() => handleStartDeleteProdCat(cat)}
                                className="px-2 py-1.5 text-xs font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                                title="Eliminar línea de producción"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: INGREDIENT CATEGORIES & REORDERING / DELETION */}
          {/* ========================================================================= */}
          {activeTab === 'ing_categories' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-amber-50 to-orange-50/50 p-4 rounded-2xl border border-amber-200/80">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <span>🏷️</span>
                    <span>Categorías de Insumos</span>
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                    Organiza los rubros de insumos para la lista de compras y stock. Reordena la prioridad con las flechas o elimina categorías obsoletas.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setEditingIngCatId(null);
                    setIngCatName('');
                    setIngCatIcon('📦');
                    setIngCatDesc('');
                    setShowAddIngCatForm(!showAddIngCatForm);
                  }}
                  className="px-4 py-2.5 text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nueva Categoría de Insumos</span>
                </button>
              </div>

              {/* Add / Edit Category Form */}
              {showAddIngCatForm && (
                <form
                  onSubmit={handleSaveIngCategory}
                  className="p-5 bg-white border-2 border-amber-500/40 rounded-2xl space-y-4 shadow-lg animate-in fade-in"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>{editingIngCatId ? 'Editar Categoría de Insumos' : 'Nueva Categoría de Insumos'}</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddIngCatForm(false);
                        setEditingIngCatId(null);
                      }}
                      className="text-xs font-bold text-slate-400 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nombre de la Categoría *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Lácteos & Quesos, Harinas & Secos, Carnes..."
                        value={ingCatName}
                        onChange={(e) => setIngCatName(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Icono / Emoji *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: 🧀, 🌾, 🥬, 🥩"
                        value={ingCatIcon}
                        onChange={(e) => setIngCatIcon(e.target.value)}
                        className="w-full px-3 py-2 text-xs text-center bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-base font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Descripción breve (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Insumos derivados de leche, quesos duros, blandos y rellenos."
                      value={ingCatDesc}
                      onChange={(e) => setIngCatDesc(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-700"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddIngCatForm(false);
                        setEditingIngCatId(null);
                      }}
                      className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-black text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>{editingIngCatId ? 'Guardar Cambios' : 'Crear Categoría'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Categories Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-xs font-bold uppercase text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-3 w-14 text-center">Orden</th>
                      <th className="px-3 py-3 w-12 text-center">Icono</th>
                      <th className="px-4 py-3">Nombre de la Categoría</th>
                      <th className="px-4 py-3">Descripción</th>
                      <th className="px-4 py-3 text-center">Insumos Asociados</th>
                      <th className="px-3 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {safeIngredientCategories.map((cat, index) => {
                      const count = safeMasterIngredients.filter((i) => i.categoryId === cat.id).length;

                      return (
                        <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                          {/* Reorder Buttons */}
                          <td className="px-2 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => handleMoveIngCategory(index, 'up')}
                                title="Mover arriba"
                                className="p-1 rounded text-slate-400 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer disabled:cursor-default transition-colors"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={index === safeIngredientCategories.length - 1}
                                onClick={() => handleMoveIngCategory(index, 'down')}
                                title="Mover abajo"
                                className="p-1 rounded text-slate-400 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer disabled:cursor-default transition-colors"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                          <td className="px-3 py-3 text-center text-xl">
                            {cat.icon}
                          </td>

                          <td className="px-4 py-3 font-bold text-slate-900">
                            {cat.name}
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              ID: {cat.id}
                            </div>
                          </td>

                          <td className="px-4 py-3 text-xs text-slate-500">
                            {cat.description || '-'}
                          </td>

                          <td className="px-4 py-3 text-center">
                            <span className="font-bold text-[11px] px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                              {count} insumos
                            </span>
                          </td>

                          <td className="px-3 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => startEditIngCat(cat)}
                                className="px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-amber-600" />
                                <span>Editar</span>
                              </button>

                              <button
                                onClick={() => handleStartDeleteIngCat(cat)}
                                className="px-2 py-1.5 text-xs font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                                title="Eliminar categoría"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: MASTER INGREDIENTS */}
          {/* ========================================================================= */}
          {activeTab === 'ingredients' && (
            <div className="space-y-4">
              {/* Filter and Search Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Buscar insumo (ej: muzzarella, harina, sal)..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 font-medium"
                    />
                  </div>

                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="all">Todas las categorías ({safeMasterIngredients.length})</option>
                    {safeIngredientCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => {
                    setEditingIngredientId(null);
                    setIngName('');
                    setIngNotes('');
                    setShowAddIngForm(!showAddIngForm);
                  }}
                  className="w-full sm:w-auto px-3.5 py-2 text-xs font-black text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nuevo Insumo Maestro</span>
                </button>
              </div>

              {/* Add / Edit Ingredient Form */}
              {showAddIngForm && (
                <form
                  onSubmit={handleSaveIngredient}
                  className="p-4 bg-amber-50/70 border border-amber-300 rounded-xl space-y-3 shadow-sm animate-in fade-in"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      {editingIngredientId ? 'Editar Insumo Maestro' : 'Agregar Nuevo Insumo Maestro'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddIngForm(false);
                        setEditingIngredientId(null);
                      }}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nombre Oficial del Insumo *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Queso Muzzarella en Barra"
                        value={ingName}
                        onChange={(e) => setIngName(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Categoría *
                      </label>
                      <select
                        value={ingCategory}
                        onChange={(e) => setIngCategory(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold text-slate-900"
                      >
                        {safeIngredientCategories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.icon} {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Unidad Estándar *
                      </label>
                      <select
                        value={ingUnit}
                        onChange={(e) => setIngUnit(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold text-slate-900"
                      >
                        <option value="kg">Kilogramos (kg)</option>
                        <option value="g">Gramos (g)</option>
                        <option value="L">Litros (L)</option>
                        <option value="ml">Mililitros (ml)</option>
                        <option value="u">Unidades (u)</option>
                        <option value="paquetes">Paquetes</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Notas / Especificación del Proveedor (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Calidad primera, horma de 4kg, proveedor Lácteos del Sur"
                      value={ingNotes}
                      onChange={(e) => setIngNotes(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-700"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-black text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{editingIngredientId ? 'Guardar Cambios' : 'Agregar al Catálogo'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Master Ingredients Table */}
              <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
                <table className="w-full text-left text-xs min-w-[700px]">
                  <thead className="bg-slate-100 text-xs font-bold uppercase text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 min-w-[160px]">Insumo</th>
                      <th className="px-4 py-3 min-w-[150px]">Categoría</th>
                      <th className="px-3 py-3 text-center w-20">Unidad</th>
                      <th className="px-4 py-3 min-w-[220px]">Uso en Recetas Actuales</th>
                      <th className="px-4 py-3 min-w-[140px]">Notas</th>
                      <th className="px-3 py-3 text-right w-20">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredIngredients.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                          No se encontraron insumos que coincidan con la búsqueda.
                        </td>
                      </tr>
                    ) : (
                      filteredIngredients.map((item) => {
                        const cat = safeIngredientCategories.find((c) => c.id === item.categoryId);
                        const usageList = ingredientUsageMap.get(item.name.toLowerCase().trim()) || [];

                        return (
                          <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-bold text-slate-900">
                              {item.name}
                            </td>

                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                                <span>{cat?.icon || '📦'}</span>
                                <span>{cat?.name || item.categoryId}</span>
                              </span>
                            </td>

                            <td className="px-3 py-3 text-center font-mono font-bold text-slate-600">
                              {item.defaultUnit}
                            </td>

                            <td className="px-4 py-3">
                              {usageList.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {usageList.map((recName, i) => (
                                    <span
                                      key={i}
                                      className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 leading-tight"
                                    >
                                      {recName}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">Sin recetas</span>
                              )}
                            </td>

                            <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">
                              {item.notes || '-'}
                            </td>

                            <td className="px-3 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => startEditIngredient(item)}
                                  className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                                  title="Editar insumo"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeletingIngItem(item)}
                                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                  title="Eliminar insumo"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: MAINTENANCE & RESET */}
          {/* ========================================================================= */}
          {activeTab === 'maintenance' && (
            <div className="space-y-4 max-w-2xl">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-slate-600" />
                  Estandarización y Respaldo
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  El catálogo maestro de insumos permite que todas las recetas utilicen los mismos nombres para queso muzzarella, harinas, condimentos y empaques. Esto garantiza que la lista de compras sume exactamente las cantidades correctas sin duplicados ni diferencias tipográficas.
                </p>
              </div>

              <div className="p-4 bg-red-50/60 border border-red-200 rounded-xl space-y-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-red-950 uppercase tracking-wider">
                      Restablecer Catálogo Maestro de Fábrica
                    </h4>
                    <p className="text-xs text-red-800 leading-relaxed">
                      Esta opción vuelve a cargar la lista original de insumos y categorías predeterminadas de fábrica.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restablecer Insumos de Fábrica</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <PackageCheck className="w-4 h-4 text-emerald-600" />
            <span>Los cambios en líneas de producción y categorías se sincronizan en tiempo real en la nube.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-black text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            Cerrar
          </button>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL: DEDICATED MANAGE / ASSIGN RECIPES FOR A PRODUCTION LINE */}
      {/* ========================================================================= */}
      {managingRecipesProdCat && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full border border-slate-200 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{managingRecipesProdCat.icon}</span>
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    Asignar Recetas a: {managingRecipesProdCat.name}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Marca las recetas que pertenecen a esta línea de producción.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setManagingRecipesProdCat(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Filter */}
            <div className="flex items-center justify-between gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filtrar recetas..."
                  value={recipeSearchInManageModal}
                  onChange={(e) => setRecipeSearchInManageModal(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setManagingRecipeIds(safeRecipes.map((r) => r.id))}
                  className="text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded"
                >
                  Todas
                </button>
                <button
                  type="button"
                  onClick={() => setManagingRecipeIds([])}
                  className="text-[11px] font-bold text-slate-500 hover:bg-slate-100 px-2 py-1 rounded"
                >
                  Ninguna
                </button>
              </div>
            </div>

            {/* Recipes List */}
            <div className="max-h-64 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2 bg-slate-50">
              {safeRecipes
                .filter((r) =>
                  r.name.toLowerCase().includes(recipeSearchInManageModal.toLowerCase())
                )
                .map((r) => {
                  const isChecked = managingRecipeIds.includes(r.id);
                  const currentLine = safeProductionCategories.find((c) => c.id === r.category);

                  return (
                    <label
                      key={r.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setManagingRecipeIds((prev) => [...prev, r.id]);
                            } else {
                              setManagingRecipeIds((prev) => prev.filter((id) => id !== r.id));
                            }
                          }}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 shrink-0"
                        />
                        <div className="truncate">
                          <p className="font-extrabold">{r.name}</p>
                          <p className="text-[10.5px] text-slate-400 font-normal">
                            Rendimiento base: {r.baseYieldUnits} {r.yieldUnitName || 'unidades'}
                          </p>
                        </div>
                      </div>

                      {currentLine && currentLine.id !== managingRecipesProdCat.id && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                          {currentLine.icon} {currentLine.name}
                        </span>
                      )}
                    </label>
                  );
                })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-600">
                {managingRecipeIds.length} de {safeRecipes.length} recetas asignadas
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setManagingRecipesProdCat(null)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveManagingRecipes}
                  className="px-4 py-2 text-xs font-black text-white bg-emerald-700 hover:bg-emerald-600 rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar Asignaciones</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIRM DELETE INGREDIENT CATEGORY (WITH REASSIGNMENT) */}
      {/* ========================================================================= */}
      {deletingIngCat && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold shrink-0">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">
                  ¿Eliminar Categoría "{deletingIngCat.name}"?
                </h4>
                <p className="text-xs text-slate-500">
                  Icono: {deletingIngCat.icon} • ID: {deletingIngCat.id}
                </p>
              </div>
            </div>

            {/* Insumos usage info */}
            {safeMasterIngredients.filter((i) => i.categoryId === deletingIngCat.id).length > 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2 text-xs text-amber-950">
                <p className="font-bold flex items-center gap-1.5 text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>
                    Esta categoría contiene {safeMasterIngredients.filter((i) => i.categoryId === deletingIngCat.id).length} insumos asignados.
                  </span>
                </p>
                <p className="text-slate-700 text-[11.5px]">
                  Selecciona a qué categoría deseas reasignar estos insumos para no perderlos:
                </p>
                <select
                  value={reassignIngCatTargetId}
                  onChange={(e) => setReassignIngCatTargetId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-amber-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {safeIngredientCategories
                    .filter((c) => c.id !== deletingIngCat.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        Reasignar a: {c.icon} {c.name}
                      </option>
                    ))}
                </select>
              </div>
            ) : (
              <p className="text-xs text-slate-600">
                Esta categoría no tiene insumos asociados y puede eliminarse de forma segura.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingIngCat(null)}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteIngCat}
                className="px-4 py-2 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md"
              >
                Eliminar Categoría
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIRM DELETE PRODUCTION LINE (WITH RECIPE REASSIGNMENT) */}
      {/* ========================================================================= */}
      {deletingProdCat && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold shrink-0">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">
                  ¿Eliminar Línea "{deletingProdCat.name}"?
                </h4>
                <p className="text-xs text-slate-500">
                  Icono: {deletingProdCat.icon} • ID: {deletingProdCat.id}
                </p>
              </div>
            </div>

            {/* Recipes usage info */}
            {safeRecipes.filter((r) => r.category === deletingProdCat.id).length > 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2 text-xs text-amber-950">
                <p className="font-bold flex items-center gap-1.5 text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>
                    Esta línea tiene {safeRecipes.filter((r) => r.category === deletingProdCat.id).length} recetas asociadas:
                  </span>
                </p>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {safeRecipes
                    .filter((r) => r.category === deletingProdCat.id)
                    .map((r) => (
                      <span key={r.id} className="text-[10.5px] font-bold px-1.5 py-0.5 rounded bg-white border border-amber-200 text-slate-800">
                        {r.name}
                      </span>
                    ))}
                </div>
                <p className="text-slate-700 text-[11.5px] pt-1">
                  Selecciona a qué otra línea transferir estas recetas:
                </p>
                <select
                  value={reassignProdCatTargetId}
                  onChange={(e) => setReassignProdCatTargetId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-amber-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {safeProductionCategories
                    .filter((c) => c.id !== deletingProdCat.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        Transferir a: {c.icon} {c.name}
                      </option>
                    ))}
                </select>
              </div>
            ) : (
              <p className="text-xs text-slate-600">
                Esta línea no tiene recetas asociadas y puede eliminarse de forma segura.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingProdCat(null)}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteProdCat}
                className="px-4 py-2 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md"
              >
                Eliminar Línea
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deleting Ingredient */}
      {deletingIngItem && (
        <div className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">¿Eliminar Insumo?</h4>
                <p className="text-xs text-slate-500">
                  {deletingIngItem.name}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600">
              ¿Estás seguro de que deseas eliminar este insumo del catálogo maestro?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingIngItem(null)}
                className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteIngredient}
                className="px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Resetting to Defaults */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">Confirmar Restablecimiento</h4>
                <p className="text-xs text-slate-500">Valores de fábrica</p>
              </div>
            </div>
            <p className="text-xs text-slate-600">
              Se restaurarán todos los insumos y categorías a su estado original de fábrica.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteReset}
                className="px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg"
              >
                Restablecer Todo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
