/**
 * SEO & Structured Data Management Service for B4it M3alm
 */

const DEFAULT_TITLE = 'بغيت معلم | B4it M3alm - المنصة الأولى للحرفيين في المغرب';
const DEFAULT_DESC = 'منصة مغربية للربط بين الزبائن وأفضل الحرفيين والمعلمين الموثوقين في 60 مدينة مغربية. سباكة، نجارة، كهرباء، صباغة وبناء مع تقييمات حقيقية.';
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop&q=80';

/**
 * Sets or updates a <meta> tag by attribute
 */
export function setMetaTag(attrName, attrVal, content) {
  let el = document.querySelector(`meta[${attrName}="${attrVal}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrVal);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * Sets or updates the canonical link tag
 */
export function setCanonical(url) {
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  // Strip any tracking/query parameters for clean canonical URL
  const cleanUrl = url.split('?')[0].split('#')[0];
  link.setAttribute('href', cleanUrl);
}

/**
 * Injects or updates Schema.org JSON-LD structured data
 */
export function setJsonLd(schemaObj) {
  let script = document.getElementById('b4it-jsonld-schema');
  if (!schemaObj) {
    if (script) script.remove();
    return;
  }

  if (!script) {
    script = document.createElement('script');
    script.id = 'b4it-jsonld-schema';
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(schemaObj);
}

/**
 * Updates SEO tags for the Homepage
 */
export function updateHomeSEO() {
  const origin = window.location.origin;

  document.title = DEFAULT_TITLE;
  setMetaTag('name', 'description', DEFAULT_DESC);
  setMetaTag('name', 'robots', 'index, follow');
  setCanonical(origin + '/');

  // Open Graph
  setMetaTag('property', 'og:type', 'website');
  setMetaTag('property', 'og:title', DEFAULT_TITLE);
  setMetaTag('property', 'og:description', DEFAULT_DESC);
  setMetaTag('property', 'og:url', origin + '/');
  setMetaTag('property', 'og:site_name', 'بغيت معلم - B4it M3alm');
  setMetaTag('property', 'og:image', DEFAULT_IMAGE);

  // Twitter Cards
  setMetaTag('name', 'twitter:card', 'summary_large_image');
  setMetaTag('name', 'twitter:title', DEFAULT_TITLE);
  setMetaTag('name', 'twitter:description', DEFAULT_DESC);
  setMetaTag('name', 'twitter:image', DEFAULT_IMAGE);

  // JSON-LD WebSite & Service Directory
  setJsonLd({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'بغيت معلم - B4it M3alm',
    url: origin,
    description: DEFAULT_DESC,
    inLanguage: 'ar-MA',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${origin}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  });
}

/**
 * Updates SEO tags for an individual provider page
 */
export function updateProviderSEO(provider) {
  const origin = window.location.origin;

  // If not found or inactive, mark noindex and clear schema
  if (!provider || provider.notFound || provider.isActive === false) {
    document.title = 'المعلم غير متاح | بغيت معلم';
    setMetaTag('name', 'robots', 'noindex, nofollow');
    setJsonLd(null);
    return;
  }

  const proName = provider.fullName || provider.name || 'معلم محترف';
  const proJob = provider.professionName || provider.job || 'حرفي مهني';
  const proCity = provider.city || provider.cityId || 'المغرب';
  const proImg = provider.img || provider.imageUrl || DEFAULT_IMAGE;
  const proUrl = `${origin}/provider/${provider.id}`;

  const title = `${proName} | ${proJob} في ${proCity} | بغيت معلم`;
  const description = `تواصل مباشرة مع ${proName}، متخصص في ${proJob} بمدينة ${proCity}. تقييمات حقيقية، تواصل فوري عبر الهاتف والواتساب عبر منصة بغيت معلم.`;

  document.title = title;
  setMetaTag('name', 'description', description);
  setMetaTag('name', 'robots', 'index, follow');
  setCanonical(proUrl);

  // Open Graph
  setMetaTag('property', 'og:type', 'profile');
  setMetaTag('property', 'og:title', title);
  setMetaTag('property', 'og:description', description);
  setMetaTag('property', 'og:url', proUrl);
  setMetaTag('property', 'og:image', proImg);
  setMetaTag('property', 'og:site_name', 'بغيت معلم - B4it M3alm');

  // Twitter Cards
  setMetaTag('name', 'twitter:card', 'summary_large_image');
  setMetaTag('name', 'twitter:title', title);
  setMetaTag('name', 'twitter:description', description);
  setMetaTag('name', 'twitter:image', proImg);

  // JSON-LD ProfessionalService Schema
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: proName,
    image: proImg,
    description: provider.bio || description,
    telephone: provider.phone || undefined,
    url: proUrl,
    address: {
      '@type': 'PostalAddress',
      addressLocality: proCity,
      addressCountry: 'MA'
    }
  };

  // Only add AggregateRating if real reviews and rating exist
  const ratingNum = Number(provider.rating);
  const reviewsCount = Number(provider.reviews);
  if (ratingNum > 0 && reviewsCount > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: ratingNum.toFixed(1),
      reviewCount: reviewsCount,
      bestRating: '5',
      worstRating: '1'
    };
  }

  setJsonLd(schema);
}

/**
 * Updates SEO tags for private / admin pages (sets noindex, nofollow)
 */
export function updatePrivatePageSEO(pageTitle = 'لوحة التحكم') {
  document.title = `${pageTitle} | بغيت معلم`;
  setMetaTag('name', 'robots', 'noindex, nofollow');
  setJsonLd(null);
}
