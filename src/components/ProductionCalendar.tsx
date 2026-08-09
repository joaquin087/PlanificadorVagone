import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Clock, 
  Snowflake, 
  Scale, 
  ShoppingCart, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  Sliders, 
  Sparkles, 
  Layers, 
  Eye, 
  Edit3, 
  Info,
  CalendarDays,
  BarChart3,
  CalendarRange,
  ArrowRight,
  Printer,
  ChevronDown,
  Package,
  X
} from 'lucide-react';
import { Recipe, ActiveBatch, ConsolidatedIngredient, ConsolidatedPackaging } from '../types';
import { scaleRecipe, formatGrams, formatSimpleKg, formatDuration, formatHoursToDuration } from '../utils/calculations';
import { 
  getMondayOfWeek, 
  getWeekDays, 
  formatDateToISO, 
  parseISODate, 
  getConsolidatedInsumosForBatches,
  MONTHS_SPANISH,
  DAYS_OF_WEEK_SPANISH,
  DaySchedule
} from '../utils/calendarHelpers';

interface ProductionCalendarProps {
  recipes: Recipe[];
  activeBatches: ActiveBatch[];
  onAddBatch: (batch: Partial<ActiveBatch>) => void;
  onUpdateBatchStatus: (batchId: string, status: ActiveBatch['status']) => void;
  onRemoveBatch: (batchId: string) => void;
  onNavigateTab: (tab: 'dashboard' | 'recipes' | 'scaler' | 'freezers' | 'planner' | 'shopping' | 'kitchen') => void;
  onSelectBatchForKitchen: (batch: ActiveBatch) => void;
}

export const ProductionCalendar: React.FC<ProductionCalendarProps> = ({
  recipes,
  activeBatches,
  onAddBatch,
  onUpdateBatchStatus,
  onRemoveBatch,
  onNavigateTab,
  onSelectBatchForKitchen,
}) => {
  // Calendar State
  const [currentMonday, setCurrentMonday] = useState<Date>(() => getMondayOfWeek(new Date()));
  
  // Weekly Saturday Toggle State: per-week dictionary (e.g. { "2026-08-03": true })
  const [enabledSaturdayWeeks, setEnabledSaturdayWeeks] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('vagone_saturday_weeks');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [viewMode, setViewMode] = useState<'weekly' | 'weekly_summary' | 'monthly_summary'>('weekly');
  const [selectedDayForInsumos, setSelectedDayForInsumos] = useState<DaySchedule | null>(null);
  const [copiedDayText, setCopiedDayText] = useState(false);
  const [copiedWeeklyText, setCopiedWeeklyText] = useState(false);

  // Stock tracking in weekly summary
  const [stockItemKeys, setStockItemKeys] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('fabriplan_weekly_stock_items');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [stockFilter, setStockFilter] = useState<'urgentes' | 'en_stock' | 'todos'>('todos');
  const [showCompletedDayHistory, setShowCompletedDayHistory] = useState(false);

  // Add / Edit Production Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalDate, setModalDate] = useState<string>(formatDateToISO(new Date()));
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(recipes[0]?.id || 'tequenos');
  const [productionPercentage, setProductionPercentage] = useState<number>(100);
  const [targetUnits, setTargetUnits] = useState<number>(recipes[0]?.baseYieldUnits || 1100);
  const [selectedAlternatives, setSelectedAlternatives] = useState<string[]>([]);
  const [batchNotes, setBatchNotes] = useState<string>('');
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);

  // Monthly summary navigation
  const [monthlyDate, setMonthlyDate] = useState<Date>(() => new Date());

  // Week Key for current Monday
  const currentWeekKey = useMemo(() => formatDateToISO(currentMonday), [currentMonday]);

  // Saturday calculation for current week
  const saturdayInfo = useMemo(() => {
    const satDate = new Date(currentMonday);
    satDate.setDate(currentMonday.getDate() + 5);
    const dateStr = formatDateToISO(satDate);
    const dayNumber = satDate.getDate();
    const monthNameFull = MONTHS_SPANISH[satDate.getMonth()];
    const monthNameShort = monthNameFull.slice(0, 3);
    const isToday = dateStr === formatDateToISO(new Date());
    return {
      date: satDate,
      dateStr,
      dayNumber,
      monthNameFull,
      monthNameShort,
      isToday,
    };
  }, [currentMonday]);

  // Check if this week has any batches scheduled on Saturday
  const hasSaturdayBatches = useMemo(() => {
    return activeBatches.some((b) => b.scheduledDate === saturdayInfo.dateStr);
  }, [activeBatches, saturdayInfo.dateStr]);

  // Is Saturday visible for this current week?
  const isSaturdayVisible = !!enabledSaturdayWeeks[currentWeekKey] || hasSaturdayBatches;

  // Handler to toggle Saturday for the current week
  const handleToggleSaturdayForWeek = () => {
    const nextVal = !isSaturdayVisible;
    const next = { ...enabledSaturdayWeeks, [currentWeekKey]: nextVal };
    setEnabledSaturdayWeeks(next);
    try {
      localStorage.setItem('vagone_saturday_weeks', JSON.stringify(next));
    } catch (e) {
      console.error(e);
    }
  };

  // Handler to disable / hide Saturday for the current week
  const handleDisableSaturdayForWeek = () => {
    const next = { ...enabledSaturdayWeeks, [currentWeekKey]: false };
    setEnabledSaturdayWeeks(next);
    try {
      localStorage.setItem('vagone_saturday_weeks', JSON.stringify(next));
    } catch (e) {
      console.error(e);
    }
  };

  // Compute weekly days (5 days if Saturday not visible, 6 days if enabled)
  const weekDays = useMemo(() => {
    return getWeekDays(currentMonday, isSaturdayVisible, activeBatches, recipes);
  }, [currentMonday, isSaturdayVisible, activeBatches, recipes]);

  // Selected recipe object for modal
  const selectedRecipe = useMemo(() => {
    return recipes.find((r) => r.id === selectedRecipeId) || recipes[0];
  }, [recipes, selectedRecipeId]);

  // Modal live calculation
  const modalScaled = useMemo(() => {
    if (!selectedRecipe) return null;
    return scaleRecipe(selectedRecipe, targetUnits, selectedAlternatives);
  }, [selectedRecipe, targetUnits, selectedAlternatives]);

  // Navigation handlers
  const handlePrevWeek = () => {
    const prev = new Date(currentMonday);
    prev.setDate(prev.getDate() - 7);
    setCurrentMonday(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentMonday);
    next.setDate(next.getDate() + 7);
    setCurrentMonday(next);
  };

  const handleGoToday = () => {
    setCurrentMonday(getMondayOfWeek(new Date()));
  };

  // Open modal for a specific day
  const handleOpenAddForDay = (dateStr: string) => {
    setEditingBatchId(null);
    setModalDate(dateStr);
    const defaultRecipe = recipes[0];
    setSelectedRecipeId(defaultRecipe?.id || 'tequenos');
    setProductionPercentage(100);
    setTargetUnits(defaultRecipe?.baseYieldUnits || 1100);
    setSelectedAlternatives([]);
    setBatchNotes('');
    setShowAddModal(true);
  };

  // Open modal to edit an existing batch
  const handleOpenEditBatch = (batch: ActiveBatch) => {
    setEditingBatchId(batch.id);
    setModalDate(batch.scheduledDate);
    setSelectedRecipeId(batch.recipeId);
    const r = recipes.find((item) => item.id === batch.recipeId);
    const baseUnits = r?.baseYieldUnits || 1000;
    const pct = Math.round((batch.targetUnits / baseUnits) * 100);
    setProductionPercentage(pct);
    setTargetUnits(batch.targetUnits);
    setSelectedAlternatives(batch.selectedAlternativeIds || []);
    setBatchNotes(batch.notes || '');
    setShowAddModal(true);
  };

  // Handle recipe change in modal
  const handleRecipeChange = (recipeId: string) => {
    setSelectedRecipeId(recipeId);
    const r = recipes.find((item) => item.id === recipeId);
    if (r) {
      const units = Math.round(r.baseYieldUnits * (productionPercentage / 100));
      setTargetUnits(units);
    }
  };

  // Handle percentage change in modal
  const handlePercentageChange = (pct: number) => {
    setProductionPercentage(pct);
    if (selectedRecipe) {
      const units = Math.round(selectedRecipe.baseYieldUnits * (pct / 100));
      setTargetUnits(units);
    }
  };

  // Handle units change in modal
  const handleUnitsChange = (units: number) => {
    setTargetUnits(units);
    if (selectedRecipe && selectedRecipe.baseYieldUnits > 0) {
      const pct = Math.round((units / selectedRecipe.baseYieldUnits) * 100);
      setProductionPercentage(pct);
    }
  };

  // Save batch from modal
  const handleSaveBatchModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipe || !modalScaled) return;

    if (editingBatchId) {
      // Remove old and re-add updated
      onRemoveBatch(editingBatchId);
    }

    onAddBatch({
      recipeId: selectedRecipe.id,
      recipeName: selectedRecipe.name,
      targetUnits: targetUnits,
      selectedAlternativeIds: selectedAlternatives,
      scheduledDate: modalDate,
      status: 'planificado',
      notes: batchNotes ? `${batchNotes} [${productionPercentage}%]` : `Producción al ${productionPercentage}%`,
      calculatedHours: modalScaled.estimatedHours,
      calculatedF1Percent: modalScaled.freezer.f1Percent,
      calculatedF2Percent: modalScaled.freezer.f2Percent,
      freezerAssigned: modalScaled.freezer.f2Percent > 0 ? 'AMBOS' : 'F1',
    });

    setShowAddModal(false);
  };

  // Calculate weekly batches & insumos (Only 'planificado' count for needed insumos)
  const weekStartStr = weekDays[0]?.dateStr || '';
  const weekEndStr = weekDays[weekDays.length - 1]?.dateStr || '';

  const weeklyBatches = useMemo(() => {
    const start = parseISODate(weekStartStr);
    const end = parseISODate(weekEndStr);
    return activeBatches.filter((b) => {
      const d = parseISODate(b.scheduledDate);
      return d >= start && d <= end;
    });
  }, [activeBatches, weekStartStr, weekEndStr]);

  const weeklyPlannedBatches = useMemo(() => {
    return weeklyBatches.filter((b) => b.status !== 'completado');
  }, [weeklyBatches]);

  const weeklyCompletedBatches = useMemo(() => {
    return weeklyBatches.filter((b) => b.status === 'completado');
  }, [weeklyBatches]);

  // Needed insumos for pending/planned productions
  const weeklyInsumos = useMemo(() => {
    return getConsolidatedInsumosForBatches(weeklyPlannedBatches, recipes);
  }, [weeklyPlannedBatches, recipes]);

  // Total weekly production volume (planned + completed)
  const weeklyAllInsumos = useMemo(() => {
    return getConsolidatedInsumosForBatches(weeklyBatches, recipes);
  }, [weeklyBatches, recipes]);

  // Calculate monthly batches & insumos
  const monthlyBatches = useMemo(() => {
    const y = monthlyDate.getFullYear();
    const m = monthlyDate.getMonth();
    return activeBatches.filter((b) => {
      const d = parseISODate(b.scheduledDate);
      return d.getFullYear() === y && d.getMonth() === m;
    });
  }, [activeBatches, monthlyDate]);

  const monthlyPlannedBatches = useMemo(() => {
    return monthlyBatches.filter((b) => b.status !== 'completado');
  }, [monthlyBatches]);

  const monthlyInsumos = useMemo(() => {
    return getConsolidatedInsumosForBatches(monthlyPlannedBatches, recipes);
  }, [monthlyPlannedBatches, recipes]);

  const monthlyAllInsumos = useMemo(() => {
    return getConsolidatedInsumosForBatches(monthlyBatches, recipes);
  }, [monthlyBatches, recipes]);

  // Toggle ingredient in stock
  const toggleStockItem = (itemKey: string) => {
    setStockItemKeys((prev) => {
      const next = { ...prev, [itemKey]: !prev[itemKey] };
      try {
        localStorage.setItem('fabriplan_weekly_stock_items', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const markAllInStock = (allItemKeys: string[]) => {
    setStockItemKeys((prev) => {
      const next = { ...prev };
      allItemKeys.forEach((k) => {
        next[k] = true;
      });
      try {
        localStorage.setItem('fabriplan_weekly_stock_items', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const clearAllStock = () => {
    setStockItemKeys({});
    try {
      localStorage.removeItem('fabriplan_weekly_stock_items');
    } catch (e) {
      console.error(e);
    }
  };

  // Generate days for monthly grid
  const monthGridDays = useMemo(() => {
    const y = monthlyDate.getFullYear();
    const m = monthlyDate.getMonth();
    const firstDay = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0);
    const daysCount = lastDay.getDate();
    const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday = 0

    const grid = [];
    // empty slots before first day
    for (let i = 0; i < startDayOfWeek; i++) {
      grid.push(null);
    }
    // days of month
    for (let d = 1; d <= daysCount; d++) {
      const current = new Date(y, m, d);
      const dateStr = formatDateToISO(current);
      const dayBatches = activeBatches.filter((b) => b.scheduledDate === dateStr);
      const dayOfWeek = current.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      grid.push({
        dayNumber: d,
        dateStr,
        batches: dayBatches,
        isToday: dateStr === formatDateToISO(new Date()),
        isWeekend,
      });
    }
    return grid;
  }, [monthlyDate, activeBatches]);

  // Copy day ingredients to clipboard for WhatsApp
  const handleCopyDayInsumos = (day: DaySchedule, includeCompleted: boolean = false) => {
    const batchesToConsolidate = includeCompleted ? day.batches : day.batches.filter((b) => b.status !== 'completado');
    const dayInsumos = getConsolidatedInsumosForBatches(batchesToConsolidate, recipes);

    let text = `📅 *PRODUCCIÓN DEL DÍA: ${day.dayName.toUpperCase()} ${day.dayNumber} ${day.monthName.toUpperCase()}*\n`;
    text += `⏱️ Tiempo estimado: ${day.totalHours} hs | Total: ${day.totalUnits.toLocaleString('es-AR')} unidades\n`;
    text += `❄️ Freezers requeridos: F1: ${day.f1Percent}% | F2: ${day.f2Percent}%\n\n`;

    text += `📦 *PRODUCTOS PLANIFICADOS (${batchesToConsolidate.length}):*\n`;
    batchesToConsolidate.forEach((b) => {
      text += `• ${b.recipeName}: ${b.targetUnits.toLocaleString('es-AR')} u (${b.status === 'completado' ? '✅ Completado' : '⏳ Planificado'})\n`;
    });
    text += `\n🛒 *INSUMOS EXACTOS A PESAR (PENDIENTES):*\n`;

    const categoryLabels: Record<string, string> = {
      lacteos: '🧀 Lácteos y Quesos',
      harinas_feculas: '🌾 Harinas y Féculas',
      frescos_verduras: '🥬 Verduras y Frescos',
      huevos: '🥚 Huevos',
      grasas_liquidos: '🧈 Grasas y Líquidos',
      especias_condimentos: '🧂 Especias y Condimentos',
      otros: '📦 Otros Insumos',
    };

    Object.entries(dayInsumos.ingredientsByCategory).forEach(([catKey, items]) => {
      if (items.length > 0) {
        text += `\n*${categoryLabels[catKey] || catKey.toUpperCase()}:*\n`;
        items.forEach((item) => {
          const inStock = !!stockItemKeys[item.name.toLowerCase().trim()];
          text += `- ${item.name}: ${formatSimpleKg(item.totalGrams, item.unit)}${inStock ? ' (✅ En Stock)' : ' (🚨 A Comprar)'}\n`;
        });
      }
    });

    if (dayInsumos.packagingList.length > 0) {
      text += `\n*📦 EMPAQUE Y BOLSAS:*\n`;
      dayInsumos.packagingList.forEach((pkg) => {
        text += `- ${pkg.name}: ${pkg.totalCount} unidades\n`;
      });
    }

    text += `\n_Generado por Planificador Vagone - Control de Fábrica_`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedDayText(true);
      setTimeout(() => setCopiedDayText(false), 2500);
    });
  };

  // Copy weekly WhatsApp list (Only urgent items or all items)
  const handleCopyWeeklyWhatsApp = (onlyUrgent: boolean = true) => {
    let text = `🛒 *PEDIDO SEMANAL DE INSUMOS URGENTES - FÁBRICA*\n`;
    text += `📅 Semana: ${weekDays[0]?.dayNumber} ${weekDays[0]?.monthName} al ${weekDays[weekDays.length - 1]?.dayNumber} ${weekDays[weekDays.length - 1]?.monthName}\n`;
    text += `📋 Lotes planificados pendientes: ${weeklyPlannedBatches.length} lotes\n`;
    text += `----------------------------------------\n\n`;

    const categoryLabels: Record<string, string> = {
      lacteos: '🧀 LÁCTEOS Y QUESOS',
      harinas_feculas: '🌾 HARINAS Y FÉCULAS',
      frescos_verduras: '🥬 VERDURAS Y FRESCOS',
      huevos: '🥚 HUEVOS',
      grasas_liquidos: '🧈 GRASAS Y LÍQUIDOS',
      especias_condimentos: '🧂 ESPECIAS Y CONDIMENTOS',
      otros: '📦 OTROS INSUMOS',
    };

    let hasItems = false;

    (Object.entries(weeklyInsumos.ingredientsByCategory) as [string, ConsolidatedIngredient[]][]).forEach(([catKey, items]) => {
      const filtered = onlyUrgent
        ? items.filter((it) => !stockItemKeys[it.name.toLowerCase().trim()])
        : items;

      if (filtered.length > 0) {
        hasItems = true;
        text += `*${categoryLabels[catKey] || catKey.toUpperCase()}:*\n`;
        filtered.forEach((item) => {
          const inStock = !!stockItemKeys[item.name.toLowerCase().trim()];
          text += `• ${item.name}: ${formatSimpleKg(item.totalGrams, item.unit)}${inStock ? ' (✅ En Stock)' : ''}\n`;
        });
        text += `\n`;
      }
    });

    if (!hasItems) {
      text += `✅ ¡Todos los insumos de los lotes planificados ya están en stock!\n\n`;
    }

    if (weeklyInsumos.packagingList.length > 0) {
      text += `*📦 MATERIAL DE EMPAQUE:*\n`;
      weeklyInsumos.packagingList.forEach((pkg) => {
        text += `• ${pkg.name}: ${pkg.totalCount} unidades\n`;
      });
      text += `\n`;
    }

    text += `_Generado por Planificador Vagone - Control de Fábrica_`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedWeeklyText(true);
      setTimeout(() => setCopiedWeeklyText(false), 2500);
    });
  };

  // Status mapping - Only 'planificado' and 'completado'
  const statuses: { id: ActiveBatch['status']; label: string; color: string; bg: string }[] = [
    { id: 'planificado', label: 'Planificado', color: 'text-slate-700', bg: 'bg-slate-100 border-slate-300' },
    { id: 'completado', label: 'Completado', color: 'text-emerald-800', bg: 'bg-emerald-100 border-emerald-300' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Calendar Title & Global Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shadow-sm">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Calendario Diario de Producción & Insumos
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Planifica por día con cantidades variables (% de lote o unidades exactas), consulta los insumos diarios y revisa los resúmenes semanales y mensuales.
                </p>
              </div>
            </div>
          </div>

          {/* View Mode Switcher Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
              <button
                onClick={() => setViewMode('weekly')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'weekly'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Vista Semanal / Diaria</span>
              </button>

              <button
                onClick={() => setViewMode('weekly_summary')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'weekly_summary'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
                <span>Resumen Semanal</span>
              </button>

              <button
                onClick={() => setViewMode('monthly_summary')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'monthly_summary'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <CalendarRange className="w-3.5 h-3.5 text-emerald-400" />
                <span>Resumen Mensual</span>
              </button>
            </div>

            {/* Quick Action: New Production */}
            <button
              onClick={() => handleOpenAddForDay(formatDateToISO(new Date()))}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Producción</span>
            </button>
          </div>
        </div>

        {/* Sub-Header: Week Controls (Shown in weekly view) */}
        {viewMode === 'weekly' && (
          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Week Navigator */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevWeek}
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                title="Semana anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={handleGoToday}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 transition-colors"
              >
                Hoy
              </button>

              <button
                onClick={handleNextWeek}
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                title="Semana siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="ml-2 font-bold text-sm text-slate-800">
                Semana del {weekDays[0]?.dayNumber} de {weekDays[0]?.monthName} al{' '}
                {weekDays[weekDays.length - 1]?.dayNumber} de{' '}
                {weekDays[weekDays.length - 1]?.monthName} ({currentMonday.getFullYear()})
              </div>
            </div>

            {/* Right side controls: Saturday toggle & Summary link */}
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 transition-colors">
                <input
                  type="checkbox"
                  checked={isSaturdayVisible}
                  onChange={handleToggleSaturdayForWeek}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                />
                <span>Habilitar Sábado ({saturdayInfo.dayNumber} {saturdayInfo.monthNameShort})</span>
              </label>

              <button
                onClick={() => setViewMode('weekly_summary')}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 hover:underline flex items-center gap-1 bg-amber-50/80 px-3 py-1.5 rounded-xl border border-amber-200/80"
              >
                <span>Ver compras de la semana</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: WEEKLY & DAILY MATRIX VIEW                                         */}
      {/* ========================================================================= */}
      {viewMode === 'weekly' && (
        <div className="space-y-6">
          {/* Day Cards Columns (5 cols when Mon-Fri, 6 cols when Saturday is enabled) */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${isSaturdayVisible ? 'xl:grid-cols-6' : 'xl:grid-cols-5'} gap-4`}>
            {weekDays.map((day) => {
              const hasBatches = day.batches.length > 0;

              return (
                <div
                  key={day.dateStr}
                  className={`bg-white rounded-2xl border transition-all flex flex-col justify-between overflow-hidden shadow-sm ${
                    day.isToday
                      ? 'border-amber-400 ring-2 ring-amber-400/20'
                      : day.isSaturday
                      ? 'border-dashed border-slate-300 bg-slate-50/40'
                      : 'border-slate-200'
                  }`}
                >
                  {/* UPPER SECTION: Day Header, Segmented Labor Bar, Freezer Occupancy & Packaging Banner */}
                  <div className={`p-3.5 border-b-2 space-y-3 ${
                    day.isToday 
                      ? 'bg-amber-100/80 border-amber-300' 
                      : 'bg-slate-100 border-slate-300'
                  }`}>
                    {/* Day Title & Date */}
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-black uppercase tracking-wider ${
                          day.isToday ? 'text-amber-900 font-extrabold' : 'text-slate-800'
                        }`}>
                          {day.dayName}
                        </span>
                        {day.isToday && (
                          <span className="bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.2 rounded uppercase">
                            Hoy
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-500">
                          {day.dayNumber} {day.monthName}
                        </span>
                        {day.isSaturday && (
                          <button
                            onClick={handleDisableSaturdayForWeek}
                            className="text-[10px] text-slate-400 hover:text-rose-600 font-bold p-0.5 rounded hover:bg-rose-50 transition-colors"
                            title="Ocultar sábado de esta semana"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Daily Labor & Segmented Occupancy Bar (Based on 8h shift) */}
                    <div className="space-y-1.5 bg-white/80 p-2 rounded-xl border border-slate-200/90 shadow-2xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-700 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Ocupación Laboral:
                        </span>
                        <span className={`font-black text-xs px-1.5 py-0.2 rounded ${
                          day.isLaborOverloaded
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : day.totalLaborPercent >= 90
                            ? 'bg-amber-100 text-amber-800'
                            : day.totalLaborPercent > 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {day.totalLaborPercent}%
                        </span>
                      </div>

                      {/* Multi-Segment Colored Labor Bar: 
                          1. Empaquetado (Blue - start of day)
                          2. Producción (Orange - middle of day)
                          3. Limpieza (Green - end of day / 40m Fridays)
                      */}
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden flex shadow-inner">
                        {/* 1. Empaquetado (Blue - start of day) */}
                        {day.packagingReservedMinutes > 0 && (
                          <div
                            className="bg-blue-500 h-full transition-all shrink-0"
                            style={{ width: `${(day.packagingReservedMinutes / 480) * 100}%` }}
                            title={`Empaquetado día previo: ${day.packagingReservedMinutes} min`}
                          />
                        )}
                        {/* 2. Producción (Orange/Amber - middle) */}
                        {day.productionMinutes > 0 && (
                          <div
                            className={`h-full transition-all shrink-0 ${day.isLaborOverloaded ? 'bg-rose-500' : 'bg-amber-500'}`}
                            style={{ width: `${Math.min(100 - (day.packagingPercent + day.cleaningPercent), (day.productionMinutes / 480) * 100)}%` }}
                            title={`Producción de recetas: ${day.productionMinutes} min (${day.productionHours} hs)`}
                          />
                        )}
                        {/* 3. Limpieza (Green - end of day) */}
                        {day.cleaningReservedMinutes > 0 && (
                          <div
                            className="bg-emerald-500 h-full transition-all shrink-0"
                            style={{ width: `${(day.cleaningReservedMinutes / 480) * 100}%` }}
                            title={`${day.isFriday ? 'Limpieza profunda' : 'Limpieza'}: ${day.cleaningReservedMinutes} min`}
                          />
                        )}
                      </div>

                      {/* Overload Alert */}
                      {day.isLaborOverloaded && (
                        <div className="flex items-start gap-1 text-[10px] text-rose-700 font-bold bg-rose-50 px-1.5 py-1 rounded border border-rose-200 leading-tight">
                          <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                          <span>Sobrecarga ({day.totalLaborPercent}%): excede la jornada de 8 hs ({day.totalHours} hs planificadas)</span>
                        </div>
                      )}

                      {/* Legend & Breakdown with explicit colored titles on the exact same row */}
                      <div className="pt-0.5">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold gap-1.5">
                          <span className="shrink-0 text-slate-700 font-black">
                            Total: {day.totalLaborFormatted} ({day.totalHours} hs / 8 hs)
                          </span>
                          <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-0.5 text-[9.5px]">
                            <span className="flex items-center gap-1 text-blue-600 font-bold" title="Empaquetado">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                              <span>Empaquetado</span>
                            </span>
                            <span className="flex items-center gap-1 text-amber-600 font-bold" title="Producción">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                              <span>Producción</span>
                            </span>
                            <span className="flex items-center gap-1 text-emerald-600 font-bold" title={day.isFriday ? 'Limpieza profunda de viernes' : 'Limpieza diaria'}>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              <span>{day.isFriday ? 'Limpieza profunda' : 'Limpieza'}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Ocupación de freezers de producción (Both freezers have identical capacity = 100% capacity combined) */}
                    <div className="space-y-1.5 bg-white/80 p-2 rounded-xl border border-slate-200/90 shadow-2xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-700 flex items-center gap-1">
                          <Snowflake className="w-3 h-3 text-cyan-600" />
                          Ocupación de freezers de producción:
                        </span>
                        <span className={`font-black text-xs px-1.5 py-0.2 rounded ${
                          day.isFreezerOverloaded
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : day.totalFreezerPercent >= 90
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : day.totalFreezerPercent > 0
                            ? 'bg-cyan-50 text-cyan-800 border border-cyan-200'
                            : 'bg-slate-100 text-slate-400'
                        }`}>
                          {day.totalFreezerPercent}%
                        </span>
                      </div>

                      {/* Dual-freezer visual bars (F1 & F2) */}
                      <div className="grid grid-cols-2 gap-1.5 text-[9px]">
                        <div className="bg-slate-50 p-1 rounded border border-slate-200">
                          <div className="flex justify-between text-slate-600 font-semibold mb-0.5">
                            <span>F1:</span>
                            <span className="font-bold">{day.f1Percent}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden">
                            <div
                              className="bg-cyan-600 h-full rounded-full transition-all"
                              style={{ width: `${Math.min(100, day.f1Percent)}%` }}
                            />
                          </div>
                        </div>

                        <div className="bg-slate-50 p-1 rounded border border-slate-200">
                          <div className="flex justify-between text-slate-600 font-semibold mb-0.5">
                            <span>F2:</span>
                            <span className="font-bold">{day.f2Percent > 0 ? `${day.f2Percent}%` : 'Libre'}</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden">
                            <div
                              className="bg-blue-600 h-full rounded-full transition-all"
                              style={{ width: `${Math.min(100, day.f2Percent)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Freezer Overload Alert Notification */}
                      {day.isFreezerOverloaded && (
                        <div className="p-1.5 bg-rose-50 border border-rose-200 rounded-lg text-[10px] text-rose-800 space-y-0.5">
                          <div className="flex items-center gap-1 font-bold">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <span>¡Capacidad de frío superada!</span>
                          </div>
                          <p className="text-[9px] text-rose-700 leading-tight">
                            Requiere <strong>{day.totalFreezerPercent}%</strong> de ocupación ({day.totalFreezerFraction.toFixed(1)} freezers). Supera los 2 freezers de planta (máx. 100%).
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Next-Day Packaging Reservation Compact Box */}
                    {day.hasPreviousDayPackaging && (
                      <div className="flex items-center justify-between p-2 rounded-xl bg-amber-200/70 border border-amber-300 text-amber-950 shadow-2xs">
                        <div className="flex items-center gap-1.5 min-w-0 font-bold text-xs truncate">
                          <Package className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                          <span className="truncate">
                            Empaquetado ({day.previousDayPackagingBatches.map(b => b.recipeName).join(', ')})
                          </span>
                        </div>
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-300 text-amber-950 shrink-0 ml-1.5">
                          +{day.packagingReservedMinutes} min
                        </span>
                      </div>
                    )}
                  </div>

                  {/* LOWER SECTION: Scheduled Productions List & Actions */}
                  <div className="p-3 bg-white space-y-2.5 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-700">
                        <div className="flex items-center gap-1.5 text-slate-800">
                          <Layers className="w-3.5 h-3.5 text-amber-600" />
                          <span>Producción del día</span>
                        </div>
                        <span className="font-extrabold px-1.5 py-0.2 rounded bg-slate-200/80 text-slate-700 text-[9px]">
                          {day.batches.length > 0 ? `${day.batches.length} ${day.batches.length === 1 ? 'lote' : 'lotes'}` : '0 lotes'}
                        </span>
                      </div>

                      {day.batches.length === 0 ? (
                        <div className="py-7 text-center text-slate-400 space-y-2">
                          <p className="text-xs">Sin producción programada</p>
                          <button
                            onClick={() => handleOpenAddForDay(day.dateStr)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5 text-amber-600" />
                            <span>Agregar producción</span>
                          </button>
                        </div>
                      ) : (
                        day.batches.map((batch) => {
                          const recipe = recipes.find((r) => r.id === batch.recipeId);
                          const baseUnits = recipe?.baseYieldUnits || 1;
                          const pct = Math.round((batch.targetUnits / baseUnits) * 100);
                          const isCompleted = batch.status === 'completado';

                          return (
                            <div
                              key={batch.id}
                              className={`p-2.5 rounded-xl border shadow-xs transition-all space-y-2 group ${
                                isCompleted
                                  ? 'bg-emerald-50/60 border-emerald-300 text-slate-800'
                                  : 'bg-white border-slate-200 hover:border-amber-400/80'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-1.5">
                                <div>
                                  <div className="flex items-center gap-1">
                                    <h4 className={`text-xs font-bold leading-snug ${isCompleted ? 'text-emerald-950' : 'text-slate-900'}`}>
                                      {batch.recipeName}
                                    </h4>
                                    {isCompleted && (
                                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className={`text-[11px] font-extrabold px-1.5 py-0.2 rounded border ${
                                      isCompleted
                                        ? 'text-emerald-800 bg-emerald-100/70 border-emerald-300'
                                        : 'text-amber-700 bg-amber-50 border-amber-200'
                                    }`}>
                                      {pct}% ({batch.targetUnits.toLocaleString('es-AR')} {recipe?.yieldUnitName || 'u'})
                                    </span>
                                    <span 
                                      className="text-[10px] text-slate-500 font-bold flex items-center gap-0.5"
                                      title={`Duración de elaboración: ${formatHoursToDuration(batch.calculatedHours)} (${batch.calculatedHours} hs)`}
                                    >
                                      <Clock className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                      {formatHoursToDuration(batch.calculatedHours)}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                                  <button
                                    onClick={() => handleOpenEditBatch(batch)}
                                    className="p-1 text-slate-400 hover:text-amber-600 rounded"
                                    title="Editar cantidad / %"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => onRemoveBatch(batch.id)}
                                    className="p-1 text-slate-400 hover:text-red-600 rounded"
                                    title="Quitar"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              {/* Completado / Insumos en stock Checkbox */}
                              <div className="pt-1.5 border-t border-slate-200/60">
                                <label 
                                  className={`flex items-center justify-between gap-2 p-1.5 rounded-lg border cursor-pointer select-none transition-all ${
                                    isCompleted
                                      ? 'bg-emerald-100/90 border-emerald-400 text-emerald-950 font-bold shadow-2xs'
                                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                  }`}
                                  title="Marca si ya tienes todos los insumos en fábrica o si la producción ya fue realizada (descuenta los insumos de la lista de compras)."
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <input
                                      type="checkbox"
                                      checked={isCompleted}
                                      onChange={(e) => onUpdateBatchStatus(batch.id, e.target.checked ? 'completado' : 'planificado')}
                                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer shrink-0"
                                    />
                                    <span className="text-[10.5px] font-bold truncate">
                                      Insumos en stock / Completado
                                    </span>
                                  </div>
                                  {isCompleted && (
                                    <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-900 uppercase shrink-0">
                                      Listo
                                    </span>
                                  )}
                                </label>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Day Footer Actions */}
                  <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenAddForDay(day.dateStr)}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-[11px] flex items-center justify-center gap-1 transition-colors shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-600" />
                      <span>Agregar producción</span>
                    </button>

                    {hasBatches && (
                      <button
                        onClick={() => setSelectedDayForInsumos(day)}
                        className="py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-colors shadow-2xs"
                        title="Ver detalle de insumos a pesar para este día"
                      >
                        <ShoppingCart className="w-3 h-3 text-amber-400" />
                        <span>Insumos</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Weekly Stats strip */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <span className="text-xs text-slate-500 font-medium">Lotes en la Semana</span>
                <p className="text-lg font-black text-slate-900">{weeklyBatches.length} tandas</p>
              </div>

              <div>
                <span className="text-xs text-slate-500 font-medium">Volumen Total Semanal</span>
                <p className="text-lg font-black text-amber-600">
                  {weeklyInsumos.totalUnits.toLocaleString('es-AR')} u
                </p>
              </div>

              <div>
                <span className="text-xs text-slate-500 font-medium">Horas Hombre Totales</span>
                <p className="text-lg font-black text-slate-900">{weeklyInsumos.totalHours} hs</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('weekly_summary')}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                <span>Ver Resumen Semanal Completo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: WEEKLY SUMMARY VIEW                                                */}
      {/* ========================================================================= */}
      {viewMode === 'weekly_summary' && (() => {
        // Collect all ingredient names across categories
        const allIngredientNames: string[] = [];
        (Object.values(weeklyInsumos.ingredientsByCategory) as ConsolidatedIngredient[][]).forEach((list) => {
          list.forEach((it) => allIngredientNames.push(it.name.toLowerCase().trim()));
        });

        const totalItemsCount = allIngredientNames.length;
        const stockItemsCount = allIngredientNames.filter((name) => !!stockItemKeys[name]).length;
        const urgentItemsCount = totalItemsCount - stockItemsCount;

        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-amber-600" />
                  <h2 className="text-lg font-extrabold text-slate-900">
                    Resumen de Producción Semanal ({weekDays[0]?.dayNumber} {weekDays[0]?.monthName} - {weekDays[weekDays.length - 1]?.dayNumber} {weekDays[weekDays.length - 1]?.monthName})
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Requerimiento de insumos para lotes <strong>Planificados</strong>. Puedes marcar los insumos que ya tienes en stock para sacarlos de la lista urgente.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('weekly')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors"
                >
                  ← Volver al Calendario Diario
                </button>
              </div>
            </div>

            {/* Product Output & Stock Breakdown Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs font-semibold text-slate-500">Unidades Planificadas</span>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {weeklyInsumos.totalUnits.toLocaleString('es-AR')} u
                </div>
                <span className="text-xs text-slate-400">
                  {weeklyPlannedBatches.length} lotes pendientes {weeklyCompletedBatches.length > 0 && `(+${weeklyCompletedBatches.length} completados)`}
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs font-semibold text-slate-500">Horas de Fábrica (Pendientes)</span>
                <div className="text-2xl font-black text-amber-600 mt-1">
                  {weeklyInsumos.totalHours} hs
                </div>
                <span className="text-xs text-slate-400">
                  Promedio {(weeklyInsumos.totalHours / (isSaturdayVisible ? 6 : 5)).toFixed(1)} h/día
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-sm">
                <span className="text-xs font-bold text-amber-800 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Insumos Urgentes a Comprar
                </span>
                <div className="text-2xl font-black text-amber-900 mt-1">
                  {urgentItemsCount} <span className="text-xs font-semibold text-amber-700">faltantes</span>
                </div>
                <span className="text-xs text-amber-700">no disponibles en fábrica</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-sm">
                <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Insumos en Stock
                </span>
                <div className="text-2xl font-black text-emerald-900 mt-1">
                  {stockItemsCount} <span className="text-xs font-semibold text-emerald-700">en stock</span>
                </div>
                <span className="text-xs text-emerald-700">listos en planta</span>
              </div>
            </div>

            {/* Product Output Table */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600" />
                Distribución de Producción por Producto esta Semana
              </h3>

              {weeklyInsumos.productSummary.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-500 font-medium">
                    No hay producciones planificadas pendientes para esta semana.
                    {weeklyCompletedBatches.length > 0 && ` (${weeklyCompletedBatches.length} lotes ya fueron marcados como completados).`}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {weeklyInsumos.productSummary.map((prod) => (
                    <div key={prod.recipeName} className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{prod.recipeName}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {prod.batchesCount} tanda(s) • {prod.hours} hs de planta
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-black text-amber-700 bg-amber-100/60 px-2.5 py-1 rounded-lg border border-amber-200">
                          {prod.units.toLocaleString('es-AR')} u
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Weekly Consolidated Insumos & Stock Check Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-amber-600" />
                    Insumos Semanales & Control de Stock
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Haz clic en cualquier insumo para marcarlo como <strong>"En Stock"</strong> y removerlo de la lista urgente de compras.
                  </p>
                </div>

                {/* Filter and Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => markAllInStock(allIngredientNames)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                    title="Marcar todos los insumos como disponibles en fábrica"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Marcar todos en Stock</span>
                  </button>

                  <button
                    onClick={clearAllStock}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                    title="Desmarcar todos"
                  >
                    <span>✕ Desmarcar todos</span>
                  </button>

                  <button
                    onClick={() => handleCopyWeeklyWhatsApp(true)}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                  >
                    {copiedWeeklyText ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5 text-white" />}
                    <span>{copiedWeeklyText ? '¡Copiado!' : 'Copiar Solo Faltantes (WhatsApp)'}</span>
                  </button>

                  <button
                    onClick={() => handleCopyWeeklyWhatsApp(false)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5 text-amber-400" />
                    <span>Copiar Todo</span>
                  </button>
                </div>
              </div>

              {/* Filter Tabs (Urgentes / En Stock / Todos) */}
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <button
                  onClick={() => setStockFilter('urgentes')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    stockFilter === 'urgentes'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>🚨 Solo Faltantes / Urgentes ({urgentItemsCount})</span>
                </button>

                <button
                  onClick={() => setStockFilter('en_stock')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    stockFilter === 'en_stock'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>✅ En Stock ({stockItemsCount})</span>
                </button>

                <button
                  onClick={() => setStockFilter('todos')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    stockFilter === 'todos'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>📋 Todos ({totalItemsCount})</span>
                </button>
              </div>

              {/* Insumos Categories Grid */}
              {totalItemsCount === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-sm font-bold text-slate-700">No hay insumos pendientes de elaboración</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Todos los lotes de esta semana están completados o no tienen producciones programadas.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(Object.entries(weeklyInsumos.ingredientsByCategory) as [string, ConsolidatedIngredient[]][]).map(([catKey, items]) => {
                    const catLabels: Record<string, string> = {
                      lacteos: '🧀 Lácteos y Quesos',
                      harinas_feculas: '🌾 Harinas y Féculas',
                      frescos_verduras: '🥬 Verduras y Frescos',
                      huevos: '🥚 Huevos Frescos',
                      grasas_liquidos: '🧈 Grasas y Líquidos',
                      especias_condimentos: '🧂 Especias y Condimentos',
                      otros: '📦 Otros Insumos',
                    };

                    const filteredItems = items.filter((it) => {
                      const inStock = !!stockItemKeys[it.name.toLowerCase().trim()];
                      if (stockFilter === 'urgentes') return !inStock;
                      if (stockFilter === 'en_stock') return inStock;
                      return true;
                    });

                    if (filteredItems.length === 0) return null;

                    return (
                      <div key={catKey} className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-3">
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                          <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                            {catLabels[catKey] || catKey}
                          </h4>
                          <span className="text-[10px] font-bold text-slate-400">
                            {filteredItems.length} {filteredItems.length === 1 ? 'ítem' : 'ítems'}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {filteredItems.map((it) => {
                            const inStock = !!stockItemKeys[it.name.toLowerCase().trim()];

                            return (
                              <div
                                key={it.name}
                                onClick={() => toggleStockItem(it.name.toLowerCase().trim())}
                                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                                  inStock
                                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950 hover:bg-emerald-100/60'
                                    : 'bg-white border-slate-200 text-slate-900 hover:border-amber-400/80 shadow-2xs'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <div
                                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                                      inStock
                                        ? 'bg-emerald-600 border-emerald-600 text-white'
                                        : 'border-slate-300 bg-white text-transparent'
                                    }`}
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <span className={`text-xs font-bold block truncate ${inStock ? 'text-emerald-900 line-through opacity-80' : 'text-slate-800'}`}>
                                      {it.name}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-medium">
                                      {inStock ? 'En stock en fábrica' : 'Pendiente de compra / urgencia'}
                                    </span>
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <span className={`text-xs font-black px-2 py-0.5 rounded-md border ${
                                    inStock
                                      ? 'text-emerald-800 bg-emerald-100/70 border-emerald-200'
                                      : 'text-amber-800 bg-amber-50 border-amber-200'
                                  }`}>
                                    {formatSimpleKg(it.totalGrams, it.unit)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* VIEW 3: MONTHLY SUMMARY & CALENDAR GRID                                    */}
      {/* ========================================================================= */}
      {viewMode === 'monthly_summary' && (
        <div className="space-y-6">
          {/* Month Header & Navigator */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CalendarRange className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-extrabold text-slate-900">
                  Resumen de Producción Mensual - {MONTHS_SPANISH[monthlyDate.getMonth()]} {monthlyDate.getFullYear()}
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Visualización mensual de tandas planificadas, proyección de horas hombre e insumos totales del mes.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const prev = new Date(monthlyDate);
                  prev.setMonth(prev.getMonth() - 1);
                  setMonthlyDate(prev);
                }}
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                title="Mes anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="font-bold text-xs text-slate-800 px-3 py-1.5 bg-slate-100 rounded-lg">
                {MONTHS_SPANISH[monthlyDate.getMonth()]} {monthlyDate.getFullYear()}
              </span>

              <button
                onClick={() => {
                  const next = new Date(monthlyDate);
                  next.setMonth(next.getMonth() + 1);
                  setMonthlyDate(next);
                }}
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                title="Mes siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setViewMode('weekly')}
                className="ml-3 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl"
              >
                ← Calendario Semanal
              </button>
            </div>
          </div>

          {/* Monthly KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">Producción Total del Mes</span>
              <div className="text-2xl font-black text-amber-600 mt-1">
                {monthlyInsumos.totalUnits.toLocaleString('es-AR')} u
              </div>
              <span className="text-xs text-slate-400">{monthlyBatches.length} lotes agendados</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">Horas de Fábrica en el Mes</span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {monthlyInsumos.totalHours} hs
              </div>
              <span className="text-xs text-slate-400">Carga total programada</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500">Productos Diferentes</span>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                {monthlyInsumos.productSummary.length} recetas
              </div>
              <span className="text-xs text-slate-400">en el programa mensual</span>
            </div>
          </div>

          {/* Month Matrix Grid */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-4">
              Matriz Calendario Mensual ({MONTHS_SPANISH[monthlyDate.getMonth()]})
            </h3>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-slate-500">
              <span>Lun</span>
              <span>Mar</span>
              <span>Mié</span>
              <span>Jue</span>
              <span>Vie</span>
              <span className="text-amber-700">Sáb</span>
              <span className="text-slate-400">Dom</span>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-2">
              {monthGridDays.map((cell, idx) => {
                if (!cell) {
                  return <div key={`empty-${idx}`} className="h-20 bg-slate-50/40 rounded-xl border border-dashed border-slate-100" />;
                }

                const hasBatches = cell.batches.length > 0;

                return (
                  <div
                    key={cell.dateStr}
                    onClick={() => {
                      if (hasBatches) {
                        const daySched = weekDays.find((d) => d.dateStr === cell.dateStr) || {
                          dateStr: cell.dateStr,
                          dayName: DAYS_OF_WEEK_SPANISH[new Date(cell.dateStr).getDay()],
                          dayNumber: cell.dayNumber,
                          monthName: MONTHS_SPANISH[monthlyDate.getMonth()].slice(0, 3),
                          isToday: cell.isToday,
                          isSaturday: false,
                          batches: cell.batches,
                          totalHours: cell.batches.reduce((a, b) => a + (b.calculatedHours || 0), 0),
                          totalUnits: cell.batches.reduce((a, b) => a + (b.targetUnits || 0), 0),
                          f1Trays: 0,
                          f2Trays: 0,
                          f1Percent: 0,
                          f2Percent: 0,
                          isOverloaded: false,
                        };
                        setSelectedDayForInsumos(daySched);
                      } else {
                        handleOpenAddForDay(cell.dateStr);
                      }
                    }}
                    className={`h-24 p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      cell.isToday
                        ? 'border-amber-500 bg-amber-50/50 shadow-sm'
                        : hasBatches
                        ? 'border-slate-300 bg-white hover:border-amber-400 hover:shadow-xs'
                        : cell.isWeekend
                        ? 'border-slate-100 bg-slate-50/60 hover:bg-slate-100'
                        : 'border-slate-100 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${
                        cell.isToday ? 'text-amber-700' : 'text-slate-700'
                      }`}>
                        {cell.dayNumber}
                      </span>
                      {hasBatches && (
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                      )}
                    </div>

                    <div className="space-y-1">
                      {cell.batches.slice(0, 2).map((b) => (
                        <div
                          key={b.id}
                          className="text-[9px] font-bold text-slate-800 bg-slate-100 px-1 py-0.5 rounded truncate"
                        >
                          {b.recipeName} ({b.targetUnits}u)
                        </div>
                      ))}
                      {cell.batches.length > 2 && (
                        <span className="text-[8px] text-slate-400 font-bold block">
                          +{cell.batches.length - 2} más
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: DETALLE DIARIO DE INSUMOS (DAILY INGREDIENTS BREAKDOWN)          */}
      {/* ========================================================================= */}
      {selectedDayForInsumos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Detalle Diario de Insumos - {selectedDayForInsumos.dayName} {selectedDayForInsumos.dayNumber} {selectedDayForInsumos.monthName}
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Materia prima exacta al gramo y descartables requeridos para la producción de este día.
                </p>
              </div>

              <button
                onClick={() => setSelectedDayForInsumos(null)}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Daily Batches Overview */}
            {(() => {
              const plannedBatches = selectedDayForInsumos.batches.filter((b) => b.status !== 'completado');
              const completedBatches = selectedDayForInsumos.batches.filter((b) => b.status === 'completado');
              const isAllCompleted = selectedDayForInsumos.batches.length > 0 && plannedBatches.length === 0;

              return (
                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 block">
                        Lotes del día ({selectedDayForInsumos.batches.length}):
                      </span>
                      {completedBatches.length > 0 && (
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-200 px-2 py-0.5 rounded-full">
                          ✓ {completedBatches.length} completado(s)
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {selectedDayForInsumos.batches.map((b) => {
                        const isDone = b.status === 'completado';
                        return (
                          <div
                            key={b.id}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-bold shadow-2xs flex items-center gap-1.5 ${
                              isDone
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                                : 'bg-white border-slate-200 text-slate-800'
                            }`}
                          >
                            <span>{b.recipeName}</span>
                            <span className={isDone ? 'text-emerald-700' : 'text-amber-700'}>
                              ({b.targetUnits.toLocaleString('es-AR')} u)
                            </span>
                            {isDone && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-slate-600 font-medium">
                      <span>Tiempo estimado: <strong>{selectedDayForInsumos.totalHours} hs / 8 hs ({selectedDayForInsumos.totalLaborPercent}%)</strong></span>
                      <span>Ocupación de freezers de producción: <strong>{selectedDayForInsumos.totalFreezerPercent}% total (F1: {selectedDayForInsumos.f1Percent}% | F2: {selectedDayForInsumos.f2Percent > 0 ? `${selectedDayForInsumos.f2Percent}%` : 'Libre'})</strong></span>
                    </div>
                  </div>

                  {/* If all batches completed */}
                  {isAllCompleted && !showCompletedDayHistory ? (
                    <div className="p-6 text-center bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                        <Check className="w-5 h-5" />
                      </div>
                      <h3 className="text-sm font-extrabold text-emerald-950">
                        ¡Todos los lotes de este día ya fueron Completados!
                      </h3>
                      <p className="text-xs text-emerald-800 max-w-md mx-auto">
                        Las recetas de esta fecha ya fueron elaboradas y pesadas. Los insumos se descontaron de la lista de pendientes.
                      </p>
                      <button
                        onClick={() => setShowCompletedDayHistory(true)}
                        className="px-3.5 py-1.5 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-xs rounded-xl transition-all shadow-2xs"
                      >
                        Ver histórico de insumos consumidos en este día
                      </button>
                    </div>
                  ) : (
                    <>
                      {isAllCompleted && showCompletedDayHistory && (
                        <div className="flex items-center justify-between bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-xs text-emerald-900 font-medium">
                          <span>Mostrando histórico de insumos de lotes ya elaborados</span>
                          <button
                            onClick={() => setShowCompletedDayHistory(false)}
                            className="font-bold text-emerald-800 hover:underline"
                          >
                            Ocultar
                          </button>
                        </div>
                      )}

                      {!isAllCompleted && completedBatches.length > 0 && (
                        <div className="bg-amber-50/70 p-2.5 rounded-xl border border-amber-200 text-xs text-amber-900">
                          ℹ️ Mostrando insumos necesarios para los <strong>{plannedBatches.length} lote(s) planificado(s) pendientes</strong>. Los {completedBatches.length} lote(s) completados ya fueron descontados.
                        </div>
                      )}

                      {/* Consolidated Insumos List */}
                      {(() => {
                        const batchesToConsolidate = isAllCompleted && showCompletedDayHistory
                          ? selectedDayForInsumos.batches
                          : plannedBatches;

                        const dayConsolidated = getConsolidatedInsumosForBatches(batchesToConsolidate, recipes);
                        const catLabels: Record<string, string> = {
                          lacteos: '🧀 Lácteos, Quesos y Rellenos',
                          harinas_feculas: '🌾 Harinas, Féculas y Galletitas',
                          frescos_verduras: '🥬 Verduras, Frescos y Frutas',
                          huevos: '🥚 Huevos Frescos',
                          grasas_liquidos: '🧈 Grasas, Aceites y Líquidos',
                          especias_condimentos: '🧂 Especias y Condimentos',
                          otros: '📦 Otros Insumos',
                        };

                        return (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Insumos Exactos a Pesar / Preparar:
                              </h3>
                              <span className="text-[11px] text-slate-500 font-medium">
                                Haz clic para marcar stock
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {(Object.entries(dayConsolidated.ingredientsByCategory) as [string, ConsolidatedIngredient[]][]).map(([catKey, items]) => {
                                if (items.length === 0) return null;
                                return (
                                  <div key={catKey} className="rounded-xl border border-slate-200 p-3.5 bg-white space-y-2">
                                    <h4 className="text-xs font-bold text-slate-900 border-b pb-1">
                                      {catLabels[catKey] || catKey}
                                    </h4>
                                    <div className="space-y-1.5">
                                      {items.map((it) => {
                                        const inStock = !!stockItemKeys[it.name.toLowerCase().trim()];
                                        return (
                                          <div
                                            key={it.name}
                                            onClick={() => toggleStockItem(it.name.toLowerCase().trim())}
                                            className={`flex items-center justify-between text-xs p-1.5 rounded-lg border transition-all cursor-pointer ${
                                              inStock
                                                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                                                : 'bg-slate-50 border-slate-100 text-slate-800 hover:border-amber-300'
                                            }`}
                                          >
                                            <div className="flex items-center gap-1.5 min-w-0">
                                              <div className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                                                inStock ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                                              }`}>
                                                {inStock && <Check className="w-3 h-3" />}
                                              </div>
                                              <span className={`truncate font-medium ${inStock ? 'line-through opacity-75' : ''}`}>
                                                {it.name}
                                              </span>
                                            </div>
                                            <span className={`font-bold ml-1 shrink-0 ${inStock ? 'text-emerald-800' : 'text-slate-900'}`}>
                                              {formatSimpleKg(it.totalGrams, it.unit)}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {dayConsolidated.packagingList.length > 0 && (
                              <div className="rounded-xl border border-slate-200 p-3.5 bg-white space-y-2">
                                <h4 className="text-xs font-bold text-slate-900 border-b pb-1">
                                  📦 Materiales de Empaque y Descartables
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                  {dayConsolidated.packagingList.map((pkg) => (
                                    <div key={pkg.name} className="text-xs flex items-center justify-between p-1.5 bg-slate-50 rounded">
                                      <span className="text-slate-600 truncate">{pkg.name}</span>
                                      <span className="font-bold text-slate-900 ml-1">{pkg.totalCount} u</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
              );
            })()}

            {/* Footer Actions */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                onClick={() => handleCopyDayInsumos(selectedDayForInsumos)}
                className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all"
              >
                {copiedDayText ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedDayText ? '¡Copiado al Portapapeles!' : 'Copiar Insumos para WhatsApp'}</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setSelectedDayForInsumos(null)}
                  className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors shadow-sm"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD / EDIT PRODUCTION FOR A DAY                                  */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                {editingBatchId ? 'Modificar Producción Agendada' : 'Agendar Producción en el Calendario'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ajusta el porcentaje del lote o ingresa la cantidad exacta a preparar.
              </p>
            </div>

            <form onSubmit={handleSaveBatchModal} className="space-y-4">
              {/* Product Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Producto a Elaborar:</label>
                <select
                  value={selectedRecipeId}
                  onChange={(e) => handleRecipeChange(e.target.value)}
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900"
                >
                  {recipes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} (Base: {r.baseYieldUnits.toLocaleString('es-AR')} {r.yieldUnitName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Percentage Presets */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Escala de Producción (% del Lote Estándar):
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handlePercentageChange(pct)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                        productionPercentage === pct
                          ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {pct}% {pct === 100 && '(Completo)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Units Input */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cantidad Objetivo ({selectedRecipe?.yieldUnitName || 'u'}):
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={targetUnits}
                    onChange={(e) => handleUnitsChange(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full text-sm font-black bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Porcentaje Calculado:
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={productionPercentage}
                      onChange={(e) => handlePercentageChange(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full text-sm font-black bg-white border border-slate-300 rounded-xl px-3 py-2 text-amber-700"
                    />
                    <span className="font-bold text-slate-500 text-sm">%</span>
                  </div>
                </div>
              </div>

              {/* Date Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Día de Elaboración:</label>
                <input
                  type="date"
                  value={modalDate}
                  onChange={(e) => setModalDate(e.target.value)}
                  className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                  required
                />
              </div>

              {/* Live Preview Metrics */}
              {modalScaled && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-3">
                  {/* Section A: Production Time Logic */}
                  <div className="bg-white p-3 rounded-xl border border-amber-200/90 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        Tiempo de Elaboración:
                      </span>
                      <span className="font-extrabold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                        {modalScaled.formattedDuration} ({modalScaled.estimatedHours} hs)
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Ocupación de Turno (8 hs):</span>
                        <strong className="text-slate-800">{Math.round((modalScaled.estimatedMinutes / 480) * 100)}% de la jornada</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Ritmo de Planta:</span>
                        <strong className="text-slate-800">{modalScaled.timeSpec.rateFormatted}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Section B: Freezer Occupancy Logic */}
                  <div className="bg-white p-3 rounded-xl border border-cyan-200/90 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Snowflake className="w-3.5 h-3.5 text-cyan-600" />
                        Ocupación de Freezers (F1 + F2):
                      </span>
                      <span className="font-extrabold text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded-lg border border-cyan-200">
                        {modalScaled.freezer.totalFreezerOccupancyPercent}% total
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      ❄️ {modalScaled.freezer.occupancySummary}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      📐 {modalScaled.freezer.trayDescription}
                    </p>
                  </div>

                  {modalScaled.recipe && !['postres', 'canelones'].includes(modalScaled.recipe.category) && (
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200">
                      <Package className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span>Se reservarán <strong>35 min</strong> de labor al día siguiente para su empaquetado.</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-700 bg-slate-100 p-2 rounded-lg border border-slate-200">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Se reservan <strong>20 min</strong> al cierre del turno para limpieza y orden de planta.</span>
                  </div>

                  {modalScaled.freezer.isOverCapacity && (
                    <div className="p-2 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-[11px] font-bold">
                      ⚠️ {modalScaled.freezer.overCapacityMessage}
                    </div>
                  )}
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl shadow-md"
                >
                  {editingBatchId ? 'Actualizar Producción' : 'Agendar en el Calendario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
