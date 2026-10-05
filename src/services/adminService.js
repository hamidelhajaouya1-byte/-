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
  serverTimestamp
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebaseConfig.js';
import { handleCustomerAccountDeleted } from './reviewService.js';

const TOMBSTONES_STORAGE_KEY = 'b4it_m3alm_tombstones';

const safeStorage = {
  getItem: (key) => (typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null),
  setItem: (key, val) => { if (typeof localStorage !== 'undefined') localStorage.setItem(key, val); },
  removeItem: (key) => { if (typeof localStorage !== 'undefined') localStorage.removeItem(key); }
};

/**
 * Reads all tombstone IDs (deleted accounts)
 */
export function getTombstonesList() {
  try {
    return JSON.parse(safeStorage.getItem(TOMBSTONES_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

/**
 * Adds an ID to the permanent Tombstone registry
 */
export async function registerTombstone(id, type = 'provider', metadata = {}) {
  if (!id) return;
  const idStr = String(id);

  // 1. Record in localStorage registry
  try {
    const list = getTombstonesList();
    if (!list.includes(idStr)) {
      list.push(idStr);
      safeStorage.setItem(TOMBSTONES_STORAGE_KEY, JSON.stringify(list));
    }
  } catch (err) {
    console.warn('[Admin] Local tombstone record error:', err);
  }

  // 2. Record in Firestore tombstones & deleted_accounts collection
  if (isFirebaseConfigured && db) {
    try {
      const tombstoneData = {
        id: idStr,
        type,
        deletedAt: serverTimestamp(),
        deletedBy: 'admin',
        ...metadata
      };
      await setDoc(doc(db, 'tombstones', idStr), tombstoneData);
      try {
        await setDoc(doc(db, 'deleted_accounts', idStr), tombstoneData);
      } catch {}
    } catch (err) {
      console.warn('[Admin] Firestore tombstone record error:', err);
    }
  }

}

/**
 * Fetches dashboard statistics
 */
export async function getAdminStats(seedProviders = []) {
  const tombstones = getTombstonesList();
  let allProviders = [];
  let allCustomers = [];

  if (!isFirebaseConfigured || !db) {
    const localAccounts = JSON.parse(localStorage.getItem('b4it_m3alm_registered_users') || '[]');
    allCustomers = localAccounts.filter(u => u.role === 'customer' && !tombstones.includes(u.uid));

    // Combine seed with local overrides
    const localOverrides = JSON.parse(localStorage.getItem('b4it_m3alm_admin_providers') || '[]');
    allProviders = seedProviders
      .filter(p => !tombstones.includes(p.id))
      .map(p => {
        const ovr = localOverrides.find(o => o.id === p.id);
        return ovr ? { ...p, ...ovr } : p;
      });

    // Add any providers registered dynamically
    const dynamicProviders = localAccounts.filter(u => u.role === 'provider' && !tombstones.includes(u.uid));
    dynamicProviders.forEach(dp => {
      if (!allProviders.some(p => p.id === dp.uid)) {
        allProviders.push({
          id: dp.uid,
          name: dp.fullName,
          job: dp.professionName || 'معلم مهني',
          city: dp.cityId || 'الرباط',
          phone: dp.phone,
          whatsapp: dp.whatsapp || dp.phone,
          isActive: dp.isActive !== false
        });
      }
    });
  } else {
    try {
      // 1. Providers from Firestore
      const provSnap = await getDocs(collection(db, 'providers'));
      provSnap.forEach(d => {
        if (!tombstones.includes(d.id)) {
          allProviders.push({ id: d.id, ...d.data() });
        }
      });

      // 2. Customers from Firestore users
      const custQuery = query(collection(db, 'users'), where('role', '==', 'customer'));
      const custSnap = await getDocs(custQuery);
      custSnap.forEach(d => {
        if (!tombstones.includes(d.id)) {
          allCustomers.push({ id: d.id, ...d.data() });
        }
      });
    } catch (err) {
      console.warn('[Admin] Stats fetch fallback:', err);
    }
  }

  const activeProvidersCount = allProviders.filter(p => p.isActive !== false).length;
  const inactiveProvidersCount = allProviders.filter(p => p.isActive === false).length;

  return {
    activeProvidersCount,
    inactiveProvidersCount,
    totalProvidersCount: allProviders.length,
    customersCount: allCustomers.length,
    tombstonesCount: tombstones.length,
    citiesCount: 60,
    professionsCount: 40
  };
}

/**
 * Fetches all providers for admin management (including inactive ones)
 */
export async function getAllProvidersAdmin(seedProviders = []) {
  const tombstones = getTombstonesList();
  let list = [];

  if (!isFirebaseConfigured || !db) {
    const localOverrides = JSON.parse(localStorage.getItem('b4it_m3alm_admin_providers') || '[]');
    const localAccounts = JSON.parse(localStorage.getItem('b4it_m3alm_registered_users') || '[]');

    // Seed providers with overrides
    seedProviders.forEach(p => {
      if (tombstones.includes(p.id)) return;
      const ovr = localOverrides.find(o => o.id === p.id);
      list.push(ovr ? { ...p, ...ovr } : { ...p, isActive: p.isActive !== false });
    });

    // Dynamically registered providers
    const dynamicProviders = localAccounts.filter(u => u.role === 'provider' && !tombstones.includes(u.uid));
    dynamicProviders.forEach(dp => {
      if (!list.some(p => p.id === dp.uid)) {
        list.push({
          id: dp.uid,
          name: dp.fullName,
          fullName: dp.fullName,
          job: dp.professionName || 'معلم مهني',
          professionName: dp.professionName || 'معلم مهني',
          city: dp.cityId || 'الرباط',
          phone: dp.phone,
          whatsapp: dp.whatsapp || dp.phone,
          rating: '5.0',
          reviews: 0,
          isActive: dp.isActive !== false,
          createdAt: dp.createdAt || new Date().toISOString()
        });
      }
    });

    return list;
  }

  try {
    const snap = await getDocs(collection(db, 'providers'));
    snap.forEach(d => {
      if (!tombstones.includes(d.id)) {
        const data = d.data();
        list.push({
          id: d.id,
          name: data.fullName || data.name || 'معلم',
          fullName: data.fullName || data.name || 'معلم',
          job: data.professionName || data.job || 'حرفي',
          professionName: data.professionName || data.job || 'حرفي',
          city: data.city || data.cityId || 'الرباط',
          address: data.address || '',
          phone: data.phone || '',
          whatsapp: data.whatsapp || data.phone || '',
          rating: data.rating ? String(data.rating) : '5.0',
          reviews: data.reviewsCount || 0,
          bio: data.description || data.bio || '',
          isActive: data.isActive !== false,
          createdAt: data.createdAt?.toMillis ? new Date(data.createdAt.toMillis()).toISOString() : data.createdAt
        });
      }
    });

    // If Firestore has no providers yet, fall back to seed
    if (list.length === 0 && seedProviders.length > 0) {
      return seedProviders.filter(p => !tombstones.includes(p.id));
    }

    return list;
  } catch (err) {
    console.error('[Admin] Error getting all providers:', err);
    return seedProviders.filter(p => !tombstones.includes(p.id));
  }
}

/**
 * Updates a provider's data in Firestore and local store
 */
export async function updateProviderAdmin(providerId, updateFields) {
  if (!providerId) throw new Error('معرف المعلم مطلوب');

  const safeData = {
    fullName: String(updateFields.fullName || updateFields.name || '').trim(),
    name: String(updateFields.fullName || updateFields.name || '').trim(),
    professionName: String(updateFields.professionName || updateFields.job || '').trim(),
    job: String(updateFields.professionName || updateFields.job || '').trim(),
    city: String(updateFields.city || updateFields.cityId || '').trim(),
    cityId: String(updateFields.city || updateFields.cityId || '').trim(),
    phone: String(updateFields.phone || '').trim(),
    whatsapp: String(updateFields.whatsapp || updateFields.phone || '').trim(),
    address: String(updateFields.address || '').trim(),
    description: String(updateFields.description || updateFields.bio || '').trim(),
    bio: String(updateFields.description || updateFields.bio || '').trim()
  };

  // Local storage override
  try {
    const localOverrides = JSON.parse(localStorage.getItem('b4it_m3alm_admin_providers') || '[]');
    const idx = localOverrides.findIndex(o => o.id === providerId);
    if (idx >= 0) {
      localOverrides[idx] = { ...localOverrides[idx], ...safeData };
    } else {
      localOverrides.push({ id: providerId, ...safeData });
    }
    localStorage.setItem('b4it_m3alm_admin_providers', JSON.stringify(localOverrides));
  } catch {}

  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'providers', String(providerId));
      await updateDoc(docRef, { ...safeData, updatedAt: serverTimestamp() });

      // Sync users record if linked
      try {
        const userDocRef = doc(db, 'users', String(providerId));
        await updateDoc(userDocRef, {
          fullName: safeData.fullName,
          phone: safeData.phone,
          whatsapp: safeData.whatsapp,
          cityId: safeData.cityId,
          professionName: safeData.professionName,
          updatedAt: serverTimestamp()
        });
      } catch {}
    } catch (err) {
      console.error('[Admin] Error updating provider in Firestore:', err);
    }
  }

  return true;
}

/**
 * Toggles provider account status (isActive: true / false)
 */
export async function toggleProviderStatusAdmin(providerId, newActiveStatus) {
  if (!providerId) return false;
  const status = Boolean(newActiveStatus);

  // Local store
  try {
    const localOverrides = JSON.parse(localStorage.getItem('b4it_m3alm_admin_providers') || '[]');
    const idx = localOverrides.findIndex(o => o.id === providerId);
    if (idx >= 0) {
      localOverrides[idx].isActive = status;
    } else {
      localOverrides.push({ id: providerId, isActive: status });
    }
    localStorage.setItem('b4it_m3alm_admin_providers', JSON.stringify(localOverrides));
  } catch {}

  // Firestore
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'providers', String(providerId));
      await updateDoc(docRef, { isActive: status, updatedAt: serverTimestamp() });
    } catch (err) {
      console.warn('[Admin] Firestore provider status toggle error:', err);
    }
  }

  return true;
}

/**
 * Centralized Deletion Service for Provider:
 * Creates Tombstone, cleans Firestore and local caches.
 */
export async function deleteProviderAdmin(providerId) {
  if (!providerId) return false;
  const idStr = String(providerId);

  // 1. Register permanent Tombstone
  await registerTombstone(idStr, 'provider');

  // 2. Remove from local overrides and registered accounts
  try {
    const localOverrides = JSON.parse(localStorage.getItem('b4it_m3alm_admin_providers') || '[]');
    const filteredOverrides = localOverrides.filter(o => o.id !== idStr);
    localStorage.setItem('b4it_m3alm_admin_providers', JSON.stringify(filteredOverrides));

    const localUsers = JSON.parse(localStorage.getItem('b4it_m3alm_registered_users') || '[]');
    const filteredUsers = localUsers.filter(u => u.uid !== idStr);
    localStorage.setItem('b4it_m3alm_registered_users', JSON.stringify(filteredUsers));
  } catch {}

  // 3. Delete documents from Firestore
  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, 'providers', idStr));
      try {
        await deleteDoc(doc(db, 'users', idStr));
      } catch {}
    } catch (err) {
      console.warn('[Admin] Firestore provider deletion error:', err);
    }
  }

  return true;
}

/**
 * Fetches all registered customer accounts
 */
export async function getAllCustomersAdmin() {
  const tombstones = getTombstonesList();
  let list = [];

  if (!isFirebaseConfigured || !db) {
    const localUsers = JSON.parse(localStorage.getItem('b4it_m3alm_registered_users') || '[]');
    return localUsers
      .filter(u => u.role === 'customer' && !tombstones.includes(u.uid))
      .map(u => ({
        uid: u.uid,
        id: u.uid,
        fullName: u.fullName || 'زبون',
        phone: u.phone || '',
        whatsapp: u.whatsapp || u.phone || '',
        cityId: u.cityId || 'الرباط',
        isActive: u.isActive !== false,
        createdAt: u.createdAt || new Date().toISOString()
      }));
  }

  try {
    const q = query(collection(db, 'users'), where('role', '==', 'customer'));
    const snap = await getDocs(q);
    snap.forEach(d => {
      if (!tombstones.includes(d.id)) {
        const data = d.data();
        list.push({
          uid: d.id,
          id: d.id,
          fullName: data.fullName || 'زبون',
          phone: data.phone || '',
          whatsapp: data.whatsapp || data.phone || '',
          cityId: data.cityId || 'الرباط',
          isActive: data.isActive !== false,
          createdAt: data.createdAt?.toMillis ? new Date(data.createdAt.toMillis()).toISOString() : data.createdAt
        });
      }
    });
    return list;
  } catch (err) {
    console.error('[Admin] Error fetching customers:', err);
    return [];
  }
}

/**
 * Updates a customer account
 */
export async function updateCustomerAdmin(customerUid, updateFields) {
  if (!customerUid) throw new Error('معرف المستخدم مطلوب');
  const safeData = {
    fullName: String(updateFields.fullName || '').trim(),
    phone: String(updateFields.phone || '').trim(),
    whatsapp: String(updateFields.whatsapp || updateFields.phone || '').trim(),
    cityId: String(updateFields.cityId || '').trim()
  };

  // Local store
  try {
    const localUsers = JSON.parse(localStorage.getItem('b4it_m3alm_registered_users') || '[]');
    const idx = localUsers.findIndex(u => u.uid === customerUid);
    if (idx >= 0) {
      localUsers[idx] = { ...localUsers[idx], ...safeData };
      localStorage.setItem('b4it_m3alm_registered_users', JSON.stringify(localUsers));
    }
  } catch {}

  // Firestore
  if (isFirebaseConfigured && db) {
    try {
      const userRef = doc(db, 'users', String(customerUid));
      await updateDoc(userRef, { ...safeData, updatedAt: serverTimestamp() });
    } catch (err) {
      console.error('[Admin] Error updating customer:', err);
    }
  }

  return true;
}

/**
 * Toggles a customer's active status
 */
export async function toggleCustomerStatusAdmin(customerUid, newActiveStatus) {
  if (!customerUid) return false;
  const status = Boolean(newActiveStatus);

  try {
    const localUsers = JSON.parse(localStorage.getItem('b4it_m3alm_registered_users') || '[]');
    const idx = localUsers.findIndex(u => u.uid === customerUid);
    if (idx >= 0) {
      localUsers[idx].isActive = status;
      localStorage.setItem('b4it_m3alm_registered_users', JSON.stringify(localUsers));
    }
  } catch {}

  if (isFirebaseConfigured && db) {
    try {
      const userRef = doc(db, 'users', String(customerUid));
      await updateDoc(userRef, { isActive: status, updatedAt: serverTimestamp() });
    } catch (err) {
      console.warn('[Admin] Firestore customer status toggle error:', err);
    }
  }

  return true;
}

/**
 * Centralized Deletion Service for Customer:
 * Creates Tombstone, deactivates their reviews, cleans caches, deletes from Firestore.
 */
export async function deleteCustomerAdmin(customerUid) {
  if (!customerUid) return false;
  const uidStr = String(customerUid);

  // 1. Register permanent Tombstone
  await registerTombstone(uidStr, 'customer');

  // 2. Mark reviews inactive
  await handleCustomerAccountDeleted(uidStr);

  // 3. Remove from local storage
  try {
    const localUsers = JSON.parse(localStorage.getItem('b4it_m3alm_registered_users') || '[]');
    const filtered = localUsers.filter(u => u.uid !== uidStr);
    localStorage.setItem('b4it_m3alm_registered_users', JSON.stringify(filtered));

    if (localStorage.getItem('b4it_m3alm_session_uid') === uidStr) {
      localStorage.removeItem('b4it_m3alm_session_uid');
    }
  } catch {}

  // 4. Delete Firestore documents
  if (isFirebaseConfigured && db) {
    try {
      await deleteDoc(doc(db, 'users', uidStr));
      try {
        await deleteDoc(doc(db, 'customers', uidStr));
      } catch {}
    } catch (err) {
      console.warn('[Admin] Firestore customer deletion error:', err);
    }
  }

  return true;
}

/**
 * Bulk Deletion Service:
 * Uses the exact same central deletion logic with Tombstone creation for every single item!
 */
export async function bulkDeleteAdmin(type, ids = []) {
  if (!ids || ids.length === 0) return true;

  for (const id of ids) {
    if (type === 'providers') {
      await deleteProviderAdmin(id);
    } else if (type === 'customers') {
      await deleteCustomerAdmin(id);
    }
  }
  return true;
}

/**
 * Fetches all registered accounts (customers, providers, admins) from Firestore & local storage
 */
export async function getAllAccountsAdmin(seedProviders = []) {
  const tombstones = getTombstonesList();
  const accountsMap = new Map();

  // 1. Fetch from live Firestore if configured
  if (isFirebaseConfigured && db) {
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      usersSnap.forEach(d => {
        if (!tombstones.includes(d.id)) {
          const data = d.data();
          accountsMap.set(d.id, {
            uid: d.id,
            id: d.id,
            fullName: data.fullName || data.name || 'مستخدم مسجل',
            phone: data.phone || '',
            whatsapp: data.whatsapp || data.phone || '',
            role: data.role || 'customer',
            cityId: data.cityId || data.city || 'الرباط',
            professionName: data.professionName || data.job || '',
            isActive: data.isActive !== false,
            createdAt: data.createdAt?.toMillis ? new Date(data.createdAt.toMillis()).toISOString() : data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt?.toMillis ? new Date(data.updatedAt.toMillis()).toISOString() : data.updatedAt || null,
            bio: data.bio || data.description || '',
            rating: data.rating ? String(data.rating) : '5.0',
            reviewsCount: data.reviewsCount || 0,
            source: 'firestore_user'
          });
        }
      });

      // Also merge with providers collection
      const provSnap = await getDocs(collection(db, 'providers'));
      provSnap.forEach(d => {
        if (!tombstones.includes(d.id)) {
          const pData = d.data();
          if (accountsMap.has(d.id)) {
            const existing = accountsMap.get(d.id);
            accountsMap.set(d.id, {
              ...existing,
              rating: pData.rating ? String(pData.rating) : existing.rating || '5.0',
              reviewsCount: pData.reviewsCount || existing.reviewsCount || 0,
              professionName: existing.professionName || pData.professionName || pData.job || '',
              bio: existing.bio || pData.description || pData.bio || '',
              address: pData.address || existing.address || ''
            });
          } else {
            accountsMap.set(d.id, {
              uid: d.id,
              id: d.id,
              fullName: pData.fullName || pData.name || 'معلم مهني',
              phone: pData.phone || '',
              whatsapp: pData.whatsapp || pData.phone || '',
              role: 'provider',
              cityId: pData.city || pData.cityId || 'الرباط',
              professionName: pData.professionName || pData.job || 'معلم مهني',
              rating: pData.rating ? String(pData.rating) : '5.0',
              reviewsCount: pData.reviewsCount || 0,
              isActive: pData.isActive !== false,
              createdAt: pData.createdAt?.toMillis ? new Date(pData.createdAt.toMillis()).toISOString() : pData.createdAt || new Date().toISOString(),
              bio: pData.description || pData.bio || '',
              source: 'firestore_provider'
            });
          }
        }
      });
    } catch (err) {
      console.warn('[Admin] Firestore accounts list error:', err);
    }
  }

  // 2. Local storage fallback merge
  try {
    const localUsers = JSON.parse(safeStorage.getItem('b4it_m3alm_registered_users') || '[]');
    localUsers.forEach(u => {
      const idKey = u.uid || u.id;
      if (idKey && !tombstones.includes(idKey) && !accountsMap.has(idKey)) {
        accountsMap.set(idKey, {
          uid: idKey,
          id: idKey,
          fullName: u.fullName || 'مستخدم',
          phone: u.phone || '',
          whatsapp: u.whatsapp || u.phone || '',
          role: u.role || 'customer',
          cityId: u.cityId || 'الرباط',
          professionName: u.professionName || '',
          isActive: u.isActive !== false,
          createdAt: u.createdAt || new Date().toISOString(),
          source: 'local_storage'
        });
      }
    });

    if (seedProviders && seedProviders.length > 0) {
      const localOverrides = JSON.parse(safeStorage.getItem('b4it_m3alm_admin_providers') || '[]');
      seedProviders.forEach(sp => {
        if (!tombstones.includes(sp.id) && !accountsMap.has(sp.id)) {
          const ovr = localOverrides.find(o => o.id === sp.id);
          accountsMap.set(sp.id, {
            uid: sp.id,
            id: sp.id,
            fullName: (ovr && (ovr.fullName || ovr.name)) || sp.name,
            phone: (ovr && ovr.phone) || sp.phone || '',
            whatsapp: (ovr && ovr.whatsapp) || sp.whatsapp || '',
            role: 'provider',
            cityId: (ovr && (ovr.city || ovr.cityId)) || sp.city || 'الرباط',
            professionName: (ovr && (ovr.professionName || ovr.job)) || sp.job || '',
            rating: sp.rating || '5.0',
            reviewsCount: sp.reviews || 0,
            isActive: ovr ? ovr.isActive !== false : (sp.isActive !== false),
            createdAt: sp.createdAt || '2026-01-01T00:00:00.000Z',
            bio: (ovr && (ovr.bio || ovr.description)) || sp.bio || '',
            source: 'seed_catalog'
          });
        }
      });
    }
  } catch {}

  const list = Array.from(accountsMap.values());
  list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return list;
}

/**
 * Permanently deletes any user account and completely cascades deletion of all associated data:
 * - /users/{uid}
 * - /customers/{uid}
 * - /providers/{uid}
 * - /favorites (both as customer and as target provider)
 * - /reviews (both created reviews and reviews received)
 * - /notifications (both as recipient and as actor)
 * - Registers permanent Tombstone in /tombstones/{uid}
 */
export async function deleteAccountCompleteAdmin(uid, role = 'customer') {
  if (!uid) throw new Error('معرف الحساب مطلوب');
  const uidStr = String(uid);

  // 1. Permanent Tombstone registration
  await registerTombstone(uidStr, role || 'user', { deletedBy: 'admin', deletedAtStr: new Date().toISOString() });

  // 2. Cascading deletion in Firestore
  if (isFirebaseConfigured && db) {
    // 2a. Delete users doc
    try {
      await deleteDoc(doc(db, 'users', uidStr));
    } catch (err) {
      console.warn('[Admin] Delete user doc error:', err.message);
    }

    // 2b. Delete customer / provider specific doc
    try {
      await deleteDoc(doc(db, 'customers', uidStr));
    } catch {}
    try {
      await deleteDoc(doc(db, 'providers', uidStr));
    } catch {}

    // 2c. Cascading deletion of Favorites
    try {
      const favCustomerSnap = await getDocs(query(collection(db, 'favorites'), where('customerId', '==', uidStr)));
      favCustomerSnap.forEach(async (d) => {
        try { await deleteDoc(d.ref); } catch {}
      });
      const favProviderSnap = await getDocs(query(collection(db, 'favorites'), where('providerId', '==', uidStr)));
      favProviderSnap.forEach(async (d) => {
        try { await deleteDoc(d.ref); } catch {}
      });
    } catch (err) {
      console.warn('[Admin] Cascading favorites deletion error:', err.message);
    }

    // 2d. Cascading deletion of Reviews
    try {
      const reviewCustomerSnap = await getDocs(query(collection(db, 'reviews'), where('customerUid', '==', uidStr)));
      reviewCustomerSnap.forEach(async (d) => {
        try { await deleteDoc(d.ref); } catch {}
      });
      const reviewProviderSnap = await getDocs(query(collection(db, 'reviews'), where('providerId', '==', uidStr)));
      reviewProviderSnap.forEach(async (d) => {
        try { await deleteDoc(d.ref); } catch {}
      });
    } catch (err) {
      console.warn('[Admin] Cascading reviews deletion error:', err.message);
    }

    // 2e. Cascading deletion of Notifications
    try {
      const notifSnap = await getDocs(query(collection(db, 'notifications'), where('recipientUid', '==', uidStr)));
      notifSnap.forEach(async (d) => {
        try { await deleteDoc(d.ref); } catch {}
      });
      const notifActorSnap = await getDocs(query(collection(db, 'notifications'), where('actorUid', '==', uidStr)));
      notifActorSnap.forEach(async (d) => {
        try { await deleteDoc(d.ref); } catch {}
      });
    } catch (err) {
      console.warn('[Admin] Cascading notifications deletion error:', err.message);
    }
  }

  // 3. Clean local storage caches
  try {
    const localUsers = JSON.parse(safeStorage.getItem('b4it_m3alm_registered_users') || '[]');
    const filteredUsers = localUsers.filter(u => u.uid !== uidStr && u.id !== uidStr);
    safeStorage.setItem('b4it_m3alm_registered_users', JSON.stringify(filteredUsers));

    const localProviders = JSON.parse(safeStorage.getItem('b4it_m3alm_admin_providers') || '[]');
    const filteredProviders = localProviders.filter(p => p.id !== uidStr);
    safeStorage.setItem('b4it_m3alm_admin_providers', JSON.stringify(filteredProviders));

    if (safeStorage.getItem('b4it_m3alm_session_uid') === uidStr) {
      safeStorage.removeItem('b4it_m3alm_session_uid');
    }
  } catch {}

  return true;
}
