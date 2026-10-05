import {
  signOut,
  onAuthStateChanged,
  signInWithCustomToken,
  deleteUser
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './firebaseConfig.js';
import { normalizeMoroccanPhone, isValidMoroccanPhone } from '../utils/phoneUtils.js';
import { createProvider } from './firestoreService.js';

const safeStorage = {
  getItem: (key) => (typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null),
  setItem: (key, val) => { if (typeof localStorage !== 'undefined') localStorage.setItem(key, val); },
  removeItem: (key) => { if (typeof localStorage !== 'undefined') localStorage.removeItem(key); }
};

/**
 * Validates password format:
 * - Minimum 4 characters/digits
 * - Accepts: 4 exactly, 5+, letters only (abcd), numbers only (1234), alphanumeric (ab12)
 * - No special characters required
 */
export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { isValid: false, message: 'كلمة السر مطلوبة.' };
  }
  const clean = password.trim();
  if (clean.length < 4) {
    return { isValid: false, message: 'كلمة السر يجب أن تتكون من 4 أحرف أو أرقام على الأقل.' };
  }
  return { isValid: true, message: '' };
}

/**
 * Fetches user profile document from Firestore (`users` collection)
 */
export async function getUserProfile(uid) {
  if (!uid) return null;

  if (isFirebaseConfigured && db) {
    try {
      const userDocRef = doc(db, 'users', String(uid));
      const snapshot = await getDoc(userDocRef);

      if (snapshot.exists()) {
        const data = snapshot.data();
        return {
          uid: snapshot.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt
        };
      }
    } catch (error) {
      console.warn(`[AuthService] Firestore read notice for ${uid}:`, error.message);
    }
  }

  // Fallback to local session storage
  const localAccounts = JSON.parse(safeStorage.getItem('b4it_m3alm_registered_users') || '[]');
  return localAccounts.find(u => u.uid === uid) || null;
}

/**
 * Creates or updates user profile in `users` collection with strict validation
 */
export async function createUserProfile({
  uid,
  role = 'customer',
  fullName,
  phone,
  cityId = 'الرباط',
  professionId = '',
  professionName = '',
  subCraft = '',
  whatsapp = ''
}) {
  if (!uid) throw new Error('معرف المستخدم uid مطلوب');

  const normalizedPhone = normalizeMoroccanPhone(phone) || phone;
  const nowIso = new Date().toISOString();
  const userPayload = {
    uid: String(uid),
    role: role === 'provider' ? 'provider' : 'customer',
    fullName: String(fullName || '').trim(),
    name: String(fullName || '').trim(),
    phone: String(phone || '').trim(),
    normalizedPhone,
    whatsapp: normalizeMoroccanPhone(whatsapp || normalizedPhone) || phone,
    cityId: String(cityId || 'الرباط'),
    city: String(cityId || 'الرباط'),
    professionId: role === 'provider' ? String(professionId || '') : null,
    professionName: role === 'provider' ? String(professionName || '') : null,
    subCraft: role === 'provider' ? String(subCraft || '') : null,
    isActive: true,
    isVerified: true,
    updatedAt: nowIso
  };

  if (isFirebaseConfigured && db) {
    try {
      const userDocRef = doc(db, 'users', String(uid));
      await setDoc(userDocRef, {
        ...userPayload,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      }, { merge: true });

      if (role === 'provider') {
        await createProvider({
          id: String(uid),
          fullName: userPayload.fullName,
          phone: userPayload.phone,
          whatsapp: userPayload.whatsapp,
          cityId: userPayload.cityId,
          city: userPayload.cityId,
          professionId: userPayload.professionId,
          professionName: userPayload.professionName,
          subCraft: userPayload.subCraft,
          address: userPayload.cityId,
          description: `معلم محترف في ${userPayload.professionName || 'مجاله'}${userPayload.subCraft ? ` - ${userPayload.subCraft}` : ''}`,
          imageUrl: '',
          rating: 5.0,
          reviewsCount: 0,
          isActive: true,
          isVerified: true
        }, String(uid));
      } else {
        const custDocRef = doc(db, 'customers', String(uid));
        await setDoc(custDocRef, {
          id: String(uid),
          fullName: userPayload.fullName,
          phone: userPayload.phone,
          city: userPayload.cityId,
          role: 'customer',
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
    } catch (err) {
      console.warn('[AuthService] Firestore sync notice:', err.message);
    }
  }

  // Cache in local session
  const localAccounts = JSON.parse(safeStorage.getItem('b4it_m3alm_registered_users') || '[]');
  const filtered = localAccounts.filter(u => u.uid !== uid);
  filtered.push({ ...userPayload, createdAt: nowIso });
  safeStorage.setItem('b4it_m3alm_registered_users', JSON.stringify(filtered));

  return userPayload;
}

/**
 * Registers a new Customer or Provider via HTTPS Backend
 * Backend uses bcrypt hashing and Firebase Admin Custom Tokens
 */
export async function registerUserWithPassword({
  fullName,
  phone,
  password,
  role = 'customer',
  cityId = 'الدار البيضاء',
  professionName = '',
  professionId = '',
  subCraft = '',
  whatsapp = ''
}) {
  // 1. Client-side fast check
  const pwdValidation = validatePassword(password);
  if (!pwdValidation.isValid) {
    throw new Error(pwdValidation.message);
  }

  const cleanIdentifier = String(phone || fullName || '').trim();
  if (!cleanIdentifier || cleanIdentifier.length < 3) {
    throw new Error('يرجى إدخال اسم مستخدم أو رقم هاتف صالح.');
  }

  // 2. Call HTTPS Backend API
  let resData;
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: cleanIdentifier,
        password: password.trim(),
        name: fullName,
        phone: cleanIdentifier,
        city: cityId,
        role: role === 'provider' ? 'provider' : 'customer',
        profession: professionName || professionId,
        subCraft,
        whatsapp
      })
    });

    resData = await response.json();

    if (!response.ok) {
      throw new Error(resData.error || 'فشل في إنشاء الحساب.');
    }
  } catch (apiErr) {
    if (apiErr.message.includes('لقد تجاوزت') || apiErr.message.includes('مسجل مسبقاً') || apiErr.message.includes('كلمة السر')) {
      throw apiErr;
    }
    throw new Error(apiErr.message || 'تعذر الاتصال بالخادم. يرجى المحاولة لاحقاً.');
  }

  const { customToken, user } = resData;

  // 3. Sign in to Firebase Auth using Custom Token if available
  if (customToken && isFirebaseConfigured && auth) {
    try {
      await signInWithCustomToken(auth, customToken);
    } catch (authErr) {
      console.warn('[AuthService] signInWithCustomToken note:', authErr.message);
    }
  }

  // 4. Save session and complete local profile
  safeStorage.setItem('b4it_m3alm_session_uid', user.uid);
  safeStorage.setItem('b4it_m3alm_session_role', user.role);

  return {
    uid: user.uid,
    role: user.role,
    fullName: user.name || fullName,
    name: user.name || fullName,
    phone: user.phone || cleanIdentifier,
    city: user.city || cityId,
    professionName: user.profession || professionName,
    subCraft: user.subCraft || subCraft
  };
}

/**
 * Logs in an existing user via HTTPS Backend
 * Backend validates password using bcrypt and issues Firebase Custom Token
 */
export async function loginUserWithPassword({ phone, password }) {
  const pwdValidation = validatePassword(password);
  if (!pwdValidation.isValid) {
    throw new Error(pwdValidation.message);
  }

  const cleanIdentifier = String(phone || '').trim();
  if (!cleanIdentifier) {
    throw new Error('يرجى إدخال اسم المستخدم أو رقم الهاتف.');
  }

  let resData;
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: cleanIdentifier,
        password: password.trim()
      })
    });

    resData = await response.json();

    if (!response.ok) {
      // Return standard generic error message
      throw new Error(resData.error || 'المعرف أو كلمة السر غير صحيحة');
    }
  } catch (apiErr) {
    throw new Error(apiErr.message || 'المعرف أو كلمة السر غير صحيحة');
  }

  const { customToken, user } = resData;

  // Sign in to Firebase Auth via Custom Token
  if (customToken && isFirebaseConfigured && auth) {
    try {
      await signInWithCustomToken(auth, customToken);
    } catch (authErr) {
      console.warn('[AuthService] signInWithCustomToken notice:', authErr.message);
    }
  }

  safeStorage.setItem('b4it_m3alm_session_uid', user.uid);
  safeStorage.setItem('b4it_m3alm_session_role', user.role);

  return {
    uid: user.uid,
    role: user.role,
    fullName: user.name || user.fullName || cleanIdentifier,
    name: user.name || user.fullName || cleanIdentifier,
    phone: user.phone || cleanIdentifier,
    city: user.city || 'الدار البيضاء',
    professionName: user.professionName || user.profession || '',
    subCraft: user.subCraft || ''
  };
}

/**
 * Subscribes to real-time Firebase Auth session state changes.
 */
export function subscribeToAuthChanges(callback) {
  if (!isFirebaseConfigured || !auth) {
    const storedSession = safeStorage.getItem('b4it_m3alm_session_uid');
    if (storedSession) {
      getUserProfile(storedSession).then(profile => {
        callback(profile);
      });
    } else {
      callback(null);
    }
    return () => {};
  }

  const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        const profile = await getUserProfile(firebaseUser.uid);
        if (profile) {
          callback({
            uid: firebaseUser.uid,
            ...profile
          });
        } else {
          callback({
            uid: firebaseUser.uid,
            role: safeStorage.getItem('b4it_m3alm_session_role') || 'customer'
          });
        }
      } catch (err) {
        callback({ uid: firebaseUser.uid });
      }
    } else {
      const storedSession = safeStorage.getItem('b4it_m3alm_session_uid');
      if (storedSession) {
        getUserProfile(storedSession).then(profile => {
          callback(profile);
        });
      } else {
        callback(null);
      }
    }
  });

  return unsubscribe;
}

/**
 * Signs out the currently authenticated user
 */
export async function signOutUser() {
  safeStorage.removeItem('b4it_m3alm_session_uid');
  safeStorage.removeItem('b4it_m3alm_session_role');

  if (isFirebaseConfigured && auth) {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('[AuthService] Sign out error:', err);
    }
  }
  return true;
}

/**
 * Checks whether a phone number exists
 */
export async function checkPhoneExists(rawPhone) {
  const normalizedPhone = normalizeMoroccanPhone(rawPhone) || rawPhone;
  if (!normalizedPhone) return { exists: false };

  if (isFirebaseConfigured && db) {
    try {
      const userDoc = await getDoc(doc(db, 'users', String(normalizedPhone)));
      if (userDoc.exists()) {
        return { exists: true, user: userDoc.data() };
      }
    } catch {}
  }

  const localAccounts = JSON.parse(safeStorage.getItem('b4it_m3alm_registered_users') || '[]');
  const found = localAccounts.find(u => u.phone === normalizedPhone || u.normalizedPhone === normalizedPhone);
  return { exists: Boolean(found), user: found || null };
}

export async function sendOtp() {
  throw new Error('تم استبدال نظام OTP بنظام المعرف وكلمة السر الآمن.');
}

export async function verifyOtp() {
  throw new Error('تم استبدال نظام OTP بنظام المعرف وكلمة السر الآمن.');
}

export function setupRecaptcha() {
  return null;
}

export function formatAuthEmailFromPhone(phone) {
  return '';
}

export function deriveAuthPassword(pwd) {
  return '';
}

