import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Menu, Globe2, MapPin, UserRound, Search, ChevronDown, ShieldCheck,
  Star, Wrench, GraduationCap, Zap, HardHat, Grid2X2, Sprout, ChefHat,
  Heart, Bell, Home, Phone, MessageCircle, ArrowLeft, Sparkles,
  X, Check, LogOut, Briefcase, Clock, ThumbsUp, AlertCircle, Info, KeyRound,
  Truck, Droplet, Wind, Settings, Layers, Paintbrush, Car, Hammer, Laptop,
  Lock, Eye, EyeOff
} from 'lucide-react';
import './styles.css';
import hero from './assets/hero-technician.jpg';
import p1 from './assets/pro-1.jpg';
import p2 from './assets/pro-2.jpg';
import p3 from './assets/pro-3.jpg';
import p4 from './assets/pro-4.jpg';
import {
  sendOtp,
  verifyOtp,
  createUserProfile,
  checkPhoneExists,
  subscribeToAuthChanges,
  signOutUser,
  validatePassword,
  registerUserWithPassword,
  loginUserWithPassword
} from './services/authService';
import {
  normalizeMoroccanPhone,
  isValidMoroccanPhone,
  formatPhoneForDisplay
} from './utils/phoneUtils';
import {
  getProviderReviews,
  getUserReview,
  saveOrUpdateReview,
  deleteReview,
  formatReviewDate
} from './services/reviewService.js';
import {
  getFavoritesByCustomerId,
  addFavorite,
  removeFavorite
} from './services/firestoreService.js';
import ProviderPage from './components/ProviderPage';
import AdminDashboard from './components/AdminDashboard';
import {
  filterProvidersList,
  getProviderDetails,
  resetDefaultSEO,
  isTombstonedProvider,
  getRealProvidersByProfession
} from './services/providerService.js';
import {
  subscribeToUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
} from './services/notificationService.js';
import { updateHomeSEO, updatePrivatePageSEO } from './services/seoService.js';
import { isReviewEnvironment } from './utils/envUtils.js';






// Multilingual translations
const T = {
  ar: {
    brand_name: 'بغيت معلم',
    brand_sub: 'B4it M3alm',
    lang_name: 'العربية',
    login_btn: 'تسجيل الدخول',
    my_account: 'حسابي',
    all_cities: 'جميع المدن',
    hero_badge: 'معلمين موثوقين في جميع المدن المغربية',
    hero_title_1: 'إبحث عن معلمك المحترف',
    hero_title_2: 'بسهولة وفي دقائق',
    hero_sub: 'أكثر من 40 مهنة، في 60 مدينة مغربية',
    search_placeholder: 'إبحث عن مهنة، مدينة أو اسم المعلم...',
    ben_reviews: 'تقييمات حقيقية',
    ben_direct: 'تواصل مباشر',
    ben_verified: 'معلمين موثوقين',
    ben_fast: 'خدمة سريعة',
    cats_title: '🔥 الفئات الأكثر طلبا',
    cats_view_all: 'عرض جميع المهن',
    pros_title: '⭐ معلمون مميزون',
    pros_view_all: 'عرض الكل',
    available_now: 'متاح الآن',
    call: 'اتصال',
    whatsapp: 'واتساب',
    wa_banner_title: 'تواصل مباشرة مع المعلم عبر واتساب',
    wa_banner_sub: 'احصل على إجابة سريعة واستفساراتك',
    wa_banner_btn: 'ابدأ الآن',
    nav_home: 'الرئيسية',
    nav_notif: 'الإشعارات',
    nav_search: 'بحث',
    nav_fav: 'المفضلة',
    nav_account: 'حسابي',
    no_results: 'لا توجد نتائج مطابقة للبحث',
    reset_search: 'إعادة ضبط البحث',
    reviews_title: 'آراء وتقييمات الزبناء',
    experience: 'الخبرة',
    services_title: 'الخدمات المقدمة',
    about_title: 'نبذة عن المعلم',
    completed_jobs: 'خدمة منجزة',
    close: 'إغلاق',
    fav_empty: 'قائمة المفضلة فارغة حالياً',
    fav_empty_sub: 'اضغط على رمز القلب في أي بطاقة مهني لإضافته إلى قائمة المفضلة والرجوع إليه بسرعة.',
    browse_pros: 'استكشف المعلمين',
    search_results_for: 'نتائج البحث عن:',
    in_city: 'في مدينة:',
    category_filter: 'تصنيف:',
    clear_filters: 'مسح التصفية'
  },
  fr: {
    brand_name: 'B4it M3alm',
    brand_sub: 'Artisans du Maroc',
    lang_name: 'Français',
    login_btn: 'Connexion',
    my_account: 'Mon Compte',
    all_cities: 'Toutes les villes',
    hero_badge: 'Artisans certifiés dans tout le Maroc',
    hero_title_1: 'Trouvez votre artisan pro',
    hero_title_2: 'Facilement et en quelques minutes',
    hero_sub: 'Plus de 40 métiers dans 60 villes marocaines',
    search_placeholder: 'Rechercher un métier, une ville ou un artisan...',
    ben_reviews: 'Avis vérifiés',
    ben_direct: 'Contact direct',
    ben_verified: 'Artisans fiables',
    ben_fast: 'Service rapide',
    cats_title: '🔥 Catégories les plus demandées',
    cats_view_all: 'Tous les métiers',
    pros_title: '⭐ Artisans en vedette',
    pros_view_all: 'Voir tout',
    available_now: 'Disponible',
    call: 'Appeler',
    whatsapp: 'WhatsApp',
    wa_banner_title: 'Contactez directement par WhatsApp',
    wa_banner_sub: 'Obtenez des réponses rapides à vos questions',
    wa_banner_btn: 'Démarrer',
    nav_home: 'Accueil',
    nav_notif: 'Notifs',
    nav_search: 'Recherche',
    nav_fav: 'Favoris',
    nav_account: 'Compte',
    no_results: 'Aucun résultat trouvé',
    reset_search: 'Réinitialiser la recherche',
    reviews_title: 'Avis et retours clients',
    experience: 'Expérience',
    services_title: 'Services proposés',
    about_title: 'À propos de l\'artisan',
    completed_jobs: 'interventions réussies',
    close: 'Fermer',
    fav_empty: 'Votre liste de favoris est vide',
    fav_empty_sub: 'Cliquez sur l\'icône cœur sur une fiche artisan pour l\'ajouter à vos favoris.',
    browse_pros: 'Découvrir les artisans',
    search_results_for: 'Résultats pour :',
    in_city: 'À :',
    category_filter: 'Catégorie :',
    clear_filters: 'Effacer les filtres'
  },
  en: {
    brand_name: 'B4it M3alm',
    brand_sub: 'Pro Craftsmen',
    lang_name: 'English',
    login_btn: 'Sign In',
    my_account: 'My Account',
    all_cities: 'All Cities',
    hero_badge: 'Verified pros in all Moroccan cities',
    hero_title_1: 'Find Your Pro Craftsman',
    hero_title_2: 'Easily and in minutes',
    hero_sub: 'Over 40 crafts across 60 Moroccan cities',
    search_placeholder: 'Search for craft, city or craftsman name...',
    ben_reviews: 'Real Reviews',
    ben_direct: 'Direct Contact',
    ben_verified: 'Verified Pros',
    ben_fast: 'Fast Service',
    cats_title: '🔥 Most Requested Categories',
    cats_view_all: 'View All Crafts',
    pros_title: '⭐ Featured Craftsmen',
    pros_view_all: 'View All',
    available_now: 'Available now',
    call: 'Call',
    whatsapp: 'WhatsApp',
    wa_banner_title: 'Direct WhatsApp communication with pros',
    wa_banner_sub: 'Get instant replies and quotes for your needs',
    wa_banner_btn: 'Start Now',
    nav_home: 'Home',
    nav_notif: 'Alerts',
    nav_search: 'Search',
    nav_fav: 'Favorites',
    nav_account: 'Account',
    no_results: 'No matching craftsmen found',
    reset_search: 'Reset Search',
    reviews_title: 'Customer Reviews & Feedback',
    experience: 'Experience',
    services_title: 'Offered Services',
    about_title: 'About the Craftsman',
    completed_jobs: 'completed jobs',
    close: 'Close',
    fav_empty: 'Your favorites list is empty',
    fav_empty_sub: 'Click the heart icon on any craftsman card to save them for quick access.',
    browse_pros: 'Explore Craftsmen',
    search_results_for: 'Search results for:',
    in_city: 'In city:',
    category_filter: 'Category:',
    clear_filters: 'Clear Filters'
  }
};

const citiesList = [
  'جميع المدن',
  'الرباط',
  'الدار البيضاء',
  'فاس',
  'مراكش',
  'طنجة',
  'أكادير',
  'مكناس',
  'وجدة',
  'القنيطرة',
  'تطوان',
  'سلا',
  'تمارة'
];

const cats = [
  ['ديبانج وسحب السيارات', 5, Truck, 'blue', 'towing', ['سحب السيارات المعطلة', 'ديبانج الشاحنات', 'إنقاذ ونقل المركبات', 'ديبانج على الطريق السريع', 'شحن البطارية على الطريق']],
  ['البناء والأشغال', 8, HardHat, 'gold', 'construction', ['بناء المنازل والهياكل', 'إصلاح وترميم المباني', 'أشغال الخرسانة والأساسات', 'أشغال الهدم والحفر', 'تزليج وتركيب الأحجار']],
  ['الكهرباء', 6, Zap, 'gold', 'electricity', ['كهرباء المباني والمنازل', 'تركيب لوحات التوزيع', 'إصلاح الأعطال والالتماسات', 'تركيب الإنارة والديكور', 'كاميرات المراقبة والإنذار']],
  ['الميكانيك وإصلاح السيارات', 7, Wrench, 'blue', 'mechanics', ['تشخيص إلكتروني بالسكانير', 'ميكانيك البنزين والديزل', 'صيانة الفرامل والتعليق', 'تغيير الزيوت والفلاتر', 'صيانة علب السرعة']],
  ['السباكة والتدفئة', 5, Droplet, 'mint', 'plumbing', ['سباكة صحية وتركيبات', 'تركيب وصيانة السخانات', 'كشف تسربات المياه', 'تسليك المجاري والبالوعات', 'تركيب التدفئة المركزية']],
  ['التبريد والتكييف', 4, Wind, 'cyan', 'hvac', ['تركيب مكيفات الهواء', 'شحن غاز المكيفات', 'إصلاح الثلاجات المنزلية', 'غرف التبريد التجارية', 'صيانة التكييف المركزي']],
  ['الصيانة والإصلاحات', 6, Settings, 'purple', 'maintenance', ['إصلاح الأجهزة الكهرومنزلية', 'صيانة سخانات وغسالات', 'صيانة التجهيزات المنزلية', 'إصلاح الأقفال والأبواب', 'ترميم وصيانة عامة']],
  ['الجبس والزليج', 5, Layers, 'gold', 'plaster-tiles', ['جبس عصري وإضاءة مخفية', 'زليج ورخام الأرضيات', 'تزليج المطابخ والحمامات', 'أقواس وجبس بلدي', 'تزيين الجدران بالبلاستيك']],
  ['الصباغة والديكور', 5, Paintbrush, 'pink', 'painting', ['صباغة الجدران الداخلية', 'صباغة الواجهات الخارجية', 'خيال ومينا وبيرلاج', 'ورق الحائط والديكور', 'صباغة الخشب والحديد']],
  ['طلوري وإصلاح هياكل السيارات', 4, Car, 'blue', 'car-body', ['تقويم وتعديل الهياكل (Tôlier)', 'صباغة أفران السيارات', 'تلميع وبوليتش الهياكل', 'إصلاح الصدامات والبلاستيك']],
  ['النجارة والألمنيوم', 6, Hammer, 'mint', 'carpentry', ['أبواب ونوافذ ألمنيوم', 'مطابخ عصرية إينوكس وخشب', 'نجارة الخشب الكلاسيكي', 'ريفيتمون وبلاكار إيطالي', 'تركيب الزجاج والمرايا']],
  ['الفلاحة والحدائق', 5, Sprout, 'green', 'gardening', ['تنسيق وصيانة الحدائق', 'شبكات السقي بالتنقيط', 'غرس الأشجار والشتائل', 'تقليم الأشجار والنخيل', 'مكافحة الآفات والأعشاب']],
  ['النظافة والخدمات المنزلية', 5, Sparkles, 'cyan', 'cleaning', ['تنظيف شامل للمنازل والفيلات', 'تنظيف السجاد والزرابي', 'تنظيف الزجاج والواجهات', 'تطهير وإبادة الحشرات', 'تنظيف ما بعد البناء']],
  ['المعلوميات والتقنية', 5, Laptop, 'purple', 'tech-it', ['صيانة الحواسيب واللابتوب', 'شبكات الإنترنت والواي فاي', 'كاميرات المراقبة الذكية', 'تركيب البارابول والتلفاز', 'حلول الهواتف الذكية']],
  ['النقل والخدمات', 4, Truck, 'blue', 'transport', ['نقل الأثاث والرحيل', 'خدمات الشحن السريع', 'تغليف وحماية المنقولات', 'عمال التحميل والتفريغ']],
  ['الطبخ والمطاعم', 6, ChefHat, 'gold', 'cooking', ['طباخات وطباخو الحفلات والأعراس', 'بسطيلة وطواجن مغربية', 'حلويات ومملحات المناسبات', 'إعداد الولائم والعقيقة', 'طباخ منزلي للمناسبات']],
  ['أخرى', 6, Grid2X2, 'gray', 'other', ['التجميل والحلاقة', 'التصوير والمناسبات', 'الخياطة والملابس', 'التعليم والتدريس', 'الخدمات المهنية', 'أي مهنة إضافية']]
];

const pros = [
  {
    id: 'abdellah-zarfi',
    name: 'عبد الله الزرفي',
    job: 'طباخ مغربي للأفراح والولائم',
    category: 'الطبخ والمطاعم',
    city: 'فاس',
    rating: '4.9',
    reviews: 154,
    img: p4,
    phone: '+212661234567',
    whatsapp: '212661234567',
    experience: '16 سنة خبرة في الطبخ الفاسي الأصيل',
    completedJobs: 320,
    price: 'حسب نوع الحفل والوليمة',
    bio: 'طباخ مغربي محترف متخصص في الأعراس والعقيقة والمناسبات العائلية الكبرى. إتقان تام للطواجن الفاسية العريقة، البسطيلة الملكية، والدجاج المحمر على الطريقة المغربية الأصيلة مع احترام معايير النظافة والجودة العالية.',
    services: ['طواجن مغربية فاسية', 'بسطيلة الدجاج والسمك', 'ولائم الأعراس والعقيقة', 'حلويات مغربية تقليدية', 'إعداد وجبات عائلية خاصة'],
    reviewsList: [
      { user: 'رشيد الفاسي', rating: 5, date: 'منذ يومين', comment: 'ما شاء الله على السي عبد الله، الطاجين والدجاج المحمر كانوا قمة في المذاق في عقيقة ابني. كل الضيوف شكروا المأكولات والنظافة لا غبار عليها.' },
      { user: 'فاطمة الزهراء المريني', rating: 5, date: 'منذ أسبوع', comment: 'انضباط كبير في الوقت وحرفية عالية. البسطيلة كانت لذيذة جداً ومقرمشة، تعامل محترم وسعر مناسب.' },
      { user: 'عادل السبتي', rating: 4, date: 'منذ أسبوعين', comment: 'طباخ متمكن وذو أخلاق عالية، أنصح بالتعامل معه لكل من يبحث عن الطبخ المغربي الأصيل.' }
    ]
  },
  {
    id: 'youssef-alaoui',
    name: 'يوسف العلوي',
    job: 'ميكانيك وتشخيص السيارات',
    category: 'الميكانيك وإصلاح السيارات',
    city: 'مراكش',
    rating: '4.7',
    reviews: 89,
    img: p3,
    phone: '+212662345678',
    whatsapp: '212662345678',
    experience: '12 سنة خبرة في تشخيص وصيانة السيارات',
    completedJobs: 410,
    price: 'ابتداءً من 100 درهم للتشخيص',
    bio: 'ميكانيكي سيارات معتمد في مراكش متخصص في جميع أنواع السيارات الحديثة والقديمة. تشخيص إلكتروني دقيق بالأجهزة الحديثة، صيانة المحركات، علب السرعة، والفرامل، مع إمكانية التنقل السريع عند الأعطال الطارئة.',
    services: ['تشخيص إلكتروني بالسكانير', 'صيانة محركات البنزين والديزل', 'تغيير الفرامل ونظام التعليق', 'إصلاح طارئ على الطريق', 'صيانة دورية وتغيير الزيت'],
    reviewsList: [
      { user: 'كريم البهجاوي', rating: 5, date: 'منذ 3 أيام', comment: 'شخص العطل في سيارتي بسرعة فائقة بعدما احتار فيها حرفيون آخرون. صلح المحرك بنجاح والسيارة رجعت كأنها جديدة.' },
      { user: 'محمد التازي', rating: 5, date: 'منذ 10 أيام', comment: 'أمانة وصدق في التعامل، ما بدّل والو فـالسيارة حتى شرح ليا العطل بالتفصيل. شكراً جزيلاً سي يوسف.' },
      { user: 'ياسين بناني', rating: 4, date: 'منذ شهر', comment: 'خدمة سريعة في مراكش ورجل طيب ومعقول. الأسعار في المتناول مقارنة بالسوق.' }
    ]
  },
  {
    id: 'samira-kettani',
    name: 'سميرة الكتاني',
    job: 'تدريس ودعم اللغات',
    category: 'أخرى',
    city: 'الدار البيضاء',
    rating: '4.9',
    reviews: 233,
    img: p2,
    phone: '+212663456789',
    whatsapp: '212663456789',
    experience: '10 سنوات في التدريس والدعم المدرسي',
    completedJobs: 560,
    price: '120 درهم للحصة (حضوري أو عن بعد)',
    bio: 'أستاذة مجازة في الأدب الفرنسي تقدم دروس دعم وتقوية لجميع المستويات (ابتدائي، إعدادي، تأهيلي، وتحضير البكالوريا والامتحانات الإشهادية). طرق بيداغوجية حديثة لتبسيط القواعد وتحسين التواصل الشفوي والكتابي.',
    services: ['تحضير لامتحان البكالوريا الجهوي والوطني', 'دعم وتقوية لجميع المستويات', 'تطوير المحادثة الشفوية (Communication)', 'مراجعة منهجية التعبير الكتابي', 'حصص فردية وجماعية مركّزة'],
    reviewsList: [
      { user: 'مريم بن جلون', rating: 5, date: 'منذ 4 أيام', comment: 'أستاذة رائعة وصبورة جداً مع التلاميذ. ابنتي كانت تجد صعوبة كبيرة في الفرنسية، والآن حصلت على نقطة 18 في الجهوي.' },
      { user: 'خالد الصقلي', rating: 5, date: 'منذ أسبوعين', comment: 'طريقة تدريس ممتازة ونتائج سريعة في التعبير والتواصل. التزام تام بالمواعيد.' },
      { user: 'أمينة التلمساني', rating: 5, date: 'منذ شهر', comment: 'الأستاذة سميرة تستحق كل التقدير، أسلوبها مبسط وحببت أطفالي في اللغة الفرنسية.' }
    ]
  },
  {
    id: 'ahmed-ben-aissa',
    name: 'أحمد بن عيسى',
    job: 'بناء وترميم المباني',
    category: 'البناء والأشغال',
    city: 'الرباط',
    rating: '4.8',
    reviews: 126,
    img: p1,
    phone: '+212664567890',
    whatsapp: '212664567890',
    experience: '18 سنة خبرة في البناء والتشطيبات',
    completedJobs: 280,
    price: 'حسب مساحة وطبيعة المشروع',
    bio: 'معلم بناء محترف بالرباط ونواحيها متخصص في أشغال البناء، الترميم، التوسيع، وإصلاح الشقق والمنازل من الأساس حتى التشطيب. احترام تام للآجال المحددة، دقة في التنفيذ، واختيار أجود مواد البناء.',
    services: ['بناء وترميم المنازل والشقق', 'أشغال الهدم وإعادة التهيئة', 'تركيب الزليج والرخام', 'عزل الأسطح ضد تسرب المياه', 'إصلاح الشقوق والترميم الشامل'],
    reviewsList: [
      { user: 'عمر الوديع', rating: 5, date: 'منذ يوم أمس', comment: 'معلم بناء محترف وكلمتو وحدة. صلح الشقة كاملة في الوقت المحدد بالضبط وبالجودة المطلوبة ونظف الورشة قبل ما يسلم المفاتيح.' },
      { user: 'عبد الحق الناصري', rating: 5, date: 'منذ أسبوعين', comment: 'خدمة متقونة وأثمنة معقولة، كيعطيك النصيحة فالمواد وما كيغشش نهائياً. الله يبارك فيه.' },
      { user: 'سناء بنسودة', rating: 4, date: 'منذ شهر', comment: 'عمل رائع في تهيئة المطبخ والحمام، دقة في قياسات الزليج وتشطيب ممتاز.' }
    ]
  }
];

export default function App() {
  // Read persisted settings or set defaults
  const [lang, setLang] = useState(() => localStorage.getItem('b4it_m3alm_lang') || 'ar');
  const [active, setActive] = useState('home');
  const [query, setQuery] = useState('');
  const [city, setCity] = useState(() => localStorage.getItem('b4it_m3alm_city') || 'جميع المدن');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [prosList, setProsList] = useState(pros);
  const [fav, setFav] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('b4it_m3alm_fav') || '[]');
    } catch {
      return [];
    }
  });
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Modals & Drawers state
  const [selectedPro, setSelectedPro] = useState(null);
  const [showLangModal, setShowLangModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [showAllCatsModal, setShowAllCatsModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [toast, setToast] = useState(null);

  // Dedicated Provider Routing state (/provider/:id) & Admin (/admin)
  const [isAdminRoute, setIsAdminRoute] = useState(() => window.location.pathname === '/admin');
  const [viewingProviderId, setViewingProviderId] = useState(() => {
    const match = window.location.pathname.match(/^\/provider\/([^\/]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  });
  const [dedicatedProvider, setDedicatedProvider] = useState(null);
  const [dedicatedLoading, setDedicatedLoading] = useState(false);



  // Real Reviews state
  const [activeReviews, setActiveReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [userReview, setUserReview] = useState(null);
  const [inputRating, setInputRating] = useState(5);
  const [inputComment, setInputComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState(null);

  // Form states for login/register modal
  const [authMode, setAuthMode] = useState('register'); // 'register' | 'login'
  const [accountType, setAccountType] = useState('customer'); // 'customer' | 'provider'
  const [loginPhone, setLoginPhone] = useState('');
  const [loginName, setLoginName] = useState('');
  const [loginCity, setLoginCity] = useState('الرباط');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginProfession, setLoginProfession] = useState('ديبانج وسحب السيارات');
  const [loginSubCraft, setLoginSubCraft] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Real Firestore Category/Profession Specific Providers state
  const [categoryRealPros, setCategoryRealPros] = useState([]);
  const [categoryProsLoading, setCategoryProsLoading] = useState(false);
  const [professionCounts, setProfessionCounts] = useState({});

  // Real Firestore Notifications state
  const [notifications, setNotifications] = useState([]);
  const [notifsLoading, setNotifsLoading] = useState(false);

  // Real-time calculation of provider counts per profession from Firestore
  const refreshProfessionCounts = async () => {
    try {
      const allPros = await getRealProvidersByProfession({ professionName: 'الكل', city: 'جميع المدن' });
      const counts = {};
      allPros.forEach(p => {
        const prof = p.professionName || p.category || p.job;
        if (prof) {
          counts[prof] = (counts[prof] || 0) + 1;
        }
      });
      setProfessionCounts(counts);
      if (allPros.length > 0) {
        setProsList(allPros);
      }
    } catch (err) {
      console.warn('[ProfessionCounts] Error:', err);
    }
  };

  useEffect(() => {
    refreshProfessionCounts();
  }, []);

  // Fetch real registered providers from Firestore whenever a category is clicked or city changes
  useEffect(() => {
    if (!selectedCategory) {
      setCategoryRealPros([]);
      return;
    }

    let isMounted = true;
    setCategoryProsLoading(true);

    getRealProvidersByProfession({ professionName: selectedCategory, city })
      .then((realPros) => {
        if (isMounted) {
          setCategoryRealPros(realPros);
          setCategoryProsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('[CategoryView] Fetch error:', err);
          setCategoryRealPros([]);
          setCategoryProsLoading(false);
        }
      });

    return () => { isMounted = false; };
  }, [selectedCategory, city]);

  // Real-time Firestore notifications subscription
  useEffect(() => {
    if (!user || !user.uid) {
      setNotifications([]);
      return;
    }

    setNotifsLoading(true);
    const unsubscribe = subscribeToUserNotifications(user.uid, (notifs) => {
      setNotifications(notifs);
      setNotifsLoading(false);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [user?.uid]);


  const t = T[lang] || T.ar;
  const isRtl = lang === 'ar';

  // Real Firebase Auth session subscription
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((profile) => {
      setUser(profile);
      setAuthLoading(false);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  useEffect(() => {
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    localStorage.setItem('b4it_m3alm_lang', lang);
  }, [lang, isRtl]);

  useEffect(() => {
    localStorage.setItem('b4it_m3alm_fav', JSON.stringify(fav));
  }, [fav]);

  // Synchronize favorites from Firestore when user logs in
  useEffect(() => {
    if (user && user.uid) {
      getFavoritesByCustomerId(user.uid)
        .then((favIds) => {
          if (Array.isArray(favIds) && favIds.length > 0) {
            setFav((prev) => {
              const combined = new Set([...prev]);
              favIds.forEach((id) => {
                const matched = prosList.find((p) => p.id === id);
                if (matched) combined.add(matched.name);
                else combined.add(id);
              });
              return Array.from(combined);
            });
          }
        })
        .catch((err) => console.warn('[Favorites] Firestore sync note:', err));
    }
  }, [user?.uid]);

  useEffect(() => {
    localStorage.setItem('b4it_m3alm_city', city);
  }, [city]);

  // Handle URL /provider/:id & /admin routing & browser Back/Forward (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/admin') {
        const isReview = isReviewEnvironment();
        const isRealAdmin = user && user.role === 'admin';
        if (!isReview && !isRealAdmin) {
          window.history.replaceState({}, '', '/');
          setIsAdminRoute(false);
          updateHomeSEO();
          return;
        }
        setIsAdminRoute(true);
        setViewingProviderId(null);
        updatePrivatePageSEO('لوحة الإدارة');
        return;
      }
      setIsAdminRoute(false);
      const match = path.match(/^\/provider\/([^\/]+)/);
      const proId = match ? decodeURIComponent(match[1]) : null;
      setViewingProviderId(proId);
      if (!proId) {
        setDedicatedProvider(null);
        updateHomeSEO();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user]);

  // Initial SEO metadata & direct route validation
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/admin') {
      const isReview = isReviewEnvironment();
      const isRealAdmin = user && user.role === 'admin';
      if (!isReview && !isRealAdmin && !authLoading) {
        window.history.replaceState({}, '', '/');
        setIsAdminRoute(false);
        updateHomeSEO();
        return;
      }
      updatePrivatePageSEO('لوحة الإدارة');
    } else if (!path.startsWith('/provider/')) {
      updateHomeSEO();
    }
  }, [user, authLoading]);

  // Fetch provider whenever viewingProviderId changes
  useEffect(() => {
    if (!viewingProviderId) {
      setDedicatedProvider(null);
      return;
    }

    let isMounted = true;
    setDedicatedLoading(true);

    getProviderDetails(viewingProviderId, prosList)
      .then((pro) => {
        if (isMounted) {
          setDedicatedProvider(pro);
          setDedicatedLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('[ProviderRouting] Fetch error:', err);
          setDedicatedProvider({ notFound: true });
          setDedicatedLoading(false);
        }
      });

    return () => { isMounted = false; };
  }, [viewingProviderId, prosList]);

  const handleOpenProvider = (proId) => {
    window.history.pushState({}, '', `/provider/${proId}`);
    setViewingProviderId(proId);
    setIsAdminRoute(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseProviderPage = () => {
    window.history.pushState({}, '', '/');
    setViewingProviderId(null);
    setDedicatedProvider(null);
    updateHomeSEO();
  };

  const handleOpenAdmin = () => {
    const isReview = isReviewEnvironment();
    const isRealAdmin = user && user.role === 'admin';
    if (!isReview && !isRealAdmin) {
      showToastMsg('عذراً، مسار الإدارة متاح للمسؤولين فقط.');
      return;
    }
    window.history.pushState({}, '', '/admin');
    setIsAdminRoute(true);
    setViewingProviderId(null);
    setShowSideMenu(false);
    updatePrivatePageSEO('لوحة الإدارة');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseAdmin = () => {
    window.history.pushState({}, '', '/');
    setIsAdminRoute(false);
    updateHomeSEO();
  };




  // Load real reviews from Firestore whenever selectedPro changes
  useEffect(() => {
    if (!selectedPro) {
      setActiveReviews([]);
      setUserReview(null);
      setInputComment('');
      setInputRating(5);
      setReviewError(null);
      return;
    }

    let isMounted = true;
    setReviewsLoading(true);

    getProviderReviews(selectedPro.id, selectedPro.reviewsList || [])
      .then((revs) => {
        if (isMounted) {
          setActiveReviews(revs);
          setReviewsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('[Review] Load error:', err);
          setReviewsLoading(false);
        }
      });

    // Check if current logged-in customer has already reviewed this pro
    if (user && user.uid && user.role === 'customer') {
      getUserReview(selectedPro.id, user.uid)
        .then((ur) => {
          if (isMounted && ur) {
            setUserReview(ur);
            setInputRating(ur.rating || 5);
            setInputComment(ur.comment || '');
          } else if (isMounted) {
            setUserReview(null);
            setInputRating(5);
            setInputComment('');
          }
        })
        .catch((err) => console.warn('[Review] Check existing error:', err));
    } else {
      setUserReview(null);
      setInputRating(5);
      setInputComment('');
    }

    return () => {
      isMounted = false;
    };
  }, [selectedPro, user]);

  const showToastMsg = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Submit or Edit Review
  const handleReviewSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!user) {
      setShowLoginModal(true);
      return;
    }

    if (user.role !== 'customer') {
      showToastMsg('التقييم متاح فقط لحسابات الزبائن');
      return;
    }

    const cleanComment = inputComment.trim();
    if (!cleanComment) {
      setReviewError('يرجى كتابة تعليق قبل إرسال التقييم');
      return;
    }

    setSubmittingReview(true);
    setReviewError(null);

    try {
      const result = await saveOrUpdateReview({
        providerId: selectedPro.id,
        customerUid: user.uid,
        customerName: user.fullName || user.name || 'زبون معتمد',
        rating: inputRating,
        comment: cleanComment
      });

      // Update active reviews list in UI
      setActiveReviews((prev) => {
        const idx = prev.findIndex((r) => r.id === result.review.id || r.customerUid === user.uid);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = result.review;
          return updated;
        }
        return [result.review, ...prev];
      });

      setUserReview(result.review);

      // Synchronize pro rating & count in both selectedPro and prosList
      const newRating = result.stats.rating;
      const newReviewsCount = result.stats.reviewsCount;

      setSelectedPro((prev) => prev ? { ...prev, rating: newRating, reviews: newReviewsCount } : prev);
      setProsList((prev) => prev.map((p) => p.id === selectedPro.id ? { ...p, rating: newRating, reviews: newReviewsCount } : p));

      showToastMsg(result.isEdit ? 'تم تحديث تقييمك بنجاح ⭐' : 'شكراً لك! تمت إضافة تقييمك بنجاح ⭐');
    } catch (err) {
      setReviewError(err.message || 'حدث خطأ أثناء حفظ التقييم');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Delete review
  const handleDeleteReview = async () => {
    if (!user || !selectedPro || !userReview) return;
    setSubmittingReview(true);
    setReviewError(null);
    try {
      await deleteReview(selectedPro.id, user.uid);
      setUserReview(null);
      setInputComment('');
      setInputRating(5);
      setActiveReviews((prev) => prev.filter((r) => r.customerUid !== user.uid));
      setSelectedPro((prev) => prev ? { ...prev, reviews: Math.max(0, (prev.reviews || 1) - 1) } : prev);
      setProsList((prev) => prev.map((p) => p.id === selectedPro.id ? { ...p, reviews: Math.max(0, (p.reviews || 1) - 1) } : p));
      showToastMsg('تم حذف تقييمك بنجاح 🗑️');
    } catch (err) {
      setReviewError(err.message || 'حدث خطأ أثناء حذف التقييم');
    } finally {
      setSubmittingReview(false);
    }
  };

  const toggleFav = async (proName, e) => {
    if (e) e.stopPropagation();
    const exists = fav.includes(proName);
    const next = exists ? prev => prev.filter((n) => n !== proName) : prev => [...prev, proName];
    setFav(next);
    showToastMsg(exists ? 'تمت الإزالة من المفضلة' : 'تمت الإضافة إلى المفضلة ❤️');

    if (user && user.uid) {
      const targetPro = prosList.find((p) => p.name === proName);
      const proId = targetPro ? targetPro.id : proName;
      try {
        if (exists) {
          await removeFavorite(user.uid, proId);
        } else {
          await addFavorite(user.uid, proId);
        }
      } catch (err) {
        console.warn('[Favorites] Firestore sync error:', err.message);
      }
    }
  };

  const handleCall = (pro, e) => {
    if (e) e.stopPropagation();
    showToastMsg(`جاري الاتصال بالمعلم ${pro.name}...`);
    window.location.href = `tel:${pro.phone}`;
  };

  const handleWhatsApp = (pro, e) => {
    if (e) e.stopPropagation();
    const text = encodeURIComponent(`السلام عليكم، تواصلت معك عبر منصة بغيت معلم بخصوص خدمة ${pro.job}.`);
    window.open(`https://wa.me/${pro.whatsapp}?text=${text}`, '_blank');
  };

  const handleGeneralWhatsApp = () => {
    const text = encodeURIComponent('السلام عليكم، أحتاج مساعدة في البحث عن معلم محترف عبر منصة بغيت معلم.');
    window.open(`https://wa.me/212661234567?text=${text}`, '_blank');
  };

  // Password-based Registration Handler
  const handleRegisterWithPassword = async (e) => {
    if (e) e.preventDefault();
    setAuthError(null);

    const norm = normalizeMoroccanPhone(loginPhone);
    if (!isValidMoroccanPhone(norm)) {
      setAuthError('يرجى إدخال رقم هاتف مغربي صحيح (مثال: 0612345678 أو 0712345678)');
      return;
    }

    if (!loginName.trim()) {
      setAuthError('يرجى إدخال الاسم الكامل.');
      return;
    }

    const pwdCheck = validatePassword(loginPassword);
    if (!pwdCheck.isValid) {
      setAuthError(pwdCheck.message);
      return;
    }

    setAuthSubmitting(true);
    try {
      const profId = accountType === 'provider' ? (cats.find(c => c[0] === loginProfession)?.[4] || 'other') : null;
      const profile = await registerUserWithPassword({
        fullName: loginName.trim(),
        phone: norm,
        password: loginPassword.trim(),
        role: accountType,
        cityId: loginCity || (city !== 'جميع المدن' ? city : 'الرباط'),
        professionName: accountType === 'provider' ? loginProfession : null,
        professionId: profId,
        subCraft: accountType === 'provider' ? loginSubCraft : null,
        whatsapp: norm
      });

      setUser(profile);
      setShowLoginModal(false);
      setLoginPassword('');
      refreshProfessionCounts();
      showToastMsg(`مرحباً بك ${profile.fullName || profile.name}! تم إنشاء الحساب بنجاح كـ ${accountType === 'provider' ? 'معلم محترف' : 'زبون معتمد'}.`);
    } catch (err) {
      setAuthError(err.message || 'حدث خطأ أثناء إنشاء الحساب.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Password-based Login Handler
  const handleLoginWithPassword = async (e) => {
    if (e) e.preventDefault();
    setAuthError(null);

    const norm = normalizeMoroccanPhone(loginPhone);
    if (!isValidMoroccanPhone(norm)) {
      setAuthError('يرجى إدخال رقم هاتف مغربي صحيح.');
      return;
    }

    const pwdCheck = validatePassword(loginPassword);
    if (!pwdCheck.isValid) {
      setAuthError(pwdCheck.message);
      return;
    }

    setAuthSubmitting(true);
    try {
      const profile = await loginUserWithPassword({
        phone: norm,
        password: loginPassword.trim()
      });

      setUser(profile);
      setShowLoginModal(false);
      setLoginPassword('');
      refreshProfessionCounts();
      showToastMsg(`أهلاً بك مجدداً ${profile.fullName || profile.name}!`);
    } catch (err) {
      setAuthError(err.message || 'حدث خطأ أثناء تسجيل الدخول.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Instant test login for testing environment
  const handleQuickDemoAuth = async (type = 'customer') => {
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      const demoData = type === 'provider'
        ? {
            uid: 'usr_demo_provider_01',
            role: 'provider',
            fullName: 'معلم يوسف النجار',
            phone: '0661234567',
            cityId: 'مراكش',
            professionId: 'mechanics',
            professionName: 'ميكانيك السيارات'
          }
        : {
            uid: 'usr_demo_customer_01',
            role: 'customer',
            fullName: 'محمد أمين التازي',
            phone: '0678901234',
            cityId: 'الرباط'
          };

      const profile = await createUserProfile(demoData);
      localStorage.setItem('b4it_m3alm_session_uid', profile.uid);
      setUser(profile);
      setShowLoginModal(false);
      showToastMsg(`تم الدخول بنجاح كـ ${type === 'provider' ? 'معلم محترف' : 'زبون معتمد'}`);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await signOutUser();
    setUser(null);
    showToastMsg('تم تسجيل الخروج بنجاح.');
  };


  const handleCategoryClick = (catName) => {
    if (selectedCategory === catName) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(catName);
      if (active !== 'home' && active !== 'search') setActive('home');
      // Scroll gently to pros section
      setTimeout(() => {
        const el = document.getElementById('pros-list-anchor');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const handleResetFilters = () => {
    setQuery('');
    setCity('جميع المدن');
    setSelectedCategory(null);
    showToastMsg('تمت إعادة ضبط جميع الفلاتر');
  };

  // Real multi-field search and compound city/category filters
  const filteredPros = filterProvidersList(prosList, {
    searchQuery: query,
    city,
    category: selectedCategory
  });

  const favoritePros = filterProvidersList(prosList.filter((p) => fav.includes(p.name)));

  // Unread notifications count across all types (review + rating + like)
  const unreadNotifsCount = notifications.filter((n) => !n.isRead && n.unread !== false).length;


  // Resolve active category meta
  const activeCatObj = selectedCategory ? (cats.find(c => c[0] === selectedCategory) || [selectedCategory, 0, Wrench, 'blue', 'category', []]) : null;
  const CatIcon = activeCatObj ? activeCatObj[2] : null;
  const catColor = activeCatObj ? activeCatObj[3] : 'blue';
  const catSubCrafts = activeCatObj ? activeCatObj[5] : [];

  return (
    <div className="app" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Toast Bar */}
      {toast && (
        <div className="toast-bar">
          <Info size={18} />
          <span>{toast}</span>
        </div>
      )}

      {/* HEADER */}
      <header className="header">
        <div
          className="brand"
          onClick={() => setActive('home')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActive('home'); }}
        >
          <div className="logo-mark">🎓</div>
          <div>
            <b>{t.brand_name}</b>
            <span>{t.brand_sub}</span>
          </div>
        </div>

        <div className="top-actions">
          <button className="pill" onClick={() => setShowCityModal(true)} aria-label="اختيار المدينة">
            <MapPin className="city-map-icon" /> {city} <ChevronDown />
          </button>
          <button
            className="login"
            onClick={() => {
              if (user) {
                setActive('account');
              } else {
                setShowLoginModal(true);
              }
            }}
          >
            <UserRound /> {user ? user.name.split(' ')[0] : t.login_btn}
          </button>
          <button className="menu" onClick={() => setShowSideMenu(true)} aria-label="القائمة">
            <Menu />
          </button>
          <button className="pill" onClick={() => setShowLangModal(true)} style={{ display: 'none' }} aria-hidden="true" tabIndex={-1}>
            <Globe2 /> {t.lang_name} <ChevronDown />
          </button>
        </div>
      </header>

      {/* MAIN VIEW CONTENT ACCORDING TO BOTTOM NAV & DIRECT ROUTE */}
      <main>
        {isAdminRoute && (isReviewEnvironment() || user?.role === 'admin') ? (
          <AdminDashboard
            user={user}
            onUserUpdate={(u) => setUser(u)}
            onBackToApp={handleCloseAdmin}
            seedProviders={prosList}
            showToastMsg={showToastMsg}
            isRtl={isRtl}
          />
        ) : viewingProviderId ? (
          dedicatedLoading ? (
            <div className="view-wrap" style={{ textAlign: 'center', padding: '60px 16px', color: '#64748b' }}>
              <span className="spinner" style={{ width: 24, height: 24, display: 'inline-block', verticalAlign: -4, marginLeft: 8 }}></span>
              جاري تحميل بيانات المعلم...
            </div>
          ) : (
            <ProviderPage
              provider={dedicatedProvider}
              user={user}
              isFavorite={dedicatedProvider ? fav.includes(dedicatedProvider.name) : false}
              onToggleFavorite={(name) => toggleFav(name)}
              onBack={handleCloseProviderPage}
              onOpenLogin={() => setShowLoginModal(true)}
              showToastMsg={showToastMsg}
              isRtl={isRtl}
            />
          )
        ) : (
          <>
            {active === 'home' && (

              <>
                {/* HERO SECTION */}
            <section className="hero">
              <img src={hero} className="hero-photo" alt="محترف" />
              <div className="hero-content">
                <div className="verified">
                  <ShieldCheck /> {t.hero_badge}
                </div>
                <h1>{t.hero_title_1}<br />{t.hero_title_2}</h1>
                <p>{t.hero_sub}</p>
              </div>

              <div className="searchbox">
                <button className="city" onClick={() => setShowCityModal(true)}>
                  <ChevronDown /> <span>{city}</span><MapPin className="city-map-icon" />
                </button>
                <div className="searchinput">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t.search_placeholder}
                  />
                  <Search
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      const el = document.getElementById('pros-list-anchor');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                  />
                </div>
              </div>

              <div className="benefits">
                <span><Star /> {t.ben_reviews}</span>
                <i></i>
                <span><MessageCircle /> {t.ben_direct}</span>
                <i></i>
                <span><ShieldCheck /> {t.ben_verified}</span>
                <i></i>
                <span><Zap /> {t.ben_fast}</span>
              </div>
            </section>

            {/* ACTIVE FILTERS INDICATOR BAR */}
            {(query || city !== 'جميع المدن' || selectedCategory) && (
              <div className="filter-bar">
                {query && (
                  <span className="filter-tag">
                    {t.search_results_for} "{query}"
                    <button onClick={() => setQuery('')}><X size={14} /></button>
                  </span>
                )}
                {city !== 'جميع المدن' && (
                  <span className="filter-tag">
                    {t.in_city} {city}
                    <button onClick={() => setCity('جميع المدن')}><X size={14} /></button>
                  </span>
                )}
                {selectedCategory && (
                  <span className="filter-tag">
                    {t.category_filter} {selectedCategory}
                    <button onClick={() => setSelectedCategory(null)}><X size={14} /></button>
                  </span>
                )}
                <button className="clear-all-btn" onClick={handleResetFilters}>
                  {t.clear_filters}
                </button>
              </div>
            )}

            {selectedCategory ? (
              /* DEDICATED PROFESSION VIEW (عند الضغط على أي بطاقة مهنة) */
              <section className="section profession-page" id="profession-view-anchor">
                {/* DEDICATED PROFESSION BANNER CARD */}
                <div className={`profession-header-card ${catColor}`} style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      {CatIcon && (
                        <span className="cat-icon" style={{ width: 62, height: 62, borderRadius: 16, flexShrink: 0 }}>
                          <CatIcon size={32} />
                        </span>
                      )}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#0b315d' }}>
                            {selectedCategory}
                          </h1>
                          <span className="badge-pill" style={{ background: '#fff', color: '#09569c', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
                            {categoryProsLoading ? 'جاري التحميل...' : `${categoryRealPros.length} معلم مسجل`}
                          </span>
                        </div>
                        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
                          قائمة الحرفيين والمعلمين المعتمدين في مهنة <strong>{selectedCategory}</strong> {city !== 'جميع المدن' ? `بمدينة ${city}` : 'في جميع المدن المغربية'}.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedCategory(null)}
                      style={{
                        border: '1px solid #cbd5e1',
                        background: '#fff',
                        color: '#475569',
                        borderRadius: 12,
                        padding: '8px 14px',
                        font: '700 13px Cairo',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <ArrowLeft style={{ transform: isRtl ? 'none' : 'rotate(180deg)' }} size={16} />
                      العودة لكافة المهن
                    </button>
                  </div>

                  {/* Sub-specialties tags */}
                  {catSubCrafts && catSubCrafts.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14, paddingTop: 12, borderTop: '1px dashed #cbd5e1' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginLeft: 4, alignSelf: 'center' }}>
                        التخصصات المشمولة:
                      </span>
                      {catSubCrafts.map((sub, sIdx) => (
                        <span
                          key={sIdx}
                          style={{
                            background: '#fff',
                            border: '1px solid #e2e8f0',
                            color: '#334155',
                            borderRadius: 14,
                            padding: '3px 10px',
                            fontSize: 12
                          }}
                        >
                          ✓ {sub}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* CITY FILTER ROW FOR THIS PROFESSION */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '18px 0 14px', flexWrap: 'wrap', gap: 10 }}>
                  <h2 style={{ margin: 0, fontSize: 18, color: '#0b315d' }}>
                    المعلمون المسجلون في {selectedCategory} ({categoryRealPros.length})
                  </h2>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      className="pill"
                      onClick={() => setShowCityModal(true)}
                      style={{ background: '#fff', border: '1px solid #cbd5e1' }}
                    >
                      <MapPin className="city-map-icon" /> المدينة: <strong>{city}</strong> <ChevronDown size={14} />
                    </button>
                    {city !== 'جميع المدن' && (
                      <button
                        onClick={() => setCity('جميع المدن')}
                        style={{ border: 0, background: 'transparent', color: '#09569c', fontSize: 12, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        عرض جميع المدن
                      </button>
                    )}
                  </div>
                </div>

                {/* REAL REGISTERED CRAFTSMEN IN EXACT ARTICLE.PRO CARD DESIGN */}
                {categoryProsLoading ? (
                  <div className="empty-box" style={{ padding: '40px 20px' }}>
                    <span className="spinner" style={{ width: 26, height: 26, display: 'inline-block', verticalAlign: -4, marginLeft: 8, borderTopColor: '#09569c', borderColor: '#cbd5e1' }}></span>
                    <h4 style={{ marginTop: 12 }}>جاري جلب المعلمين المسجلين في Firestore...</h4>
                  </div>
                ) : categoryRealPros.length > 0 ? (
                  <div className="pros">
                    {categoryRealPros.map((p) => (
                      <article
                        className="pro"
                        key={p.id || p.name}
                        onClick={() => handleOpenProvider(p.id)}
                      >
                        <button
                          className={`heart ${fav.includes(p.name) ? 'on' : ''}`}
                          onClick={(e) => toggleFav(p.name, e)}
                          title="إضافة للمفضلة"
                          aria-label={fav.includes(p.name) ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
                        >
                          <Heart />
                        </button>

                        <div className="photo-wrap">
                          <img
                            src={p.img}
                            alt={`صورة المعلم ${p.name}`}
                            loading="lazy"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=150&auto=format&fit=crop&q=80';
                            }}
                          />
                          <span className="check"><ShieldCheck /></span>
                        </div>

                        <span className="available">{t.available_now}</span>
                        <div className="rating">
                          <Star /> {p.rating} <small>({p.reviews})</small>
                        </div>

                        <h3>{p.name}</h3>
                        <p>{p.job || selectedCategory}</p>
                        <span className="loc"><MapPin /> {p.city}</span>

                        <div className="contact">
                          <button className="call" onClick={(e) => handleCall(p, e)} aria-label={`اتصال مباشر بالمعلم ${p.name}`}>
                            <Phone /> {t.call}
                          </button>
                          <button className="wa" onClick={(e) => handleWhatsApp(p, e)} aria-label={`مراسلة المعلم ${p.name} عبر واتساب`}>
                            <MessageCircle /> {t.whatsapp}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-box">
                    <AlertCircle style={{ color: '#09569c', width: 46, height: 46 }} />
                    <h4 style={{ fontSize: 18, color: '#0b315d', marginTop: 10 }}>لا يوجد معلم مسجل حالياً في هذه المهنة</h4>
                    <p style={{ maxWidth: 420, margin: '6px auto 18px' }}>
                      لم يسجل أي حرفي حتى الآن في تخصص «{selectedCategory}»
                      {city !== 'جميع المدن' ? ` بمدينة ${city}` : ''}. كن أول من ينضم ويستقبل طلبات الزبائن!
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
                      {city !== 'جميع المدن' && (
                        <button className="btn-secondary" onClick={() => setCity('جميع المدن')} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid #cbd5e1', cursor: 'pointer' }}>
                          البحث في جميع المدن
                        </button>
                      )}
                      <button
                        className="btn-primary"
                        onClick={() => {
                          setAccountType('provider');
                          setLoginProfession(selectedCategory);
                          setShowLoginModal(true);
                        }}
                      >
                        سجل الآن كمعلم في {selectedCategory}
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => setSelectedCategory(null)}
                        style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid #cbd5e1', cursor: 'pointer' }}
                      >
                        تصفح باقي المهن
                      </button>
                    </div>
                  </div>
                )}
              </section>
            ) : (
              <>
                {/* CATEGORIES SECTION */}
                <section className="section">
                  <div className="section-head">
                    <h2>{t.cats_title}</h2>
                    <button onClick={() => setShowAllCatsModal(true)}>
                      {t.cats_view_all} <ArrowLeft style={{ transform: isRtl ? 'none' : 'rotate(180deg)' }} />
                    </button>
                  </div>
                  <div className="cats">
                    {cats.slice(0, 16).map(([n, c, I, color]) => (
                      <button
                        className={`cat ${color} ${selectedCategory === n ? 'selected' : ''}`}
                        key={n}
                        onClick={() => handleCategoryClick(n)}
                      >
                        <span className="cat-icon"><I /></span>
                        <strong>{n}</strong>
                        <small>{professionCounts[n] !== undefined ? `${professionCounts[n]} معلمين` : `${c} مهن`}</small>
                      </button>
                    ))}
                  </div>
                </section>

                {/* FEATURED PROS SECTION */}
                <section className="section pros-section" id="pros-list-anchor">
                  <div className="section-head">
                    <h2>{t.pros_title} ({filteredPros.length})</h2>
                    <button onClick={handleResetFilters}>
                      {t.pros_view_all} <ArrowLeft style={{ transform: isRtl ? 'none' : 'rotate(180deg)' }} />
                    </button>
                  </div>

                  {filteredPros.length > 0 ? (
                    <div className="pros">
                      {filteredPros.map((p) => (
                        <article
                          className="pro"
                          key={p.id || p.name}
                          onClick={() => handleOpenProvider(p.id)}
                        >
                          <button
                            className={`heart ${fav.includes(p.name) ? 'on' : ''}`}
                            onClick={(e) => toggleFav(p.name, e)}
                            title="إضافة للمفضلة"
                            aria-label={fav.includes(p.name) ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
                          >
                            <Heart />
                          </button>

                          <div className="photo-wrap">
                            <img
                              src={p.img}
                              alt={`صورة المعلم ${p.name}`}
                              loading="lazy"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=150&auto=format&fit=crop&q=80';
                              }}
                            />
                            <span className="check"><ShieldCheck /></span>
                          </div>

                          <span className="available">{t.available_now}</span>
                          <div className="rating">
                            <Star /> {p.rating} <small>({p.reviews})</small>
                          </div>

                          <h3>{p.name}</h3>
                          <p>{p.job}</p>
                          <span className="loc"><MapPin /> {p.city}</span>

                          <div className="contact">
                            <button className="call" onClick={(e) => handleCall(p, e)} aria-label={`اتصال مباشر بالمعلم ${p.name}`}>
                              <Phone /> {t.call}
                            </button>
                            <button className="wa" onClick={(e) => handleWhatsApp(p, e)} aria-label={`مراسلة المعلم ${p.name} عبر واتساب`}>
                              <MessageCircle /> {t.whatsapp}
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-box">
                      <AlertCircle />
                      <h4>{t.no_results}</h4>
                      <p>لم نجد أي معلم مطابق للبحث "{query || city || selectedCategory}". جرب اختيار مدينة أخرى أو مسح الفلاتر.</p>
                      <button className="btn-primary" onClick={handleResetFilters}>
                        {t.reset_search}
                      </button>
                    </div>
                  )}
                </section>
              </>
            )}

            {/* WHATSAPP BANNER */}
            <section className="whatsapp">
              <div className="wa-art" aria-hidden="true">📱💬</div>
              <div>
                <h3>{t.wa_banner_title}</h3>
                <p>{t.wa_banner_sub}</p>
              </div>
              <button onClick={handleGeneralWhatsApp} aria-label="تواصل مع فريق الدعم عبر واتساب">
                <MessageCircle /> {t.wa_banner_btn}
              </button>
            </section>
          </>
        )}

        {/* SEARCH TAB VIEW */}
        {active === 'search' && (
          <div className="view-wrap">
            <div className="section-head">
              <h2>🔎 {t.nav_search}</h2>
              <button onClick={() => setActive('home')}>{t.nav_home}</button>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e2e8ef', borderRadius: 16, padding: 18, marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <button
                  className="pill"
                  onClick={() => setShowCityModal(true)}
                  style={{ whiteSpace: 'nowrap' }}
                  aria-label={`تغيير المدينة الحالية: ${city}`}
                >
                  <MapPin size={16} /> {city} <ChevronDown size={14} />
                </button>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: '#f7faff', border: '1px solid #e2e9f2', borderRadius: 24, padding: '0 14px' }}>
                  <Search size={18} color="#64748b" aria-hidden="true" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t.search_placeholder}
                    aria-label="حقل البحث عن الحرفيين والمهن"
                    style={{ border: 0, outline: 0, background: 'transparent', width: '100%', padding: '10px 8px', font: '600 14px Cairo', color: '#0b315d' }}
                  />
                  {query && (
                    <button onClick={() => setQuery('')} aria-label="مسح نص البحث" style={{ border: 0, background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Category Chips */}
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 }}>
                {cats.map(([n, , I]) => (
                  <button
                    key={n}
                    onClick={() => setSelectedCategory(selectedCategory === n ? null : n)}
                    aria-label={`تصفية حسب مهنة ${n}`}
                    style={{
                      border: selectedCategory === n ? '2px solid #09569c' : '1px solid #e2e8ef',
                      background: selectedCategory === n ? '#eef5ff' : '#fff',
                      color: selectedCategory === n ? '#09569c' : '#334155',
                      borderRadius: 20,
                      padding: '6px 12px',
                      font: '700 12px Cairo',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <I size={14} /> {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="section-head">
              <h3>نتائج البحث ({filteredPros.length})</h3>
              {(query || city !== 'جميع المدن' || selectedCategory) && (
                <button className="clear-all-btn" onClick={handleResetFilters}>
                  {t.clear_filters}
                </button>
              )}
            </div>

            {filteredPros.length > 0 ? (
              <div className="pros">
                {filteredPros.map((p) => (
                  <article className="pro" key={p.id || p.name} onClick={() => handleOpenProvider(p.id)}>
                    <button
                      className={`heart ${fav.includes(p.name) ? 'on' : ''}`}
                      onClick={(e) => toggleFav(p.name, e)}
                      aria-label={fav.includes(p.name) ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
                    >
                      <Heart />
                    </button>
                    <div className="photo-wrap">
                      <img
                        src={p.img}
                        alt={`صورة المعلم ${p.name}`}
                        loading="lazy"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=150&auto=format&fit=crop&q=80';
                        }}
                      />
                      <span className="check"><ShieldCheck /></span>
                    </div>
                    <span className="available">{t.available_now}</span>
                    <div className="rating"><Star /> {p.rating} <small>({p.reviews})</small></div>
                    <h3>{p.name}</h3>
                    <p>{p.job}</p>
                    <span className="loc"><MapPin /> {p.city}</span>
                    <div className="contact">
                      <button className="call" onClick={(e) => handleCall(p, e)} aria-label={`اتصال مباشر بالمعلم ${p.name}`}><Phone /> {t.call}</button>
                      <button className="wa" onClick={(e) => handleWhatsApp(p, e)} aria-label={`مراسلة المعلم ${p.name} عبر واتساب`}><MessageCircle /> {t.whatsapp}</button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-box">
                <AlertCircle />
                <h4>{t.no_results}</h4>
                <p>جرب تغيير مصطلح البحث أو اختيار مدينة أخرى.</p>
                <button className="btn-primary" onClick={handleResetFilters}>{t.reset_search}</button>
              </div>
            )}
          </div>
        )}

        {/* FAVORITES VIEW */}
        {active === 'favorites' && (
          <div className="view-wrap">
            <div className="section-head">
              <h2>❤️ {t.nav_fav} ({favoritePros.length})</h2>
              <button onClick={() => setActive('home')}>{t.nav_home}</button>
            </div>

            {favoritePros.length > 0 ? (
              <div className="pros">
                {favoritePros.map((p) => (
                  <article className="pro" key={p.id || p.name} onClick={() => handleOpenProvider(p.id)}>
                    <button
                      className="heart on"
                      onClick={(e) => toggleFav(p.name, e)}
                      aria-label="إزالة من المفضلة"
                    >
                      <Heart />
                    </button>
                    <div className="photo-wrap">
                      <img
                        src={p.img}
                        alt={`صورة المعلم ${p.name}`}
                        loading="lazy"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=150&auto=format&fit=crop&q=80';
                        }}
                      />
                      <span className="check"><ShieldCheck /></span>
                    </div>
                    <span className="available">{t.available_now}</span>
                    <div className="rating"><Star /> {p.rating} <small>({p.reviews})</small></div>
                    <h3>{p.name}</h3>
                    <p>{p.job}</p>
                    <span className="loc"><MapPin /> {p.city}</span>
                    <div className="contact">
                      <button className="call" onClick={(e) => handleCall(p, e)} aria-label={`اتصال مباشر بالمعلم ${p.name}`}><Phone /> {t.call}</button>
                      <button className="wa" onClick={(e) => handleWhatsApp(p, e)} aria-label={`مراسلة المعلم ${p.name} عبر واتساب`}><MessageCircle /> {t.whatsapp}</button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-box">
                <Heart style={{ color: '#ef3b62' }} />
                <h4>{t.fav_empty}</h4>
                <p>{t.fav_empty_sub}</p>
                <button className="btn-primary" onClick={() => setActive('home')}>
                  {t.browse_pros}
                </button>
              </div>
            )}
          </div>
        )}

        {/* NOTIFICATIONS VIEW */}
        {active === 'notifications' && (
          <div className="view-wrap">
            <div className="section-head">
              <h2>🔔 {t.nav_notif} {user && notifications.length > 0 ? `(${notifications.length})` : ''}</h2>
              {user && notifications.length > 0 && (
                <button
                  onClick={async () => {
                    await markAllNotificationsAsRead(user.uid);
                    showToastMsg('تم تعليم كافة الإشعارات كمقروءة');
                  }}
                  style={{
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    borderRadius: 10,
                    padding: '6px 12px',
                    font: '700 12px Cairo',
                    color: '#09569c',
                    cursor: 'pointer'
                  }}
                >
                  تعليم الكل كمقروء
                </button>
              )}
            </div>

            {!user ? (
              <div className="empty-box">
                <Bell size={40} style={{ color: '#09569c', margin: '0 auto 12px' }} />
                <h4>تسجيل الدخول مطلوب</h4>
                <p>يرجى تسجيل الدخول بحسابك لعرض الإشعارات والتفاعلات الواردة إليك.</p>
                <button className="btn-primary" onClick={() => setShowLoginModal(true)}>
                  تسجيل الدخول الآن
                </button>
              </div>
            ) : notifsLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                <span className="spinner" style={{ width: 22, height: 22, display: 'inline-block', verticalAlign: -4, marginLeft: 8 }}></span>
                جاري جلب إشعاراتك من Firestore...
              </div>
            ) : notifications.length === 0 ? (
              <div className="empty-box">
                <Bell size={40} style={{ color: '#cbd5e1', margin: '0 auto 12px' }} />
                <h4>لا توجد إشعارات جديدة</h4>
                <p>ستظهر هنا أي تفاعلات جديدة (تقييمات، تعليقات، أو إعجابات) تخص حسابك.</p>
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = !n.isRead && n.unread !== false;
                return (
                  <div
                    className={`notif-card ${isUnread ? 'notif-unread' : ''}`}
                    key={n.id}
                    onClick={async () => {
                      if (isUnread) {
                        await markNotificationAsRead(n.id);
                      }
                      if (n.providerId) {
                        if (isTombstonedProvider(n.providerId)) {
                          showToastMsg('عذراً، هذا المعلم لم يعد متاحاً أو تم حذف حسابه');
                        } else {
                          handleOpenProvider(n.providerId);
                        }
                      }
                    }}
                  >
                    <div
                      className="notif-icon"
                      style={{
                        background: n.type === 'like' ? '#eff6ff' : (n.type === 'review' ? '#fef3c7' : '#e0efff'),
                        color: n.type === 'like' ? '#1d4ed8' : (n.type === 'review' ? '#b45309' : '#09569c')
                      }}
                    >
                      {n.type === 'like' ? <ThumbsUp size={18} /> : (n.type === 'review' ? <Star size={18} fill="#f4b500" color="#f4b500" /> : <Bell size={18} />)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          {isUnread && <span className="notif-unread-dot" />}
                          <strong style={{ fontSize: 14, color: '#0b315d' }}>{n.actorName}</strong>
                          <span style={{ fontSize: 11, color: '#64748b', marginRight: 6 }}>
                            ({n.type === 'like' ? 'إعجاب 👍' : (n.type === 'review' ? 'تقييم جديد ⭐' : 'تفاعل')})
                          </span>
                        </div>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>{n.formattedDate || n.date || 'الآن'}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: '#334155', lineHeight: 1.5 }}>
                        {n.message || n.body}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ACCOUNT VIEW */}
        {active === 'account' && (
          <div className="view-wrap">
            <div className="section-head">
              <h2>👤 {t.nav_account}</h2>
              <button onClick={() => setActive('home')}>{t.nav_home}</button>
            </div>

            <div className="account-box">
              <div className="account-avatar">
                {user ? user.name.slice(0, 1) : '👤'}
              </div>

              {user ? (
                <>
                  <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <div className="account-avatar">
                      {user.role === 'provider' ? '👷‍♂️' : (user.fullName ? user.fullName.slice(0, 1) : '👤')}
                    </div>
                    <h3 style={{ margin: '0 0 6px', fontSize: 20, color: '#0b315d' }}>
                      {user.fullName || user.name}
                    </h3>
                    <span
                      style={{
                        display: 'inline-block',
                        background: user.role === 'admin' ? '#fee2e2' : (user.role === 'provider' ? '#dcfce7' : '#e0efff'),
                        color: user.role === 'admin' ? '#991b1b' : (user.role === 'provider' ? '#15803d' : '#09569c'),
                        padding: '4px 14px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 700
                      }}
                    >
                      {user.role === 'admin' ? '🛡️ مسؤول النظام (Admin)' : (user.role === 'provider' ? '✓ معلم مهني معتمد' : '✓ حساب زبون')}
                    </span>
                  </div>

                  {user.role === 'admin' && (
                    <button
                      className="btn-primary"
                      style={{ width: '100%', background: '#0b315d', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      onClick={handleOpenAdmin}
                    >
                      <ShieldCheck size={18} /> فتح لوحة تحكم الإدارة (Admin Panel)
                    </button>
                  )}

                  <div className="account-row">
                    <span className="account-label">نوع الحساب (Role)</span>
                    <span className="account-val" style={{ color: user.role === 'admin' ? '#991b1b' : (user.role === 'provider' ? '#15803d' : '#09569c') }}>
                      {user.role === 'admin' ? 'مسؤول (Admin)' : (user.role === 'provider' ? 'معلم (Provider)' : 'زبون (Customer)')}
                    </span>
                  </div>

                  {user.role === 'provider' && user.professionName && (
                    <div className="account-row">
                      <span className="account-label">المهنة المسجلة</span>
                      <span className="account-val">{user.professionName}</span>
                    </div>
                  )}

                  <div className="account-row">
                    <span className="account-label">رقم الهاتف</span>
                    <span className="account-val">{formatPhoneForDisplay(user.phone || user.phoneNumber)}</span>
                  </div>

                  <div className="account-row">
                    <span className="account-label">الرقم الموحد (Normalized)</span>
                    <span className="account-val" style={{ direction: 'ltr', fontFamily: 'monospace', fontSize: 13 }}>
                      {user.normalizedPhone || normalizeMoroccanPhone(user.phone)}
                    </span>
                  </div>

                  <div className="account-row">
                    <span className="account-label">المدينة</span>
                    <span className="account-val">{user.cityId || user.city || city}</span>
                  </div>

                  <div className="account-row">
                    <span className="account-label">معرف الحساب (UID)</span>
                    <span className="account-val" style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>
                      {user.uid}
                    </span>
                  </div>

                  <div className="account-row">
                    <span className="account-label">المعلمين في المفضلة</span>
                    <span className="account-val">{fav.length} معلم</span>
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                    <button
                      className="btn-primary"
                      style={{ flex: 1 }}
                      onClick={() => setActive('favorites')}
                    >
                      عرض المفضلة ({fav.length})
                    </button>
                    <button
                      onClick={handleLogout}
                      style={{
                        border: '1px solid #fee2e2',
                        background: '#fef2f2',
                        color: '#dc2626',
                        borderRadius: 12,
                        padding: '10px 16px',
                        font: '700 14px Cairo',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <LogOut size={16} /> خروج
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <h3 style={{ margin: '0 0 6px', fontSize: 20, color: '#0b315d' }}>
                      تسجيل الدخول / إنشاء حساب
                    </h3>
                    <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>
                      سجل الآن كزبون أو معلم للوصول لحسابك الموثق
                    </p>
                  </div>

                  <button
                    className="btn-primary"
                    style={{ width: '100%', padding: '12px', fontSize: 15, marginBottom: 12 }}
                    onClick={() => {
                      setAuthStep('form');
                      setAuthError(null);
                      setShowLoginModal(true);
                    }}
                  >
                    <UserRound size={18} style={{ verticalAlign: -3, marginLeft: 6 }} />
                    فتح نافذة تسجيل الدخول برقم الهاتف (OTP)
                  </button>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button
                      onClick={() => handleQuickDemoAuth('customer')}
                      disabled={authSubmitting}
                      style={{
                        border: '1px solid #bae6fd',
                        background: '#f0f9ff',
                        color: '#0369a1',
                        borderRadius: 12,
                        padding: 10,
                        font: '700 12px Cairo',
                        cursor: 'pointer'
                      }}
                    >
                      ⚡ تجربة كزبون (Customer)
                    </button>
                    <button
                      onClick={() => handleQuickDemoAuth('provider')}
                      disabled={authSubmitting}
                      style={{
                        border: '1px solid #bbf7d0',
                        background: '#f0fdf4',
                        color: '#166534',
                        borderRadius: 12,
                        padding: 10,
                        font: '700 12px Cairo',
                        cursor: 'pointer'
                      }}
                    >
                      ⚡ تجربة كمعلم (Provider)
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
          </>
        )}
      </main>


      {/* BOTTOM NAVIGATION */}
      <nav className="bottom">
        <button
          className={active === 'account' ? 'active' : ''}
          onClick={() => setActive('account')}
        >
          <UserRound />
          <span>{t.nav_account}</span>
        </button>

        <button
          className={active === 'notifications' ? 'active' : ''}
          onClick={() => setActive('notifications')}
          style={{ position: 'relative' }}
        >
          <Bell />
          {unreadNotifsCount > 0 && (
            <span className="nav-badge">
              {unreadNotifsCount > 99 ? '99+' : unreadNotifsCount}
            </span>
          )}
          <span>{t.nav_notif}</span>
        </button>


        <button
          className={active === 'search' ? 'active' : ''}
          onClick={() => setActive('search')}
        >
          <Search />
          <span>{t.nav_search}</span>
        </button>

        <button
          className={active === 'favorites' ? 'active' : ''}
          onClick={() => setActive('favorites')}
        >
          <Heart />
          <span>{t.nav_fav}</span>
        </button>

        <button
          className={active === 'home' ? 'active' : ''}
          onClick={() => setActive('home')}
        >
          <Home />
          <span>{t.nav_home}</span>
        </button>
      </nav>

      {/* PRO PROFILE MODAL */}
      {selectedPro && (
        <div className="modal-overlay" onClick={() => setSelectedPro(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <ShieldCheck color="#13a869" size={22} /> الملف المهني
              </h3>
              <button className="close-btn" onClick={() => setSelectedPro(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="pro-dialog-head">
              <img src={selectedPro.img} alt={selectedPro.name} className="pro-dialog-img" />
              <div className="pro-dialog-info">
                <h2>{selectedPro.name}</h2>
                <p>{selectedPro.job}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748b' }}>
                  <MapPin size={15} /> {selectedPro.city} • <Star size={14} color="#f4b500" fill="#f4b500" /> {selectedPro.rating} ({selectedPro.reviews} تقييم)
                </div>
              </div>
            </div>

            <div className="pro-badge-row">
              <span className="badge-pill"><Clock size={14} /> {selectedPro.experience}</span>
              <span className="badge-pill"><Briefcase size={14} /> {selectedPro.completedJobs} {t.completed_jobs}</span>
              <span className="badge-pill" style={{ background: '#dcfce7', color: '#15803d' }}>
                <Check size={14} /> {t.available_now}
              </span>
            </div>

            <div style={{ marginBottom: 16 }}>
              <h4 style={{ margin: '0 0 6px', fontSize: 15, color: '#0b315d' }}>{t.about_title}</h4>
              <p style={{ margin: 0, fontSize: 13, color: '#334155', lineHeight: 1.6 }}>{selectedPro.bio}</p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <h4 style={{ margin: '0 0 8px', fontSize: 15, color: '#0b315d' }}>{t.services_title}</h4>
              <div>
                {selectedPro.services.map((s, idx) => (
                  <span className="service-chip" key={idx}>✓ {s}</span>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h4 style={{ margin: 0, fontSize: 15, color: '#0b315d' }}>
                  {t.reviews_title} ({activeReviews.length})
                </h4>
                <div style={{ fontSize: 13, color: '#b45309', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Star size={14} color="#f4b500" fill="#f4b500" />
                  <span>{selectedPro.rating}</span>
                  <small style={{ color: '#64748b' }}>({selectedPro.reviews} تقييم)</small>
                </div>
              </div>

              {/* REVIEW INPUT / EDIT CARD */}
              {user && user.role === 'customer' ? (
                <div className="review-form-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <strong style={{ fontSize: 13, color: '#0b315d' }}>
                      {userReview ? '✏️ تعديل تقييمك لهذا المعلم' : '⭐ أضف تقييمك وتجربتك الحقيقية'}
                    </strong>
                    {userReview && (
                      <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>
                        ✓ تقييمك مسجل مسبقاً
                      </span>
                    )}
                  </div>

                  <div className="star-rating-select">
                    <span style={{ fontSize: 13, color: '#475569', marginLeft: 6 }}>عدد النجوم:</span>
                    {[1, 2, 3, 4, 5].map((starVal) => (
                      <button
                        type="button"
                        key={starVal}
                        className="star-rating-btn"
                        onClick={() => setInputRating(starVal)}
                        title={`${starVal} نجوم`}
                      >
                        <Star
                          size={22}
                          color="#f4b500"
                          fill={starVal <= inputRating ? '#f4b500' : 'none'}
                        />
                      </button>
                    ))}
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#b45309', marginRight: 4 }}>
                      ({inputRating} من 5)
                    </span>
                  </div>

                  <form onSubmit={handleReviewSubmit}>
                    <textarea
                      className="review-textarea"
                      value={inputComment}
                      onChange={(e) => setInputComment(e.target.value)}
                      placeholder="شاركنا رأيك في جودة الخدمة، التعامل، احترام المواعيد والأسعار..."
                      required
                    />

                    {reviewError && (
                      <div className="auth-error-box" style={{ padding: '6px 10px', fontSize: 12, marginBottom: 8 }}>
                        <AlertCircle size={14} style={{ flexShrink: 0 }} />
                        <span>{reviewError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={submittingReview}
                      style={{ width: '100%', padding: '9px', fontSize: 13 }}
                    >
                      {submittingReview ? (
                        <span className="spinner-btn">
                          <span className="spinner"></span> جاري حفظ التقييم في Firestore...
                        </span>
                      ) : (
                        userReview ? 'حفظ تعديل التقييم' : 'إرسال التقييم'
                      )}
                    </button>

                    {userReview && (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={handleDeleteReview}
                        disabled={submittingReview}
                        style={{ width: '100%', marginTop: 8, padding: '7px', fontSize: 12, color: '#dc2626', borderColor: '#fecaca' }}
                      >
                        🗑️ حذف تقييمي
                      </button>
                    )}
                  </form>
                </div>
              ) : !user ? (
                <div className="review-form-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, color: '#475569' }}>
                    قم بتسجيل الدخول كزبون لتتمكن من تقييم هذا المعلم
                  </span>
                  <button
                    className="btn-primary"
                    style={{ padding: '6px 14px', fontSize: 12, whiteSpace: 'nowrap' }}
                    onClick={() => setShowLoginModal(true)}
                  >
                    تسجيل الدخول
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#64748b', background: '#f8fafc', padding: '8px 12px', borderRadius: 10, marginBottom: 14 }}>
                  ℹ️ التقييمات مخصصة لحسابات الزبائن فقط.
                </div>
              )}

              {/* REVIEWS LIST */}
              {reviewsLoading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: 13 }}>
                  <span className="spinner" style={{ display: 'inline-block', verticalAlign: -3, marginLeft: 8 }}></span>
                  جاري جلب التقييمات الحقيقية من Firestore...
                </div>
              ) : activeReviews.length > 0 ? (
                <div>
                  {activeReviews.map((r, i) => (
                    <div className="review-item" key={r.id || i}>
                      <div className="review-head">
                        <span className="review-user">
                          {r.customerName || r.user || 'زبون معتمد'}
                          {user && user.uid === r.customerUid && (
                            <span className="review-badge-own">تقييمك</span>
                          )}
                        </span>
                        <span className="review-date">{r.formattedDate || r.date || 'مؤخراً'}</span>
                      </div>
                      <div style={{ marginBottom: 4 }}>
                        {[...Array(Math.max(1, Math.min(5, Number(r.rating) || 5)))].map((_, sIdx) => (
                          <Star key={sIdx} size={13} color="#f4b500" fill="#f4b500" style={{ marginRight: 2 }} />
                        ))}
                      </div>
                      <p className="review-text">{r.comment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="review-empty-state">
                  لا توجد تقييمات لهذا المعلم بعد. كن أول من يشارك تجربته معه!
                </div>
              )}
            </div>

            {/* Direct Actions in Dialog */}
            <div style={{ display: 'flex', gap: 10, borderTop: '1px solid #eef3f8', paddingTop: 14 }}>
              <button
                className="btn-primary"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                onClick={(e) => handleCall(selectedPro, e)}
              >
                <Phone size={16} /> {t.call}
              </button>
              <button
                style={{
                  flex: 1,
                  border: 0,
                  background: '#16b866',
                  color: '#fff',
                  borderRadius: 12,
                  padding: '10px 16px',
                  font: '700 14px Cairo',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
                onClick={(e) => handleWhatsApp(selectedPro, e)}
              >
                <MessageCircle size={16} /> {t.whatsapp}
              </button>
              <button
                style={{
                  border: '1px solid #e2e8f0',
                  background: fav.includes(selectedPro.name) ? '#fff1f2' : '#f8fafc',
                  color: fav.includes(selectedPro.name) ? '#ef3b62' : '#64748b',
                  borderRadius: 12,
                  padding: '10px 14px',
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center'
                }}
                onClick={(e) => toggleFav(selectedPro.name, e)}
              >
                <Heart size={20} fill={fav.includes(selectedPro.name) ? '#ef3b62' : 'none'} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LANGUAGE SELECTOR MODAL */}
      {showLangModal && (
        <div className="modal-overlay" onClick={() => setShowLangModal(false)}>
          <div className="modal-box" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Globe2 size={20} /> اختر لغة التطبيق</h3>
              <button className="close-btn" onClick={() => setShowLangModal(false)}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { code: 'ar', label: 'العربية (المغرب)', sub: 'Arabic' },
                { code: 'fr', label: 'Français', sub: 'French' },
                { code: 'en', label: 'English', sub: 'English' }
              ].map((l) => (
                <button
                  key={l.code}
                  className={`choice-btn ${lang === l.code ? 'active' : ''}`}
                  onClick={() => {
                    setLang(l.code);
                    setShowLangModal(false);
                    showToastMsg(`تم تغيير اللغة إلى: ${l.label}`);
                  }}
                >
                  <span>{l.label} <small style={{ opacity: 0.7 }}>({l.sub})</small></span>
                  {lang === l.code && <Check size={18} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CITY SELECTOR MODAL */}
      {showCityModal && (
        <div className="modal-overlay" onClick={() => setShowCityModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><MapPin size={20} /> اختر المدينة</h3>
              <button className="close-btn" onClick={() => setShowCityModal(false)}><X size={18} /></button>
            </div>
            <div className="choice-grid">
              {citiesList.map((c) => (
                <button
                  key={c}
                  className={`choice-btn ${city === c ? 'active' : ''}`}
                  onClick={() => {
                    setCity(c);
                    setShowCityModal(false);
                    showToastMsg(`تم اختيار المدينة: ${c}`);
                  }}
                >
                  <span>{c}</span>
                  {city === c && <Check size={18} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ALL CATEGORIES MODAL */}
      {showAllCatsModal && (
        <div className="modal-overlay" onClick={() => setShowAllCatsModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Grid2X2 size={20} /> جميع المهن والتخصصات</h3>
              <button className="close-btn" onClick={() => setShowAllCatsModal(false)}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {cats.map(([name, count, Icon, color, , subCrafts]) => (
                <div
                  key={name}
                  style={{
                    border: '1px solid #e2e8ef',
                    borderRadius: 14,
                    padding: 14,
                    background: selectedCategory === name ? '#edf5ff' : '#fff'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className={`cat-icon ${color}`} style={{ width: 38, height: 38, borderRadius: 10 }}>
                        <Icon size={20} />
                      </span>
                      <strong style={{ fontSize: 16, color: '#0b315d' }}>{name}</strong>
                    </div>
                    <button
                      className="btn-primary"
                      style={{ padding: '6px 14px', fontSize: 12 }}
                      onClick={() => {
                        setSelectedCategory(name);
                        setShowAllCatsModal(false);
                        setActive('home');
                        setTimeout(() => {
                          const el = document.getElementById('pros-list-anchor');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }, 100);
                      }}
                    >
                      تصفح المعلمين
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {subCrafts.map((sub, sIdx) => (
                      <span
                        key={sIdx}
                        style={{
                          background: '#f1f5f9',
                          color: '#475569',
                          borderRadius: 16,
                          padding: '4px 10px',
                          fontSize: 12,
                          cursor: 'pointer'
                        }}
                        onClick={() => {
                          setQuery(sub);
                          setShowAllCatsModal(false);
                          setActive('home');
                        }}
                      >
                        • {sub}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* LOGIN / REGISTER MODAL WITH PHONE & PASSWORD AUTH */}
      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="modal-box" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <UserRound size={20} />
                {authMode === 'register' ? (accountType === 'provider' ? 'تسجيل معلم محترف' : 'تسجيل حساب زبون') : 'تسجيل الدخول إلى حسابك'}
              </h3>
              <button
                className="close-btn"
                onClick={() => {
                  setShowLoginModal(false);
                  setLoginPassword('');
                  setAuthError(null);
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Auth Mode Tabs (Register / Login) */}
            <div className="role-tabs" style={{ marginBottom: 14 }}>
              <button
                type="button"
                className={`role-tab-btn ${authMode === 'register' ? 'active' : ''}`}
                onClick={() => { setAuthMode('register'); setAuthError(null); }}
              >
                ✨ إنشاء حساب جديد
              </button>
              <button
                type="button"
                className={`role-tab-btn ${authMode === 'login' ? 'active' : ''}`}
                onClick={() => { setAuthMode('login'); setAuthError(null); }}
              >
                🔑 تسجيل الدخول
              </button>
            </div>

            {authError && (
              <div className="auth-error-box">
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{authError}</span>
              </div>
            )}

            {authMode === 'register' ? (
              /* REGISTER FORM */
              <>
                {/* Account Type Selector Tabs */}
                <div className="role-tabs">
                  <button
                    type="button"
                    className={`role-tab-btn ${accountType === 'customer' ? 'active' : ''}`}
                    onClick={() => { setAccountType('customer'); setAuthError(null); }}
                  >
                    <UserRound size={16} /> حساب زبون
                  </button>
                  <button
                    type="button"
                    className={`role-tab-btn ${accountType === 'provider' ? 'active' : ''}`}
                    onClick={() => { setAccountType('provider'); setAuthError(null); }}
                  >
                    <Briefcase size={16} /> حساب معلم
                  </button>
                </div>

                <form onSubmit={handleRegisterWithPassword}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4, color: '#1e293b' }}>
                    الاسم الكامل
                  </label>
                  <input
                    className="form-input"
                    value={loginName}
                    onChange={(e) => setLoginName(e.target.value)}
                    placeholder={accountType === 'provider' ? 'مثال: المعلم رشيد' : 'مثال: محمد أمين'}
                    required
                  />

                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4, color: '#1e293b' }}>
                    المدينة
                  </label>
                  <select
                    className="form-input"
                    value={loginCity}
                    onChange={(e) => setLoginCity(e.target.value)}
                    style={{ height: 42, background: '#fff', marginBottom: 12 }}
                  >
                    {citiesList.filter(c => c !== 'جميع المدن').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>

                  {accountType === 'provider' && (
                    <>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4, color: '#1e293b' }}>
                        المهنة الرئيسية
                      </label>
                      <select
                        className="form-input"
                        value={loginProfession}
                        onChange={(e) => {
                          const newProf = e.target.value;
                          setLoginProfession(newProf);
                          const matchedCat = cats.find(c => c[0] === newProf);
                          if (matchedCat && matchedCat[5] && matchedCat[5].length > 0) {
                            setLoginSubCraft(matchedCat[5][0]);
                          } else {
                            setLoginSubCraft('');
                          }
                        }}
                        style={{ height: 42, background: '#fff', marginBottom: 12 }}
                      >
                        {cats.map(([name]) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>

                      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4, color: '#1e293b' }}>
                        التخصص الفرعي / الخدمة المحددة
                      </label>
                      <select
                        className="form-input"
                        value={loginSubCraft}
                        onChange={(e) => setLoginSubCraft(e.target.value)}
                        style={{ height: 42, background: '#fff', marginBottom: 12 }}
                      >
                        <option value="">تخصص عام في المهنة</option>
                        {(cats.find(c => c[0] === loginProfession)?.[5] || []).map((sub) => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                    </>
                  )}

                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4, color: '#1e293b' }}>
                    رقم الهاتف المغربي (06 أو 07 أو +212)
                  </label>
                  <input
                    className="form-input"
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value)}
                    placeholder="06 XX XX XX XX"
                    type="tel"
                    required
                  />

                  {/* Explicit Required Password Field */}
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4, color: '#1e293b' }}>
                    كلمة السر (مطلوبة - 4 خانات على الأقل)
                  </label>
                  <div style={{ position: 'relative', marginBottom: 4 }}>
                    <input
                      className="form-input"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="مثال: 1234 أو abcd أو ab12"
                      type={showPassword ? 'text' : 'password'}
                      minLength={4}
                      style={{ paddingLeft: isRtl ? 40 : 12, paddingRight: isRtl ? 12 : 40, marginBottom: 0 }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        left: isRtl ? 10 : 'auto',
                        right: isRtl ? 'auto' : 10,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        border: 0,
                        background: 'transparent',
                        color: '#64748b',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        padding: 4
                      }}
                      tabIndex={-1}
                      aria-label="إظهار/إخفاء كلمة السر"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p style={{ margin: '4px 0 14px', fontSize: 11, color: '#64748b' }}>
                    * الحد الأدنى 4 أحرف أو أرقام (أرقام فقط، أحرف فقط، أو كلاهما).
                  </p>

                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={authSubmitting}
                    style={{ width: '100%', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12 }}
                  >
                    {authSubmitting ? (
                      <>
                        <span className="spinner"></span> جاري إنشاء الحساب...
                      </>
                    ) : (
                      <>
                        <Check size={16} /> إنشاء الحساب والتسجيل
                      </>
                    )}
                  </button>
                </form>
              </>
            ) : (
              /* LOGIN FORM */
              <form onSubmit={handleLoginWithPassword}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4, color: '#1e293b' }}>
                  رقم الهاتف المغربي
                </label>
                <input
                  className="form-input"
                  value={loginPhone}
                  onChange={(e) => setLoginPhone(e.target.value)}
                  placeholder="06 XX XX XX XX"
                  type="tel"
                  required
                />

                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 4, color: '#1e293b' }}>
                  كلمة السر
                </label>
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <input
                    className="form-input"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="أدخل كلمة السر"
                    type={showPassword ? 'text' : 'password'}
                    minLength={4}
                    style={{ paddingLeft: isRtl ? 40 : 12, paddingRight: isRtl ? 12 : 40, marginBottom: 0 }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      left: isRtl ? 10 : 'auto',
                      right: isRtl ? 'auto' : 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      border: 0,
                      background: 'transparent',
                      color: '#64748b',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 4
                    }}
                    tabIndex={-1}
                    aria-label="إظهار/إخفاء كلمة السر"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={authSubmitting}
                  style={{ width: '100%', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12 }}
                >
                  {authSubmitting ? (
                    <>
                      <span className="spinner"></span> جاري تسجيل الدخول...
                    </>
                  ) : (
                    <>
                      <Lock size={16} /> تسجيل الدخول
                    </>
                  )}
                </button>
              </form>
            )}

            {isReviewEnvironment() && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => handleQuickDemoAuth('customer')}
                  disabled={authSubmitting}
                  style={{
                    border: '1px solid #bae6fd',
                    background: '#f0f9ff',
                    color: '#0369a1',
                    borderRadius: 12,
                    padding: '8px 6px',
                    font: '700 11px Cairo',
                    cursor: 'pointer'
                  }}
                >
                  ⚡ تجربة كزبون (Customer)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoAuth('provider')}
                  disabled={authSubmitting}
                  style={{
                    border: '1px solid #bbf7d0',
                    background: '#f0fdf4',
                    color: '#166534',
                    borderRadius: 12,
                    padding: '8px 6px',
                    font: '700 11px Cairo',
                    cursor: 'pointer'
                  }}
                >
                  ⚡ تجربة كمعلم (Provider)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SIDE MENU DRAWER */}
      {showSideMenu && (
        <div className="modal-overlay" onClick={() => setShowSideMenu(false)}>
          <div
            className="modal-box"
            style={{ maxWidth: 360, margin: isRtl ? '0 0 auto auto' : '0 auto auto 0', height: '100vh', maxHeight: '100vh', borderRadius: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 24 }}>🎓</span>
                <b>{t.brand_name}</b>
              </div>
              <button className="close-btn" onClick={() => setShowSideMenu(false)}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button
                className="choice-btn"
                onClick={() => { setActive('home'); setShowSideMenu(false); }}
              >
                <span><Home size={18} /> {t.nav_home}</span>
              </button>
              <button
                className="choice-btn"
                onClick={() => { setActive('search'); setShowSideMenu(false); }}
              >
                <span><Search size={18} /> {t.nav_search}</span>
              </button>
              <button
                className="choice-btn"
                onClick={() => { setShowAllCatsModal(true); setShowSideMenu(false); }}
              >
                <span><Grid2X2 size={18} /> {t.cats_view_all}</span>
              </button>
              <button
                className="choice-btn"
                onClick={() => { setActive('favorites'); setShowSideMenu(false); }}
              >
                <span><Heart size={18} /> {t.nav_fav} ({fav.length})</span>
              </button>
              <button
                className="choice-btn"
                onClick={() => { setActive('account'); setShowSideMenu(false); }}
              >
                <span><UserRound size={18} /> {user ? user.name : t.nav_account}</span>
              </button>
              <button
                className="choice-btn"
                onClick={() => { setShowLangModal(true); setShowSideMenu(false); }}
              >
                <span><Globe2 size={18} /> لغة التطبيق ({t.lang_name})</span>
              </button>
              <button
                className="choice-btn"
                onClick={() => { setShowCityModal(true); setShowSideMenu(false); }}
              >
                <span><MapPin size={18} /> تغيير المدينة ({city})</span>
              </button>
              {(isReviewEnvironment() || (user && user.role === 'admin')) && (
                <button
                  className="choice-btn"
                  style={{ background: '#f8fafc', borderColor: '#cbd5e1', color: '#0b315d' }}
                  onClick={handleOpenAdmin}
                >
                  <span><ShieldCheck size={18} color="#09569c" /> لوحة تحكم الإدارة (Admin)</span>
                </button>
              )}
              <button
                className="choice-btn"
                style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}
                onClick={() => { handleGeneralWhatsApp(); setShowSideMenu(false); }}
              >
                <span><MessageCircle size={18} /> تواصل مع الدعم عبر واتساب</span>
              </button>

            </div>

            <div style={{ marginTop: 24, padding: 14, background: '#f8fafc', borderRadius: 14, fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
              <b>بغيت معلم</b>: منصة مغربية لربط المواطنين بالحرفيين والمعلمين الموثوقين في مختلف المهن والمدن.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById('root')).render(<App />);
