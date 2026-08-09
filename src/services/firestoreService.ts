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
import { ActiveBatch, Recipe } from '../types';
import { INITIAL_RECIPES } from '../data/recipesData';

const BATCHES_COLLECTION = 'batches';
const RECIPES_COLLECTION = 'recipes';

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
  localRecipes: Recipe[]
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
  } catch (error) {
    console.error('Error initializing Firestore defaults:', error);
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
