import { MasterIngredient } from '../types';

export const INITIAL_MASTER_INGREDIENTS: MasterIngredient[] = [
  // Lácteos, Quesos y Rellenos
  { id: 'ing-muzzarella', name: 'Muzzarella', categoryId: 'lacteos', defaultUnit: 'kg', notes: 'Para rellenos de pastas, pizzas y canelones' },
  { id: 'ing-queso-danbo', name: 'Queso Danbo', categoryId: 'lacteos', defaultUnit: 'kg', notes: 'Bastones para tequeños' },
  { id: 'ing-queso-pategras', name: 'Queso Pategrás', categoryId: 'lacteos', defaultUnit: 'kg', notes: 'Para chipas y pastas' },
  { id: 'ing-queso-sardo', name: 'Queso Sardo', categoryId: 'lacteos', defaultUnit: 'kg', notes: 'Rallado fino para chipas' },
  { id: 'ing-queso-crema', name: 'Queso crema', categoryId: 'lacteos', defaultUnit: 'kg', notes: 'Para cheesecake, tiramisú y chocotorta' },
  { id: 'ing-dulce-de-leche', name: 'Dulce de leche', categoryId: 'lacteos', defaultUnit: 'kg', notes: 'Repostero / clásico para chocotorta' },
  { id: 'ing-crema-de-leche', name: 'Crema de leche', categoryId: 'lacteos', defaultUnit: 'kg', notes: 'Para batidos y bases de postres' },
  { id: 'ing-queso-duro', name: 'Queso duro (Pategrás / Sardo / Danbo)', categoryId: 'lacteos', defaultUnit: 'kg', notes: 'Genérico para rellenos de verdura' },
  { id: 'ing-ricota', name: 'Ricota', categoryId: 'lacteos', defaultUnit: 'kg', notes: 'Ricota magra bien escurrida' },

  // Harinas, Féculas y Galletitas
  { id: 'ing-harina-000', name: 'Harina 000', categoryId: 'harinas_feculas', defaultUnit: 'kg', notes: 'Harina de fuerza para masas' },
  { id: 'ing-fecula-mandioca', name: 'Fécula de mandioca', categoryId: 'harinas_feculas', defaultUnit: 'kg', notes: 'Base para chipa' },
  { id: 'ing-galletitas-lincoln', name: 'Galletitas Lincoln', categoryId: 'harinas_feculas', defaultUnit: 'kg', notes: 'Base para cheesecake' },
  { id: 'ing-galletitas-chocolinas', name: 'Galletitas Chocolinas', categoryId: 'harinas_feculas', defaultUnit: 'kg', notes: 'Para capas de chocotorta' },
  { id: 'ing-vainillas', name: 'Vainillas', categoryId: 'harinas_feculas', defaultUnit: 'kg', notes: 'Para tiramisú' },
  { id: 'ing-azucar', name: 'Azúcar', categoryId: 'harinas_feculas', defaultUnit: 'kg', notes: 'Azúcar blanco común' },
  { id: 'ing-azucar-impalpable', name: 'Azúcar impalpable', categoryId: 'harinas_feculas', defaultUnit: 'kg', notes: 'Para cremas y batidos' },

  // Verduras, Frescos y Frutas
  { id: 'ing-cebolla-deshidratada', name: 'Cebolla deshidratada', categoryId: 'frescos_verduras', defaultUnit: 'kg', notes: 'Insumo estandarizado para rellenos' },
  { id: 'ing-espinaca-congelada', name: 'Espinaca congelada', categoryId: 'frescos_verduras', defaultUnit: 'kg', notes: 'Prensada sin exceso de líquido' },
  { id: 'ing-tomate-fresco', name: 'Tomate fresco', categoryId: 'frescos_verduras', defaultUnit: 'kg', notes: 'Para sorrentinos Caprese' },
  { id: 'ing-salsa-tomate', name: 'Salsa de tomate', categoryId: 'frescos_verduras', defaultUnit: 'kg', notes: 'Para pizzas y canelones' },
  { id: 'ing-albahaca-fresca', name: 'Albahaca fresca', categoryId: 'frescos_verduras', defaultUnit: 'paquetes', notes: 'Hojas frescas seleccionadas' },
  { id: 'ing-frutos-rojos', name: 'Frutos rojos', categoryId: 'frescos_verduras', defaultUnit: 'kg', notes: 'Para coulis de cheesecake' },
  { id: 'ing-morron-rojo', name: 'Morrón rojo', categoryId: 'frescos_verduras', defaultUnit: 'kg', notes: 'Para relleno de canelones' },

  // Huevos
  { id: 'ing-huevos', name: 'Huevos', categoryId: 'huevos', defaultUnit: 'u', notes: 'Huevos frescos de campo' },

  // Grasas, Aceites y Líquidos
  { id: 'ing-margarina', name: 'Margarina', categoryId: 'grasas_liquidos', defaultUnit: 'kg', notes: 'Para hojaldres, masas y chipas' },
  { id: 'ing-leche-entera', name: 'Leche entera', categoryId: 'grasas_liquidos', defaultUnit: 'L', notes: 'Fluida pasteurizada' },
  { id: 'ing-aceite-girasol', name: 'Aceite de girasol', categoryId: 'grasas_liquidos', defaultUnit: 'L', notes: 'Para masas elásticas y pre-frito' },
  { id: 'ing-agua', name: 'Agua', categoryId: 'grasas_liquidos', defaultUnit: 'L', notes: 'Agua potable fría' },

  // Especias, Sales y Condimentos
  { id: 'ing-sal-fina', name: 'Sal fina', categoryId: 'especias_condimentos', defaultUnit: 'g', notes: 'Sal común' },
  { id: 'ing-nuez-moscada', name: 'Nuez moscada', categoryId: 'especias_condimentos', defaultUnit: 'g', notes: 'Para rellenos de pastas' },
  { id: 'ing-pimienta-blanca', name: 'Pimienta blanca', categoryId: 'especias_condimentos', defaultUnit: 'g', notes: 'Molida fina' },
  { id: 'ing-ajo-en-polvo', name: 'Ajo en polvo', categoryId: 'especias_condimentos', defaultUnit: 'g', notes: 'Condimento' },
  { id: 'ing-esencia-vainilla', name: 'Esencia de vainilla', categoryId: 'especias_condimentos', defaultUnit: 'g', notes: 'Para repostería' },
  { id: 'ing-cacao-amargo', name: 'Cacao amargo', categoryId: 'especias_condimentos', defaultUnit: 'g', notes: 'Para tiramisú' },

  // Otros Insumos y Salames
  { id: 'ing-jamon-cocido', name: 'Jamón cocido', categoryId: 'otros', defaultUnit: 'kg', notes: 'Picado o fetas para rellenos' },
  { id: 'ing-salame', name: 'Salame', categoryId: 'otros', defaultUnit: 'kg', notes: 'Para chipas saborizadas' },
  { id: 'ing-levadura-fresca', name: 'Levadura fresca', categoryId: 'otros', defaultUnit: 'kg', notes: 'Para masas leudadas' },
  { id: 'ing-cafe-soluble', name: 'Café soluble', categoryId: 'otros', defaultUnit: 'g', notes: 'Para embeber vainillas' },
];
