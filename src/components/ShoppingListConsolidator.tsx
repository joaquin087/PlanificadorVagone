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
  ChevronDown,
  Image as ImageIcon,
  Download,
  Loader2,
  Sparkles,
  Share2,
  Boxes,
  Layers,
  ArrowRight,
  Plus,
  Minus
} from 'lucide-react';
import { Recipe, ActiveBatch, ConsolidatedIngredient, IngredientCategoryConfig, MasterIngredient } from '../types';
import { 
  consolidateBatches, 
  formatSimpleKg, 
  formatBatchDateShort,
  formatBatchLabelWithDate 
} from '../utils/calculations';
import { formatDateToISO, getThisWeekBounds, getNextWeekBounds } from '../utils/calendarHelpers';
import { 
  downloadShoppingListImage, 
  copyShoppingListImageToClipboard,
  ExportShoppingListTableRow
} from '../utils/exportShoppingListImage';

interface ShoppingListConsolidatorProps {
  recipes: Recipe[];
  activeBatches: ActiveBatch[];
  masterIngredients?: MasterIngredient[];
  ingredientCategories?: IngredientCategoryConfig[];
  checkedItems?: Record<string, boolean>;
  factoryStock?: Record<string, number>;
  onToggleCheckItem?: (nameOrKey: string, category?: string, isPackaging?: boolean) => void;
  onUpdateFactoryStock?: (rowId: string, value: number) => void;
  onMarkAllPurchased?: (rowIds: string[]) => void;
  onResetFactoryStock?: () => void;
  onClearCheckedItems?: () => void;
  onUpdateBatchStatus?: (batchId: string, status: ActiveBatch['status']) => void;
  onNavigateTab: (tab: 'calendar' | 'recipes' | 'shopping') => void;
}

export interface TableRowItem {
  id: string;
  name: string;
  categoryKey: string;
  categoryLabel: string;
  categoryIcon: string;
  netGramsOrCount: number;
  bufferedGramsOrCount: number;
  coveredByBatchesGramsOrCount: number;
  manualStockGramsOrCount: number;
  totalAvailableStock: number;
  toBuyGramsOrCount: number;
  isInStock: boolean;
  isPartialStock: boolean;
  isCoveredByBatch: boolean;
  unit: string;
  inputUnit: 'kg' | 'g' | 'L' | 'u';
  inputScale: number; // Multiplier to convert user typed input to internal unit (e.g. 1000 for kg->g)
  formattedNet: string;
  formattedBuffered: string;
  formattedStock: string;
  formattedToBuy: string;
  usedInDetails: { 
    recipeName: string; 
    formattedDate: string; 
    units: number; 
    isBatchCompleted?: boolean;
    batchStatus?: ActiveBatch['status'];
  }[];
  usedInText: string;
  isPackaging: boolean;
}

const STORAGE_KEY_CHECKED = 'fabriplan_shopping_checked_items_v3';
const STORAGE_KEY_FACTORY_STOCK = 'fabriplan_shopping_factory_stock_v3';

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
  masterIngredients,
  ingredientCategories,
  checkedItems: propCheckedItems,
  factoryStock: propFactoryStock,
  onToggleCheckItem,
  onUpdateFactoryStock,
  onMarkAllPurchased,
  onResetFactoryStock,
  onClearCheckedItems,
  onNavigateTab,
}) => {
  const [bufferPercent, setBufferPercent] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [hidePurchased, setHidePurchased] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedFilter, setSelectedFilter] = useState<string>('this_week');

  // Dynamic category mapping from props or fallback
  const activeCategoryMap = useMemo(() => {
    const map: Record<string, { label: string; icon: string; order: number }> = {};
    if (ingredientCategories && ingredientCategories.length > 0) {
      ingredientCategories.forEach((cat, idx) => {
        map[cat.id] = {
          label: cat.name,
          icon: cat.icon || '📦',
          order: cat.order ?? (idx + 1),
        };
      });
    }
    // Fallback for default categories if missing
    Object.entries(CATEGORY_MAP).forEach(([key, val]) => {
      if (!map[key]) {
        map[key] = {
          ...val,
          order: val.order + (ingredientCategories?.length || 0),
        };
      }
    });
    return map;
  }, [ingredientCategories]);

  // Load manual factory stock (uses props or local storage fallback)
  const [localFactoryStock, setLocalFactoryStock] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FACTORY_STOCK);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Load checked/purchased items (uses props or local storage fallback)
  const [localCheckedItems, setLocalCheckedItems] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CHECKED);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const activeCheckedItems = propCheckedItems || localCheckedItems;
  const activeFactoryStock = propFactoryStock || localFactoryStock;

  // Image export state
  const [isExportingImage, setIsExportingImage] = useState<boolean>(false);
  const [imageExportStatus, setImageExportStatus] = useState<'downloaded' | 'copied' | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CHECKED, JSON.stringify(activeCheckedItems));
    } catch (e) {
      console.error('Error saving checked items', e);
    }
  }, [activeCheckedItems]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_FACTORY_STOCK, JSON.stringify(activeFactoryStock));
    } catch (e) {
      console.error('Error saving factory stock', e);
    }
  }, [activeFactoryStock]);

  // Today ISO date string (YYYY-MM-DD)
  const todayStr = useMemo(() => formatDateToISO(new Date()), []);
  const thisWeekBounds = useMemo(() => getThisWeekBounds(), []);
  const nextWeekBounds = useMemo(() => getNextWeekBounds(), []);

  // 1. ALL upcoming scheduled active batches (from today onwards: b.scheduledDate >= todayStr)
  // This strictly excludes past productions from days that have already passed!
  const allScheduledUpcomingBatches = useMemo(() => {
    return activeBatches
      .filter((b) => {
        if (!b.scheduledDate) return false;
        return b.scheduledDate >= todayStr;
      })
      .sort((a, b) => (a.scheduledDate || '').localeCompare(b.scheduledDate || ''));
  }, [activeBatches, todayStr]);

  // 2. Batches scheduled for THIS current work week (Monday through Sunday)
  const thisWeekBatches = useMemo(() => {
    return allScheduledUpcomingBatches.filter((b) => {
      if (!b.scheduledDate) return false;
      return b.scheduledDate <= thisWeekBounds.sundayISO;
    });
  }, [allScheduledUpcomingBatches, thisWeekBounds]);

  // 3. Batches scheduled for NEXT week
  const nextWeekBatches = useMemo(() => {
    return allScheduledUpcomingBatches.filter((b) => {
      if (!b.scheduledDate) return false;
      return b.scheduledDate >= nextWeekBounds.mondayISO && b.scheduledDate <= nextWeekBounds.sundayISO;
    });
  }, [allScheduledUpcomingBatches, nextWeekBounds]);

  // 4. Earliest upcoming batch ("Próxima producción")
  const nextBatch = useMemo(() => {
    return allScheduledUpcomingBatches.length > 0 ? allScheduledUpcomingBatches[0] : null;
  }, [allScheduledUpcomingBatches]);

  // 5. Batches to consolidate based on user selector
  const batchesToConsolidate = useMemo(() => {
    if (selectedFilter === 'this_week') {
      return thisWeekBatches;
    }
    if (selectedFilter === 'next_week') {
      return nextWeekBatches;
    }
    if (selectedFilter === 'next_production') {
      return nextBatch ? [nextBatch] : [];
    }
    if (selectedFilter === 'all_future') {
      return allScheduledUpcomingBatches;
    }
    // Specific batch ID selected
    const single = allScheduledUpcomingBatches.find((b) => b.id === selectedFilter);
    return single ? [single] : thisWeekBatches;
  }, [selectedFilter, thisWeekBatches, nextWeekBatches, nextBatch, allScheduledUpcomingBatches]);

  // 4. Consolidate the selected batches
  const consolidated = useMemo(() => {
    return consolidateBatches(batchesToConsolidate, recipes, masterIngredients, ingredientCategories);
  }, [batchesToConsolidate, recipes, masterIngredients, ingredientCategories]);

  // 5. Build Unified Spreadsheet Rows (Ingredients + Packaging) with Stock Deductions
  const tableRows: TableRowItem[] = useMemo(() => {
    const rows: TableRowItem[] = [];

    // Ingredients
    (Object.entries(consolidated.ingredientsByCategory) as [string, ConsolidatedIngredient[]][]).forEach(([catKey, items]) => {
      const catConfig = activeCategoryMap[catKey] || { label: catKey.toUpperCase(), icon: '📦', order: 99 };
      items.forEach((item) => {
        const rowId = `ing_${catKey}_${item.name.toLowerCase().trim()}`;
        const bufferedGrams = item.totalGrams * (1 + bufferPercent / 100);

        // Sum of grams covered by batches with status === 'completado' (Insumos en stock)
        const coveredByBatchesGrams = item.usedInRecipes
          .filter((r) => r.isBatchCompleted)
          .reduce((sum, r) => sum + r.amount, 0);

        const isAllBatchesCompleted = item.usedInRecipes.length > 0 && item.usedInRecipes.every((r) => r.isBatchCompleted);

        // Manual stock from user input
        const cleanName = item.name.toLowerCase().trim();
        const manualStockGrams = activeFactoryStock[rowId] ?? activeFactoryStock[cleanName] ?? 0;

        // Total available stock is the maximum of manual entered stock or batch covered stock
        const totalAvailableStock = Math.max(manualStockGrams, coveredByBatchesGrams);

        // Determine input scale & unit (kg vs g vs L vs u)
        let inputUnit: 'kg' | 'g' | 'L' | 'u' = 'kg';
        let inputScale = 1000; // 1 kg = 1000 g

        if (item.unit === 'u' || item.unit === 'unidades') {
          inputUnit = 'u';
          inputScale = 1;
        } else if (item.unit === 'L' || item.unit === 'ml') {
          inputUnit = 'L';
          inputScale = 1000;
        } else if (item.totalGrams < 1000 && !cleanName.includes('harina') && !cleanName.includes('queso')) {
          // Smaller spice/condiment: enter in grams
          inputUnit = 'g';
          inputScale = 1;
        }

        const isChecked = Boolean(
          activeCheckedItems[rowId] ||
          activeCheckedItems[cleanName] ||
          activeCheckedItems[`ing_${catKey}_${cleanName}`]
        );
        const isCoveredByStock = totalAvailableStock >= bufferedGrams && bufferedGrams > 0;
        const isInStock = isChecked || isAllBatchesCompleted || isCoveredByStock;

        const toBuyGrams = isInStock ? 0 : Math.max(0, bufferedGrams - totalAvailableStock);
        const isPartialStock = !isInStock && totalAvailableStock > 0 && toBuyGrams > 0;

        const formattedNet = formatSimpleKg(item.totalGrams, item.unit, item.name);
        const formattedBuffered = formatSimpleKg(bufferedGrams, item.unit, item.name);
        const formattedStock = totalAvailableStock > 0 ? formatSimpleKg(totalAvailableStock, item.unit, item.name) : '0';
        const formattedToBuy = isInStock ? (item.unit === 'u' ? '0 u' : '0.00 kg') : formatSimpleKg(toBuyGrams, item.unit, item.name);

        const usedInDetails = item.usedInRecipes.map((r) => ({
          recipeName: r.recipeName,
          formattedDate: r.formattedDate || '',
          units: r.amount,
          isBatchCompleted: r.isBatchCompleted,
          batchStatus: r.batchStatus,
        }));

        const usedInText = usedInDetails
          .map((d) => {
            const dateTag = d.formattedDate ? ` (${d.formattedDate})` : '';
            const statusTag = d.isBatchCompleted ? ' [En stock]' : '';
            return `${d.recipeName}${dateTag}${statusTag}`;
          })
          .join(', ');

        rows.push({
          id: rowId,
          name: item.name,
          categoryKey: catKey,
          categoryLabel: catConfig.label,
          categoryIcon: catConfig.icon,
          netGramsOrCount: item.totalGrams,
          bufferedGramsOrCount: bufferedGrams,
          coveredByBatchesGramsOrCount: coveredByBatchesGrams,
          manualStockGramsOrCount: manualStockGrams,
          totalAvailableStock,
          toBuyGramsOrCount: toBuyGrams,
          isInStock,
          isPartialStock,
          isCoveredByBatch: isAllBatchesCompleted || coveredByBatchesGrams > 0,
          unit: item.unit,
          inputUnit,
          inputScale,
          formattedNet,
          formattedBuffered,
          formattedStock,
          formattedToBuy,
          usedInDetails,
          usedInText,
          isPackaging: false,
        });
      });
    });

    // Packaging & Disposables
    consolidated.packagingList.forEach((pkg) => {
      const cleanPkgName = pkg.name.toLowerCase().trim();
      const rowId = `pkg_${cleanPkgName}`;
      const bufferedCount = Math.ceil(pkg.totalCount * (1 + bufferPercent / 100));
      const catConfig = activeCategoryMap['empaques'] || { label: 'Empaque & Descartables', icon: '🛍️', order: 8 };

      const coveredByBatchesCount = pkg.usedInRecipes
        .filter((r) => r.isBatchCompleted)
        .reduce((sum, r) => sum + r.count, 0);

      const isAllBatchesCompleted = pkg.usedInRecipes.length > 0 && pkg.usedInRecipes.every((r) => r.isBatchCompleted);
      const manualStockCount = activeFactoryStock[rowId] ?? activeFactoryStock[cleanPkgName] ?? 0;
      const totalAvailableStock = Math.max(manualStockCount, coveredByBatchesCount);

      const isChecked = Boolean(
        activeCheckedItems[rowId] ||
        activeCheckedItems[cleanPkgName] ||
        activeCheckedItems[`pkg_${cleanPkgName}`]
      );
      const isCoveredByStock = totalAvailableStock >= bufferedCount && bufferedCount > 0;
      const isInStock = isChecked || isAllBatchesCompleted || isCoveredByStock;

      const toBuyCount = isInStock ? 0 : Math.max(0, bufferedCount - totalAvailableStock);
      const isPartialStock = !isInStock && totalAvailableStock > 0 && toBuyCount > 0;

      const formattedNet = `${pkg.totalCount} u`;
      const formattedBuffered = `${bufferedCount} u`;
      const formattedStock = totalAvailableStock > 0 ? `${totalAvailableStock} u` : '0 u';
      const formattedToBuy = `${toBuyCount} u`;

      const usedInDetails = pkg.usedInRecipes.map((r) => ({
        recipeName: r.recipeName,
        formattedDate: r.formattedDate || '',
        units: r.count,
        isBatchCompleted: r.isBatchCompleted,
        batchStatus: r.batchStatus,
      }));

      const usedInText = usedInDetails
        .map((d) => {
          const dateTag = d.formattedDate ? ` (${d.formattedDate})` : '';
          const statusTag = d.isBatchCompleted ? ' [En stock]' : '';
          return `${d.recipeName}${dateTag}${statusTag}`;
        })
        .join(', ');

      rows.push({
        id: rowId,
        name: pkg.name,
        categoryKey: 'empaques',
        categoryLabel: catConfig.label,
        categoryIcon: catConfig.icon,
        netGramsOrCount: pkg.totalCount,
        bufferedGramsOrCount: bufferedCount,
        coveredByBatchesGramsOrCount: coveredByBatchesCount,
        manualStockGramsOrCount: manualStockCount,
        totalAvailableStock,
        toBuyGramsOrCount: toBuyCount,
        isInStock,
        isPartialStock,
        isCoveredByBatch: isAllBatchesCompleted || coveredByBatchesCount > 0,
        unit: 'u',
        inputUnit: 'u',
        inputScale: 1,
        formattedNet,
        formattedBuffered,
        formattedStock,
        formattedToBuy,
        usedInDetails,
        usedInText,
        isPackaging: true,
      });
    });

    // Sort by Category Order, then Name
    rows.sort((a, b) => {
      const orderA = activeCategoryMap[a.categoryKey]?.order || 99;
      const orderB = activeCategoryMap[b.categoryKey]?.order || 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
    });

    return rows;
  }, [consolidated, bufferPercent, activeFactoryStock, activeCheckedItems, activeCategoryMap]);

  // 6. Filter rows by Search, Category and Hide Purchased
  const filteredRows = useMemo(() => {
    return tableRows.filter((row) => {
      // Category filter
      if (selectedCategoryFilter !== 'all' && row.categoryKey !== selectedCategoryFilter) {
        return false;
      }
      // Hide purchased filter
      if (hidePurchased && row.isInStock) {
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
  }, [tableRows, selectedCategoryFilter, hidePurchased, searchQuery]);

  // Counts
  const totalCount = tableRows.length;
  const inStockCount = useMemo(() => {
    return tableRows.filter((r) => r.isInStock).length;
  }, [tableRows]);
  const pendingCount = Math.max(0, totalCount - inStockCount);

  // Manual checkbox toggle
  const toggleCheck = (rowId: string) => {
    if (onToggleCheckItem) {
      const isPkg = rowId.startsWith('pkg_');
      const catKey = rowId.startsWith('ing_') ? rowId.split('_')[1] : undefined;
      onToggleCheckItem(rowId, catKey, isPkg);
    } else {
      setLocalCheckedItems((prev) => {
        const isCurrentlyChecked = !!prev[rowId];
        return { ...prev, [rowId]: !isCurrentlyChecked };
      });
    }
  };

  // Stock Input updater
  const handleUpdateStock = (row: TableRowItem, rawInputVal: number) => {
    const safeVal = isNaN(rawInputVal) || rawInputVal < 0 ? 0 : rawInputVal;
    const internalVal = safeVal * row.inputScale;
    if (onUpdateFactoryStock) {
      onUpdateFactoryStock(row.id, internalVal);
    } else {
      setLocalFactoryStock((prev) => ({
        ...prev,
        [row.id]: internalVal,
      }));
    }
  };

  // Quick action: Set stock = needed amount (tengo todo)
  const handleCoverStock = (row: TableRowItem) => {
    if (onUpdateFactoryStock) {
      onUpdateFactoryStock(row.id, row.bufferedGramsOrCount);
    } else {
      setLocalFactoryStock((prev) => ({
        ...prev,
        [row.id]: row.bufferedGramsOrCount,
      }));
    }
    if (onToggleCheckItem) {
      const isPkg = row.isPackaging;
      onToggleCheckItem(row.id, row.categoryKey, isPkg);
    } else {
      setLocalCheckedItems((prev) => ({
        ...prev,
        [row.id]: true,
      }));
    }
  };

  // Quick action: Clear stock to 0
  const handleClearStock = (row: TableRowItem) => {
    if (onUpdateFactoryStock) {
      onUpdateFactoryStock(row.id, 0);
    } else {
      setLocalFactoryStock((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
    }
    if (onToggleCheckItem && activeCheckedItems[row.id]) {
      const isPkg = row.isPackaging;
      onToggleCheckItem(row.id, row.categoryKey, isPkg);
    } else {
      setLocalCheckedItems((prev) => ({
        ...prev,
        [row.id]: false,
      }));
    }
  };

  // Batch actions
  const handleSelectAllVisible = () => {
    const allInStock = filteredRows.every((r) => r.isInStock);
    if (onMarkAllPurchased) {
      const targetIds = filteredRows.map((r) => r.id);
      if (allInStock) {
        if (onClearCheckedItems) onClearCheckedItems();
      } else {
        onMarkAllPurchased(targetIds);
      }
    } else {
      const updated = { ...localCheckedItems };
      filteredRows.forEach((r) => {
        updated[r.id] = !allInStock;
      });
      setLocalCheckedItems(updated);
    }
  };

  const handleClearAllChecksAndStock = () => {
    if (onClearCheckedItems) onClearCheckedItems();
    if (onResetFactoryStock) onResetFactoryStock();
    setLocalCheckedItems({});
    setLocalFactoryStock({});
  };

  // WhatsApp Copy Handler
  const handleCopyWhatsApp = () => {
    const isSingle = batchesToConsolidate.length === 1;
    const targetSingle = batchesToConsolidate[0];

    // Pending rows that actually need to be purchased
    const pendingRows = tableRows.filter((r) => !r.isInStock && r.toBuyGramsOrCount > 0);
    const inStockRows = tableRows.filter((r) => r.isInStock);

    if (pendingRows.length === 0 && tableRows.length > 0) {
      const allDoneText = `🛒 *PEDIDO DE INSUMOS - FÁBRICA VAGONE*\n\n✅ *TODOS LOS INSUMOS SE ENCUENTRAN EN STOCK / CUBIERTOS*\nNo quedan insumos pendientes para las producciones planificadas.\n\n_Control Operativo y Stock Vagone_`;
      navigator.clipboard.writeText(allDoneText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      return;
    }

    let text = '';
    if (hidePurchased) {
      text += `🛒 *PEDIDO DE INSUMOS FALTANTES A COMPRAR - FÁBRICA VAGONE*\n`;
    } else if (isSingle && targetSingle) {
      text += `🛒 *PEDIDO DE INSUMOS PENDIENTES - PRODUCCIÓN*\n`;
    } else {
      text += `🛒 *PLANILLA CONSOLIDADA DE INSUMOS A COMPRAR - FÁBRICA*\n`;
    }

    if (isSingle && targetSingle) {
      text += `📅 *Lote:* ${formatBatchLabelWithDate(targetSingle.recipeName, targetSingle.scheduledDate)}\n`;
      text += `📦 *Cantidad:* ${targetSingle.targetUnits.toLocaleString('es-AR')} unidades\n`;
    } else {
      text += `📅 *Lotes incluidos (${batchesToConsolidate.length}):*\n`;
      batchesToConsolidate.forEach((b) => {
        const isDone = b.status === 'completado';
        text += `• ${formatBatchLabelWithDate(b.recipeName, b.scheduledDate)}: ${b.targetUnits.toLocaleString('es-AR')} u ${isDone ? '✅ (Insumos en stock)' : ''}\n`;
      });
    }

    if (bufferPercent > 0) {
      text += `📈 *Margen de merma aplicado:* +${bufferPercent}%\n`;
    }

    if (hidePurchased) {
      text += `ℹ️ *Resumen:* ${pendingRows.length} insumos a comprar (insumos en stock descontados y ocultados).\n`;
    } else {
      text += `ℹ️ *Resumen:* ${pendingRows.length} insumos a comprar • ${inStockRows.length} insumos ya en stock en fábrica.\n`;
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
    const categoryKeysToOutput = Object.keys(activeCategoryMap).filter((k) => groupedByCategory[k]?.length > 0);
    // Add any category in groupedByCategory that is not in activeCategoryMap keys
    Object.keys(groupedByCategory).forEach((k) => {
      if (!categoryKeysToOutput.includes(k)) categoryKeysToOutput.push(k);
    });

    categoryKeysToOutput.sort((a, b) => {
      const orderA = activeCategoryMap[a]?.order ?? 99;
      const orderB = activeCategoryMap[b]?.order ?? 99;
      return orderA - orderB;
    });

    categoryKeysToOutput.forEach((catKey) => {
      const items = groupedByCategory[catKey];
      if (items && items.length > 0) {
        const catConfig = activeCategoryMap[catKey] || { label: catKey, icon: '📦', order: 99 };
        text += `*${catConfig.icon} ${catConfig.label.toUpperCase()}*:\n`;
        items.forEach((item) => {
          const stockNote = item.totalAvailableStock > 0 ? ` (Stock en fábrica: ${item.formattedStock} / Faltan: ${item.formattedToBuy})` : '';
          text += `• ${item.name}: *${item.formattedToBuy}*${stockNote} _(Usado en: ${item.usedInText})_\n`;
        });
        text += `\n`;
      }
    });

    // Only append in-stock section if NOT in hidePurchased mode
    if (!hidePurchased && inStockRows.length > 0) {
      text += `----------------------------------------\n`;
      text += `✅ *INSUMOS CUBIERTOS EN STOCK DE FÁBRICA (${inStockRows.length}):*\n`;
      inStockRows.forEach((item) => {
        text += `✓ ~${item.name}~ (${item.formattedNet})\n`;
      });
      text += `\n`;
    }

    text += `_Generado automáticamente desde Sistema de Producción Vagone_`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // Image Export Handler - Generates high-resolution PNG with stock & strikethrough styling
  const handleExportImage = async (mode: 'download' | 'clipboard' = 'download') => {
    setIsExportingImage(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 80));

      const rowsToExport = hidePurchased
        ? tableRows.filter((r) => !r.isInStock && r.toBuyGramsOrCount > 0)
        : tableRows;

      const exportRows: ExportShoppingListTableRow[] = rowsToExport.map((r) => ({
        id: r.id,
        name: r.name,
        categoryKey: r.categoryKey,
        categoryLabel: r.categoryLabel,
        categoryIcon: r.categoryIcon,
        formattedNet: r.formattedNet,
        formattedStock: r.formattedStock,
        formattedBuffered: r.formattedBuffered,
        formattedToBuy: r.formattedToBuy,
        usedInText: r.usedInText,
        isPackaging: r.isPackaging,
        isInStock: r.isInStock,
        isPartialStock: r.isPartialStock,
        totalAvailableStock: r.totalAvailableStock,
        toBuyGramsOrCount: r.toBuyGramsOrCount,
      }));

      const params = {
        batches: batchesToConsolidate,
        recipes,
        tableRows: exportRows,
        checkedItems: activeCheckedItems,
        bufferPercent,
        CATEGORY_MAP: activeCategoryMap,
        formatBatchDateShort,
        onlyMissing: hidePurchased,
      };

      if (mode === 'clipboard') {
        const copiedSuccess = await copyShoppingListImageToClipboard(params);
        if (copiedSuccess) {
          setImageExportStatus('copied');
          setTimeout(() => setImageExportStatus(null), 3500);
          setIsExportingImage(false);
          return;
        }
      }

      const filePrefix = hidePurchased ? 'planilla-faltantes-compras-vagone' : 'planilla-compras-vagone';
      downloadShoppingListImage(params, filePrefix);
      setImageExportStatus('downloaded');
      setTimeout(() => setImageExportStatus(null), 3500);
    } catch (err) {
      console.error('Error generating image export:', err);
    } finally {
      setIsExportingImage(false);
    }
  };

  const isNextActive = selectedFilter === 'next_production' || (!!nextBatch && selectedFilter === nextBatch.id);

  // Available categories in the current table for quick tabs
  const availableCategories = useMemo(() => {
    const presentKeys = new Set(tableRows.map((r) => r.categoryKey));
    const allKeys = Object.keys(activeCategoryMap);
    const sorted = allKeys.filter((k) => presentKeys.has(k)).sort((a, b) => {
      const orderA = activeCategoryMap[a]?.order ?? 99;
      const orderB = activeCategoryMap[b]?.order ?? 99;
      return orderA - orderB;
    });
    presentKeys.forEach((k) => {
      if (!sorted.includes(k)) sorted.push(k);
    });
    return sorted;
  }, [tableRows, activeCategoryMap]);

  if (activeBatches.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-4">
        <ShoppingCart className="w-12 h-12 text-slate-400 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">No hay producciones planificadas</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Agrega producciones en el Calendario para consolidar los insumos exactos en una planilla de compras con control de stock.
        </p>
        <button
          onClick={() => onNavigateTab('calendar')}
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
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
              Planilla Unificada de Compras & Stock en Fábrica
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Consolida los insumos requeridos. Completa el <strong>Stock en Fábrica</strong> para descontar lo que ya hay en planta y evitar compras en exceso.
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
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  bufferPercent === b
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                +{b}%
              </button>
            ))}
          </div>

          {/* Hide Stock Toggle Button (Also applies to Export) */}
          <button
            onClick={() => setHidePurchased(!hidePurchased)}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-xs active:scale-95 cursor-pointer border ${
              hidePurchased
                ? 'bg-amber-500 border-amber-600 text-slate-950 ring-2 ring-amber-300'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400'
            }`}
            title={hidePurchased ? 'Mostrando solo faltantes. Clic para ver todos los insumos.' : 'Ocultar insumos en stock y exportar solo lo que falta'}
          >
            {hidePurchased ? <EyeOff className="w-4 h-4 text-slate-950" /> : <Eye className="w-4 h-4 text-slate-500" />}
            <span>
              {hidePurchased ? 'Ocultando en stock (Solo faltantes)' : 'Ocultar insumos en stock'}
            </span>
            {inStockCount > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                hidePurchased ? 'bg-slate-950 text-amber-300' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {inStockCount} en stock
              </span>
            )}
          </button>

          {/* Export as Image Button */}
          <button
            onClick={() => handleExportImage('download')}
            disabled={isExportingImage}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-white font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer ${
              imageExportStatus === 'downloaded'
                ? 'bg-indigo-700'
                : 'bg-indigo-600 hover:bg-indigo-500'
            } ${isExportingImage ? 'opacity-70 cursor-wait' : ''}`}
            title={hidePurchased ? "Descargar imagen PNG con solo los insumos faltantes a comprar" : "Descargar planilla consolidada como imagen PNG con insumos en stock tachados en verde"}
          >
            {isExportingImage ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : imageExportStatus === 'downloaded' ? (
              <Check className="w-4 h-4 text-emerald-300" />
            ) : (
              <ImageIcon className="w-4 h-4" />
            )}
            <span>
              {isExportingImage 
                ? 'Generando Imagen...' 
                : imageExportStatus === 'downloaded'
                  ? '¡Imagen PNG Descargada!'
                  : hidePurchased
                    ? 'Exportar Imagen (Solo faltantes)'
                    : 'Exportar como Imagen'
              }
            </span>
          </button>

          {/* WhatsApp Copy Button */}
          <button
            onClick={handleCopyWhatsApp}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
            title={hidePurchased ? "Copiar solo los insumos faltantes para enviar por WhatsApp" : "Copiar planilla consolidada para WhatsApp con resumen de stock"}
          >
            {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
            <span>
              {copied 
                ? '¡Copiado al Portapapeles!' 
                : hidePurchased
                  ? `Copiar ${pendingCount} Faltantes para WhatsApp`
                  : pendingCount > 0 
                    ? `Copiar ${pendingCount} Faltantes para WhatsApp` 
                    : 'Copiar para WhatsApp Proveedores'
              }
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FILTER CONTROLS: PRODUCTIONS TO CONSOLIDATE (WEEK VS ALL)                  */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-800">
              Lotes de Producción Consolidados:
            </span>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {batchesToConsolidate.length} {batchesToConsolidate.length === 1 ? 'lote seleccionado' : 'lotes seleccionados'}
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
                    setSelectedFilter('this_week');
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

        {/* Primary Scope Buttons: Esta semana (default) vs Próxima semana vs Todas */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Esta semana (DEFAULT) */}
          <button
            onClick={() => setSelectedFilter('this_week')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 cursor-pointer ${
              selectedFilter === 'this_week'
                ? 'bg-slate-900 border-slate-900 text-white shadow-sm ring-2 ring-amber-400'
                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400 hover:bg-slate-50'
            }`}
          >
            <Calendar className={`w-3.5 h-3.5 ${selectedFilter === 'this_week' ? 'text-amber-400' : 'text-slate-400'}`} />
            <div className="text-left">
              <span className="block leading-tight">Esta semana ({thisWeekBatches.length})</span>
              <span className={`text-[10px] font-medium block leading-tight ${selectedFilter === 'this_week' ? 'text-slate-300' : 'text-slate-400'}`}>
                {thisWeekBounds.label}
              </span>
            </div>
            {selectedFilter === 'this_week' && (
              <span className="text-[9px] font-black bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded uppercase ml-1">
                Por defecto
              </span>
            )}
          </button>

          {/* Próxima semana */}
          <button
            onClick={() => setSelectedFilter('next_week')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 cursor-pointer ${
              selectedFilter === 'next_week'
                ? 'bg-slate-900 border-slate-900 text-white shadow-sm ring-2 ring-amber-400'
                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400 hover:bg-slate-50'
            }`}
          >
            <Calendar className={`w-3.5 h-3.5 ${selectedFilter === 'next_week' ? 'text-amber-400' : 'text-slate-400'}`} />
            <div className="text-left">
              <span className="block leading-tight">Próxima semana ({nextWeekBatches.length})</span>
              <span className={`text-[10px] font-medium block leading-tight ${selectedFilter === 'next_week' ? 'text-slate-300' : 'text-slate-400'}`}>
                {nextWeekBounds.label}
              </span>
            </div>
          </button>

          {/* Todas las producciones planificadas */}
          <button
            onClick={() => setSelectedFilter('all_future')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 cursor-pointer ${
              selectedFilter === 'all_future'
                ? 'bg-slate-900 border-slate-900 text-white shadow-sm ring-2 ring-amber-400'
                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400 hover:bg-slate-50'
            }`}
          >
            <Boxes className={`w-3.5 h-3.5 ${selectedFilter === 'all_future' ? 'text-amber-400' : 'text-slate-400'}`} />
            <div className="text-left">
              <span className="block leading-tight">Todas las planificadas ({allScheduledUpcomingBatches.length})</span>
              <span className={`text-[10px] font-medium block leading-tight ${selectedFilter === 'all_future' ? 'text-slate-300' : 'text-slate-400'}`}>
                Incluye todo el calendario
              </span>
            </div>
          </button>
        </div>

        {/* Empty state notice if current week has 0 batches */}
        {selectedFilter === 'this_week' && thisWeekBatches.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="text-amber-900">
              <p className="font-bold">No hay producciones planificadas para esta semana ({thisWeekBounds.label}).</p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                {allScheduledUpcomingBatches.length > 0 
                  ? `Tienes ${allScheduledUpcomingBatches.length} producciones programadas en semanas futuras.`
                  : 'No hay producciones activas en el calendario.'}
              </p>
            </div>
            {allScheduledUpcomingBatches.length > 0 && (
              <div className="flex items-center gap-2">
                {nextWeekBatches.length > 0 && (
                  <button
                    onClick={() => setSelectedFilter('next_week')}
                    className="px-3 py-1.5 bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 rounded-lg font-bold text-xs cursor-pointer"
                  >
                    Ver próxima semana ({nextWeekBatches.length})
                  </button>
                )}
                <button
                  onClick={() => setSelectedFilter('all_future')}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs"
                >
                  Ver todas las planificadas ({allScheduledUpcomingBatches.length})
                </button>
              </div>
            )}
          </div>
        )}

        {/* Empty state notice if next week has 0 batches */}
        {selectedFilter === 'next_week' && nextWeekBatches.length === 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="text-slate-700">
              <p className="font-bold">No hay producciones programadas para la próxima semana ({nextWeekBounds.label}).</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Puedes ver todas las producciones planificadas o volver a esta semana.</p>
            </div>
            <button
              onClick={() => setSelectedFilter('all_future')}
              className="px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-lg font-bold text-xs cursor-pointer"
            >
              Ver todas ({allScheduledUpcomingBatches.length})
            </button>
          </div>
        )}

        {/* Individual Batches Pills */}
        {allScheduledUpcomingBatches.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="text-[11px] font-semibold text-slate-500">
              O selecciona un lote individual para aislar sus insumos:
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {allScheduledUpcomingBatches.map((batch) => {
                const isSelected = selectedFilter === batch.id || (selectedFilter === 'next_production' && nextBatch?.id === batch.id);
                const recipe = recipes.find((r) => r.id === batch.recipeId);
                const dateLabel = formatBatchDateShort(batch.scheduledDate);
                const isBatchCompleted = batch.status === 'completado';
                const isThisWeek = thisWeekBatches.some((b) => b.id === batch.id);
                const isNextWeek = nextWeekBatches.some((b) => b.id === batch.id);

                return (
                  <button
                    key={batch.id}
                    onClick={() => setSelectedFilter(batch.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 border-amber-600 text-slate-950 shadow-xs ring-2 ring-amber-300'
                        : isBatchCompleted
                        ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 hover:bg-emerald-100/70'
                        : 'bg-white border-slate-200 text-slate-800 hover:border-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      isSelected ? 'bg-slate-950' : isBatchCompleted ? 'bg-emerald-500' : 'bg-amber-500'
                    }`} />
                    <span>{batch.recipeName} <strong className="text-[11px]">({dateLabel})</strong></span>
                    
                    {isThisWeek && (
                      <span className="text-[9px] font-extrabold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded">
                        Esta sem
                      </span>
                    )}
                    {isNextWeek && (
                      <span className="text-[9px] font-extrabold bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded">
                        Próx sem
                      </span>
                    )}

                    {isBatchCompleted && (
                      <span className="text-[9.5px] font-black bg-emerald-200/80 text-emerald-900 px-1.5 py-0.2 rounded">
                        ✓ Insumos en stock
                      </span>
                    )}
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ml-0.5 ${
                      isSelected 
                        ? 'bg-amber-600/30 text-slate-950' 
                        : isBatchCompleted 
                        ? 'bg-emerald-200/50 text-emerald-800' 
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {batch.targetUnits.toLocaleString('es-AR')} {recipe?.yieldUnitName || 'u'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
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
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
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
              title="Ocultar insumos que ya se encuentran cubiertos en stock"
            >
              {hidePurchased ? <EyeOff className="w-3.5 h-3.5 text-amber-700" /> : <Eye className="w-3.5 h-3.5 text-slate-500" />}
              <span>{hidePurchased ? 'Ocultando en stock' : 'Ocultar en stock'}</span>
            </button>

            {(inStockCount > 0 || Object.keys(activeFactoryStock).length > 0) && (
              <button
                onClick={handleClearAllChecksAndStock}
                className="px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                title="Limpiar stocks manuales y marcas"
              >
                Limpiar stocks y marcas
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
            const cat = activeCategoryMap[catKey] || { label: catKey, icon: '📦', order: 99 };
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
      {/* SPREADSHEET TABLE WITH STOCK INPUTS & STRIKETHROUGH IN GREEN              */}
      {/* ========================================================================= */}
      {filteredRows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3 shadow-sm">
          <CheckCheck className="w-10 h-10 text-emerald-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">
            {totalCount === 0 
              ? 'No hay insumos requeridos para las producciones seleccionadas' 
              : 'No hay insumos que coincidan con los filtros aplicados'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {totalCount === 0 
              ? 'Todas las producciones planificadas tienen sus insumos en stock o no hay lotes agregados.'
              : 'Prueba quitando el filtro de búsqueda o desmarcando "Ocultar en stock".'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[880px]">
              <thead>
                <tr className="bg-slate-900 text-white text-[11px] font-extrabold uppercase tracking-wider select-none border-b border-slate-800">
                  <th className="py-3 px-3 w-10 text-center">
                    <button
                      onClick={handleSelectAllVisible}
                      title="Marcar / Desmarcar todos los visibles"
                      className="text-slate-300 hover:text-white cursor-pointer"
                    >
                      <Check className="w-4 h-4 mx-auto" />
                    </button>
                  </th>
                  <th className="py-3 px-4 min-w-[200px]">Insumo / Descripción</th>
                  <th className="py-3 px-3 min-w-[130px]">Categoría</th>
                  <th className="py-3 px-3 text-right min-w-[100px]">Cant. Neta</th>
                  <th className="py-3 px-3 text-center min-w-[170px] bg-emerald-950/80 text-emerald-300">
                    Stock en Fábrica
                  </th>
                  <th className="py-3 px-3 text-right min-w-[130px] bg-slate-800 text-amber-300">
                    A Comprar {bufferPercent > 0 ? `(+${bufferPercent}%)` : ''}
                  </th>
                  <th className="py-3 px-4 min-w-[220px]">Destino / Producción Requerida</th>
                  <th className="py-3 px-3 text-center min-w-[110px]">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {filteredRows.map((row, idx) => {
                  const isInStock = row.isInStock;
                  const isPartial = row.isPartialStock;

                  // Current user input value for the stock field
                  const currentStockDisplay = row.totalAvailableStock > 0 
                    ? Number((row.totalAvailableStock / row.inputScale).toFixed(2)) 
                    : '';

                  return (
                    <tr
                      key={row.id}
                      className={`transition-colors select-none group ${
                        isInStock
                          ? 'bg-emerald-50/60 hover:bg-emerald-100/50 text-slate-700'
                          : isPartial
                          ? 'bg-amber-50/30 hover:bg-amber-100/40 text-slate-900'
                          : idx % 2 === 0
                            ? 'bg-white hover:bg-slate-50 text-slate-900'
                            : 'bg-slate-50/60 hover:bg-slate-100/60 text-slate-900'
                      }`}
                    >
                      {/* Checkbox Column */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isInStock}
                          onChange={() => toggleCheck(row.id)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer align-middle"
                        />
                      </td>

                      {/* Insumo Name & Strikethrough if in stock */}
                      <td className="py-3 px-4 font-bold">
                        <div className="flex items-center gap-2">
                          <span className="text-sm shrink-0">{row.categoryIcon}</span>
                          <span className={`${
                            isInStock 
                              ? 'line-through text-emerald-800 font-bold decoration-emerald-500 decoration-2' 
                              : 'text-slate-900'
                          }`}>
                            {row.name}
                          </span>
                          {isInStock && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold text-emerald-700 bg-emerald-100/90 border border-emerald-300 px-1.5 py-0.5 rounded ml-1">
                              ✓ En Stock
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Category Chip */}
                      <td className="py-3 px-3 text-slate-600">
                        <span className="inline-flex items-center text-[10.5px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                          {row.categoryLabel}
                        </span>
                      </td>

                      {/* Net Quantity */}
                      <td className="py-3 px-3 text-right font-mono text-xs">
                        <span className={isInStock ? 'line-through text-emerald-700 font-semibold decoration-emerald-400' : 'text-slate-600'}>
                          {row.formattedNet}
                        </span>
                      </td>

                      {/* Stock en Fábrica (Interactive Input Field) */}
                      <td className="py-2.5 px-3 bg-emerald-50/30 group-hover:bg-emerald-100/30">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="relative flex items-center">
                            <input
                              type="number"
                              min="0"
                              step={row.inputUnit === 'u' ? '1' : row.inputUnit === 'g' ? '5' : '0.1'}
                              value={currentStockDisplay}
                              placeholder="0"
                              onChange={(e) => handleUpdateStock(row, parseFloat(e.target.value))}
                              className={`w-20 px-2 py-1 text-center font-mono font-bold text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                                isInStock
                                  ? 'bg-emerald-100/90 border-emerald-400 text-emerald-950 font-black'
                                  : isPartial
                                  ? 'bg-amber-50 border-amber-300 text-amber-950'
                                  : 'bg-white border-slate-300 text-slate-800'
                              }`}
                              title={`Ingresa la cantidad que ya hay en fábrica en ${row.inputUnit}`}
                            />
                            <span className="text-[11px] font-extrabold text-slate-500 ml-1">
                              {row.inputUnit}
                            </span>
                          </div>

                          {/* Quick buttons */}
                          {!isInStock ? (
                            <button
                              type="button"
                              onClick={() => handleCoverStock(row)}
                              className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition-all shadow-xs cursor-pointer"
                              title="Marcar que tenemos todo el stock necesario"
                            >
                              Tengo todo
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleClearStock(row)}
                              className="p-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[10px] transition-all cursor-pointer"
                              title="Limpiar stock a 0"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        {row.isCoveredByBatch && (
                          <div className="text-[9.5px] font-semibold text-emerald-700 text-center mt-0.5">
                            ✓ Cubierto por lote en stock
                          </div>
                        )}
                      </td>

                      {/* Buffered Quantity to Buy */}
                      <td className="py-3 px-3 text-right font-black font-mono text-xs bg-amber-50/30 group-hover:bg-amber-100/50">
                        <span className={`px-2.5 py-1 rounded-lg border inline-block ${
                          isInStock 
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-900 font-black'
                            : isPartial
                            ? 'bg-amber-100 border-amber-300 text-amber-950 shadow-2xs font-black'
                            : 'bg-amber-100/80 border-amber-300 text-amber-950 shadow-2xs'
                        }`}>
                          {isInStock ? `0 ${row.unit === 'u' ? 'u' : 'kg'}` : row.formattedToBuy}
                        </span>
                        {isPartial && (
                          <span className="block text-[9.5px] font-bold text-amber-700 text-right mt-0.5">
                            (Faltan {row.formattedToBuy})
                          </span>
                        )}
                      </td>

                      {/* Used in Recipes & Dates */}
                      <td className="py-3 px-4 text-[11px] text-slate-600">
                        <div className="flex flex-wrap gap-1 items-center">
                          {row.usedInDetails.map((dest, dIdx) => (
                            <span 
                              key={dIdx}
                              className={`inline-flex items-center gap-1 border px-2 py-0.5 rounded-md font-medium shadow-2xs ${
                                dest.isBatchCompleted
                                  ? 'bg-emerald-100/80 border-emerald-300 text-emerald-900'
                                  : 'bg-white border-slate-200 text-slate-700'
                              }`}
                            >
                              <span className="font-semibold">{dest.recipeName}</span>
                              {dest.formattedDate && (
                                <span className={`text-[10px] font-bold ${dest.isBatchCompleted ? 'text-emerald-800' : 'text-amber-700'}`}>
                                  ({dest.formattedDate})
                                </span>
                              )}
                              {dest.isBatchCompleted && (
                                <span className="text-[9.5px] font-black text-emerald-700">
                                  ✓ Stock
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        {isInStock ? (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                            <Check className="w-3 h-3" />
                            <span>EN STOCK</span>
                          </span>
                        ) : isPartial ? (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-black text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                            <span>PARCIAL</span>
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
                  <td className="py-3.5 px-3 text-center font-mono text-[11px]">
                    {inStockCount}/{totalCount}
                  </td>
                  <td className="py-3.5 px-4" colSpan={2}>
                    <span>Total Planilla: <strong>{totalCount} insumos</strong> ({pendingCount} a comprar, <span className="text-emerald-300 font-extrabold">{inStockCount} en stock</span>)</span>
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-[11px] text-slate-300" colSpan={2}>
                    Margen merma: +{bufferPercent}%
                  </td>
                  <td className="py-3.5 px-4 text-right" colSpan={3}>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleExportImage('download')}
                        disabled={isExportingImage}
                        className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
                        title="Descargar lista completa en imagen PNG"
                      >
                        {isExportingImage ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ImageIcon className="w-3.5 h-3.5" />
                        )}
                        <span>Exportar Imagen</span>
                      </button>

                      <button
                        onClick={handleCopyWhatsApp}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar {pendingCount} Faltantes</span>
                      </button>
                    </div>
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
