import React, { useState } from 'react';
import { 
  ShoppingCart, 
  Check, 
  Copy, 
  Printer, 
  Package, 
  Scale, 
  AlertTriangle, 
  Layers, 
  Sparkles,
  Info,
  Calendar
} from 'lucide-react';
import { Recipe, ActiveBatch } from '../types';
import { consolidateBatches, formatGrams, formatSimpleKg } from '../utils/calculations';

interface ShoppingListConsolidatorProps {
  recipes: Recipe[];
  activeBatches: ActiveBatch[];
  onNavigateTab: (tab: 'planner' | 'scaler') => void;
}

export const ShoppingListConsolidator: React.FC<ShoppingListConsolidatorProps> = ({
  recipes,
  activeBatches,
  onNavigateTab,
}) => {
  const [bufferPercent, setBufferPercent] = useState<number>(0);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<boolean>(false);

  const consolidated = consolidateBatches(activeBatches, recipes);

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const categoryLabels: Record<string, { label: string; icon: string }> = {
    lacteos: { label: '🧀 Lácteos, Quesos y Rellenos', icon: 'lacteos' },
    harinas_feculas: { label: '🌾 Harinas, Féculas y Galletitas', icon: 'harinas' },
    frescos_verduras: { label: '🥬 Verduras, Frescos y Frutas', icon: 'verduras' },
    huevos: { label: '🥚 Huevos Frescos', icon: 'huevos' },
    grasas_liquidos: { label: '🧈 Grasas, Aceites y Líquidos', icon: 'grasas' },
    especias_condimentos: { label: '🧂 Especias, Sales y Condimentos', icon: 'especias' },
    otros: { label: '📦 Otros Insumos y Salames', icon: 'otros' },
  };

  const handleCopyWhatsApp = () => {
    let text = `🛒 PEDIDO CONSOLIDADO DE INSUMOS - FÁBRICA\n`;
    text += `📅 Lotes incluidos: ${activeBatches.length} lotes de producción\n`;
    if (bufferPercent > 0) {
      text += `📈 Margen de seguridad/merma aplicado: +${bufferPercent}%\n`;
    }
    text += `----------------------------------------\n\n`;

    Object.entries(consolidated.ingredientsByCategory).forEach(([catKey, items]) => {
      if (items.length === 0) return;
      const cat = categoryLabels[catKey] || { label: catKey.toUpperCase() };
      text += `${cat.label.toUpperCase()}:\n`;
      items.forEach((item) => {
        const bufferedGrams = item.totalGrams * (1 + bufferPercent / 100);
        text += `• ${item.name}: ${formatSimpleKg(bufferedGrams, item.unit)}\n`;
      });
      text += `\n`;
    });

    if (consolidated.packagingList.length > 0) {
      text += `📦 INSUMOS DE EMPAQUE Y DESCARTABLES:\n`;
      consolidated.packagingList.forEach((pkg) => {
        const bufferedCount = Math.ceil(pkg.totalCount * (1 + bufferPercent / 100));
        text += `• ${pkg.name}: ${bufferedCount} unidades\n`;
      });
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (activeBatches.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-4">
        <ShoppingCart className="w-12 h-12 text-slate-400 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">No hay lotes en el plan de producción</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Agrega lotes en el Planificador o calcula una receta para que la fábrica consolide automáticamente la lista de compras agrupada por proveedor.
        </p>
        <button
          onClick={() => onNavigateTab('planner')}
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md"
        >
          Ir al Planificador de Lotes
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Lista Consolidada de Compras & Proveedores</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Suma todos los insumos de los {activeBatches.length} lotes activos planificados para emitir órdenes de compra sin faltantes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Buffer selector */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-500 font-medium">Margen Merma:</span>
            {[0, 5, 10].map((b) => (
              <button
                key={b}
                onClick={() => setBufferPercent(b)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                  bufferPercent === b
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                +{b}%
              </button>
            ))}
          </div>

          <button
            onClick={handleCopyWhatsApp}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md active:scale-95"
          >
            {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? '¡Copiado al Portapapeles!' : 'Copiar para WhatsApp Proveedores'}</span>
          </button>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(consolidated.ingredientsByCategory).map(([catKey, items]) => {
          if (items.length === 0) return null;
          const catInfo = categoryLabels[catKey] || { label: catKey.toUpperCase() };

          return (
            <div key={catKey} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
                  {catInfo.label}
                </h3>

                <div className="space-y-3">
                  {items.map((item, idx) => {
                    const itemKey = `${catKey}_${item.name}`;
                    const isChecked = !!checkedItems[itemKey];
                    const bufferedGrams = item.totalGrams * (1 + bufferPercent / 100);

                    return (
                      <div
                        key={idx}
                        onClick={() => toggleCheck(itemKey)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isChecked
                            ? 'bg-slate-50 border-slate-200 opacity-50 line-through'
                            : 'bg-white border-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                            isChecked
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-slate-300 bg-white'
                          }`}>
                            {isChecked && <Check className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <span className="font-bold text-xs text-slate-900 block">{item.name}</span>
                            <span className="text-[10px] text-slate-400">
                              Usado en: {item.usedInRecipes.map((r) => r.recipeName).join(', ')}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-black text-slate-900 block">
                            {formatSimpleKg(bufferedGrams, item.unit)}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {Math.round(bufferedGrams).toLocaleString('es-AR')} {item.unit === 'L' || item.unit === 'ml' ? 'ml' : item.unit === 'u' ? 'u' : 'g'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {/* Packaging Consumables Box */}
        {consolidated.packagingList.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm md:col-span-2">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-600" />
              Insumos de Empaque, Bolsas, Folex & Etiquetas Requeridas
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {consolidated.packagingList.map((pkg, idx) => {
                const pkgKey = `pkg_${pkg.name}`;
                const isChecked = !!checkedItems[pkgKey];
                const bufferedCount = Math.ceil(pkg.totalCount * (1 + bufferPercent / 100));

                return (
                  <div
                    key={idx}
                    onClick={() => toggleCheck(pkgKey)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isChecked
                        ? 'bg-slate-50 border-slate-200 opacity-50 line-through'
                        : 'bg-slate-50/50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                        isChecked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 bg-white'
                      }`}>
                        {isChecked && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <span className="text-xs font-bold text-slate-900">{pkg.name}</span>
                    </div>

                    <span className="text-sm font-black text-amber-700">
                      {bufferedCount} u
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
