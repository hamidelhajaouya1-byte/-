import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebaseConfig.js';
import { createNotification } from './notificationService.js';

const REVIEWS_COLLECTION = 'reviews';

const safeStorage = {
  getItem: (key) => (typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null),
  setItem: (key, val) => { if (typeof localStorage !== 'undefined') localStorage.setItem(key, val); }
};


/**
 * Formats a Firestore timestamp, Date, or string into a user-friendly Arabic date
 */
export function formatReviewDate(rawDate) {
  if (!rawDate) return 'الآن';

  try {
    let dateObj;
    if (rawDate && typeof rawDate.toDate === 'function') {
      dateObj = rawDate.toDate();
    } else if (rawDate && rawDate.seconds) {
      dateObj = new Date(rawDate.seconds * 1000);
    } else if (rawDate instanceof Date) {
      dateObj = rawDate;
    } else {
      dateObj = new Date(rawDate);
    }

    if (isNaN(dateObj.getTime())) return 'مؤخراً';

    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'منذ لحظات';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays === 1) return 'أمس';
    if (diffDays === 2) return 'منذ يومين';
    if (diffDays <= 10) return `منذ ${diffDays} أيام`;
    if (diffDays <= 30) return `منذ ${Math.floor(diffDays / 7)} أسبوع`;

    return dateObj.toLocaleDateString('ar-MA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return 'مؤخراً';
  }
}

/**
 * Deterministic review ID: `${customerUid}_${providerId}`
 * Guarantees zero duplicate reviews for the same customer-provider pair at the database layer.
 */
export function generateReviewId(customerUid, providerId) {
  return `${customerUid}_${providerId}`.replace(/[\/\s]/g, '_');
}

/**
 * Fetches all active reviews for a specific provider
 */
export async function getProviderReviews(providerId, seedReviews = []) {
  if (!providerId) return [];

  // Fallback / Simulated storage for environments without live Firestore credentials
  if (!isFirebaseConfigured || !db) {
    let localStore = JSON.parse(safeStorage.getItem('b4it_m3alm_reviews_db') || '[]');
    let filtered = localStore
      .filter(r => r.providerId === String(providerId) && r.isActive !== false)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    // If local store has no reviews yet for this seeded provider, seed them once into the database
    if (filtered.length === 0 && seedReviews.length > 0) {
      const seeded = seedReviews.map((sr, idx) => ({
        id: `seed_${providerId}_${idx}`,
        providerId: String(providerId),
        customerUid: `seed_user_${idx}`,
        customerName: sr.user || 'زبون سابق',
        rating: Number(sr.rating) || 5,
        comment: sr.comment || '',
        isActive: true,
        createdAt: new Date(Date.now() - (idx + 1) * 86400000 * 3).toISOString(),
        updatedAt: new Date(Date.now() - (idx + 1) * 86400000 * 3).toISOString()
      }));
      localStore = [...localStore, ...seeded];
      safeStorage.setItem('b4it_m3alm_reviews_db', JSON.stringify(localStore));
      filtered = seeded;
    }

    return filtered.map(r => ({
      ...r,
      formattedDate: r.formattedDate || formatReviewDate(r.createdAt)
    }));
  }

  try {
    const collRef = collection(db, REVIEWS_COLLECTION);
    const q = query(
      collRef,
      where('providerId', '==', String(providerId)),
      where('isActive', '==', true)
    );

    const snapshot = await getDocs(q);
    const reviews = [];

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      // Skip invalid or corrupted records safely
      if (!data || typeof data.rating !== 'number' || !data.comment) return;

      reviews.push({
        id: docSnap.id,
        ...data,
        formattedDate: formatReviewDate(data.createdAt || data.updatedAt)
      });
    });

    // If Firestore has no reviews for this provider yet and seedReviews are provided, migrate seed to Firestore
    if (reviews.length === 0 && seedReviews.length > 0) {
      for (let idx = 0; idx < seedReviews.length; idx++) {
        const sr = seedReviews[idx];
        const seedId = `seed_${providerId}_${idx}`;
        const seedPayload = {
          id: seedId,
          providerId: String(providerId),
          customerUid: `seed_user_${idx}`,
          customerName: sr.user || 'زبون سابق',
          rating: Number(sr.rating) || 5,
          comment: sr.comment || '',
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        try {
          await setDoc(doc(db, REVIEWS_COLLECTION, seedId), seedPayload);
          reviews.push({ ...seedPayload, formattedDate: sr.date || 'مؤخراً' });
        } catch {
          // ignore seeding write error
        }
      }
    }

    // Sort descending by createdAt
    reviews.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (new Date(a.createdAt || 0).getTime());
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (new Date(b.createdAt || 0).getTime());
      return timeB - timeA;
    });

    return reviews;
  } catch (error) {
    console.error(`[ReviewService] Error getting reviews for provider ${providerId}:`, error);
    return [];
  }
}

/**
 * Retrieves an existing review by customerUid and providerId, if any exists
 */
export async function getUserReview(providerId, customerUid) {
  if (!providerId || !customerUid) return null;

  const reviewId = generateReviewId(customerUid, providerId);

  if (!isFirebaseConfigured || !db) {
    const localStore = JSON.parse(safeStorage.getItem('b4it_m3alm_reviews_db') || '[]');
    const found = localStore.find(r => r.id === reviewId && r.isActive !== false);
    return found ? { ...found, formattedDate: formatReviewDate(found.createdAt) } : null;
  }

  try {
    const docRef = doc(db, REVIEWS_COLLECTION, reviewId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists() && docSnap.data().isActive !== false) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        formattedDate: formatReviewDate(data.createdAt || data.updatedAt)
      };
    }
    return null;
  } catch (error) {
    console.error('[ReviewService] Error getting user review:', error);
    return null;
  }
}

/**
 * Creates a new review or updates an existing review (Atomic upsert by composite ID)
 * Prevents duplicates, sanitizes input, and recalculates the provider's overall rating.
 */
export async function saveOrUpdateReview({ providerId, customerUid, customerName, rating, comment }) {
  if (!providerId) throw new Error('معرف المعلم مطلوب');
  if (!customerUid) throw new Error('يجب تسجيل الدخول كزبون لإضافة تقييم');

  const cleanRating = Math.max(1, Math.min(5, Math.round(Number(rating) || 5)));
  const cleanComment = String(comment || '').trim();

  if (!cleanComment) {
    throw new Error('يرجى كتابة تعليق يوضح تجربتك مع المعلم');
  }

  const reviewId = generateReviewId(customerUid, providerId);
  const cleanName = String(customerName || 'زبون معتمد').trim();

  // 1. Fallback local persistence
  if (!isFirebaseConfigured || !db) {
    const localStore = JSON.parse(safeStorage.getItem('b4it_m3alm_reviews_db') || '[]');
    const existingIndex = localStore.findIndex(r => r.id === reviewId);

    const nowIso = new Date().toISOString();
    let updatedRecord;

    if (existingIndex >= 0) {
      // Update existing review
      updatedRecord = {
        ...localStore[existingIndex],
        rating: cleanRating,
        comment: cleanComment,
        customerName: cleanName,
        isActive: true,
        updatedAt: nowIso
      };
      localStore[existingIndex] = updatedRecord;
    } else {
      // Create new review
      updatedRecord = {
        id: reviewId,
        providerId: String(providerId),
        customerUid: String(customerUid),
        customerName: cleanName,
        rating: cleanRating,
        comment: cleanComment,
        isActive: true,
        createdAt: nowIso,
        updatedAt: nowIso
      };
      localStore.push(updatedRecord);
    }

    safeStorage.setItem('b4it_m3alm_reviews_db', JSON.stringify(localStore));
    const stats = await recalculateProviderRating(providerId);

    // Send notification to provider on new review
    if (existingIndex < 0) {
      await createNotification({
        recipientUid: String(providerId),
        actorUid: String(customerUid),
        actorName: cleanName,
        type: 'review',
        providerId: String(providerId),
        reviewId,
        message: `أضاف ${cleanName} تقييماً جديداً (${cleanRating} نجوم ⭐): "${cleanComment}"`
      });
    }

    return {
      review: { ...updatedRecord, formattedDate: formatReviewDate(updatedRecord.createdAt) },
      stats,
      isEdit: existingIndex >= 0
    };
  }

  // 2. Real Firestore persistence
  try {
    const docRef = doc(db, REVIEWS_COLLECTION, reviewId);
    const existingSnap = await getDoc(docRef);
    const isEdit = existingSnap.exists() && existingSnap.data().isActive !== false;

    const payload = {
      id: reviewId,
      providerId: String(providerId),
      customerUid: String(customerUid),
      customerName: cleanName,
      rating: cleanRating,
      comment: cleanComment,
      isActive: true,
      updatedAt: serverTimestamp()
    };

    if (!isEdit) {
      payload.createdAt = serverTimestamp();
    }

    await setDoc(docRef, payload, { merge: true });

    // Recalculate provider aggregate rating and reviews count
    const stats = await recalculateProviderRating(providerId);

    // Send notification to provider on new review
    if (!isEdit) {
      await createNotification({
        recipientUid: String(providerId),
        actorUid: String(customerUid),
        actorName: cleanName,
        type: 'review',
        providerId: String(providerId),
        reviewId,
        message: `أضاف ${cleanName} تقييماً جديداً (${cleanRating} نجوم ⭐): "${cleanComment}"`
      });
    }

    return {
      review: { ...payload, formattedDate: 'الآن' },
      stats,
      isEdit
    };
  } catch (error) {
    console.error('[ReviewService] Error saving review:', error);
    throw error;
  }
}

/**
 * Soft deletes a review (sets isActive: false) and recalculates the rating
 */
export async function deleteReview(providerId, customerUid) {
  if (!providerId || !customerUid) return false;
  const reviewId = generateReviewId(customerUid, providerId);

  if (!isFirebaseConfigured || !db) {
    const localStore = JSON.parse(safeStorage.getItem('b4it_m3alm_reviews_db') || '[]');
    const updated = localStore.map(r => r.id === reviewId ? { ...r, isActive: false } : r);
    safeStorage.setItem('b4it_m3alm_reviews_db', JSON.stringify(updated));
    await recalculateProviderRating(providerId);
    return true;
  }

  try {
    const docRef = doc(db, REVIEWS_COLLECTION, reviewId);
    await updateDoc(docRef, {
      isActive: false,
      updatedAt: serverTimestamp()
    });
    await recalculateProviderRating(providerId);
    return true;
  } catch (error) {
    console.error('[ReviewService] Error deleting review:', error);
    return false;
  }
}

/**
 * Recalculates the average rating and review count from all active reviews
 * and updates the provider record in Firestore
 */
export async function recalculateProviderRating(providerId) {
  if (!providerId) return { rating: '5.0', reviewsCount: 0 };

  let activeReviews = [];

  if (!isFirebaseConfigured || !db) {
    const localStore = JSON.parse(safeStorage.getItem('b4it_m3alm_reviews_db') || '[]');
    activeReviews = localStore.filter(r => r.providerId === String(providerId) && r.isActive !== false);
  } else {
    try {
      const collRef = collection(db, REVIEWS_COLLECTION);
      const q = query(
        collRef,
        where('providerId', '==', String(providerId)),
        where('isActive', '==', true)
      );
      const snapshot = await getDocs(q);
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        if (d && typeof d.rating === 'number') {
          activeReviews.push(d);
        }
      });
    } catch (err) {
      console.error('[ReviewService] Error calculating rating:', err);
    }
  }

  const reviewsCount = activeReviews.length;
  let avgRating = '5.0';

  if (reviewsCount > 0) {
    const totalScore = activeReviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0);
    avgRating = (totalScore / reviewsCount).toFixed(1);
  }

  // Persist updated stats in providers collection if configured
  if (isFirebaseConfigured && db) {
    try {
      const providerDocRef = doc(db, 'providers', String(providerId));
      await setDoc(providerDocRef, {
        rating: parseFloat(avgRating),
        reviewsCount: reviewsCount,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch {
      // Non-blocking if provider is statically seeded or not yet written
    }
  }

  return {
    rating: avgRating,
    reviewsCount
  };
}

/**
 * Handles Account Deletion (Part 4 Tombstones integration):
 * When a customer account is deleted, mark their reviews as isActive: false so they don't leak or revive.
 */
export async function handleCustomerAccountDeleted(customerUid) {
  if (!customerUid) return;

  if (!isFirebaseConfigured || !db) {
    const localStore = JSON.parse(localStorage.getItem('b4it_m3alm_reviews_db') || '[]');
    const updated = localStore.map(r => r.customerUid === String(customerUid) ? { ...r, isActive: false } : r);
    localStorage.setItem('b4it_m3alm_reviews_db', JSON.stringify(updated));
    return;
  }

  try {
    const collRef = collection(db, REVIEWS_COLLECTION);
    const q = query(collRef, where('customerUid', '==', String(customerUid)));
    const snapshot = await getDocs(q);

    const affectedProviderIds = new Set();
    const updatePromises = [];

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.providerId) affectedProviderIds.add(data.providerId);
      updatePromises.push(updateDoc(docSnap.ref, {
        isActive: false,
        updatedAt: serverTimestamp()
      }));
    });

    await Promise.all(updatePromises);

    // Recalculate stats for all affected providers
    for (const pId of affectedProviderIds) {
      await recalculateProviderRating(pId);
    }
  } catch (error) {
    console.error('[ReviewService] Error marking customer reviews inactive:', error);
  }
}
