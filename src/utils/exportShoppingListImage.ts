import { Recipe, ActiveBatch } from '../types';

export interface ExportShoppingListTableRow {
  id: string;
  name: string;
  categoryKey: string;
  categoryLabel: string;
  categoryIcon: string;
  formattedNet: string;
  formattedStock: string;
  formattedBuffered: string;
  formattedToBuy: string;
  usedInText: string;
  isPackaging: boolean;
  isInStock: boolean;
  isPartialStock?: boolean;
  totalAvailableStock?: number;
  toBuyGramsOrCount?: number;
}

export interface ExportShoppingListParams {
  batches: ActiveBatch[];
  recipes: Recipe[];
  tableRows: ExportShoppingListTableRow[];
  checkedItems: Record<string, boolean>;
  bufferPercent: number;
  CATEGORY_MAP: Record<string, { label: string; icon: string; order: number }>;
  formatBatchDateShort: (dateStr: string) => string;
  onlyMissing?: boolean;
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number | { tl?: number; tr?: number; br?: number; bl?: number }
) {
  let tl = 0, tr = 0, br = 0, bl = 0;
  if (typeof r === 'number') {
    tl = tr = br = bl = r;
  } else {
    tl = r.tl || 0;
    tr = r.tr || 0;
    br = r.br || 0;
    bl = r.bl || 0;
  }
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
  ctx.lineTo(x + bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
  ctx.lineTo(x, y + tl);
  ctx.quadraticCurveTo(x, y, x + tl, y);
  ctx.closePath();
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 0 && ctx.measureText(truncated + '…').width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '…';
}

export function generateShoppingListCanvas(params: ExportShoppingListParams): HTMLCanvasElement {
  const {
    batches,
    recipes,
    tableRows,
    bufferPercent,
    CATEGORY_MAP,
    formatBatchDateShort,
  } = params;

  const LOGICAL_WIDTH = 1120;
  const PADDING_X = 36;
  const CONTENT_WIDTH = LOGICAL_WIDTH - PADDING_X * 2; // 1048px

  // Collect unique categories present in tableRows and sort strictly by user-defined order
  const uniqueCatKeys = Array.from(new Set(tableRows.map((r) => r.categoryKey)));
  const categoriesPresent = uniqueCatKeys.sort((a, b) => {
    const orderA = CATEGORY_MAP[a]?.order ?? 999;
    const orderB = CATEGORY_MAP[b]?.order ?? 999;
    if (orderA !== orderB) return orderA - orderB;
    const labelA = CATEGORY_MAP[a]?.label ?? a;
    const labelB = CATEGORY_MAP[b]?.label ?? b;
    return labelA.localeCompare(labelB, 'es', { sensitivity: 'base' });
  });

  // Counts
  const totalCount = tableRows.length;
  const inStockCount = tableRows.filter((r) => r.isInStock).length;
  const pendingCount = Math.max(0, totalCount - inStockCount);

  // Calculate Batches box rows
  const batchesPerLine = 3;
  const batchLineCount = Math.max(1, Math.ceil(batches.length / batchesPerLine));
  const batchesBoxHeight = 36 + batchLineCount * 28 + 12;

  // Calculate dynamic total height
  let totalHeight = 36; // Top padding
  totalHeight += 110; // Header & Branding
  totalHeight += 18; // Margin
  totalHeight += batchesBoxHeight; // Batches Box
  totalHeight += 24; // Margin before categories

  // Add categories height
  categoriesPresent.forEach((catKey) => {
    const itemsInCat = tableRows.filter((r) => r.categoryKey === catKey);
    if (itemsInCat.length === 0) return;
    totalHeight += 38; // Category Header
    totalHeight += 30; // Column Header
    totalHeight += itemsInCat.length * 38; // Rows (38px height for clarity)
    totalHeight += 22; // Gap between categories
  });

  totalHeight += 120; // Footer with signature and summary
  totalHeight += 30; // Bottom padding

  // Create Canvas with 2x retina scale
  const canvas = document.createElement('canvas');
  const SCALE = 2;
  canvas.width = LOGICAL_WIDTH * SCALE;
  canvas.height = Math.ceil(totalHeight) * SCALE;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.scale(SCALE, SCALE);

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, LOGICAL_WIDTH, totalHeight);

  let currentY = 36;

  // -------------------------------------------------------------
  // 1. BRAND & DOCUMENT HEADER
  // -------------------------------------------------------------
  ctx.fillStyle = '#0F172A';
  ctx.font = '900 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('VAGONE', PADDING_X, currentY + 24);

  // Brand pill tag
  const brandTagText = 'FÁBRICA DE PASTAS Y CONGELADOS';
  ctx.font = '800 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const brandTagWidth = ctx.measureText(brandTagText).width + 16;
  const brandTagX = PADDING_X + 130;
  const brandTagY = currentY + 6;
  ctx.fillStyle = '#F59E0B';
  drawRoundRect(ctx, brandTagX, brandTagY, brandTagWidth, 22, 6);
  ctx.fill();
  ctx.fillStyle = '#0F172A';
  ctx.fillText(brandTagText, brandTagX + 8, brandTagY + 15);

  const isOnlyMissingMode = !!params.onlyMissing || (inStockCount === 0 && totalCount > 0);

  // Subtitle / Document Title
  ctx.fillStyle = '#1E293B';
  ctx.font = '800 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const docTitle = isOnlyMissingMode 
    ? 'PLANILLA DE INSUMOS A COMPRAR (SOLO FALTANTES)' 
    : 'PLANILLA CONSOLIDADA DE COMPRAS & PEDIDO DE INSUMOS';
  ctx.fillText(docTitle, PADDING_X, currentY + 58);

  const now = new Date();
  const dateStr = now.toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  ctx.fillStyle = '#64748B';
  ctx.font = '500 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const emissionNote = isOnlyMissingMode
    ? `Emisión: ${dateStr} • ${timeStr} hs • Solo Faltantes (Stock en planta descontado)`
    : `Emisión: ${dateStr} • ${timeStr} hs • Control Operativo de Planta & Stock`;
  ctx.fillText(emissionNote, PADDING_X, currentY + 78);

  // Right badges: Stats
  const statBoxRight = LOGICAL_WIDTH - PADDING_X;
  
  // Pending Badge
  const pendingBadgeText = isOnlyMissingMode 
    ? `${totalCount} FALTANTES A COMPRAR`
    : `${pendingCount} PENDIENTES DE COMPRA`;
  ctx.font = '800 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const pendingBadgeW = ctx.measureText(pendingBadgeText).width + 20;
  const pendingBadgeX = statBoxRight - pendingBadgeW;
  ctx.fillStyle = (pendingCount > 0 || totalCount > 0) ? '#FEF3C7' : '#F1F5F9';
  drawRoundRect(ctx, pendingBadgeX, currentY + 6, pendingBadgeW, 26, 8);
  ctx.fill();
  ctx.strokeStyle = (pendingCount > 0 || totalCount > 0) ? '#F59E0B' : '#CBD5E1';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = (pendingCount > 0 || totalCount > 0) ? '#92400E' : '#475569';
  ctx.fillText(pendingBadgeText, pendingBadgeX + 10, currentY + 23);

  // Ready / In Stock Badge (only show when not in only-missing mode or when inStockCount > 0)
  if (!isOnlyMissingMode && inStockCount > 0) {
    const stockBadgeText = `${inStockCount} EN STOCK / CUBIERTOS`;
    const stockBadgeW = ctx.measureText(stockBadgeText).width + 20;
    const stockBadgeX = pendingBadgeX - stockBadgeW - 8;
    ctx.fillStyle = '#D1FAE5';
    drawRoundRect(ctx, stockBadgeX, currentY + 6, stockBadgeW, 26, 8);
    ctx.fill();
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#065F46';
    ctx.fillText(stockBadgeText, stockBadgeX + 10, currentY + 23);
  } else if (isOnlyMissingMode) {
    const filterBadgeText = 'STOCK DESCONTADO';
    const filterBadgeW = ctx.measureText(filterBadgeText).width + 18;
    const filterBadgeX = pendingBadgeX - filterBadgeW - 8;
    ctx.fillStyle = '#ECFDF5';
    drawRoundRect(ctx, filterBadgeX, currentY + 6, filterBadgeW, 26, 8);
    ctx.fill();
    ctx.strokeStyle = '#34D399';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#065F46';
    ctx.fillText(filterBadgeText, filterBadgeX + 9, currentY + 23);
  }

  // Merma Buffer Badge (if any)
  if (bufferPercent > 0) {
    const bufferText = `Margen Merma: +${bufferPercent}%`;
    ctx.font = '700 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const bufW = ctx.measureText(bufferText).width + 16;
    const bufX = statBoxRight - bufW;
    ctx.fillStyle = '#F1F5F9';
    drawRoundRect(ctx, bufX, currentY + 40, bufW, 24, 6);
    ctx.fill();
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#334155';
    ctx.fillText(bufferText, bufX + 8, currentY + 56);
  }

  // Header bottom border
  currentY += 92;
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(PADDING_X, currentY);
  ctx.lineTo(LOGICAL_WIDTH - PADDING_X, currentY);
  ctx.stroke();

  currentY += 16;

  // -------------------------------------------------------------
  // 2. BATCHES SUMMARY BOX
  // -------------------------------------------------------------
  ctx.fillStyle = '#F8FAFC';
  drawRoundRect(ctx, PADDING_X, currentY, CONTENT_WIDTH, batchesBoxHeight, 10);
  ctx.fill();
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Header inside batches box
  ctx.fillStyle = '#334155';
  ctx.font = '800 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`LOTES DE PRODUCCIÓN INCLUIDOS (${batches.length}):`, PADDING_X + 16, currentY + 24);

  // Render batch chips
  let chipX = PADDING_X + 16;
  let chipY = currentY + 36;
  const chipH = 24;

  batches.forEach((b) => {
    const recipe = recipes.find((r) => r.id === b.recipeId);
    const dateFormatted = formatBatchDateShort(b.scheduledDate);
    const unitsFormatted = `${b.targetUnits.toLocaleString('es-AR')} ${recipe?.yieldUnitName || 'u'}`;
    const isBatchCompleted = b.status === 'completado';
    const batchLabel = `${isBatchCompleted ? '✓ ' : ''}${b.recipeName} (${dateFormatted}) • ${unitsFormatted}${isBatchCompleted ? ' (En stock)' : ''}`;

    ctx.font = '700 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const batchW = ctx.measureText(batchLabel).width + 20;

    // Check if wraps
    if (chipX + batchW > PADDING_X + CONTENT_WIDTH - 16) {
      chipX = PADDING_X + 16;
      chipY += 28;
    }

    ctx.fillStyle = isBatchCompleted ? '#ECFDF5' : '#FFFFFF';
    drawRoundRect(ctx, chipX, chipY, batchW, chipH, 6);
    ctx.fill();
    ctx.strokeStyle = isBatchCompleted ? '#10B981' : '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = isBatchCompleted ? '#065F46' : '#0F172A';
    ctx.fillText(batchLabel, chipX + 10, chipY + 16);

    chipX += batchW + 8;
  });

  currentY += batchesBoxHeight + 20;

  // -------------------------------------------------------------
  // 3. CATEGORY TABLES
  // -------------------------------------------------------------
  // Column definitions (relative to PADDING_X)
  // Total Content Width = 1048px
  const COL_STATE_W = 95;      // 0..95
  const COL_NAME_W = 285;      // 95..380
  const COL_NET_W = 115;       // 380..495
  const COL_STOCK_W = 125;     // 495..620 (Stock en Fábrica)
  const COL_BUY_W = 158;       // 620..778 (A Comprar)
  const COL_DEST_W = 270;      // 778..1048 (Destino / Producción)

  const COL_STATE_X = PADDING_X;
  const COL_NAME_X = COL_STATE_X + COL_STATE_W;
  const COL_NET_X = COL_NAME_X + COL_NAME_W;
  const COL_STOCK_X = COL_NET_X + COL_NET_W;
  const COL_BUY_X = COL_STOCK_X + COL_STOCK_W;
  const COL_DEST_X = COL_BUY_X + COL_BUY_W;

  categoriesPresent.forEach((catKey) => {
    const cat = CATEGORY_MAP[catKey] || { label: catKey, icon: '📦', order: 99 };
    const itemsInCat = tableRows.filter((r) => r.categoryKey === catKey);
    if (itemsInCat.length === 0) return;

    // Category Header Bar (Dark slate with rounded top)
    const catHeaderH = 36;
    ctx.fillStyle = '#0F172A';
    drawRoundRect(ctx, PADDING_X, currentY, CONTENT_WIDTH, catHeaderH, { tl: 8, tr: 8, bl: 0, br: 0 });
    ctx.fill();

    // Category icon & name
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const catTitle = `${cat.icon}  ${cat.label.toUpperCase()}`;
    ctx.fillText(catTitle, PADDING_X + 14, currentY + 23);

    // Category count on right
    ctx.fillStyle = '#FDE68A';
    ctx.font = '700 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const countText = `${itemsInCat.length} ${itemsInCat.length === 1 ? 'insumo' : 'insumos'}`;
    const countW = ctx.measureText(countText).width;
    ctx.fillText(countText, LOGICAL_WIDTH - PADDING_X - countW - 14, currentY + 23);

    currentY += catHeaderH;

    // Table Column Headers
    const colHeaderH = 28;
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(PADDING_X, currentY, CONTENT_WIDTH, colHeaderH);

    ctx.fillStyle = '#475569';
    ctx.font = '800 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('ESTADO', COL_STATE_X + 10, currentY + 18);
    ctx.fillText('INSUMO / DESCRIPCIÓN', COL_NAME_X + 8, currentY + 18);
    
    // Right align NET
    const netHdr = 'CANT. NETA';
    const netHdrW = ctx.measureText(netHdr).width;
    ctx.fillText(netHdr, COL_NET_X + COL_NET_W - netHdrW - 14, currentY + 18);

    // Stock Fábrica
    const stockHdr = 'STOCK FÁBRICA';
    const stockHdrW = ctx.measureText(stockHdr).width;
    ctx.fillStyle = '#065F46';
    ctx.fillText(stockHdr, COL_STOCK_X + COL_STOCK_W - stockHdrW - 14, currentY + 18);

    // A Comprar
    const buyHdr = bufferPercent > 0 ? `A COMPRAR (+${bufferPercent}%)` : 'A COMPRAR';
    const buyHdrW = ctx.measureText(buyHdr).width;
    ctx.fillStyle = '#92400E';
    ctx.fillText(buyHdr, COL_BUY_X + COL_BUY_W - buyHdrW - 14, currentY + 18);

    // Destino
    ctx.fillStyle = '#475569';
    ctx.fillText('DESTINO / PRODUCCIÓN', COL_DEST_X + 8, currentY + 18);

    // Border under col header
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PADDING_X, currentY + colHeaderH);
    ctx.lineTo(LOGICAL_WIDTH - PADDING_X, currentY + colHeaderH);
    ctx.stroke();

    currentY += colHeaderH;

    // Table Rows
    const rowH = 38;
    itemsInCat.forEach((row, idx) => {
      const isInStock = row.isInStock;
      const isPartial = row.isPartialStock;

      // Background alternating or green highlight
      ctx.fillStyle = isInStock 
        ? '#F0FDF4' 
        : isPartial
        ? '#FFFBEB'
        : idx % 2 === 0 
        ? '#FFFFFF' 
        : '#F8FAFC';
      ctx.fillRect(PADDING_X, currentY, CONTENT_WIDTH, rowH);

      // Status Badge (ESTADO)
      if (isInStock) {
        ctx.fillStyle = '#DCFCE7';
        drawRoundRect(ctx, COL_STATE_X + 8, currentY + 8, 78, 22, 5);
        ctx.fill();
        ctx.strokeStyle = '#86EFAC';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#15803D';
        ctx.font = '800 9.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('✓ EN STOCK', COL_STATE_X + 14, currentY + 22);
      } else if (isPartial) {
        ctx.fillStyle = '#FEF3C7';
        drawRoundRect(ctx, COL_STATE_X + 8, currentY + 8, 78, 22, 5);
        ctx.fill();
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#92400E';
        ctx.font = '800 9.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('⚠️ PARCIAL', COL_STATE_X + 16, currentY + 22);
      } else {
        ctx.fillStyle = '#FEF3C7';
        drawRoundRect(ctx, COL_STATE_X + 8, currentY + 8, 78, 22, 5);
        ctx.fill();
        ctx.strokeStyle = '#FCD34D';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#B45309';
        ctx.font = '800 9.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('⏳ PENDIENTE', COL_STATE_X + 12, currentY + 22);
      }

      // Insumo Name & Strikethrough if in stock
      ctx.fillStyle = isInStock ? '#065F46' : '#0F172A';
      ctx.font = isInStock 
        ? '600 12.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        : '700 12.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const truncatedName = truncateText(ctx, row.name, COL_NAME_W - 20);
      const nameX = COL_NAME_X + 8;
      const nameY = currentY + 23;
      ctx.fillText(truncatedName, nameX, nameY);

      // Optical strikethrough (tachado en verde) line for in-stock items
      if (isInStock) {
        const nameTextWidth = ctx.measureText(truncatedName).width;
        ctx.strokeStyle = '#10B981'; // Green strikethrough as requested!
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(nameX, nameY - 4);
        ctx.lineTo(nameX + nameTextWidth, nameY - 4);
        ctx.stroke();
      }

      // Net Amount (Right aligned)
      ctx.fillStyle = isInStock ? '#047857' : '#475569';
      ctx.font = '600 12px monospace, -apple-system, sans-serif';
      const netTextW = ctx.measureText(row.formattedNet).width;
      const netX = COL_NET_X + COL_NET_W - netTextW - 14;
      const netY = currentY + 23;
      ctx.fillText(row.formattedNet, netX, netY);
      if (isInStock) {
        ctx.strokeStyle = '#34D399';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(netX, netY - 4);
        ctx.lineTo(netX + netTextW, netY - 4);
        ctx.stroke();
      }

      // Stock en Fábrica Column (Right aligned)
      const stockText = row.formattedStock || '0';
      const hasStock = (row.totalAvailableStock || 0) > 0;
      ctx.fillStyle = hasStock ? '#065F46' : '#94A3B8';
      ctx.font = hasStock ? '700 12px monospace, -apple-system, sans-serif' : '500 11.5px monospace, -apple-system, sans-serif';
      const stockTextW = ctx.measureText(stockText).width;
      ctx.fillText(stockText, COL_STOCK_X + COL_STOCK_W - stockTextW - 14, currentY + 23);

      // A Comprar (Highlighted badge box)
      const buyText = isInStock ? '0 (En stock)' : row.formattedToBuy;
      ctx.font = '800 11.5px monospace, -apple-system, sans-serif';
      const buyTextW = ctx.measureText(buyText).width;
      const buyBadgeW = Math.max(76, buyTextW + 18);
      const buyBadgeX = COL_BUY_X + COL_BUY_W - buyBadgeW - 10;
      const buyBadgeY = currentY + 7;

      if (isInStock) {
        ctx.fillStyle = '#DCFCE7';
        drawRoundRect(ctx, buyBadgeX, buyBadgeY, buyBadgeW, 24, 6);
        ctx.fill();
        ctx.strokeStyle = '#86EFAC';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#15803D';
      } else if (isPartial) {
        ctx.fillStyle = '#FEF3C7';
        drawRoundRect(ctx, buyBadgeX, buyBadgeY, buyBadgeW, 24, 6);
        ctx.fill();
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#78350F';
      } else {
        ctx.fillStyle = '#FEF3C7';
        drawRoundRect(ctx, buyBadgeX, buyBadgeY, buyBadgeW, 24, 6);
        ctx.fill();
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#78350F';
      }
      ctx.fillText(buyText, buyBadgeX + (buyBadgeW - buyTextW) / 2, buyBadgeY + 16);

      // Destino / Usado en lotes
      ctx.fillStyle = '#64748B';
      ctx.font = '500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const truncatedDest = truncateText(ctx, row.usedInText, COL_DEST_W - 20);
      ctx.fillText(truncatedDest, COL_DEST_X + 8, currentY + 23);

      // Bottom row divider line
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(PADDING_X, currentY + rowH);
      ctx.lineTo(LOGICAL_WIDTH - PADDING_X, currentY + rowH);
      ctx.stroke();

      currentY += rowH;
    });

    // Outer table border box
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.strokeRect(PADDING_X, currentY - catHeaderH - colHeaderH - itemsInCat.length * rowH, CONTENT_WIDTH, catHeaderH + colHeaderH + itemsInCat.length * rowH);

    currentY += 20; // Gap between categories
  });

  // -------------------------------------------------------------
  // 4. FOOTER & SIGNOFF
  // -------------------------------------------------------------
  currentY += 10;
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PADDING_X, currentY);
  ctx.lineTo(LOGICAL_WIDTH - PADDING_X, currentY);
  ctx.stroke();

  currentY += 26;

  // Left: Summary description
  ctx.fillStyle = '#0F172A';
  ctx.font = '800 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`TOTAL: ${totalCount} INSUMOS CONSOLIDADOS`, PADDING_X, currentY);

  ctx.fillStyle = '#64748B';
  ctx.font = '500 11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(
    `Estado de Compra: ${pendingCount} insumos pendientes • ${inStockCount} insumos cubiertos en stock de fábrica (tachados en verde).`,
    PADDING_X,
    currentY + 18
  );
  ctx.fillText(
    `Documento de compras y control operativo emitido automáticamente por el Sistema de Gestión Vagone.`,
    PADDING_X,
    currentY + 34
  );

  // Right: Signature line
  const signWidth = 240;
  const signX = LOGICAL_WIDTH - PADDING_X - signWidth;
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(signX, currentY + 22);
  ctx.lineTo(signX + signWidth, currentY + 22);
  ctx.stroke();

  ctx.fillStyle = '#475569';
  ctx.font = '700 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const signLabel = 'FIRMA RESPONSABLE COMPRAS / PLANTA';
  const signLabelW = ctx.measureText(signLabel).width;
  ctx.fillText(signLabel, signX + (signWidth - signLabelW) / 2, currentY + 38);

  return canvas;
}

/**
 * Downloads the generated canvas as high-resolution PNG
 */
export function downloadShoppingListImage(params: ExportShoppingListParams, filenamePrefix = 'planilla-compras-vagone') {
  const canvas = generateShoppingListCanvas(params);
  const dataUrl = canvas.toDataURL('image/png', 1.0);
  const nowStr = new Date().toISOString().split('T')[0];
  const link = document.createElement('a');
  link.download = `${filenamePrefix}-${nowStr}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Copies the generated canvas image to system clipboard if supported
 */
export async function copyShoppingListImageToClipboard(params: ExportShoppingListParams): Promise<boolean> {
  const canvas = generateShoppingListCanvas(params);
  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      if (!blob || typeof navigator.clipboard?.write !== 'function' || typeof ClipboardItem === 'undefined') {
        resolve(false);
        return;
      }
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        resolve(true);
      } catch (err) {
        console.warn('Clipboard write failed:', err);
        resolve(false);
      }
    }, 'image/png', 1.0);
  });
}
