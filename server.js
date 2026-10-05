import express from 'express';
import bcrypt from 'bcryptjs';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Initialize Firebase Admin SDK securely without hardcoded credentials
const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'gen-lang-client-0925461253';
const databaseId = process.env.VITE_FIREBASE_DATABASE_ID || 'ai-studio-dd85ac2a-402b-43c5-b346-a38356c82103';

let adminApp = null;
let adminAuth = null;
let adminDb = null;

try {
  adminApp = getApps().length > 0 ? getApps()[0] : initializeApp({ projectId });
  adminAuth = getAuth(adminApp);
  adminDb = databaseId && databaseId !== '(default)' ? getFirestore(adminApp, databaseId) : getFirestore(adminApp);
  console.info(`[Backend] Firebase Admin initialized for project: ${projectId}`);
} catch (err) {
  console.warn('[Backend] Firebase Admin init notice:', err.message);
}


// In-Memory Rate Limiting Tracker to prevent Brute-Force & Enumeration
const rateLimitMap = new Map();

function checkRateLimit(key, maxAttempts = 10, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const record = rateLimitMap.get(key) || { count: 0, resetTime: now + windowMs };

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
    rateLimitMap.set(key, record);
    return { allowed: true };
  }

  record.count += 1;
  rateLimitMap.set(key, record);

  if (record.count > maxAttempts) {
    return { allowed: false, remainingMs: record.resetTime - now };
  }

  return { allowed: true };
}

// In-memory fallback credential store when Firestore Admin is offline
const localCredentialsStore = new Map();

// Generate deterministic safe UID from identifier
function generateUid(identifier, role) {
  const cleanId = String(identifier).replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const prefix = role === 'provider' ? 'pro' : 'usr';
  return `${prefix}_${cleanId}`;
}

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  const clientIp = req.ip || req.headers['x-forwarded-for'] || 'client';
  const rateCheck = checkRateLimit(`reg_${clientIp}`, 10, 15 * 60 * 1000);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: 'لقد تجاوزت عدد محاولات التسجيل المسموح بها. يرجى المحاولة بعد قليل.'
    });
  }

  const { identifier, password, name, city, role, profession, subCraft, phone } = req.body;

  // Validate Identifier
  if (!identifier || typeof identifier !== 'string' || identifier.trim().length < 3) {
    return res.status(400).json({ error: 'يرجى إدخال اسم مستخدم أو رقم هاتف صالح (3 أحرف أو أرقام على الأقل).' });
  }

  // Strict Password validation: Minimum 4 characters/digits (accepts pure digits, pure letters, or mixed)
  if (!password || typeof password !== 'string' || password.length < 4) {
    return res.status(400).json({ error: 'كلمة السر يجب أن تتكون من 4 أحرف أو أرقام على الأقل.' });
  }

  // Strict Role validation
  const validRole = role === 'provider' ? 'provider' : 'customer';
  const cleanIdentifier = identifier.trim().toLowerCase();
  const uid = generateUid(cleanIdentifier, validRole);

  try {
    // Check if user already exists
    let existingUser = null;
    if (adminDb) {
      try {
        const credDoc = await adminDb.collection('_auth_credentials').doc(cleanIdentifier).get();
        if (credDoc.exists) {
          existingUser = credDoc.data();
        }
      } catch (e) {
        // Fallback to local memory store
        existingUser = localCredentialsStore.get(cleanIdentifier);
      }
    } else {
      existingUser = localCredentialsStore.get(cleanIdentifier);
    }

    if (existingUser) {
      return res.status(400).json({ error: 'هذا المعرف أو رقم الهاتف مسجل مسبقاً.' });
    }

    // Hash password with bcrypt (10 rounds) - NEVER store plaintext
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const credentialData = {
      identifier: cleanIdentifier,
      passwordHash,
      uid,
      role: validRole,
      createdAt: new Date().toISOString()
    };

    // Save in protected credentials store
    if (adminDb) {
      try {
        await adminDb.collection('_auth_credentials').doc(cleanIdentifier).set(credentialData);
      } catch (e) {
        localCredentialsStore.set(cleanIdentifier, credentialData);
      }
    } else {
      localCredentialsStore.set(cleanIdentifier, credentialData);
    }

    // Create user profile in Firestore
    const userProfile = {
      uid,
      name: (name || cleanIdentifier).trim(),
      phone: (phone || cleanIdentifier).trim(),
      city: city || 'الدار البيضاء',
      role: validRole,
      createdAt: new Date().toISOString()
    };

    if (adminDb) {
      try {
        await adminDb.collection('users').doc(uid).set(userProfile, { merge: true });
        if (validRole === 'provider') {
          const providerProfile = {
            id: uid,
            name: userProfile.name,
            phone: userProfile.phone,
            city: userProfile.city,
            profession: profession || 'الصيانة والإصلاحات',
            subCraft: subCraft || 'صيانة عامة',
            rating: 5.0,
            reviewCount: 0,
            completedJobs: 0,
            isVerified: true,
            isActive: true,
            createdAt: new Date().toISOString()
          };
          await adminDb.collection('providers').doc(uid).set(providerProfile, { merge: true });
        } else {
          await adminDb.collection('customers').doc(uid).set(userProfile, { merge: true });
        }
      } catch (dbErr) {
        console.warn('[Backend] Firestore profile write notice:', dbErr.message);
      }
    }

    // Generate custom token via Firebase Admin SDK
    let customToken = null;
    if (adminAuth) {
      try {
        customToken = await adminAuth.createCustomToken(uid, { role: validRole });
      } catch (authErr) {
        console.warn('[Backend] Custom token generation note:', authErr.message);
      }
    }

    return res.status(201).json({
      success: true,
      customToken,
      user: {
        uid,
        name: userProfile.name,
        phone: userProfile.phone,
        city: userProfile.city,
        role: validRole,
        profession: profession || '',
        subCraft: subCraft || ''
      }
    });
  } catch (error) {
    console.error('[Backend] Registration error:', error);
    return res.status(500).json({ error: 'حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة لاحقاً.' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const clientIp = req.ip || req.headers['x-forwarded-for'] || 'client';
  const { identifier, password } = req.body;

  // Rate Limiting on Login per Identifier and IP (Brute-Force Protection)
  const rateKey = `login_${cleanRateKey(identifier)}_${clientIp}`;
  const rateCheck = checkRateLimit(rateKey, 5, 15 * 60 * 1000); // 5 attempts per 15 mins

  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: 'تم تجاوز عدد محاولات الدخول المسموح بها. يرجى الانتظار 15 دقيقة قبل المحاولة مجدداً.'
    });
  }

  // Dummy hash for uniform execution time (Anti-Timing & Anti-Enumeration Protection)
  const DUMMY_HASH = '$2a$10$e8w8y0N9R5wBvD3h1k9vE.L1qH5s4rZ2k3x9y8w7v6u5t4s3r2q1p';

  if (!identifier || !password || typeof password !== 'string') {
    await bcrypt.compare(password || '', DUMMY_HASH);
    return res.status(401).json({ error: 'المعرف أو كلمة السر غير صحيحة' });
  }

  const cleanIdentifier = String(identifier).trim().toLowerCase();

  try {
    let credential = null;
    if (adminDb) {
      try {
        const doc = await adminDb.collection('_auth_credentials').doc(cleanIdentifier).get();
        if (doc.exists) {
          credential = doc.data();
        }
      } catch (e) {
        credential = localCredentialsStore.get(cleanIdentifier);
      }
    } else {
      credential = localCredentialsStore.get(cleanIdentifier);
    }

    if (!credential) {
      // Execute dummy compare for constant timing
      await bcrypt.compare(password, DUMMY_HASH);
      return res.status(401).json({ error: 'المعرف أو كلمة السر غير صحيحة' });
    }

    // Verify Password using bcrypt.compare
    const isMatch = await bcrypt.compare(password, credential.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'المعرف أو كلمة السر غير صحيحة' });
    }

    // Generate Custom Token
    let customToken = null;
    if (adminAuth) {
      try {
        customToken = await adminAuth.createCustomToken(credential.uid, { role: credential.role });
      } catch (authErr) {
        console.warn('[Backend] Custom token notice:', authErr.message);
      }
    }

    // Fetch user details
    let userData = {
      uid: credential.uid,
      role: credential.role,
      phone: credential.identifier
    };

    if (adminDb) {
      try {
        const userDoc = await adminDb.collection('users').doc(credential.uid).get();
        if (userDoc.exists) {
          userData = { ...userData, ...userDoc.data() };
        }
      } catch (e) {
        // use basic userData
      }
    }

    return res.status(200).json({
      success: true,
      customToken,
      user: userData
    });
  } catch (error) {
    console.error('[Backend] Login error:', error);
    return res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الدخول.' });
  }
});

function cleanRateKey(str) {
  return String(str || '').replace(/[^a-zA-Z0-9]/g, '');
}

// Serve Vite dev middleware in development or static files in production
if (process.env.NODE_ENV === 'production' || fs.existsSync(path.join(__dirname, 'dist'))) {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    }
    next();
  });
} else {
  // Vite dev mode middleware integration
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: { middlewareMode: true }
  });
  app.use(vite.middlewares);
}

app.listen(PORT, '0.0.0.0', () => {
  console.info(`[Backend] Full-Stack Server running on port ${PORT}`);
});

export { app };
export default app;

