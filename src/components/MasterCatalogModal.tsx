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
  CheckCircle2
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
  onSaveAllIngredientCategories?: (cats: IngredientCategoryConfig[]) => void;
  onSaveIngredientCategories?: (cats: IngredientCategoryConfig[]) => void;
  onSaveProductionCategory?: (pCat: ProductionCategoryConfig) => void;
  onSaveAllProductionCategories?: (pCats: ProductionCategoryConfig[]) => void;
  onSaveProductionCategories?: (pCats: ProductionCategoryConfig[]) => void;
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
  onSaveAllIngredientCategories,
  onSaveIngredientCategories,
  onSaveProductionCategory,
  onSaveAllProductionCategories,
  onSaveProductionCategories,
  onResetToDefaults,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('ingredients');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

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

  // Edit Production Category state
  const [editingProdCatId, setEditingProdCatId] = useState<string | null>(null);
  const [prodCatName, setProdCatName] = useState('');
  const [prodCatIcon, setProdCatIcon] = useState('🏭');
  const [prodCatBadgeText, setProdCatBadgeText] = useState('');
  const [showAddProdCatForm, setShowAddProdCatForm] = useState(false);

  // Reset confirmation state
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
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

  // Handlers for Master Ingredients
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

  // Handlers for Ingredient Categories
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

  // Handlers for Production Categories
  const handleSaveProdCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodCatName.trim()) return;

    if (editingProdCatId) {
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

      showToast(`Línea de producción "${updatedCat.name}" actualizada.`);
      setEditingProdCatId(null);
      setShowAddProdCatForm(false);
    } else {
      const newId = `prod-${Date.now()}`;
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

      showToast(`Nueva línea "${newCat.name}" creada.`);
      setShowAddProdCatForm(false);
    }
    setProdCatName('');
    setProdCatBadgeText('');
  };

  const startEditProdCat = (cat: ProductionCategoryConfig) => {
    setEditingProdCatId(cat.id);
    setProdCatName(cat.name);
    setProdCatIcon(cat.icon);
    setProdCatBadgeText(cat.badgeText || cat.name);
    setShowAddProdCatForm(true);
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
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold text-xl shadow-xs">
              <Layers className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">
                  Catálogo Maestro de Insumos & Categorías
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                  {safeMasterIngredients.length} Insumos
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Estandarización de ingredientes para recetas, categorías de compras y líneas de fábrica.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Floating Notification Toast */}
        {notification && (
          <div className="px-6 py-2 bg-emerald-50 border-b border-emerald-200 flex items-center gap-2 text-xs font-bold text-emerald-900 animate-in slide-in-from-top-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{notification.message}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 border-b border-slate-200 bg-white flex flex-wrap gap-2">
          <button
            onClick={() => {
              setActiveTab('ingredients');
              setShowAddIngForm(false);
              setEditingIngredientId(null);
            }}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'ingredients'
                ? 'border-amber-600 text-amber-700 bg-amber-50/70 rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span>📋 Insumos Maestros ({safeMasterIngredients.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('ing_categories');
              setShowAddIngCatForm(false);
              setEditingIngCatId(null);
            }}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'ing_categories'
                ? 'border-amber-600 text-amber-700 bg-amber-50/70 rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span>🏷️ Categorías de Insumos ({safeIngredientCategories.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('prod_categories');
              setShowAddProdCatForm(false);
              setEditingProdCatId(null);
            }}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'prod_categories'
                ? 'border-amber-600 text-amber-700 bg-amber-50/70 rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span>🏭 Líneas de Producción ({safeProductionCategories.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('maintenance');
            }}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'maintenance'
                ? 'border-slate-800 text-slate-900 bg-slate-100 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span>⚙️ Mantenimiento</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: MASTER INGREDIENTS */}
          {activeTab === 'ingredients' && (
            <div className="space-y-4">
              {/* Controls bar */}
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
                <div className="flex flex-1 gap-2 items-center">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar insumo maestro o nota..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                    />
                  </div>

                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold text-slate-700"
                  >
                    <option value="all">Todas las categorías</option>
                    {safeIngredientCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSyncFromRecipes}
                    title="Re-extraer insumos de las recetas actuales"
                    className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                    <span>Sincronizar Recetas</span>
                  </button>

                  <button
                    onClick={() => {
                      setEditingIngredientId(null);
                      setIngName('');
                      setIngCategory(safeIngredientCategories[0]?.id || 'lacteos');
                      setIngUnit('kg');
                      setIngNotes('');
                      setShowAddIngForm(!showAddIngForm);
                    }}
                    className="px-3.5 py-2 text-xs font-black text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nuevo Insumo</span>
                  </button>
                </div>
              </div>

              {/* Add / Edit Inline Form */}
              {showAddIngForm && (
                <form
                  onSubmit={handleSaveIngredient}
                  className="p-4 bg-amber-50/70 border border-amber-300 rounded-xl space-y-3 shadow-sm animate-in fade-in"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      {editingIngredientId ? 'Editar Insumo Maestro' : 'Crear Nuevo Insumo Maestro'}
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

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nombre del Insumo *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Queso Pategrás, Cebolla de verdeo..."
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
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold text-slate-800"
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
                        Unidad habitual
                      </label>
                      <select
                        value={ingUnit}
                        onChange={(e) => setIngUnit(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold text-slate-800"
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
                      Observaciones / Instrucciones de uso (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Prensada y escurrida, rallado fino, cocido..."
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
                      <span>{editingIngredientId ? 'Guardar Cambios' : 'Crear Insumo'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Ingredients Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-xs font-bold uppercase text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Insumo Maestro</th>
                      <th className="px-4 py-3">Categoría</th>
                      <th className="px-3 py-3 text-center">Unidad</th>
                      <th className="px-4 py-3">Uso en Fichas / Recetas</th>
                      <th className="px-3 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredIngredients.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">
                          No se encontraron insumos con los filtros seleccionados.
                        </td>
                      </tr>
                    ) : (
                      filteredIngredients.map((item) => {
                        const cat = safeIngredientCategories.find((c) => c.id === item.categoryId);
                        const usage = ingredientUsageMap.get(item.name.toLowerCase().trim()) || [];

                        return (
                          <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-900">
                                {item.name}
                              </div>
                              {item.notes && (
                                <div className="text-[11px] text-slate-500 italic mt-0.5 line-clamp-1">
                                  {item.notes}
                                </div>
                              )}
                            </td>

                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                <span>{cat?.icon || '📦'}</span>
                                <span>{cat?.name || item.categoryId}</span>
                              </span>
                            </td>

                            <td className="px-3 py-3 text-center">
                              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                {item.defaultUnit}
                              </span>
                            </td>

                            <td className="px-4 py-3">
                              {usage.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {usage.map((rName, idx) => (
                                    <span
                                      key={idx}
                                      className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200"
                                    >
                                      {rName}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">Sin asignar</span>
                              )}
                            </td>

                            <td className="px-3 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => startEditIngredient(item)}
                                  className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                  title="Editar insumo"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeletingIngItem(item)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
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

          {/* TAB 2: INGREDIENT CATEGORIES */}
          {activeTab === 'ing_categories' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    Categorías de Insumos & Materia Prima
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Modificá los nombres y emojis con los que se agrupan los ingredientes en las listas de compras y fórmulas.
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
                  className="px-3.5 py-2 text-xs font-black text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>Nueva Categoría</span>
                </button>
              </div>

              {/* Add / Edit Category Form */}
              {showAddIngCatForm && (
                <form
                  onSubmit={handleSaveIngCategory}
                  className="p-4 bg-amber-50/70 border border-amber-300 rounded-xl space-y-3 shadow-sm animate-in fade-in"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      {editingIngCatId ? 'Editar Nombre de Categoría' : 'Nueva Categoría de Insumo'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddIngCatForm(false);
                        setEditingIngCatId(null);
                      }}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800"
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
                        placeholder="Ej: Lácteos, Quesos y Rellenos"
                        value={ingCatName}
                        onChange={(e) => setIngCatName(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Icono / Emoji *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: 🧀, 🌾, 🥬"
                        value={ingCatIcon}
                        onChange={(e) => setIngCatIcon(e.target.value)}
                        className="w-full px-3 py-2 text-xs text-center bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-base"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Descripción breve (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Insumos derivados de leche, quesos duros y blandos."
                      value={ingCatDesc}
                      onChange={(e) => setIngCatDesc(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-700"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-black text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Guardar Categoría</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Categories Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-xs font-bold uppercase text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 w-16 text-center">Icono</th>
                      <th className="px-4 py-3">Nombre de la Categoría</th>
                      <th className="px-4 py-3">Descripción</th>
                      <th className="px-4 py-3 text-center">Insumos Asociados</th>
                      <th className="px-3 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {safeIngredientCategories.map((cat) => {
                      const count = safeMasterIngredients.filter((i) => i.categoryId === cat.id).length;

                      return (
                        <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-center text-xl">
                            {cat.icon}
                          </td>

                          <td className="px-4 py-3 font-bold text-slate-900">
                            {cat.name}
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
                            <button
                              onClick={() => startEditIngCat(cat)}
                              className="px-2.5 py-1 text-xs font-bold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Editar</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: PRODUCTION CATEGORIES */}
          {activeTab === 'prod_categories' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    Líneas de Producción & Recetas
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Personalizá el nombre de cada línea de producción (por ejemplo: cambiar "Pastas" por <strong className="text-slate-800">"Pasta rellena"</strong>).
                  </p>
                </div>

                <button
                  onClick={() => {
                    setEditingProdCatId(null);
                    setProdCatName('');
                    setProdCatIcon('🏭');
                    setProdCatBadgeText('');
                    setShowAddProdCatForm(!showAddProdCatForm);
                  }}
                  className="px-3.5 py-2 text-xs font-black text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nueva Línea</span>
                </button>
              </div>

              {/* Add / Edit Prod Category Form */}
              {showAddProdCatForm && (
                <form
                  onSubmit={handleSaveProdCategory}
                  className="p-4 bg-emerald-50/70 border border-emerald-300 rounded-xl space-y-3 shadow-sm animate-in fade-in"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      {editingProdCatId ? 'Editar Línea de Producción' : 'Nueva Línea de Producción'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddProdCatForm(false);
                        setEditingProdCatId(null);
                      }}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nombre de la Línea *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Pasta rellena, Tequeños & Snacks..."
                        value={prodCatName}
                        onChange={(e) => setProdCatName(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Icono / Emoji *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: 🥟, 🥯, 🍰"
                        value={prodCatIcon}
                        onChange={(e) => setProdCatIcon(e.target.value)}
                        className="w-full px-3 py-2 text-xs text-center bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-black text-white bg-emerald-700 hover:bg-emerald-600 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Guardar Línea</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Production Categories Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-xs font-bold uppercase text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 w-16 text-center">Icono</th>
                      <th className="px-4 py-3">Nombre de la Línea</th>
                      <th className="px-4 py-3">Fichas / Recetas Asociadas</th>
                      <th className="px-3 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {safeProductionCategories.map((cat) => {
                      const associatedRecipes = safeRecipes.filter(
                        (r) => r.category === cat.id || r.category?.toLowerCase() === cat.id.toLowerCase()
                      );

                      return (
                        <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-center text-xl">
                            {cat.icon}
                          </td>

                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900 flex items-center gap-2">
                              <span>{cat.name}</span>
                              {cat.id === 'pastas' && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-200">
                                  Sorrentinos & Raviolones
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              ID: {cat.id}
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            {associatedRecipes.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {associatedRecipes.map((r) => (
                                  <span
                                    key={r.id}
                                    className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200"
                                  >
                                    {r.name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Sin recetas asociadas</span>
                            )}
                          </td>

                          <td className="px-3 py-3 text-right">
                            <button
                              onClick={() => startEditProdCat(cat)}
                              className="px-2.5 py-1 text-xs font-bold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Modificar Nombre</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: MAINTENANCE & RESET */}
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
            <span>Los insumos y nombres se sincronizan en tiempo real con todas las recetas y listas de compras.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-black text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            Cerrar
          </button>
        </div>

      </div>

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
