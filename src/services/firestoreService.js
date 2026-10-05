import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebaseConfig';

/**
 * Core Firestore Collections Dictionary
 */
export const COLLECTIONS = {
  PROVIDERS: 'providers',
  CUSTOMERS: 'customers',
  CITIES: 'cities',
  PROFESSIONS: 'professions',
  REVIEWS: 'reviews',
  NOTIFICATIONS: 'notifications',
  FAVORITES: 'favorites'
};

/**
 * Provider Schema Specification:
 * - id: string (unique UUID or slug)
 * - fullName: string
 * - phone: string
 * - whatsapp: string
 * - cityId: string (FK to cities)
 * - professionId: string (FK to professions)
 * - professionName: string
 * - address: string
 * - description: string
 * - imageUrl: string
 * - rating: number
 * - reviewsCount: number
 * - isActive: boolean
 * - isVerified: boolean
 * - createdAt: Timestamp (serverTimestamp)
 * - updatedAt: Timestamp (serverTimestamp)
 */

/**
 * Validates and formats a provider record before persisting
 */
export function formatProviderData(data, isNew = false) {
  const formatted = {
    fullName: String(data.fullName || '').trim(),
    phone: String(data.phone || '').trim(),
    whatsapp: String(data.whatsapp || '').trim(),
    cityId: String(data.cityId || '').trim(),
    professionId: String(data.professionId || '').trim(),
    professionName: String(data.professionName || '').trim(),
    address: String(data.address || '').trim(),
    description: String(data.description || '').trim(),
    imageUrl: String(data.imageUrl || '').trim(),
    rating: typeof data.rating === 'number' ? data.rating : Number(data.rating) || 5.0,
    reviewsCount: typeof data.reviewsCount === 'number' ? data.reviewsCount : Number(data.reviewsCount) || 0,
    isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
    isVerified: data.isVerified !== undefined ? Boolean(data.isVerified) : false,
    updatedAt: serverTimestamp()
  };

  if (isNew) {
    formatted.createdAt = serverTimestamp();
  }

  return formatted;
}

// ==========================================
// 1. PROVIDERS SERVICE (بيانات المعلمين والمهنيين)
// ==========================================

/**
 * Fetches all active providers with optional filters (cityId, professionId)
 */
export async function getProviders({ cityId = null, professionId = null, isActive = true, limitCount = 50 } = {}) {
  if (!isFirebaseConfigured || !db) {
    console.warn('[Firestore] Firebase not configured yet. Returning empty providers list.');
    return [];
  }

  try {
    const collRef = collection(db, COLLECTIONS.PROVIDERS);
    let constraints = [];

    if (isActive !== null) {
      constraints.push(where('isActive', '==', isActive));
    }
    if (cityId) {
      constraints.push(where('cityId', '==', cityId));
    }
    if (professionId) {
      constraints.push(where('professionId', '==', professionId));
    }
    if (limitCount) {
      constraints.push(limit(limitCount));
    }

    const q = query(collRef, ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
  } catch (error) {
    console.error('[Firestore] Error getting providers:', error);
    throw error;
  }
}

/**
 * Fetches a single provider by their unique ID (Never by name)
 */
export async function getProviderById(providerId) {
  if (!providerId) throw new Error('providerId is required');
  if (!isFirebaseConfigured || !db) return null;

  try {
    const docRef = doc(db, COLLECTIONS.PROVIDERS, String(providerId));
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;

    return {
      id: docSnap.id,
      ...docSnap.data()
    };
  } catch (error) {
    console.error(`[Firestore] Error getting provider ${providerId}:`, error);
    throw error;
  }
}

/**
 * Creates a new provider with an explicit, unique ID
 */
export async function createProvider(providerData, customId = null) {
  if (!isFirebaseConfigured || !db) {
    console.warn('[Firestore] Firebase not configured. Provider not written to remote DB.');
    return { id: customId || 'temp-id', ...providerData };
  }

  try {
    const collRef = collection(db, COLLECTIONS.PROVIDERS);
    const docRef = customId ? doc(collRef, String(customId)) : doc(collRef);
    const formatted = formatProviderData(providerData, true);

    await setDoc(docRef, formatted);
    return {
      id: docRef.id,
      ...formatted
    };
  } catch (error) {
    console.error('[Firestore] Error creating provider:', error);
    throw error;
  }
}

/**
 * Updates an existing provider by ID
 */
export async function updateProvider(providerId, updateData) {
  if (!providerId) throw new Error('providerId is required');
  if (!isFirebaseConfigured || !db) return false;

  try {
    const docRef = doc(db, COLLECTIONS.PROVIDERS, String(providerId));
    const formatted = {
      ...updateData,
      updatedAt: serverTimestamp()
    };
    await updateDoc(docRef, formatted);
    return true;
  } catch (error) {
    console.error(`[Firestore] Error updating provider ${providerId}:`, error);
    throw error;
  }
}

/**
 * Deletes a single provider by ID (Standard single document deletion)
 */
export async function deleteProvider(providerId) {
  if (!providerId) throw new Error('providerId is required');
  if (!isFirebaseConfigured || !db) return false;

  try {
    const docRef = doc(db, COLLECTIONS.PROVIDERS, String(providerId));
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error(`[Firestore] Error deleting provider ${providerId}:`, error);
    throw error;
  }
}

// ==========================================
// 2. CUSTOMERS SERVICE (حسابات الزبائن)
// ==========================================

export async function getCustomerById(customerId) {
  if (!customerId || !isFirebaseConfigured || !db) return null;
  try {
    const docRef = doc(db, COLLECTIONS.CUSTOMERS, String(customerId));
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  } catch (error) {
    console.error('[Firestore] Error getting customer:', error);
    throw error;
  }
}

export async function createCustomer(customerData, customId = null) {
  if (!isFirebaseConfigured || !db) return { id: customId, ...customerData };
  try {
    const collRef = collection(db, COLLECTIONS.CUSTOMERS);
    const docRef = customId ? doc(collRef, String(customId)) : doc(collRef);
    const payload = {
      fullName: customerData.fullName || '',
      phone: customerData.phone || '',
      preferredCityId: customerData.preferredCityId || '',
      role: 'customer',
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    await setDoc(docRef, payload);
    return { id: docRef.id, ...payload };
  } catch (error) {
    console.error('[Firestore] Error creating customer:', error);
    throw error;
  }
}

export async function updateCustomer(customerId, updateData) {
  if (!customerId || !isFirebaseConfigured || !db) return false;
  try {
    const docRef = doc(db, COLLECTIONS.CUSTOMERS, String(customerId));
    await updateDoc(docRef, { ...updateData, updatedAt: serverTimestamp() });
    return true;
  } catch (error) {
    console.error('[Firestore] Error updating customer:', error);
    throw error;
  }
}

// ==========================================
// 3. CITIES & PROFESSIONS (المدن والمهن)
// ==========================================

export async function getCities() {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.CITIES));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('[Firestore] Error getting cities:', error);
    return [];
  }
}

export async function getProfessions() {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.PROFESSIONS));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('[Firestore] Error getting professions:', error);
    return [];
  }
}

// ==========================================
// 4. REVIEWS SERVICE (التقييمات والمراجعات)
// ==========================================

export async function getReviewsByProviderId(providerId) {
  if (!providerId || !isFirebaseConfigured || !db) return [];
  try {
    const collRef = collection(db, COLLECTIONS.REVIEWS);
    const q = query(collRef, where('providerId', '==', String(providerId)), orderBy('createdAt', 'desc'), limit(50));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('[Firestore] Error getting reviews:', error);
    return [];
  }
}

export async function addReview({ providerId, customerId, customerName, rating, comment }) {
  if (!providerId) throw new Error('providerId is required');
  if (!isFirebaseConfigured || !db) return null;

  try {
    const docRef = doc(collection(db, COLLECTIONS.REVIEWS));
    const payload = {
      providerId: String(providerId),
      customerId: customerId ? String(customerId) : null,
      customerName: String(customerName || 'مستخدم'),
      rating: Number(rating) || 5,
      comment: String(comment || '').trim(),
      status: 'approved',
      createdAt: serverTimestamp()
    };
    await setDoc(docRef, payload);
    return { id: docRef.id, ...payload };
  } catch (error) {
    console.error('[Firestore] Error adding review:', error);
    throw error;
  }
}

// ==========================================
// 5. FAVORITES SERVICE (المفضلة)
// ==========================================

export async function getFavoritesByCustomerId(customerId) {
  if (!customerId || !isFirebaseConfigured || !db) return [];
  try {
    const collRef = collection(db, COLLECTIONS.FAVORITES);
    const q = query(collRef, where('customerId', '==', String(customerId)));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data().providerId);
  } catch (error) {
    console.error('[Firestore] Error getting favorites:', error);
    return [];
  }
}

export async function addFavorite(customerId, providerId) {
  if (!customerId || !providerId || !isFirebaseConfigured || !db) return false;
  try {
    const favDocId = `${customerId}_${providerId}`;
    const docRef = doc(db, COLLECTIONS.FAVORITES, favDocId);
    await setDoc(docRef, {
      customerId: String(customerId),
      providerId: String(providerId),
      createdAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('[Firestore] Error adding favorite:', error);
    throw error;
  }
}

export async function removeFavorite(customerId, providerId) {
  if (!customerId || !providerId || !isFirebaseConfigured || !db) return false;
  try {
    const favDocId = `${customerId}_${providerId}`;
    const docRef = doc(db, COLLECTIONS.FAVORITES, favDocId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error('[Firestore] Error removing favorite:', error);
    throw error;
  }
}

// ==========================================
// 6. NOTIFICATIONS SERVICE (الإشعارات)
// ==========================================

export async function getNotificationsByUserId(userId) {
  if (!userId || !isFirebaseConfigured || !db) return [];
  try {
    const collRef = collection(db, COLLECTIONS.NOTIFICATIONS);
    const q = query(collRef, where('userId', '==', String(userId)), orderBy('createdAt', 'desc'), limit(30));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('[Firestore] Error getting notifications:', error);
    return [];
  }
}

export async function createNotification({ userId, title, body, type = 'system' }) {
  if (!userId || !isFirebaseConfigured || !db) return null;
  try {
    const docRef = doc(collection(db, COLLECTIONS.NOTIFICATIONS));
    const payload = {
      userId: String(userId),
      title: String(title),
      body: String(body),
      type,
      isRead: false,
      createdAt: serverTimestamp()
    };
    await setDoc(docRef, payload);
    return { id: docRef.id, ...payload };
  } catch (error) {
    console.error('[Firestore] Error creating notification:', error);
    throw error;
  }
}

export async function markNotificationAsRead(notificationId) {
  if (!notificationId || !isFirebaseConfigured || !db) return false;
  try {
    const docRef = doc(db, COLLECTIONS.NOTIFICATIONS, String(notificationId));
    await updateDoc(docRef, { isRead: true });
    return true;
  } catch (error) {
    console.error('[Firestore] Error marking notification read:', error);
    throw error;
  }
}
