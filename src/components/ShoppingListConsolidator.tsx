import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShoppingCart, 
  Check, 
  Copy, 
  Package, 
  Calendar,
  Filter,
  Clock,
  RotateCcw,
  Eye,
  EyeOff,
  Search,
  FileSpreadsheet,
  CheckCheck,
  Tag,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import { Recipe, ActiveBatch, ConsolidatedIngredient } from '../types';
import { 
  consolidateBatches, 
  formatSimpleKg, 
  formatBatchDateShort,
  formatBatchLabelWithDate 
} from '../utils/calculations';
import { formatDateToISO } from '../utils/calendarHelpers';

interface ShoppingListConsolidatorProps {
  recipes: Recipe[];
  activeBatches: ActiveBatch[];
  onUpdateBatchStatus?: (batchId: string, status: ActiveBatch['status']) => void;
  onNavigateTab: (tab: 'calendar' | 'recipes' | 'shopping') => void;
}

interface TableRowItem {
  id: string;
  name: string;
  categoryKey: string;
  categoryLabel: string;
  categoryIcon: string;
  netGramsOrCount: number;
  bufferedGramsOrCount: number;
  unit: string;
  formattedNet: string;
  formattedBuffered: string;
  usedInDetails: { recipeName: string; formattedDate: string; units: number }[];
  usedInText: string;
  isPackaging: boolean;
}

const STORAGE_KEY_CHECKED = 'fabriplan_shopping_checked_items_v3';

const CATEGORY_MAP: Record<string, { label: string; icon: string; order: number }> = {
  lacteos: { label: 'Lácteos, Quesos y Rellenos', icon: '🧀', order: 1 },
  harinas_feculas: { label: 'Harinas, Féculas y Galletitas', icon: '🌾', order: 2 },
  frescos_verduras: { label: 'Verduras, Frescos y Frutas', icon: '🥬', order: 3 },
  huevos: { label: 'Huevos Frescos', icon: '🥚', order: 4 },
  grasas_liquidos: { label: 'Grasas, Aceites y Líquidos', icon: '🧈', order: 5 },
  especias_condimentos: { label: 'Especias, Sales y Condimentos', icon: '🧂', order: 6 },
  otros: { label: 'Otros Insumos y Salames', icon: '📦', order: 7 },
  empaques: { label: 'Empaque, Bolsas y Descartables', icon: '🛍️', order: 8 },
};

export const ShoppingListConsolidator: React.FC<ShoppingListConsolidatorProps> = ({
  recipes,
  activeBatches,
  onNavigateTab,
}) => {
  const [bufferPercent, setBufferPercent] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [hidePurchased, setHidePurchased] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedFilter, setSelectedFilter] = useState<string>('all_future');

  // Load checked/purchased items from localStorage
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CHECKED);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CHECKED, JSON.stringify(checkedItems));
    } catch (e) {
      console.error('Error saving checked items', e);
    }
  }, [checkedItems]);

  // Today ISO date string (YYYY-MM-DD)
  const todayStr = useMemo(() => formatDateToISO(new Date()), []);

  // 1. FILTER: Only active upcoming batches (scheduledDate >= today and status !== 'completado')
  // Batches marked with status === 'completado' (Insumos en stock) or past dates are excluded
  const upcomingBatchesToBuy = useMemo(() => {
    return activeBatches
      .filter((b) => b.status !== 'completado' && b.scheduledDate >= todayStr)
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  }, [activeBatches, todayStr]);

  // 2. Earliest upcoming pending batch ("Próxima producción")
  const nextBatch = useMemo(() => {
    return upcomingBatchesToBuy.length > 0 ? upcomingBatchesToBuy[0] : null;
  }, [upcomingBatchesToBuy]);

  // 3. Batches to consolidate based on user selector
  const batchesToConsolidate = useMemo(() => {
    if (selectedFilter === 'next_production') {
      return nextBatch ? [nextBatch] : [];
    }
    if (selectedFilter === 'all_future') {
      return upcomingBatchesToBuy;
    }
    // Specific batch ID selected
    const single = upcomingBatchesToBuy.find((b) => b.id === selectedFilter);
    return single ? [single] : upcomingBatchesToBuy;
  }, [selectedFilter, nextBatch, upcomingBatchesToBuy]);

  // 4. Consolidate only the selected batches
  const consolidated = useMemo(() => {
    return consolidateBatches(batchesToConsolidate, recipes);
  }, [batchesToConsolidate, recipes]);

  // 5. Build Unified Spreadsheet Rows (Ingredients + Packaging)
  const tableRows: TableRowItem[] = useMemo(() => {
    const rows: TableRowItem[] = [];

    // Ingredients
    (Object.entries(consolidated.ingredientsByCategory) as [string, ConsolidatedIngredient[]][]).forEach(([catKey, items]) => {
      const catConfig = CATEGORY_MAP[catKey] || { label: catKey.toUpperCase(), icon: '📦', order: 99 };
      items.forEach((item) => {
        const rowId = `ing_${catKey}_${item.name.toLowerCase().trim()}`;
        const bufferedGrams = item.totalGrams * (1 + bufferPercent / 100);
        const formattedNet = formatSimpleKg(item.totalGrams, item.unit, item.name);
        const formattedBuffered = formatSimpleKg(bufferedGrams, item.unit, item.name);

        const usedInDetails = item.usedInRecipes.map((r) => ({
          recipeName: r.recipeName,
          formattedDate: r.formattedDate || '',
          units: r.amount,
        }));

        const usedInText = usedInDetails
          .map((d) => d.formattedDate ? `${d.recipeName} (${d.formattedDate})` : d.recipeName)
          .join(', ');

        rows.push({
          id: rowId,
          name: item.name,
          categoryKey: catKey,
          categoryLabel: catConfig.label,
          categoryIcon: catConfig.icon,
          netGramsOrCount: item.totalGrams,
          bufferedGramsOrCount: bufferedGrams,
          unit: item.unit,
          formattedNet,
          formattedBuffered,
          usedInDetails,
          usedInText,
          isPackaging: false,
        });
      });
    });

    // Packaging & Disposables
    consolidated.packagingList.forEach((pkg) => {
      const rowId = `pkg_${pkg.name.toLowerCase().trim()}`;
      const bufferedCount = Math.ceil(pkg.totalCount * (1 + bufferPercent / 100));
      const catConfig = CATEGORY_MAP['empaques'];

      const usedInDetails = pkg.usedInRecipes.map((r) => ({
        recipeName: r.recipeName,
        formattedDate: r.formattedDate || '',
        units: r.count,
      }));

      const usedInText = usedInDetails
        .map((d) => d.formattedDate ? `${d.recipeName} (${d.formattedDate})` : d.recipeName)
        .join(', ');

      rows.push({
        id: rowId,
        name: pkg.name,
        categoryKey: 'empaques',
        categoryLabel: catConfig.label,
        categoryIcon: catConfig.icon,
        netGramsOrCount: pkg.totalCount,
        bufferedGramsOrCount: bufferedCount,
        unit: 'u',
        formattedNet: `${pkg.totalCount} u`,
        formattedBuffered: `${bufferedCount} u`,
        usedInDetails,
        usedInText,
        isPackaging: true,
      });
    });

    // Sort by Category Order, then Name
    rows.sort((a, b) => {
      const orderA = CATEGORY_MAP[a.categoryKey]?.order || 99;
      const orderB = CATEGORY_MAP[b.categoryKey]?.order || 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
    });

    return rows;
  }, [consolidated, bufferPercent]);

  // 6. Filter rows by Search and Category
  const filteredRows = useMemo(() => {
    return tableRows.filter((row) => {
      // Category filter
      if (selectedCategoryFilter !== 'all' && row.categoryKey !== selectedCategoryFilter) {
        return false;
      }
      // Hide purchased filter
      if (hidePurchased && checkedItems[row.id]) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = row.name.toLowerCase().includes(q);
        const matchCategory = row.categoryLabel.toLowerCase().includes(q);
        const matchUsed = row.usedInText.toLowerCase().includes(q);
        return matchName || matchCategory || matchUsed;
      }
      return true;
    });
  }, [tableRows, selectedCategoryFilter, hidePurchased, checkedItems, searchQuery]);

  // Counts
  const totalCount = tableRows.length;
  const checkedCount = useMemo(() => {
    return tableRows.filter((r) => !!checkedItems[r.id]).length;
  }, [tableRows, checkedItems]);
  const pendingCount = Math.max(0, totalCount - checkedCount);

  const toggleCheck = (rowId: string) => {
    setCheckedItems((prev) => ({ ...prev, [rowId]: !prev[rowId] }));
  };

  const handleSelectAllVisible = () => {
    const updated = { ...checkedItems };
    const allChecked = filteredRows.every((r) => !!updated[r.id]);
    filteredRows.forEach((r) => {
      updated[r.id] = !allChecked;
    });
    setCheckedItems(updated);
  };

  const handleClearAllChecks = () => {
    setCheckedItems({});
  };

  // WhatsApp Copy Handler - ONLY copies items that are NOT checked/bought
  const handleCopyWhatsApp = () => {
    const isSingle = batchesToConsolidate.length === 1;
    const targetSingle = batchesToConsolidate[0];

    // Filter only unchecked rows from the entire table
    const pendingRows = tableRows.filter((r) => !checkedItems[r.id]);

    if (pendingRows.length === 0 && tableRows.length > 0) {
      const allDoneText = `🛒 *PEDIDO DE INSUMOS - FÁBRICA*\n\n✅ *TODOS LOS INSUMOS SE ENCUENTRAN EN STOCK / COMPRADOS*\nNo quedan insumos pendientes para las producciones planificadas.\n\n_Control de Producción Vagone_`;
      navigator.clipboard.writeText(allDoneText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      return;
    }

    let text = '';
    if (isSingle && targetSingle) {
      text += `🛒 *PEDIDO DE INSUMOS PENDIENTES - PRODUCCIÓN*\n`;
      text += `📅 *Lote:* ${formatBatchLabelWithDate(targetSingle.recipeName, targetSingle.scheduledDate)}\n`;
      text += `📦 *Cantidad:* ${targetSingle.targetUnits.toLocaleString('es-AR')} unidades\n`;
    } else {
      text += `🛒 *PLANILLA CONSOLIDADA DE INSUMOS PENDIENTES - FÁBRICA*\n`;
      text += `📅 *Lotes incluidos (${batchesToConsolidate.length}):*\n`;
      batchesToConsolidate.forEach((b) => {
        text += `• ${formatBatchLabelWithDate(b.recipeName, b.scheduledDate)}: ${b.targetUnits.toLocaleString('es-AR')} u\n`;
      });
    }

    if (bufferPercent > 0) {
      text += `📈 *Margen de merma aplicado:* +${bufferPercent}%\n`;
    }

    if (checkedCount > 0) {
      text += `ℹ️ *Nota:* Solo se incluyen los ${pendingRows.length} insumos faltantes (${checkedCount} ya en stock fueron excluidos).\n`;
    }

    text += `----------------------------------------\n\n`;

    // Group pending rows by category
    const groupedByCategory: Record<string, TableRowItem[]> = {};
    pendingRows.forEach((r) => {
      if (!groupedByCategory[r.categoryKey]) {
        groupedByCategory[r.categoryKey] = [];
      }
      groupedByCategory[r.categoryKey].push(r);
    });

    // Output ingredients by category
    Object.keys(CATEGORY_MAP).forEach((catKey) => {
      const items = groupedByCategory[catKey];
      if (items && items.length > 0) {
        const catConfig = CATEGORY_MAP[catKey];
        text += `*${catConfig.icon} ${catConfig.label.toUpperCase()}*:\n`;
        items.forEach((item) => {
          text += `• ${item.name}: ${item.formattedBuffered} _(Usado en: ${item.usedInText})_\n`;
        });
        text += `\n`;
      }
    });

    text += `_Generado automáticamente desde Sistema Vagone_`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const isNextActive = selectedFilter === 'next_production' || (!!nextBatch && selectedFilter === nextBatch.id);

  // Available categories in the current table for quick tabs
  const availableCategories = useMemo(() => {
    const set = new Set(tableRows.map((r) => r.categoryKey));
    return Object.keys(CATEGORY_MAP).filter((k) => set.has(k));
  }, [tableRows]);

  if (activeBatches.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-4">
        <ShoppingCart className="w-12 h-12 text-slate-400 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">No hay lotes en el plan de producción</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Agrega producciones en el Calendario para consolidar los insumos exactos en una planilla de compras estilo Excel.
        </p>
        <button
          onClick={() => onNavigateTab('calendar')}
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md"
        >
          Ir al Calendario de Planificación
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-12">
      {/* ========================================================================= */}
      {/* TOP HEADER & EXPORT TOOLBAR                                                */}
      {/* ========================================================================= */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 shadow-xs">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Planilla Unificada de Compras & Insumos
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Unifica los insumos exactos de las producciones activas a comprar. Al marcar una producción con insumos en stock, se descuenta automáticamente.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Buffer / Merma Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100/80 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-600 font-semibold text-[11px]">Merma:</span>
            {[0, 5, 10].map((b) => (
              <button
                key={b}
                onClick={() => setBufferPercent(b)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                  bufferPercent === b
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                +{b}%
              </button>
            ))}
          </div>

          {/* WhatsApp Copy Button (Only copies unchecked items) */}
          <button
            onClick={handleCopyWhatsApp}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
            title="Copia al portapapeles solo los insumos que NO fueron marcados como comprados/en stock"
          >
            {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
            <span>
              {copied 
                ? '¡Copiado al Portapapeles!' 
                : checkedCount > 0 
                  ? `Copiar ${pendingCount} Faltantes para WhatsApp` 
                  : 'Copiar para WhatsApp Proveedores'
              }
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FILTER CONTROLS: PRODUCTIONS TO CONSOLIDATE                                */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-800">
              Producciones Planificadas a Comprar ({upcomingBatchesToBuy.length} lotes activos):
            </span>
          </div>

          {/* Quick Checkbox: "Próxima producción" */}
          {nextBatch && (
            <label className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer select-none transition-all ${
              isNextActive
                ? 'bg-amber-500 border-amber-600 text-slate-950 shadow-xs'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}>
              <input
                type="checkbox"
                checked={isNextActive}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedFilter('next_production');
                  } else {
                    setSelectedFilter('all_future');
                  }
                }}
                className="rounded border-slate-300 text-slate-950 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
              />
              <span className="flex items-center gap-1">
                <span>Próxima producción:</span>
                <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                  isNextActive ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-800'
                }`}>
                  {formatBatchLabelWithDate(nextBatch.recipeName, nextBatch.scheduledDate)}
                </span>
              </span>
            </label>
          )}
        </div>

        {/* Filter Pills: All Active vs Individual Batches */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedFilter('all_future')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
              selectedFilter === 'all_future'
                ? 'bg-slate-900 border-slate-900 text-white shadow-sm ring-2 ring-amber-400'
                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400 hover:bg-slate-50'
            }`}
          >
            <span>Todas las producciones a comprar ({upcomingBatchesToBuy.length})</span>
          </button>

          {upcomingBatchesToBuy.map((batch) => {
            const isSelected = selectedFilter === batch.id || (selectedFilter === 'next_production' && nextBatch?.id === batch.id);
            const recipe = recipes.find((r) => r.id === batch.recipeId);
            const dateLabel = formatBatchDateShort(batch.scheduledDate);

            return (
              <button
                key={batch.id}
                onClick={() => setSelectedFilter(batch.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 border-amber-600 text-slate-950 shadow-xs ring-2 ring-amber-300'
                    : 'bg-white border-slate-200 text-slate-800 hover:border-slate-400 hover:bg-slate-50'
                }`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-slate-950' : 'bg-amber-500'}`} />
                <span>{batch.recipeName} <strong className="text-[11px]">({dateLabel})</strong></span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ml-1 ${
                  isSelected ? 'bg-amber-600/30 text-slate-950' : 'bg-slate-100 text-slate-600'
                }`}>
                  {batch.targetUnits.toLocaleString('es-AR')} {recipe?.yieldUnitName || 'u'}
                </span>
              </button>
            );
          })}

          {upcomingBatchesToBuy.length === 0 && (
            <span className="text-xs text-emerald-700 font-semibold italic py-1">
              ✓ No hay producciones pendientes de compra (todas están completadas o con insumos en stock).
            </span>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SPREADSHEET TOOLBAR (Search, Categories, Hide Checked, Stats)              */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar insumo, categoría o producción..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-slate-900"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            )}
          </div>

          {/* Table Actions: Hide purchased, clear, select visible */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setHidePurchased(!hidePurchased)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                hidePurchased
                  ? 'bg-amber-100 border-amber-300 text-amber-950 shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              title="Ocultar insumos ya marcados como comprados o en stock"
            >
              {hidePurchased ? <EyeOff className="w-3.5 h-3.5 text-amber-700" /> : <Eye className="w-3.5 h-3.5 text-slate-500" />}
              <span>{hidePurchased ? 'Ocultando comprados' : 'Ocultar comprados'}</span>
            </button>

            {checkedCount > 0 && (
              <button
                onClick={handleClearAllChecks}
                className="px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                title="Desmarcar todos los insumos"
              >
                Desmarcar todos ({checkedCount})
              </button>
            )}

            {selectedFilter !== 'all_future' && (
              <button
                onClick={() => setSelectedFilter('all_future')}
                className="px-2.5 py-1.5 text-xs font-bold text-amber-700 hover:text-amber-900 rounded-xl hover:bg-amber-50 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Ver todos los lotes</span>
              </button>
            )}
          </div>
        </div>

        {/* Category Tabs Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-t border-slate-100 pt-3">
          <button
            onClick={() => setSelectedCategoryFilter('all')}
            className={`px-3 py-1 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedCategoryFilter === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({totalCount})
          </button>
          {availableCategories.map((catKey) => {
            const cat = CATEGORY_MAP[catKey];
            const countInCat = tableRows.filter((r) => r.categoryKey === catKey).length;
            const isSelected = selectedCategoryFilter === catKey;

            return (
              <button
                key={catKey}
                onClick={() => setSelectedCategoryFilter(catKey)}
                className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-extrabold ${
                  isSelected ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {countInCat}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* EXCEL-LIKE SPREADSHEET TABLE                                               */}
      {/* ========================================================================= */}
      {filteredRows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3 shadow-sm">
          <CheckCheck className="w-10 h-10 text-emerald-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">
            {totalCount === 0 
              ? 'No hay insumos pendientes de compra para las producciones seleccionadas' 
              : 'No hay insumos que coincidan con los filtros aplicados'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {totalCount === 0 
              ? 'Todas las producciones planificadas tienen sus insumos marcados en stock o no hay lotes futuros agregados.'
              : 'Prueba quitando el filtro de búsqueda o desmarcando "Ocultar comprados".'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-slate-900 text-white text-[11px] font-extrabold uppercase tracking-wider select-none border-b border-slate-800">
                  <th className="py-3 px-4 w-12 text-center">
                    <button
                      onClick={handleSelectAllVisible}
                      title="Marcar / Desmarcar todos los visibles"
                      className="text-slate-300 hover:text-white"
                    >
                      <Check className="w-4 h-4 mx-auto" />
                    </button>
                  </th>
                  <th className="py-3 px-4 min-w-[220px]">Insumo / Descripción</th>
                  <th className="py-3 px-4 min-w-[160px]">Categoría</th>
                  <th className="py-3 px-4 text-right min-w-[120px]">Cant. Neta</th>
                  <th className="py-3 px-4 text-right min-w-[140px] bg-slate-800 text-amber-300">
                    A Comprar {bufferPercent > 0 ? `(+${bufferPercent}%)` : ''}
                  </th>
                  <th className="py-3 px-4 min-w-[280px]">Destino / Producción Requerida</th>
                  <th className="py-3 px-4 text-center min-w-[110px]">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {filteredRows.map((row, idx) => {
                  const isChecked = !!checkedItems[row.id];

                  return (
                    <tr
                      key={row.id}
                      onClick={() => toggleCheck(row.id)}
                      className={`transition-colors cursor-pointer select-none group ${
                        isChecked
                          ? 'bg-emerald-50/40 text-slate-500'
                          : idx % 2 === 0
                            ? 'bg-white hover:bg-amber-50/40 text-slate-900'
                            : 'bg-slate-50/60 hover:bg-amber-50/40 text-slate-900'
                      }`}
                    >
                      {/* Checkbox Column */}
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCheck(row.id)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer align-middle"
                        />
                      </td>

                      {/* Insumo Name */}
                      <td className="py-3 px-4 font-bold">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{row.categoryIcon}</span>
                          <span className={isChecked ? 'line-through text-slate-400 font-semibold' : 'text-slate-900'}>
                            {row.name}
                          </span>
                        </div>
                      </td>

                      {/* Category Chip */}
                      <td className="py-3 px-4 text-slate-600">
                        <span className="inline-flex items-center text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                          {row.categoryLabel}
                        </span>
                      </td>

                      {/* Net Quantity */}
                      <td className="py-3 px-4 text-right text-slate-500 font-mono text-xs">
                        {row.formattedNet}
                      </td>

                      {/* Buffered Quantity to Buy */}
                      <td className="py-3 px-4 text-right font-black font-mono text-xs bg-amber-50/30 group-hover:bg-amber-100/50">
                        <span className={`px-2 py-0.5 rounded-lg border ${
                          isChecked 
                            ? 'bg-slate-100 border-slate-200 text-slate-400 line-through'
                            : 'bg-amber-100/80 border-amber-300 text-amber-950 shadow-2xs'
                        }`}>
                          {row.formattedBuffered}
                        </span>
                      </td>

                      {/* Used in Recipes & Dates */}
                      <td className="py-3 px-4 text-[11px] text-slate-600">
                        <div className="flex flex-wrap gap-1 items-center">
                          {row.usedInDetails.map((dest, dIdx) => (
                            <span 
                              key={dIdx}
                              className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-md font-medium text-slate-700 shadow-2xs"
                            >
                              <span className="font-semibold text-slate-900">{dest.recipeName}</span>
                              {dest.formattedDate && (
                                <span className="text-[10px] font-bold text-amber-700">({dest.formattedDate})</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {isChecked ? (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                            <Check className="w-3 h-3" />
                            <span>En Stock</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-amber-800 bg-amber-100/80 border border-amber-300 px-2 py-0.5 rounded-full">
                            <span>Pendiente</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Table Summary Footer */}
              <tfoot>
                <tr className="bg-slate-900 text-white font-bold text-xs border-t-2 border-slate-800">
                  <td className="py-3 px-4 text-center font-mono text-[11px]">
                    {checkedCount}/{totalCount}
                  </td>
                  <td className="py-3 px-4" colSpan={2}>
                    <span>Total Planilla: <strong>{totalCount} insumos</strong> ({pendingCount} pendientes de compra, {checkedCount} en stock)</span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-[11px] text-slate-300" colSpan={2}>
                    Margen merma: +{bufferPercent}%
                  </td>
                  <td className="py-3 px-4 text-right" colSpan={2}>
                    <button
                      onClick={handleCopyWhatsApp}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar {pendingCount} Faltantes</span>
                    </button>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
