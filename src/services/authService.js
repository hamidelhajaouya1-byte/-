import {
  signInWithPhoneNumber,
  RecaptchaVerifier,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './firebaseConfig';
import { normalizeMoroccanPhone, isValidMoroccanPhone } from '../utils/phoneUtils';
import { COLLECTIONS, createProvider } from './firestoreService';

/**
 * Checks whether a normalized phone number already exists in the `users` collection.
 * Prevents duplicate accounts with the same phone number.
 */
export async function checkPhoneExists(rawPhone) {
  const normalizedPhone = normalizeMoroccanPhone(rawPhone);
  if (!normalizedPhone) return { exists: false };

  if (!isFirebaseConfigured || !db) {
    // Fallback simulation check using local storage cache for testing
    const localAccounts = JSON.parse(localStorage.getItem('b4it_m3alm_registered_users') || '[]');
    const found = localAccounts.find(u => u.normalizedPhone === normalizedPhone);
    return {
      exists: Boolean(found),
      user: found || null
    };
  }

  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('normalizedPhone', '==', normalizedPhone));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      return {
        exists: true,
        user: { uid: userDoc.id, ...userDoc.data() }
      };
    }
    return { exists: false, user: null };
  } catch (error) {
    console.error('[AuthService] Error checking phone existence:', error);
    // If permission or network issue, fail safely
    return { exists: false, error: error.message };
  }
}

/**
 * Initializes a Firebase reCAPTCHA verifier for Phone Auth
 */
export function setupRecaptcha(containerId = 'recaptcha-container') {
  if (!isFirebaseConfigured || !auth) {
    return null;
  }

  try {
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }

    const verifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved
      },
      'expired-callback': () => {
        console.warn('[AuthService] reCAPTCHA expired. Resetting.');
      }
    });

    verifier.render();
    window.recaptchaVerifier = verifier;
    return verifier;
  } catch (error) {
    console.error('[AuthService] Error setting up reCAPTCHA:', error);
    return null;
  }
}

/**
 * Sends OTP to a normalized Moroccan phone number
 */
export async function sendOtp(rawPhone, recaptchaVerifier = null) {
  const normalizedPhone = normalizeMoroccanPhone(rawPhone);

  if (!isValidMoroccanPhone(normalizedPhone)) {
    throw new Error('يرجى إدخال رقم هاتف مغربي صحيح (مثال: 0612345678 أو 0712345678)');
  }

  if (!isFirebaseConfigured || !auth) {
    // Simulated OTP for environment without live SMS keys
    console.info(`[AuthService] Simulated OTP generated for ${normalizedPhone}. Code: 123456`);
    return {
      isSimulated: true,
      normalizedPhone,
      confirm: async (code) => {
        if (code === '123456' || code.length === 6) {
          // Generate or retrieve persistent pseudo UID for this phone
          const pseudoUid = 'usr_' + btoa(normalizedPhone).replace(/=/g, '').slice(0, 16);
          return {
            user: {
              uid: pseudoUid,
              phoneNumber: normalizedPhone
            }
          };
        }
        throw new Error('رمز التحقق (OTP) غير صحيح');
      }
    };
  }

  try {
    const verifier = recaptchaVerifier || window.recaptchaVerifier || setupRecaptcha();
    const confirmationResult = await signInWithPhoneNumber(auth, normalizedPhone, verifier);
    return confirmationResult;
  } catch (error) {
    console.error('[AuthService] Error sending OTP:', error);
    let errorMsg = 'تعذر إرسال رمز التحقق (OTP). يرجى المحاولة لاحقاً.';
    if (error.code === 'auth/invalid-phone-number') {
      errorMsg = 'صيغة رقم الهاتف غير صالحة لدى مزود الخدمة.';
    } else if (error.code === 'auth/too-many-requests') {
      errorMsg = 'تم تجاوز الحد الأقصى للمحاولات. يرجى الانتظار بضع دقائق.';
    } else if (error.code === 'auth/quota-exceeded') {
      errorMsg = 'تم تجاوز حصة الرسائل القصيرة SMS المتاحة.';
    }
    throw new Error(errorMsg);
  }
}

/**
 * Verifies the OTP code submitted by the user
 */
export async function verifyOtp(confirmationResult, otpCode) {
  if (!confirmationResult || !confirmationResult.confirm) {
    throw new Error('جلسة التحقق غير صالحة. يرجى إعادة إرسال الرمز.');
  }

  const cleanCode = String(otpCode || '').trim();
  if (cleanCode.length !== 6) {
    throw new Error('رمز التحقق يتكون من 6 أرقام');
  }

  try {
    const userCredential = await confirmationResult.confirm(cleanCode);
    return userCredential.user;
  } catch (error) {
    console.error('[AuthService] Error verifying OTP:', error);
    throw new Error('رمز التحقق غير صحيح أو انتهت صلاحيته.');
  }
}

/**
 * Fetches user profile document from Firestore (`users` collection)
 */
export async function getUserProfile(uid) {
  if (!uid) return null;

  if (!isFirebaseConfigured || !db) {
    // Read from simulated storage
    const localAccounts = JSON.parse(localStorage.getItem('b4it_m3alm_registered_users') || '[]');
    return localAccounts.find(u => u.uid === uid) || null;
  }

  try {
    const userDocRef = doc(db, 'users', String(uid));
    const snapshot = await getDoc(userDocRef);

    if (snapshot.exists()) {
      return {
        uid: snapshot.id,
        ...snapshot.data()
      };
    }
    return null;
  } catch (error) {
    console.error(`[AuthService] Error fetching user profile ${uid}:`, error);
    return null;
  }
}

/**
 * Creates or updates user profile in `users` collection with strict validation
 * Automatically creates linked record in `providers` if role === 'provider'
 */
export async function createUserProfile({
  uid,
  role = 'customer',
  fullName,
  phone,
  cityId = 'الرباط',
  professionId = '',
  professionName = '',
  whatsapp = ''
}) {
  if (!uid) throw new Error('معرف المستخدم uid مطلوب');

  const normalizedPhone = normalizeMoroccanPhone(phone);
  if (!isValidMoroccanPhone(normalizedPhone)) {
    throw new Error('رقم الهاتف غير صالح.');
  }

  // Security check: Role must be strictly 'customer' or 'provider'
  if (role !== 'customer' && role !== 'provider') {
    throw new Error('نوع الحساب غير صالح. يجب أن يكون زبون أو معلم.');
  }

  // Check phone duplication
  const existing = await checkPhoneExists(normalizedPhone);
  if (existing.exists && existing.user && existing.user.uid !== uid) {
    throw new Error('رقم الهاتف هذا مرتبط بحساب آخر بالفعل.');
  }

  const userPayload = {
    uid: String(uid),
    role,
    fullName: String(fullName || '').trim(),
    phone: String(phone || '').trim(),
    normalizedPhone,
    whatsapp: normalizeMoroccanPhone(whatsapp || normalizedPhone),
    cityId: String(cityId || 'الرباط'),
    professionId: role === 'provider' ? String(professionId || '') : null,
    professionName: role === 'provider' ? String(professionName || '') : null,
    isActive: true,
    isVerified: false,
    updatedAt: serverTimestamp()
  };

  if (!isFirebaseConfigured || !db) {
    // Save to local test store
    const localAccounts = JSON.parse(localStorage.getItem('b4it_m3alm_registered_users') || '[]');
    const filtered = localAccounts.filter(u => u.uid !== uid);
    const completeLocal = {
      ...userPayload,
      createdAt: new Date().toISOString()
    };
    filtered.push(completeLocal);
    localStorage.setItem('b4it_m3alm_registered_users', JSON.stringify(filtered));
    return completeLocal;
  }

  try {
    const userDocRef = doc(db, 'users', String(uid));
    const existingSnap = await getDoc(userDocRef);

    if (!existingSnap.exists()) {
      userPayload.createdAt = serverTimestamp();
    }

    await setDoc(userDocRef, userPayload, { merge: true });

    // If role is provider, synchronize with `providers` collection
    if (role === 'provider') {
      try {
        await createProvider({
          id: String(uid),
          fullName: userPayload.fullName,
          phone: userPayload.phone,
          whatsapp: userPayload.whatsapp,
          cityId: userPayload.cityId,
          professionId: userPayload.professionId,
          professionName: userPayload.professionName,
          address: userPayload.cityId,
          description: `معلم محترف في ${userPayload.professionName || 'مجاله'}`,
          imageUrl: '',
          rating: 5.0,
          reviewsCount: 0,
          isActive: true,
          isVerified: false
        }, String(uid));
      } catch (err) {
        console.warn('[AuthService] Non-blocking provider sync note:', err.message);
      }
    }

    return { uid, ...userPayload };
  } catch (error) {
    console.error('[AuthService] Error writing user document:', error);
    throw error;
  }
}

/**
 * Subscribes to real-time Firebase Auth session state changes.
 * Loads the associated Firestore user document automatically upon sign-in.
 */
export function subscribeToAuthChanges(callback) {
  if (!isFirebaseConfigured || !auth) {
    // If not configured, check if active test session exists
    const storedSession = localStorage.getItem('b4it_m3alm_session_uid');
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
            phoneNumber: firebaseUser.phoneNumber,
            ...profile
          });
        } else {
          // Authenticated in Auth but profile not yet completed
          callback({
            uid: firebaseUser.uid,
            phoneNumber: firebaseUser.phoneNumber,
            isNewUser: true
          });
        }
      } catch (err) {
        console.error('[AuthService] Error resolving user profile:', err);
        callback({ uid: firebaseUser.uid, phoneNumber: firebaseUser.phoneNumber });
      }
    } else {
      callback(null);
    }
  });

  return unsubscribe;
}

/**
 * Signs out the currently authenticated user
 */
export async function signOutUser() {
  localStorage.removeItem('b4it_m3alm_session_uid');

  if (isFirebaseConfigured && auth) {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('[AuthService] Sign out error:', err);
    }
  }
  return true;
}
