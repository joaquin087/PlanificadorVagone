import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ActiveBatch, Recipe, MasterIngredient, IngredientCategoryConfig, ProductionCategoryConfig } from '../types';
import { INITIAL_RECIPES } from '../data/recipesData';
import { INITIAL_MASTER_INGREDIENTS } from '../data/masterIngredientsData';
import { DEFAULT_INGREDIENT_CATEGORIES, DEFAULT_PRODUCTION_CATEGORIES } from '../data/categoriesData';

const BATCHES_COLLECTION = 'batches';
const RECIPES_COLLECTION = 'recipes';
const MASTER_INGREDIENTS_COLLECTION = 'master_ingredients';
const INGREDIENT_CATEGORIES_COLLECTION = 'ingredient_categories';
const PRODUCTION_CATEGORIES_COLLECTION = 'production_categories';
const INVENTORY_STATE_COLLECTION = 'inventory_state';
const INVENTORY_STATE_DOC = 'stock_and_checked';

// Helper to remove undefined fields which Firestore rejects
function sanitizeForFirestore<T extends object>(data: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = sanitizeForFirestore(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

/**
 * Initialize Firestore data if collections are empty.
 * Migrates local data or initial defaults to Firestore.
 */
export async function initializeFirestoreDefaults(
  localBatches: ActiveBatch[],
  localRecipes: Recipe[],
  localMasterIngredients?: MasterIngredient[],
  localIngredientCategories?: IngredientCategoryConfig[],
  localProductionCategories?: ProductionCategoryConfig[]
): Promise<void> {
  try {
    // Check recipes collection
    const recipesSnap = await getDocs(collection(db, RECIPES_COLLECTION));
    if (recipesSnap.empty) {
      console.log('Migrating recipes to Firestore...');
      const recipesToSave = localRecipes && localRecipes.length > 0 ? localRecipes : INITIAL_RECIPES;
      const batch = writeBatch(db);
      for (const recipe of recipesToSave) {
        const ref = doc(db, RECIPES_COLLECTION, recipe.id);
        batch.set(ref, sanitizeForFirestore(recipe));
      }
      await batch.commit();
      console.log('Recipes migrated to Firestore successfully.');
    }

    // Check batches collection
    const batchesSnap = await getDocs(collection(db, BATCHES_COLLECTION));
    if (batchesSnap.empty && localBatches && localBatches.length > 0) {
      console.log('Migrating initial batches to Firestore...');
      const batch = writeBatch(db);
      for (const b of localBatches) {
        const ref = doc(db, BATCHES_COLLECTION, b.id);
        batch.set(ref, sanitizeForFirestore(b));
      }
      await batch.commit();
      console.log('Batches migrated to Firestore successfully.');
    }

    // Check master_ingredients collection
    const masterSnap = await getDocs(collection(db, MASTER_INGREDIENTS_COLLECTION));
    if (masterSnap.empty) {
      console.log('Migrating master ingredients to Firestore...');
      const itemsToSave = localMasterIngredients && localMasterIngredients.length > 0 ? localMasterIngredients : INITIAL_MASTER_INGREDIENTS;
      const batch = writeBatch(db);
      for (const item of itemsToSave) {
        const ref = doc(db, MASTER_INGREDIENTS_COLLECTION, item.id);
        batch.set(ref, sanitizeForFirestore(item));
      }
      await batch.commit();
    }

    // Check ingredient_categories collection
    const ingCatSnap = await getDocs(collection(db, INGREDIENT_CATEGORIES_COLLECTION));
    if (ingCatSnap.empty) {
      console.log('Migrating ingredient categories to Firestore...');
      const catsToSave = localIngredientCategories && localIngredientCategories.length > 0 ? localIngredientCategories : DEFAULT_INGREDIENT_CATEGORIES;
      const batch = writeBatch(db);
      for (const cat of catsToSave) {
        const ref = doc(db, INGREDIENT_CATEGORIES_COLLECTION, cat.id);
        batch.set(ref, sanitizeForFirestore(cat));
      }
      await batch.commit();
    }

    // Check production_categories collection
    const prodCatSnap = await getDocs(collection(db, PRODUCTION_CATEGORIES_COLLECTION));
    if (prodCatSnap.empty) {
      console.log('Migrating production categories to Firestore...');
      const pCatsToSave = localProductionCategories && localProductionCategories.length > 0 ? localProductionCategories : DEFAULT_PRODUCTION_CATEGORIES;
      const batch = writeBatch(db);
      for (const pCat of pCatsToSave) {
        const ref = doc(db, PRODUCTION_CATEGORIES_COLLECTION, pCat.id);
        batch.set(ref, sanitizeForFirestore(pCat));
      }
      await batch.commit();
    }
  } catch (error) {
    console.error('Error initializing Firestore defaults:', error);
  }
}

/**
 * Master Ingredients Firestore Handlers
 */
export function subscribeToMasterIngredients(
  onUpdate: (ingredients: MasterIngredient[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const ref = collection(db, MASTER_INGREDIENTS_COLLECTION);
  return onSnapshot(
    ref,
    (snapshot) => {
      const items: MasterIngredient[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as MasterIngredient);
      });
      if (items.length > 0) {
        items.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
        onUpdate(items);
      }
    },
    (error) => {
      console.error('Error listening to master ingredients:', error);
      if (onError) onError(error);
    }
  );
}

export async function saveMasterIngredientToFirestore(item: MasterIngredient): Promise<void> {
  try {
    const ref = doc(db, MASTER_INGREDIENTS_COLLECTION, item.id);
    await setDoc(ref, sanitizeForFirestore(item), { merge: true });
  } catch (error) {
    console.error('Error saving master ingredient to Firestore:', error);
    throw error;
  }
}

export async function deleteMasterIngredientFromFirestore(itemId: string): Promise<void> {
  try {
    const ref = doc(db, MASTER_INGREDIENTS_COLLECTION, itemId);
    await deleteDoc(ref);
  } catch (error) {
    console.error('Error deleting master ingredient from Firestore:', error);
    throw error;
  }
}

export async function saveAllMasterIngredientsToFirestore(items: MasterIngredient[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    for (const item of items) {
      const ref = doc(db, MASTER_INGREDIENTS_COLLECTION, item.id);
      batch.set(ref, sanitizeForFirestore(item));
    }
    await batch.commit();
  } catch (error) {
    console.error('Error saving all master ingredients to Firestore:', error);
    throw error;
  }
}

/**
 * Ingredient Categories Firestore Handlers
 */
export function subscribeToIngredientCategories(
  onUpdate: (categories: IngredientCategoryConfig[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const ref = collection(db, INGREDIENT_CATEGORIES_COLLECTION);
  return onSnapshot(
    ref,
    (snapshot) => {
      const items: IngredientCategoryConfig[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as IngredientCategoryConfig);
      });
      if (items.length > 0) {
        items.sort((a, b) => a.order - b.order);
        onUpdate(items);
      }
    },
    (error) => {
      console.error('Error listening to ingredient categories:', error);
      if (onError) onError(error);
    }
  );
}

export async function saveIngredientCategoryToFirestore(cat: IngredientCategoryConfig): Promise<void> {
  try {
    const ref = doc(db, INGREDIENT_CATEGORIES_COLLECTION, cat.id);
    await setDoc(ref, sanitizeForFirestore(cat), { merge: true });
  } catch (error) {
    console.error('Error saving ingredient category to Firestore:', error);
    throw error;
  }
}

export async function deleteIngredientCategoryFromFirestore(catId: string): Promise<void> {
  try {
    const ref = doc(db, INGREDIENT_CATEGORIES_COLLECTION, catId);
    await deleteDoc(ref);
  } catch (error) {
    console.error('Error deleting ingredient category from Firestore:', error);
    throw error;
  }
}

export async function saveAllIngredientCategoriesToFirestore(cats: IngredientCategoryConfig[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    for (const cat of cats) {
      const ref = doc(db, INGREDIENT_CATEGORIES_COLLECTION, cat.id);
      batch.set(ref, sanitizeForFirestore(cat));
    }
    await batch.commit();
  } catch (error) {
    console.error('Error saving all ingredient categories to Firestore:', error);
    throw error;
  }
}

/**
 * Production Categories Firestore Handlers
 */
export function subscribeToProductionCategories(
  onUpdate: (categories: ProductionCategoryConfig[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const ref = collection(db, PRODUCTION_CATEGORIES_COLLECTION);
  return onSnapshot(
    ref,
    (snapshot) => {
      const items: ProductionCategoryConfig[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as ProductionCategoryConfig);
      });
      if (items.length > 0) {
        items.sort((a, b) => a.order - b.order);
        onUpdate(items);
      }
    },
    (error) => {
      console.error('Error listening to production categories:', error);
      if (onError) onError(error);
    }
  );
}

export async function saveProductionCategoryToFirestore(pCat: ProductionCategoryConfig): Promise<void> {
  try {
    const ref = doc(db, PRODUCTION_CATEGORIES_COLLECTION, pCat.id);
    await setDoc(ref, sanitizeForFirestore(pCat), { merge: true });
  } catch (error) {
    console.error('Error saving production category to Firestore:', error);
    throw error;
  }
}

export async function deleteProductionCategoryFromFirestore(pCatId: string): Promise<void> {
  try {
    const ref = doc(db, PRODUCTION_CATEGORIES_COLLECTION, pCatId);
    await deleteDoc(ref);
  } catch (error) {
    console.error('Error deleting production category from Firestore:', error);
    throw error;
  }
}

export async function saveAllProductionCategoriesToFirestore(pCats: ProductionCategoryConfig[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    for (const pCat of pCats) {
      const ref = doc(db, PRODUCTION_CATEGORIES_COLLECTION, pCat.id);
      batch.set(ref, sanitizeForFirestore(pCat));
    }
    await batch.commit();
  } catch (error) {
    console.error('Error saving all production categories to Firestore:', error);
    throw error;
  }
}

/**
 * Subscribe to real-time updates for active production batches
 */
export function subscribeToBatches(
  onUpdate: (batches: ActiveBatch[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const batchesRef = collection(db, BATCHES_COLLECTION);
  return onSnapshot(
    batchesRef,
    (snapshot) => {
      const batches: ActiveBatch[] = [];
      snapshot.forEach((docSnap) => {
        batches.push(docSnap.data() as ActiveBatch);
      });
      // Sort by scheduledDate ascending or createdAt
      batches.sort((a, b) => {
        if (a.scheduledDate === b.scheduledDate) {
          return (b.createdAt || '').localeCompare(a.createdAt || '');
        }
        return a.scheduledDate.localeCompare(b.scheduledDate);
      });
      onUpdate(batches);
    },
    (error) => {
      console.error('Error listening to batches:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Save or update a single batch in Firestore
 */
export async function saveBatchToFirestore(batch: ActiveBatch): Promise<void> {
  try {
    const ref = doc(db, BATCHES_COLLECTION, batch.id);
    await setDoc(ref, sanitizeForFirestore(batch), { merge: true });
  } catch (error) {
    console.error('Error saving batch to Firestore:', error);
    throw error;
  }
}

/**
 * Delete a batch from Firestore
 */
export async function deleteBatchFromFirestore(batchId: string): Promise<void> {
  try {
    const ref = doc(db, BATCHES_COLLECTION, batchId);
    await deleteDoc(ref);
  } catch (error) {
    console.error('Error deleting batch from Firestore:', error);
    throw error;
  }
}

/**
 * Subscribe to real-time updates for recipes
 */
export function subscribeToRecipes(
  onUpdate: (recipes: Recipe[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const recipesRef = collection(db, RECIPES_COLLECTION);
  return onSnapshot(
    recipesRef,
    (snapshot) => {
      const recipes: Recipe[] = [];
      snapshot.forEach((docSnap) => {
        recipes.push(docSnap.data() as Recipe);
      });
      if (recipes.length > 0) {
        onUpdate(recipes);
      }
    },
    (error) => {
      console.error('Error listening to recipes:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Save or update a recipe in Firestore
 */
export async function saveRecipeToFirestore(recipe: Recipe): Promise<void> {
  try {
    const ref = doc(db, RECIPES_COLLECTION, recipe.id);
    await setDoc(ref, sanitizeForFirestore(recipe), { merge: true });
  } catch (error) {
    console.error('Error saving recipe to Firestore:', error);
    throw error;
  }
}

/**
 * Save or update multiple recipes in Firestore in a single batch
 */
export async function saveAllRecipesToFirestore(recipes: Recipe[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    for (const recipe of recipes) {
      const ref = doc(db, RECIPES_COLLECTION, recipe.id);
      batch.set(ref, sanitizeForFirestore(recipe));
    }
    await batch.commit();
  } catch (error) {
    console.error('Error saving all recipes to Firestore:', error);
    throw error;
  }
}

/**
 * Delete a recipe from Firestore
 */
export async function deleteRecipeFromFirestore(recipeId: string): Promise<void> {
  try {
    const ref = doc(db, RECIPES_COLLECTION, recipeId);
    await deleteDoc(ref);
  } catch (error) {
    console.error('Error deleting recipe from Firestore:', error);
    throw error;
  }
}

/**
 * Reset recipes in Firestore back to factory defaults
 */
export async function resetRecipesInFirestore(): Promise<void> {
  try {
    const batch = writeBatch(db);
    for (const recipe of INITIAL_RECIPES) {
      const ref = doc(db, RECIPES_COLLECTION, recipe.id);
      batch.set(ref, sanitizeForFirestore(recipe));
    }
    await batch.commit();
  } catch (error) {
    console.error('Error resetting recipes in Firestore:', error);
    throw error;
  }
}

/**
 * Inventory Stock & Checked Items Firestore Handlers
 */
export interface FirestoreInventoryState {
  checkedItems: Record<string, boolean>;
  factoryStock: Record<string, number>;
  dismissedPackagingDates?: Record<string, boolean>;
  saturdayWeeks?: Record<string, boolean>;
  updatedAt?: string;
}

export function subscribeToInventoryState(
  onUpdate: (state: FirestoreInventoryState) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const ref = doc(db, INVENTORY_STATE_COLLECTION, INVENTORY_STATE_DOC);
  return onSnapshot(
    ref,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as FirestoreInventoryState;
        onUpdate(data);
      }
    },
    (error) => {
      console.error('Error listening to inventory state:', error);
      if (onError) onError(error);
    }
  );
}

export async function saveInventoryStateToFirestore(state: Partial<FirestoreInventoryState>): Promise<void> {
  try {
    const ref = doc(db, INVENTORY_STATE_COLLECTION, INVENTORY_STATE_DOC);
    await setDoc(
      ref,
      sanitizeForFirestore({
        ...state,
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    );
  } catch (error) {
    console.error('Error saving inventory state to Firestore:', error);
  }
}

