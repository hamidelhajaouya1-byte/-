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
import { db, isFirebaseConfigured } from './firebaseConfig';
import { handleCustomerAccountDeleted } from './reviewService';

const TOMBSTONES_STORAGE_KEY = 'b4it_m3alm_tombstones';

/**
 * Reads all tombstone IDs (deleted accounts)
 */
export function getTombstonesList() {
  try {
    return JSON.parse(localStorage.getItem(TOMBSTONES_STORAGE_KEY) || '[]');
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
      localStorage.setItem(TOMBSTONES_STORAGE_KEY, JSON.stringify(list));
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
