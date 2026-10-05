import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebaseConfig';
import { normalizeMoroccanPhone } from '../utils/phoneUtils';
import { getProviderReviews } from './reviewService';

const PROVIDERS_COLLECTION = 'providers';

/**
 * Normalizes text for forgiving, multilingual substring search (Arabic, Latin, digits)
 */
export function normalizeSearchTerm(str) {
  if (!str) return '';
  return String(str)
    .trim()
    .toLowerCase()
    // Normalize common Arabic letter variations
    .replace(/[إأآا]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[يى]/g, 'ي')
    // Remove diacritics / tashkeel
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // Normalize spaces
    .replace(/\s+/g, ' ');
}

/**
 * Checks whether an ID is in tombstone records (deleted accounts)
 */
export function isTombstonedProvider(providerId) {
  if (!providerId) return false;
  try {
    const tombstones = JSON.parse(localStorage.getItem('b4it_m3alm_tombstones') || '[]');
    return tombstones.includes(String(providerId));
  } catch {
    return false;
  }
}

/**
 * Dynamically updates document <title>, <meta description>, and <link rel="canonical">
 */
export function updateProviderSEO(provider) {
  if (!provider) return;

  const proName = provider.fullName || provider.name || 'معلم محترف';
  const proJob = provider.professionName || provider.job || 'خدمات حرفية';
  const proCity = provider.city || provider.cityId || 'المغرب';

  // 1. Dynamic Title
  const title = `${proName} | ${proJob} في ${proCity} | بغيت معلم`;
  document.title = title;

  // 2. Dynamic Meta Description
  const description = `تواصل مباشرة مع ${proName}، متخصص في ${proJob} في مدينة ${proCity}. تقييمات حقيقية، تواصل عبر الهاتف والواتساب عبر منصة بغيت معلم.`;
  let metaDesc = document.querySelector('meta[name="description"]');
  if (!metaDesc) {
    metaDesc = document.createElement('meta');
    metaDesc.name = 'description';
    document.head.appendChild(metaDesc);
  }
  metaDesc.setAttribute('content', description);

  // 3. Dynamic Canonical Link
  const currentUrl = `${window.location.origin}/provider/${provider.id}`;
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', currentUrl);
}

/**
 * Resets document SEO tags back to default platform identity
 */
export function resetDefaultSEO() {
  document.title = 'بغيت معلم | B4it M3alm - المنصة الأولى للحرفيين في المغرب';
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    metaDesc.setAttribute(
      'content',
      'منصة مغربية للربط بين الزبائن وأفضل الحرفيين والمعلمين في جميع المهن بـ 60 مدينة مغربية.'
    );
  }
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) {
    canonical.setAttribute('href', window.location.origin);
  }
}

/**
 * Searches active providers with multi-field matching (Name, Phone, WhatsApp, Job, Service, City, Address)
 */
export function filterProvidersList(providers, { searchQuery = '', city = 'جميع المدن', category = null } = {}) {
  const cleanQ = normalizeSearchTerm(searchQuery);
  const cleanPhoneDigits = searchQuery.replace(/\D/g, '');

  return providers.filter((p) => {
    // 1. Exclude inactive or tombstoned providers strictly
    if (p.isActive === false || isTombstonedProvider(p.id)) {
      return false;
    }

    // 2. City Filter
    const proCity = p.city || p.cityId;
    if (city && city !== 'جميع المدن' && proCity !== city) {
      return false;
    }

    // 3. Category / Profession Filter
    const proCat = p.category || p.professionName || p.job;
    if (category && proCat !== category) {
      return false;
    }

    // 4. Search Query Filter (if empty query, passes)
    if (!cleanQ) {
      return true;
    }

    // Normalized provider fields
    const nameNorm = normalizeSearchTerm(p.fullName || p.name);
    const jobNorm = normalizeSearchTerm(p.professionName || p.job);
    const catNorm = normalizeSearchTerm(p.category);
    const cityNorm = normalizeSearchTerm(p.city || p.cityId);
    const addressNorm = normalizeSearchTerm(p.address);
    const descNorm = normalizeSearchTerm(p.description || p.bio);
    const servicesNorm = Array.isArray(p.services) ? p.services.map(s => normalizeSearchTerm(s)).join(' ') : '';

    // Check textual fields
    if (
      nameNorm.includes(cleanQ) ||
      jobNorm.includes(cleanQ) ||
      catNorm.includes(cleanQ) ||
      cityNorm.includes(cleanQ) ||
      addressNorm.includes(cleanQ) ||
      descNorm.includes(cleanQ) ||
      servicesNorm.includes(cleanQ)
    ) {
      return true;
    }

    // Phone / WhatsApp digit substring match
    if (cleanPhoneDigits.length >= 3) {
      const pPhone = String(p.phone || '').replace(/\D/g, '');
      const pWa = String(p.whatsapp || '').replace(/\D/g, '');
      const pNormPhone = String(p.normalizedPhone || '').replace(/\D/g, '');

      if (
        pPhone.includes(cleanPhoneDigits) ||
        pWa.includes(cleanPhoneDigits) ||
        pNormPhone.includes(cleanPhoneDigits)
      ) {
        return true;
      }
    }

    return false;
  });
}

/**
 * Retrieves full details for a single provider by ID from Firestore, including real reviews
 */
export async function getProviderDetails(providerId, seedFallbackProviders = []) {
  if (!providerId) return null;

  // Security & Tombstone check
  if (isTombstonedProvider(providerId)) {
    return { notFound: true, isDeleted: true };
  }

  // 1. Fetch from Firestore if configured
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, PROVIDERS_COLLECTION, String(providerId));
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.isActive === false) {
          return { notFound: true, isInactive: true };
        }

        // Fetch their real reviews
        const reviews = await getProviderReviews(providerId);

        return {
          id: docSnap.id,
          name: data.fullName || data.name || 'معلم محترف',
          fullName: data.fullName || data.name || 'معلم محترف',
          job: data.professionName || data.job || 'معلم حرفي',
          professionName: data.professionName || data.job || 'معلم حرفي',
          city: data.city || data.cityId || 'المغرب',
          address: data.address || data.city || 'المنطقة الحضرية',
          phone: data.phone || '',
          whatsapp: data.whatsapp || data.phone || '',
          rating: data.rating ? String(data.rating) : '5.0',
          reviews: data.reviewsCount !== undefined ? data.reviewsCount : reviews.length,
          bio: data.description || data.bio || `معلم مهني معتمد في ${data.professionName || data.job || 'مجاله'}.`,
          description: data.description || data.bio,
          services: data.services || ['خدمات عامة', 'صيانة وإصلاح', 'استشارات مهنية'],
          experience: data.experience || 'أكثر من 5 سنوات',
          completedJobs: data.completedJobs || 50,
          img: data.imageUrl || data.img || '',
          isActive: data.isActive !== false,
          realReviews: reviews
        };
      }
    } catch (err) {
      console.warn('[ProviderService] Firestore fetch error, checking seed fallback:', err.message);
    }
  }

  // 2. Fallback to seed list if Firestore record not found or before sync
  const fallback = seedFallbackProviders.find(p => p.id === String(providerId));
  if (fallback) {
    if (fallback.isActive === false || isTombstonedProvider(fallback.id)) {
      return { notFound: true, isInactive: true };
    }

    const reviews = await getProviderReviews(fallback.id, fallback.reviewsList || []);
    return {
      ...fallback,
      realReviews: reviews
    };
  }

  return { notFound: true };
}
