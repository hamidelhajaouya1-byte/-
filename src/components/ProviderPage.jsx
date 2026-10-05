import React, { useState, useEffect } from 'react';
import {
  MapPin, Star, Phone, MessageCircle, ArrowLeft, ArrowRight,
  ShieldCheck, Check, Clock, Briefcase, Heart, Share2, AlertCircle, UserRound, ThumbsUp
} from 'lucide-react';
import {
  getProviderReviews,
  getUserReview,
  saveOrUpdateReview
} from '../services/reviewService';
import { updateProviderSEO, updateHomeSEO } from '../services/seoService';
import { toggleLikeProvider, getProviderLikeStatus } from '../services/notificationService';


export default function ProviderPage({
  provider,
  user,
  isFavorite,
  onToggleFavorite,
  onBack,
  onOpenLogin,
  showToastMsg,
  isRtl = true
}) {
  const [activeReviews, setActiveReviews] = useState(provider?.realReviews || []);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [userReview, setUserReview] = useState(null);
  const [inputRating, setInputRating] = useState(5);
  const [inputComment, setInputComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState(null);
  const [likeStatus, setLikeStatus] = useState(() => getProviderLikeStatus(provider?.id, user?.uid));

  useEffect(() => {
    if (provider?.id) {
      setLikeStatus(getProviderLikeStatus(provider.id, user?.uid));
    }
  }, [provider?.id, user?.uid]);


  // Dynamic SEO lifecycle
  useEffect(() => {
    if (provider && !provider.notFound && provider.isActive !== false) {
      updateProviderSEO(provider);
    } else {
      updateProviderSEO(null);
    }
    return () => {
      updateHomeSEO();
    };
  }, [provider]);


  // Load reviews from Firestore
  useEffect(() => {
    if (!provider || provider.notFound) return;

    let isMounted = true;
    setReviewsLoading(true);

    getProviderReviews(provider.id, provider.reviewsList || [])
      .then((revs) => {
        if (isMounted) {
          setActiveReviews(revs);
          setReviewsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('[ProviderPage] Reviews load error:', err);
          setReviewsLoading(false);
        }
      });

    if (user && user.uid && user.role === 'customer') {
      getUserReview(provider.id, user.uid)
        .then((ur) => {
          if (isMounted && ur) {
            setUserReview(ur);
            setInputRating(ur.rating || 5);
            setInputComment(ur.comment || '');
          }
        })
        .catch((err) => console.warn('[ProviderPage] User review error:', err));
    }
    return () => { isMounted = false; };
  }, [provider, user]);

  const handleShareLink = () => {
    try {
      const shareUrl = window.location.href;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl);
        showToastMsg('تم نسخ رابط صفحة المعلم بنجاح 📋');
      } else {
        showToastMsg('الرابط: ' + shareUrl);
      }
    } catch {
      showToastMsg('تم نسخ الرابط');
    }
  };

  const handleReviewSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!user) {
      onOpenLogin();
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
        providerId: provider.id,
        customerUid: user.uid,
        customerName: user.fullName || user.name || 'زبون معتمد',
        rating: inputRating,
        comment: cleanComment
      });

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
      showToastMsg(result.isEdit ? 'تم تحديث تقييمك بنجاح ⭐' : 'شكراً لك! تمت إضافة تقييمك بنجاح ⭐');
    } catch (err) {
      setReviewError(err.message || 'حدث خطأ أثناء حفظ التقييم');
    } finally {
      setSubmittingReview(false);
    }
  };

  // 1. Not Found or Deleted Provider View
  if (!provider || provider.notFound) {
    return (
      <div className="view-wrap" style={{ padding: '40px 16px', textAlign: 'center', minHeight: '60vh' }}>
        <div style={{ maxWidth: 460, margin: '0 auto', background: '#fff', padding: 30, borderRadius: 20, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 50, marginBottom: 16 }}>🔍</div>
          <h2 style={{ fontSize: 22, color: '#0b315d', margin: '0 0 8px' }}>
            المعلم غير موجود أو لم يعد متاحاً
          </h2>
          <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 24px', lineHeight: 1.6 }}>
            قد يكون هذا الرابط غير صحيح، أو تم حذف حساب المعلم نهائياً من المنصة.
          </p>
          <button
            className="btn-primary"
            style={{ width: '100%', padding: '12px' }}
            onClick={onBack}
          >
            {isRtl ? '← العودة إلى الصفحة الرئيسية' : 'Back to Home →'}
          </button>
        </div>
      </div>
    );
  }

  // 2. Normal Dedicated Provider View
  return (
    <div className="view-wrap" style={{ paddingBottom: 60 }}>
      {/* Top Navigation Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 18px' }}>
        <button
          onClick={onBack}
          style={{
            border: '1px solid #cbd5e1',
            background: '#fff',
            borderRadius: 12,
            padding: '8px 14px',
            font: '700 13px Cairo',
            color: '#09569c',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          {isRtl ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
          <span>العودة إلى النتائج</span>
        </button>

        <button
          onClick={handleShareLink}
          style={{
            border: '1px solid #cbd5e1',
            background: '#fff',
            borderRadius: 12,
            padding: '8px 14px',
            font: '700 13px Cairo',
            color: '#475569',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
          title="مشاركة رابط المعلم المباشر"
        >
          <Share2 size={16} />
          <span>مشاركة الرابط</span>
        </button>
      </div>

      {/* Main Provider Card */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: 20, marginBottom: 20, boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
        <div className="pro-dialog-head" style={{ marginBottom: 16 }}>
          {provider.img ? (
            <img
              src={provider.img}
              alt={provider.name}
              className="pro-dialog-img"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=150&auto=format&fit=crop&q=80';
              }}
            />
          ) : (
            <div
              className="pro-dialog-img"
              style={{ display: 'grid', placeItems: 'center', background: '#e0efff', color: '#09569c', fontSize: 32 }}
            >
              👷‍♂️
            </div>
          )}

          <div className="pro-dialog-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: 22, color: '#0b315d' }}>{provider.name}</h1>
              <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                ✓ معتمد
              </span>
            </div>
            <p style={{ margin: '4px 0 6px', fontSize: 15, fontWeight: 700, color: '#09569c' }}>
              {provider.job || provider.professionName}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={15} color="#09569c" /> {provider.city}
              </span>
              <span>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#b45309', fontWeight: 700 }}>
                <Star size={14} color="#f4b500" fill="#f4b500" />
                {provider.rating} ({provider.reviews || activeReviews.length} تقييم)
              </span>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="pro-badge-row" style={{ marginBottom: 16 }}>
          <span className="badge-pill"><Clock size={14} /> {provider.experience || 'أكثر من 5 سنوات خبرة'}</span>
          <span className="badge-pill"><Briefcase size={14} /> {provider.completedJobs || 50} خدمة منجزة</span>
          <span className="badge-pill" style={{ background: '#dcfce7', color: '#15803d' }}>
            <Check size={14} /> متاح الآن للعمل
          </span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button
            className="btn-primary"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, fontSize: 15 }}
            onClick={() => {
              showToastMsg(`جاري الاتصال بالمعلم ${provider.name}...`);
              window.location.href = `tel:${provider.phone}`;
            }}
          >
            <Phone size={18} /> اتصال مباشر
          </button>
          <button
            style={{
              flex: 1,
              border: 0,
              background: '#16b866',
              color: '#fff',
              borderRadius: 12,
              padding: 12,
              font: '700 15px Cairo',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
            onClick={() => {
              const text = encodeURIComponent(`السلام عليكم، تواصلت معك عبر منصة بغيت معلم بخصوص خدمة ${provider.job}.`);
              window.open(`https://wa.me/${provider.whatsapp}?text=${text}`, '_blank');
            }}
          >
            <MessageCircle size={18} /> واتساب
          </button>
          <button
            className={`like-btn ${likeStatus.liked ? 'liked' : ''}`}
            onClick={async () => {
              if (!user) {
                onOpenLogin();
                return;
              }
              const res = await toggleLikeProvider({
                providerId: provider.id,
                user,
                providerName: provider.name
              });
              setLikeStatus({ liked: res.liked, count: res.count });
              showToastMsg(res.liked ? 'تم تسجيل إعجابك بالمعلم 👍' : 'تم إلغاء الإعجاب');
            }}
            title={likeStatus.liked ? 'إلغاء الإعجاب' : 'إعجاب بالمعلم'}
            style={{ padding: '0 14px' }}
          >
            <ThumbsUp size={18} fill={likeStatus.liked ? '#1d4ed8' : 'none'} />
            <span>{likeStatus.count > 0 ? likeStatus.count : ''}</span>
          </button>
          <button
            style={{
              border: '1px solid #e2e8f0',
              background: isFavorite ? '#fff1f2' : '#f8fafc',
              color: isFavorite ? '#ef3b62' : '#64748b',
              borderRadius: 12,
              padding: '0 16px',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center'
            }}
            onClick={() => onToggleFavorite(provider.name)}
            title="إضافة للمفضلة"
          >
            <Heart size={20} fill={isFavorite ? '#ef3b62' : 'none'} />
          </button>
        </div>

        {/* About section */}
        <div style={{ marginBottom: 18, borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
          <h3 style={{ margin: '0 0 6px', fontSize: 16, color: '#0b315d' }}>نبذة عن المعلم</h3>
          <p style={{ margin: 0, fontSize: 14, color: '#334155', lineHeight: 1.7 }}>
            {provider.bio || provider.description}
          </p>
        </div>

        {/* Services section */}
        {provider.services && provider.services.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 16, color: '#0b315d' }}>الخدمات المقدمة</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {provider.services.map((s, idx) => (
                <span className="service-chip" key={idx}>✓ {s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Real Reviews Section */}
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16, color: '#0b315d' }}>
              التقييمات والمراجعات ({activeReviews.length})
            </h3>
            <div style={{ fontSize: 14, color: '#b45309', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Star size={16} color="#f4b500" fill="#f4b500" />
              <span>{provider.rating}</span>
            </div>
          </div>

          {/* Customer Review Form */}
          {user && user.role === 'customer' ? (
            <div className="review-form-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <strong style={{ fontSize: 13, color: '#0b315d' }}>
                  {userReview ? '✏️ تعديل تقييمك لهذا المعلم' : '⭐ أضف تقييمك وتجربتك الحقيقية'}
                </strong>
                {userReview && (
                  <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>
                    ✓ لديك تقييم مسجل مسبقاً
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
                      <span className="spinner"></span> جاري الحفظ في Firestore...
                    </span>
                  ) : (
                    userReview ? 'حفظ تعديل التقييم' : 'إرسال التقييم'
                  )}
                </button>
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
                onClick={onOpenLogin}
              >
                تسجيل الدخول
              </button>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: '#64748b', background: '#f8fafc', padding: '8px 12px', borderRadius: 10, marginBottom: 14 }}>
              ℹ️ التقييمات مخصصة لحسابات الزبائن فقط.
            </div>
          )}

          {/* Reviews List */}
          {reviewsLoading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: 13 }}>
              <span className="spinner" style={{ display: 'inline-block', verticalAlign: -3, marginLeft: 8 }}></span>
              جاري جلب التقييمات من Firestore...
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
      </div>
    </div>
  );
}
