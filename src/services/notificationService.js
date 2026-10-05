import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebaseConfig.js';
import { formatReviewDate } from './reviewService.js';

const NOTIFICATIONS_COLLECTION = 'notifications';
const LIKES_COLLECTION = 'likes';
const LOCAL_NOTIFS_KEY = 'b4it_m3alm_notifications_db';
const LOCAL_LIKES_KEY = 'b4it_m3alm_likes_db';

const safeStorage = {
  getItem: (key) => (typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null),
  setItem: (key, val) => { if (typeof localStorage !== 'undefined') localStorage.setItem(key, val); }
};

/**
 * Creates an interaction notification (review, rating, or like)
 * Guarantees self-notification prevention: if actorUid === recipientUid, no notification is sent.
 */
export async function createNotification({
  recipientUid,
  actorUid,
  actorName,
  type, // 'review' | 'rating' | 'like'
  providerId,
  reviewId = null,
  message
}) {
  if (!recipientUid || !actorUid) return null;

  // Strict prevention of self-notification
  if (String(actorUid) === String(recipientUid)) {
    return null;
  }

  const cleanName = String(actorName || 'زبون').trim();
  const notifData = {
    recipientUid: String(recipientUid),
    actorUid: String(actorUid),
    actorName: cleanName,
    type: String(type || 'review'),
    providerId: String(providerId || ''),
    reviewId: reviewId ? String(reviewId) : null,
    message: String(message || '').trim(),
    isRead: false,
    createdAt: new Date().toISOString()
  };

  // Local fallback storage
  try {
    const localStore = JSON.parse(safeStorage.getItem(LOCAL_NOTIFS_KEY) || '[]');
    const newId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    localStore.unshift({ id: newId, ...notifData });
    safeStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(localStore));

    // Dispatch event for local listener if any
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('b4it_local_notifications_updated'));
    }
  } catch (err) {
    console.warn('[NotificationService] Local store error:', err);
  }

  // Firestore storage
  if (isFirebaseConfigured && db) {
    try {
      const collRef = collection(db, NOTIFICATIONS_COLLECTION);
      const docRef = doc(collRef);
      await setDoc(docRef, {
        ...notifData,
        createdAt: serverTimestamp()
      });
      return { id: docRef.id, ...notifData };
    } catch (err) {
      console.error('[NotificationService] Firestore createNotification error:', err);
    }
  }

  return notifData;
}

/**
 * Subscribes to real-time notifications for the current authenticated user
 */
export function subscribeToUserNotifications(recipientUid, onUpdate) {
  if (!recipientUid) {
    if (typeof onUpdate === 'function') onUpdate([]);
    return () => {};
  }

  // Firestore onSnapshot real-time listener
  if (isFirebaseConfigured && db) {
    try {
      const collRef = collection(db, NOTIFICATIONS_COLLECTION);
      const q = query(
        collRef,
        where('recipientUid', '==', String(recipientUid)),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const notifs = [];
          snapshot.forEach((d) => {
            const data = d.data();
            notifs.push({
              id: d.id,
              ...data,
              formattedDate: formatReviewDate(data.createdAt)
            });
          });
          onUpdate(notifs);
        },
        (error) => {
          console.warn('[NotificationService] onSnapshot error, falling back to local store:', error);
          const localStore = JSON.parse(localStorage.getItem(LOCAL_NOTIFS_KEY) || '[]');
          const filtered = localStore
            .filter((n) => n.recipientUid === String(recipientUid))
            .map((n) => ({ ...n, formattedDate: formatReviewDate(n.createdAt) }));
          onUpdate(filtered);
        }
      );

      return unsubscribe;
    } catch (err) {
      console.error('[NotificationService] Listener setup error:', err);
    }
  }

  // Fallback local listener
  const readLocal = () => {
    const localStore = JSON.parse(localStorage.getItem(LOCAL_NOTIFS_KEY) || '[]');
    const filtered = localStore
      .filter((n) => n.recipientUid === String(recipientUid))
      .map((n) => ({ ...n, formattedDate: formatReviewDate(n.createdAt) }));
    onUpdate(filtered);
  };

  readLocal();
  const listener = () => readLocal();
  window.addEventListener('b4it_local_notifications_updated', listener);

  return () => {
    window.removeEventListener('b4it_local_notifications_updated', listener);
  };
}

/**
 * Marks a single notification as read
 */
export async function markNotificationAsRead(notificationId) {
  if (!notificationId) return;

  // Local store
  try {
    const localStore = JSON.parse(localStorage.getItem(LOCAL_NOTIFS_KEY) || '[]');
    const updated = localStore.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n));
    localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('b4it_local_notifications_updated'));
  } catch {}

  // Firestore
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, NOTIFICATIONS_COLLECTION, String(notificationId));
      await updateDoc(docRef, { isRead: true });
    } catch (err) {
      console.warn('[NotificationService] markNotificationAsRead error:', err);
    }
  }
}

/**
 * Marks all notifications as read for a specific recipient
 */
export async function markAllNotificationsAsRead(recipientUid) {
  if (!recipientUid) return;

  // Local store
  try {
    const localStore = JSON.parse(localStorage.getItem(LOCAL_NOTIFS_KEY) || '[]');
    const updated = localStore.map((n) =>
      n.recipientUid === String(recipientUid) ? { ...n, isRead: true } : n
    );
    localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('b4it_local_notifications_updated'));
  } catch {}

  // Firestore
  if (isFirebaseConfigured && db) {
    try {
      const collRef = collection(db, NOTIFICATIONS_COLLECTION);
      const q = query(
        collRef,
        where('recipientUid', '==', String(recipientUid)),
        where('isRead', '==', false)
      );
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.forEach((docSnap) => {
        batch.update(docSnap.ref, { isRead: true });
      });
      await batch.commit();
    } catch (err) {
      console.warn('[NotificationService] markAllNotificationsAsRead error:', err);
    }
  }
}

/**
 * Deletes a notification
 */
export async function deleteNotification(notificationId) {
  if (!notificationId) return;

  try {
    const localStore = JSON.parse(localStorage.getItem(LOCAL_NOTIFS_KEY) || '[]');
    const updated = localStore.filter((n) => n.id !== notificationId);
    localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('b4it_local_notifications_updated'));
  } catch {}

  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, NOTIFICATIONS_COLLECTION, String(notificationId)));
    } catch (err) {
      console.warn('[NotificationService] deleteNotification error:', err);
    }
  }
}

/**
 * Likes management:
 * Creates a unique like and triggers a notification if not self-liking.
 */
export async function toggleLikeProvider({ providerId, user, providerName }) {
  if (!providerId || !user) return { liked: false, count: 0 };

  const likeDocId = `${user.uid}_${providerId}`;

  // 1. Check local state
  let localLikes = JSON.parse(localStorage.getItem(LOCAL_LIKES_KEY) || '[]');
  const alreadyLiked = localLikes.some((l) => l.id === likeDocId);

  let isLikedNow = !alreadyLiked;

  if (alreadyLiked) {
    localLikes = localLikes.filter((l) => l.id !== likeDocId);
  } else {
    localLikes.push({
      id: likeDocId,
      userId: user.uid,
      userName: user.fullName || user.name || 'زبون معتمد',
      providerId: String(providerId),
      createdAt: new Date().toISOString()
    });
  }
  localStorage.setItem(LOCAL_LIKES_KEY, JSON.stringify(localLikes));

  // 2. Firestore sync
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, LIKES_COLLECTION, likeDocId);
      if (isLikedNow) {
        await setDoc(docRef, {
          id: likeDocId,
          userId: user.uid,
          userName: user.fullName || user.name || 'زبون معتمد',
          providerId: String(providerId),
          createdAt: serverTimestamp()
        });

        // Trigger notification to the provider owner
        await createNotification({
          recipientUid: String(providerId),
          actorUid: user.uid,
          actorName: user.fullName || user.name || 'زبون معتمد',
          type: 'like',
          providerId: String(providerId),
          message: `أبدى ${user.fullName || user.name || 'زبون'} إعجابه بملفك المهني 👍`
        });
      } else {
        await deleteDoc(docRef);
      }
    } catch (err) {
      console.warn('[NotificationService] Firestore like toggle error:', err);
    }
  } else if (isLikedNow) {
    // Local notification trigger
    await createNotification({
      recipientUid: String(providerId),
      actorUid: user.uid,
      actorName: user.fullName || user.name || 'زبون معتمد',
      type: 'like',
      providerId: String(providerId),
      message: `أبدى ${user.fullName || user.name || 'زبون'} إعجابه بملفك المهني 👍`
    });
  }

  const currentCount = localLikes.filter((l) => l.providerId === String(providerId)).length;
  return { liked: isLikedNow, count: currentCount };
}

/**
 * Checks whether user has liked a provider and gets total like count
 */
export function getProviderLikeStatus(providerId, userUid) {
  if (!providerId) return { liked: false, count: 0 };

  const localLikes = JSON.parse(localStorage.getItem(LOCAL_LIKES_KEY) || '[]');
  const proLikes = localLikes.filter((l) => l.providerId === String(providerId));
  const hasLiked = userUid ? proLikes.some((l) => l.userId === String(userUid)) : false;

  return {
    liked: hasLiked,
    count: proLikes.length
  };
}
