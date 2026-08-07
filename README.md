# 🏭 FabriPlan - Sistema de Gestión de Producción & Fábrica de Congelados

Sistema integral para la planificación de producción, escalado al gramo de recetas industriales, monitoreo en tiempo real de ocupación de cámaras de congelado rápido (F1 & F2), consolidación de órdenes de compra para proveedores con cálculo de mermas y guía táctil de pesaje para operarios de planta.

---

## 🚀 Características Principales

1. **📊 Dashboard de Planta en Tiempo Real**
   - Resumen de ocupación en directo de los congeladores de choque F1 (10 bandejas) y F2 (10 bandejas).
   - Métricas de horas de trabajo estimadas, lotes en curso y catálogo de productos con acceso rápido a escalado.

2. **⚖️ Calculadora / Escalador de Lotes al Gramo**
   - Escalado proporcional exacto de ingredientes secos, frescos, líquidos y condimentos según las unidades objetivo.
   - Cálculo automático de horas de elaboración de fábrica.
   - Reglas de distribución en freezers: cálculo automático de bandejas requeridas en F1 y saturación hacia F2.
   - Insumos de empaque automáticos (bolsas primarias, folex separador, cajas y etiquetas).
   - Soporte para alternativas de ingredientes (e.g., Pategrás vs. Muzzarella, Sal fina vs. gruesa).

3. **❄️ Monitor & Simulador de Congeladores (F1 & F2)**
   - Visualizador gráfico de las 10 ranuras por freezer con estados de ocupación.
   - Detección visual de sobrecarga térmica o espacial (>100%).
   - **Simulador de Capacidad de Planta:** permite simular dos recetas en simultáneo para validar si pueden elaborarse y estibarse el mismo día sin saturar las cámaras.

4. **📅 Planificador de Turnos & Lotes (Pipeline Kanban)**
   - Creación y seguimiento de lotes por estado: *1. Planificado*, *2. Pesando*, *3. Elaborando*, *4. En Freezer*, *5. Completado*.
   - Persistencia local en navegador para no perder el estado de los turnos de producción.
   - Acceso directo al modo operario desde cada orden programada.

5. **🛒 Consolidador de Compras & Proveedores**
   - Agrupación automática de todos los insumos necesarios para los lotes activos clasificados por categoría:
     - 🧀 Lácteos, Quesos y Rellenos
     - 🌾 Harinas, Féculas y Galletitas
     - 🥬 Verduras, Frescos y Frutas
     - 🥚 Huevos Frescos
     - 🧈 Grasas, Aceites y Líquidos
     - 🧂 Especias, Sales y Condimentos
     - 📦 Insumos de Empaque y Descartables
   - Selector de margen de seguridad y merma (+0%, +5%, +10%).
   - **Botón de exportación con un clic:** genera texto formateado listo para enviar por WhatsApp a proveedores.

6. **⏱️ Guía Táctil de Pesaje y Elaboración para Operarios**
   - Interfaz simplificada con tipografía de alto contraste para tablets y pantallas táctiles de balanza.
   - Cronómetro de turno integrado con funciones de inicio, pausa y reinicio.
   - Checklist interactivo de ingredientes pesados con visualización en kilogramos y gramos.
   - Instrucciones técnicas paso a paso y pautas de estiba en frío.

7. **📖 Fichas Técnicas Oficiales (10 Productos)**
   - Tequeños de Queso
   - Chipa Tradicional
   - Canelones de Carne Suave
   - Empanadas Criollas
   - Medallones de Pollo
   - Sorrentinos JyQ
   - Ravioles de Ricota y Nuez
   - Croquetas de Jamón
   - Pastel de Papas
   - Ñoquis de Papa

---

## 🛠️ Stack Tecnológico

- **Frontend:** React 19, TypeScript
- **Estilos:** Tailwind CSS
- **Iconografía:** Lucide React
- **Herramienta de Build:** Vite 6
- **Animaciones:** Motion
- **Almacenamiento:** LocalStorage para persistencia local de lotes

---

## 💻 Instalación y Ejecución Local

Para ejecutar el proyecto en tu entorno local:

```bash
# 1. Clonar el repositorio
git clone <URL_DE_TU_REPOSITORIO>

# 2. Ingresar a la carpeta
cd gestion-produccion-fabrica

# 3. Instalar las dependencias
npm install

# 4. Iniciar el servidor de desarrollo
npm run dev
```

El sistema estará disponible en `http://localhost:3000` (o el puerto configurado por Vite).

---

## 📦 Compilación para Producción

```bash
# Generar los archivos estáticos listos para producción
npm run build

# Previsualizar el build generado
npm run preview
```

---

## 📂 Estructura del Proyecto

```
├── src/
│   ├── components/
│   │   ├── BatchScaler.tsx             # Calculadora y escalador de recetas
│   │   ├── DashboardOverview.tsx       # Tablero principal de métricas y accesos
│   │   ├── FreezerMonitor.tsx          # Monitor y simulador de frío F1 & F2
│   │   ├── KitchenWeighingGuide.tsx    # Guía táctil para operarios y cronómetro
│   │   ├── Navbar.tsx                  # Navegación y medidores rápidos de freezers
│   │   ├── ProductionPlanner.tsx       # Planificador de turnos y pipeline de lotes
│   │   ├── RecipeDetailModal.tsx       # Modal de ficha técnica detallada
│   │   └── ShoppingListConsolidator.tsx# Consolidador de compras para proveedores
│   ├── data/
│   │   └── recipesData.ts              # Base de datos de recetas, ingredientes y reglas
│   ├── utils/
│   │   └── calculations.ts             # Motor de cálculo matemático, escalado y mermas
│   ├── types.ts                        # Definición de tipos TypeScript del dominio
│   ├── App.tsx                         # Componente raíz y gestión de estado
│   └── main.tsx                        # Punto de entrada React
├── package.json
└── README.md
```
