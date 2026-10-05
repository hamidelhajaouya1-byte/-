import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, ShieldCheck, Users, Briefcase, UserX, MapPin,
  Phone, MessageCircle, Star, Search, Edit3, Trash2, Power,
  ArrowRight, ArrowLeft, RefreshCw, CheckCircle, AlertTriangle, X
} from 'lucide-react';
import {
  getAdminStats,
  getAllProvidersAdmin,
  updateProviderAdmin,
  toggleProviderStatusAdmin,
  deleteProviderAdmin,
  getAllCustomersAdmin,
  updateCustomerAdmin,
  toggleCustomerStatusAdmin,
  deleteCustomerAdmin,
  bulkDeleteAdmin
} from '../services/adminService';
import { createUserProfile } from '../services/authService';
import { updatePrivatePageSEO, updateHomeSEO } from '../services/seoService';

export default function AdminDashboard({
  user,
  onUserUpdate,
  onBackToApp,
  seedProviders = [],
  showToastMsg,
  isRtl = true
}) {
  const isAdmin = user && user.role === 'admin';

  useEffect(() => {
    updatePrivatePageSEO('لوحة الإدارة');
    return () => {
      updateHomeSEO();
    };
  }, []);


  // Navigation tab: 'stats' | 'providers' | 'customers'
  const [activeTab, setActiveTab] = useState('stats');

  // Stats state
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Providers list state
  const [providers, setProviders] = useState([]);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [providerQuery, setProviderQuery] = useState('');

  // Customers list state
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerQuery, setCustomerQuery] = useState('');

  // Edit Modals
  const [editingProvider, setEditingProvider] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Confirmation Modal
  const [confirmDialog, setConfirmDialog] = useState(null);

  // Load stats
  const refreshStats = async () => {
    setStatsLoading(true);
    try {
      const data = await getAdminStats(seedProviders);
      setStats(data);
    } catch (err) {
      console.error('[Admin] Stats load error:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Load providers
  const refreshProviders = async () => {
    setProvidersLoading(true);
    try {
      const data = await getAllProvidersAdmin(seedProviders);
      setProviders(data);
    } catch (err) {
      console.error('[Admin] Providers load error:', err);
    } finally {
      setProvidersLoading(false);
    }
  };

  // Load customers
  const refreshCustomers = async () => {
    setCustomersLoading(true);
    try {
      const data = await getAllCustomersAdmin();
      setCustomers(data);
    } catch (err) {
      console.error('[Admin] Customers load error:', err);
    } finally {
      setCustomersLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      refreshStats();
      refreshProviders();
      refreshCustomers();
    }
  }, [isAdmin]);

  // Demo Admin Login
  const handleLoginAsAdminDemo = async () => {
    setActionLoading(true);
    try {
      const adminProfile = await createUserProfile({
        uid: 'usr_admin_master_01',
        role: 'admin',
        fullName: 'المشرف العام (Admin)',
        phone: '0600000000',
        cityId: 'الرباط'
      });
      localStorage.setItem('b4it_m3alm_session_uid', adminProfile.uid);
      if (onUserUpdate) onUserUpdate(adminProfile);
      showToastMsg('تم الدخول كمسؤول النظام (Admin) بنجاح 🛡️');
    } catch (err) {
      showToastMsg('خطأ أثناء تسجيل الدخول كمسؤول: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Provider Status
  const handleToggleProvider = async (pro) => {
    const nextStatus = !pro.isActive;
    setActionLoading(true);
    try {
      await toggleProviderStatusAdmin(pro.id, nextStatus);
      setProviders(prev => prev.map(p => p.id === pro.id ? { ...p, isActive: nextStatus } : p));
      refreshStats();
      showToastMsg(nextStatus ? `تم تفعيل حساب ${pro.name}` : `تم تعطيل حساب ${pro.name}`);
    } catch (err) {
      showToastMsg('خطأ: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Customer Status
  const handleToggleCustomer = async (cust) => {
    const nextStatus = !cust.isActive;
    setActionLoading(true);
    try {
      await toggleCustomerStatusAdmin(cust.uid, nextStatus);
      setCustomers(prev => prev.map(c => c.uid === cust.uid ? { ...c, isActive: nextStatus } : c));
      refreshStats();
      showToastMsg(nextStatus ? `تم تفعيل حساب ${cust.fullName}` : `تم تعطيل حساب ${cust.fullName}`);
    } catch (err) {
      showToastMsg('خطأ: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Save Provider Edit
  const handleSaveProviderEdit = async (e) => {
    if (e) e.preventDefault();
    if (!editingProvider) return;
    setActionLoading(true);
    try {
      await updateProviderAdmin(editingProvider.id, editingProvider);
      setProviders(prev => prev.map(p => p.id === editingProvider.id ? { ...p, ...editingProvider } : p));
      setEditingProvider(null);
      showToastMsg('تم حفظ تعديلات المعلم بنجاح في Firestore');
    } catch (err) {
      showToastMsg('خطأ أثناء التعديل: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Save Customer Edit
  const handleSaveCustomerEdit = async (e) => {
    if (e) e.preventDefault();
    if (!editingCustomer) return;
    setActionLoading(true);
    try {
      await updateCustomerAdmin(editingCustomer.uid, editingCustomer);
      setCustomers(prev => prev.map(c => c.uid === editingCustomer.uid ? { ...c, ...editingCustomer } : c));
      setEditingCustomer(null);
      showToastMsg('تم حفظ بيانات الزبون بنجاح');
    } catch (err) {
      showToastMsg('خطأ أثناء التعديل: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Single Provider Delete (Centralized Deletion with Tombstone)
  const handleDeleteProvider = (pro) => {
    setConfirmDialog({
      title: `حذف حساب المعلم "${pro.name}" نهائياً`,
      message: 'سيتم حذف الحساب نهائياً من قاعدة البيانات، وتسجيل Tombstone دائم يمنع استرجاعه أو عودته عبر المزامنة أو الكاش.',
      actionLabel: 'تأكيد الحذف النهائي والتسجيل في Tombstones',
      isDanger: true,
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await deleteProviderAdmin(pro.id);
          setProviders(prev => prev.filter(p => p.id !== pro.id));
          refreshStats();
          showToastMsg(`تم الحذف النهائي لحساب المعلم ${pro.name} وتسجيله في Tombstones.`);
        } catch (err) {
          showToastMsg('خطأ: ' + err.message);
        } finally {
          setActionLoading(false);
          setConfirmDialog(null);
        }
      }
    });
  };

  // Single Customer Delete (Centralized Deletion with Tombstone)
  const handleDeleteCustomer = (cust) => {
    setConfirmDialog({
      title: `حذف حساب الزبون "${cust.fullName}" نهائياً`,
      message: 'سيتم حذف حساب الزبون، وتسجيل Tombstone، وإلغاء تنشيط تقييماته تلقائياً لمنع أي تسريب بيانات.',
      actionLabel: 'تأكيد الحذف النهائي',
      isDanger: true,
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await deleteCustomerAdmin(cust.uid);
          setCustomers(prev => prev.filter(c => c.uid !== cust.uid));
          refreshStats();
          showToastMsg(`تم حذف حساب الزبون ${cust.fullName} نهائياً.`);
        } catch (err) {
          showToastMsg('خطأ: ' + err.message);
        } finally {
          setActionLoading(false);
          setConfirmDialog(null);
        }
      }
    });
  };

  // Bulk Delete with Tombstones
  const handleBulkDelete = (type) => {
    const count = type === 'providers' ? providers.length : customers.length;
    if (count === 0) {
      showToastMsg('القائمة فارغة بالفعل.');
      return;
    }

    setConfirmDialog({
      title: `⚠️ مسح الكل (${type === 'providers' ? 'كافة المعلمين' : 'كافة الزبائن'})`,
      message: `أنت على وشك تنفيذ حذف نهائي مركزي لـ ${count} حساب. سيتم تسجيل Tombstone لكل حساب على حدة لضمان عدم عودتها نهائياً بعد التحديث أو المزامنة.`,
      actionLabel: `تأكيد مسح كافة الـ ${count} حسابات مع Tombstones`,
      isDanger: true,
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const ids = type === 'providers' ? providers.map(p => p.id) : customers.map(c => c.uid);
          await bulkDeleteAdmin(type, ids);
          if (type === 'providers') setProviders([]);
          if (type === 'customers') setCustomers([]);
          refreshStats();
          showToastMsg(`تم مسح الحسابات وتسجيل Tombstones بنجاح.`);
        } catch (err) {
          showToastMsg('خطأ في المسح: ' + err.message);
        } finally {
          setActionLoading(false);
          setConfirmDialog(null);
        }
      }
    });
  };

  // Non-Admin Screen
  if (!isAdmin) {
    return (
      <div className="view-wrap" style={{ padding: '60px 16px', textAlign: 'center', minHeight: '70vh' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', background: '#fff', padding: 32, borderRadius: 20, border: '1px solid #fee2e2' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🛡️</div>
          <h2 style={{ fontSize: 20, color: '#991b1b', margin: '0 0 10px' }}>
            منطقة مخصصة للإدارة (Admin Area)
          </h2>
          <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 24px', lineHeight: 1.6 }}>
            هذا المسار محمي بصلاحيات أمنية صارمة في Firestore Security Rules.
            <br />
            المستخدمون العاديون ليس لديهم صلاحية الوصول.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              className="btn-primary"
              onClick={handleLoginAsAdminDemo}
              disabled={actionLoading}
              style={{ padding: 12, background: '#0b315d' }}
            >
              {actionLoading ? 'جاري التحقق...' : '🔑 دخول تجريبي كمسؤول النظام (Admin Demo)'}
            </button>
            <button
              onClick={onBackToApp}
              style={{
                border: '1px solid #cbd5e1',
                background: '#fff',
                color: '#475569',
                borderRadius: 12,
                padding: 10,
                font: '700 13px Cairo',
                cursor: 'pointer'
              }}
            >
              {isRtl ? '← العودة إلى الصفحة العامة' : 'Back to Public Home →'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Filtered lists for admin search
  const filteredAdminProviders = providers.filter(p => {
    const q = providerQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.fullName && p.fullName.toLowerCase().includes(q)) ||
      (p.phone && p.phone.includes(q)) ||
      (p.city && p.city.toLowerCase().includes(q)) ||
      (p.job && p.job.toLowerCase().includes(q)) ||
      (p.professionName && p.professionName.toLowerCase().includes(q))
    );
  });

  const filteredAdminCustomers = customers.filter(c => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (c.fullName && c.fullName.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.cityId && c.cityId.toLowerCase().includes(q)) ||
      (c.uid && c.uid.toLowerCase().includes(q))
    );
  });

  return (
    <div className="view-wrap" style={{ paddingBottom: 60 }}>
      {/* Top Admin Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 20px', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, color: '#0b315d', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck color="#16a34a" size={26} /> لوحة تحكم الإدارة (Admin Panel)
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
            إدارة الحسابات، الصلاحيات، الفحص والتحكم المباشر في Firestore
          </p>
        </div>

        <button
          onClick={onBackToApp}
          style={{
            border: '1px solid #cbd5e1',
            background: '#fff',
            borderRadius: 12,
            padding: '8px 16px',
            font: '700 13px Cairo',
            color: '#09569c',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          {isRtl ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
          <span>العودة للمنصة العامة</span>
        </button>
      </div>

      {/* Admin Tabs */}
      <div style={{ display: 'flex', gap: 8, background: '#f1f5f9', padding: 4, borderRadius: 14, marginBottom: 20 }}>
        <button
          onClick={() => setActiveTab('stats')}
          style={{
            flex: 1,
            border: 0,
            background: activeTab === 'stats' ? '#fff' : 'transparent',
            color: activeTab === 'stats' ? '#09569c' : '#64748b',
            boxShadow: activeTab === 'stats' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
            padding: '10px 12px',
            borderRadius: 10,
            font: '700 13px Cairo',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6
          }}
        >
          <Briefcase size={16} /> الإحصائيات
        </button>
        <button
          onClick={() => setActiveTab('providers')}
          style={{
            flex: 1,
            border: 0,
            background: activeTab === 'providers' ? '#fff' : 'transparent',
            color: activeTab === 'providers' ? '#09569c' : '#64748b',
            boxShadow: activeTab === 'providers' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
            padding: '10px 12px',
            borderRadius: 10,
            font: '700 13px Cairo',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6
          }}
        >
          <Users size={16} /> المعلمون ({providers.length})
        </button>
        <button
          onClick={() => setActiveTab('customers')}
          style={{
            flex: 1,
            border: 0,
            background: activeTab === 'customers' ? '#fff' : 'transparent',
            color: activeTab === 'customers' ? '#09569c' : '#64748b',
            boxShadow: activeTab === 'customers' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
            padding: '10px 12px',
            borderRadius: 10,
            font: '700 13px Cairo',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6
          }}
        >
          <Users size={16} /> الزبناء ({customers.length})
        </button>
      </div>

      {/* TAB 1: STATS OVERVIEW */}
      {activeTab === 'stats' && (
        <div>
          {statsLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
              <span className="spinner"></span> جاري احتساب الإحصائيات...
            </div>
          ) : stats ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
              <div style={{ background: '#fff', padding: 18, borderRadius: 16, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>المعلمون النشطون</span>
                <h3 style={{ margin: '8px 0 0', fontSize: 26, color: '#16a34a' }}>{stats.activeProvidersCount}</h3>
              </div>
              <div style={{ background: '#fff', padding: 18, borderRadius: 16, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>المعلمون المعطلون</span>
                <h3 style={{ margin: '8px 0 0', fontSize: 26, color: '#ea580c' }}>{stats.inactiveProvidersCount}</h3>
              </div>
              <div style={{ background: '#fff', padding: 18, borderRadius: 16, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>حسابات الزبناء</span>
                <h3 style={{ margin: '8px 0 0', fontSize: 26, color: '#09569c' }}>{stats.customersCount}</h3>
              </div>
              <div style={{ background: '#fff', padding: 18, borderRadius: 16, border: '1px solid #fee2e2' }}>
                <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 600 }}>الحسابات المحذوفة (Tombstones)</span>
                <h3 style={{ margin: '8px 0 0', fontSize: 26, color: '#dc2626' }}>{stats.tombstonesCount}</h3>
              </div>
              <div style={{ background: '#fff', padding: 18, borderRadius: 16, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>المدن المغطاة</span>
                <h3 style={{ margin: '8px 0 0', fontSize: 26, color: '#0b315d' }}>{stats.citiesCount}</h3>
              </div>
              <div style={{ background: '#fff', padding: 18, borderRadius: 16, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>المهن والتخصصات</span>
                <h3 style={{ margin: '8px 0 0', fontSize: 26, color: '#0b315d' }}>{stats.professionsCount}</h3>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* TAB 2: PROVIDERS MANAGEMENT */}
      {activeTab === 'providers' && (
        <div>
          {/* Controls Bar */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
              <input
                className="form-input"
                style={{ margin: 0, paddingLeft: 34 }}
                placeholder="بحث بالاسم، الهاتف، المدينة أو المهنة..."
                value={providerQuery}
                onChange={e => setProviderQuery(e.target.value)}
              />
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 10, top: 12 }} />
            </div>

            <button
              onClick={refreshProviders}
              disabled={providersLoading}
              style={{
                border: '1px solid #cbd5e1',
                background: '#fff',
                borderRadius: 10,
                padding: '0 14px',
                font: '700 13px Cairo',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <RefreshCw size={14} /> تحديث
            </button>

            <button
              onClick={() => handleBulkDelete('providers')}
              style={{
                border: '1px solid #fecaca',
                background: '#fef2f2',
                color: '#dc2626',
                borderRadius: 10,
                padding: '0 14px',
                font: '700 13px Cairo',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <Trash2 size={14} /> مسح الكل
            </button>
          </div>

          {/* Providers Table / Cards */}
          {providersLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
              <span className="spinner"></span> جاري تحميل المعلمين من Firestore...
            </div>
          ) : filteredAdminProviders.length === 0 ? (
            <div className="review-empty-state">لا يوجد معلمون يطابقون البحث</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredAdminProviders.map(p => (
                <div
                  key={p.id}
                  style={{
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 14,
                    padding: 14,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 12
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: '#e0efff', color: '#09569c', display: 'grid', placeItems: 'center', fontSize: 20 }}>
                      👷‍♂️
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <strong style={{ fontSize: 15, color: '#0b315d' }}>{p.name}</strong>
                        <span
                          style={{
                            background: p.isActive !== false ? '#dcfce7' : '#fee2e2',
                            color: p.isActive !== false ? '#15803d' : '#b91c1c',
                            padding: '2px 8px',
                            borderRadius: 10,
                            fontSize: 11,
                            fontWeight: 700
                          }}
                        >
                          {p.isActive !== false ? 'نشط' : 'معطل'}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        {p.job || p.professionName} • {p.city} • هاتف: {p.phone} • ★ {p.rating} ({p.reviews || 0})
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => handleToggleProvider(p)}
                      title={p.isActive !== false ? 'تعطيل المعلم' : 'تفعيل المعلم'}
                      style={{
                        border: '1px solid #e2e8f0',
                        background: p.isActive !== false ? '#fff7ed' : '#f0fdf4',
                        color: p.isActive !== false ? '#c2410c' : '#15803d',
                        borderRadius: 8,
                        padding: '6px 10px',
                        font: '700 12px Cairo',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <Power size={13} /> {p.isActive !== false ? 'تعطيل' : 'تفعيل'}
                    </button>
                    <button
                      onClick={() => setEditingProvider({ ...p })}
                      title="تعديل بيانات المعلم"
                      style={{
                        border: '1px solid #cbd5e1',
                        background: '#f8fafc',
                        color: '#0369a1',
                        borderRadius: 8,
                        padding: '6px 10px',
                        font: '700 12px Cairo',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <Edit3 size={13} /> تعديل
                    </button>
                    <button
                      onClick={() => handleDeleteProvider(p)}
                      title="حذف نهائي وتسجيل في Tombstones"
                      style={{
                        border: '1px solid #fecaca',
                        background: '#fef2f2',
                        color: '#dc2626',
                        borderRadius: 8,
                        padding: '6px 10px',
                        font: '700 12px Cairo',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <Trash2 size={13} /> حذف نهائي
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CUSTOMERS MANAGEMENT */}
      {activeTab === 'customers' && (
        <div>
          {/* Controls Bar */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
              <input
                className="form-input"
                style={{ margin: 0, paddingLeft: 34 }}
                placeholder="بحث باسم الزبون، الهاتف، أو المعرف UID..."
                value={customerQuery}
                onChange={e => setCustomerQuery(e.target.value)}
              />
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 10, top: 12 }} />
            </div>

            <button
              onClick={refreshCustomers}
              disabled={customersLoading}
              style={{
                border: '1px solid #cbd5e1',
                background: '#fff',
                borderRadius: 10,
                padding: '0 14px',
                font: '700 13px Cairo',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <RefreshCw size={14} /> تحديث
            </button>

            <button
              onClick={() => handleBulkDelete('customers')}
              style={{
                border: '1px solid #fecaca',
                background: '#fef2f2',
                color: '#dc2626',
                borderRadius: 10,
                padding: '0 14px',
                font: '700 13px Cairo',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <Trash2 size={14} /> مسح الكل
            </button>
          </div>

          {/* Customers List */}
          {customersLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
              <span className="spinner"></span> جاري تحميل الزبناء من Firestore...
            </div>
          ) : filteredAdminCustomers.length === 0 ? (
            <div className="review-empty-state">لا يوجد زبناء مسجلون</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredAdminCustomers.map(c => (
                <div
                  key={c.uid}
                  style={{
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 14,
                    padding: 14,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 12
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: '#f1f5f9', color: '#475569', display: 'grid', placeItems: 'center', fontSize: 20 }}>
                      👤
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <strong style={{ fontSize: 15, color: '#0b315d' }}>{c.fullName}</strong>
                        <span
                          style={{
                            background: c.isActive !== false ? '#dcfce7' : '#fee2e2',
                            color: c.isActive !== false ? '#15803d' : '#b91c1c',
                            padding: '2px 8px',
                            borderRadius: 10,
                            fontSize: 11,
                            fontWeight: 700
                          }}
                        >
                          {c.isActive !== false ? 'نشط' : 'معطل'}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        هاتف: {c.phone} • مدينة: {c.cityId || 'الرباط'} • UID: <code style={{ fontSize: 10 }}>{c.uid}</code>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => handleToggleCustomer(c)}
                      title={c.isActive !== false ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                      style={{
                        border: '1px solid #e2e8f0',
                        background: c.isActive !== false ? '#fff7ed' : '#f0fdf4',
                        color: c.isActive !== false ? '#c2410c' : '#15803d',
                        borderRadius: 8,
                        padding: '6px 10px',
                        font: '700 12px Cairo',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <Power size={13} /> {c.isActive !== false ? 'تعطيل' : 'تفعيل'}
                    </button>
                    <button
                      onClick={() => setEditingCustomer({ ...c })}
                      title="تعديل حساب الزبون"
                      style={{
                        border: '1px solid #cbd5e1',
                        background: '#f8fafc',
                        color: '#0369a1',
                        borderRadius: 8,
                        padding: '6px 10px',
                        font: '700 12px Cairo',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <Edit3 size={13} /> تعديل
                    </button>
                    <button
                      onClick={() => handleDeleteCustomer(c)}
                      title="حذف نهائي وتسجيل في Tombstones"
                      style={{
                        border: '1px solid #fecaca',
                        background: '#fef2f2',
                        color: '#dc2626',
                        borderRadius: 8,
                        padding: '6px 10px',
                        font: '700 12px Cairo',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <Trash2 size={13} /> حذف نهائي
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* EDIT PROVIDER MODAL */}
      {editingProvider && (
        <div className="modal-overlay" onClick={() => setEditingProvider(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3><Edit3 size={18} /> تعديل بيانات المعلم</h3>
              <button className="close-btn" onClick={() => setEditingProvider(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveProviderEdit}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>الاسم الكامل</label>
              <input
                className="form-input"
                value={editingProvider.name || editingProvider.fullName || ''}
                onChange={e => setEditingProvider({ ...editingProvider, name: e.target.value, fullName: e.target.value })}
                required
              />

              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>المهنة والتخصص</label>
              <input
                className="form-input"
                value={editingProvider.job || editingProvider.professionName || ''}
                onChange={e => setEditingProvider({ ...editingProvider, job: e.target.value, professionName: e.target.value })}
                required
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>رقم الهاتف</label>
                  <input
                    className="form-input"
                    value={editingProvider.phone || ''}
                    onChange={e => setEditingProvider({ ...editingProvider, phone: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>المدينة</label>
                  <input
                    className="form-input"
                    value={editingProvider.city || editingProvider.cityId || ''}
                    onChange={e => setEditingProvider({ ...editingProvider, city: e.target.value, cityId: e.target.value })}
                    required
                  />
                </div>
              </div>

              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>رقم الواتساب</label>
              <input
                className="form-input"
                value={editingProvider.whatsapp || ''}
                onChange={e => setEditingProvider({ ...editingProvider, whatsapp: e.target.value })}
              />

              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>العنوان / الحي</label>
              <input
                className="form-input"
                value={editingProvider.address || ''}
                onChange={e => setEditingProvider({ ...editingProvider, address: e.target.value })}
              />

              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>الوصف والنبذة</label>
              <textarea
                className="review-textarea"
                value={editingProvider.bio || editingProvider.description || ''}
                onChange={e => setEditingProvider({ ...editingProvider, bio: e.target.value, description: e.target.value })}
              />

              <button type="submit" className="btn-primary" disabled={actionLoading} style={{ width: '100%' }}>
                {actionLoading ? 'جاري الحفظ...' : 'حفظ التعديلات في Firestore'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CUSTOMER MODAL */}
      {editingCustomer && (
        <div className="modal-overlay" onClick={() => setEditingCustomer(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3><Edit3 size={18} /> تعديل حساب الزبون</h3>
              <button className="close-btn" onClick={() => setEditingCustomer(null)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveCustomerEdit}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>الاسم الكامل</label>
              <input
                className="form-input"
                value={editingCustomer.fullName || ''}
                onChange={e => setEditingCustomer({ ...editingCustomer, fullName: e.target.value })}
                required
              />

              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>رقم الهاتف</label>
              <input
                className="form-input"
                value={editingCustomer.phone || ''}
                onChange={e => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                required
              />

              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>المدينة</label>
              <input
                className="form-input"
                value={editingCustomer.cityId || ''}
                onChange={e => setEditingCustomer({ ...editingCustomer, cityId: e.target.value })}
              />

              <button type="submit" className="btn-primary" disabled={actionLoading} style={{ width: '100%' }}>
                {actionLoading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG */}
      {confirmDialog && (
        <div className="modal-overlay" onClick={() => setConfirmDialog(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, textAlign: 'center' }}>
            <div style={{ color: '#dc2626', marginBottom: 12 }}>
              <AlertTriangle size={36} style={{ margin: '0 auto' }} />
            </div>
            <h3 style={{ margin: '0 0 10px', fontSize: 17, color: '#0b315d' }}>
              {confirmDialog.title}
            </h3>
            <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, marginBottom: 20 }}>
              {confirmDialog.message}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                style={{
                  flex: 1,
                  border: '1px solid #cbd5e1',
                  background: '#f1f5f9',
                  color: '#475569',
                  borderRadius: 10,
                  padding: 10,
                  font: '700 13px Cairo',
                  cursor: 'pointer'
                }}
                onClick={() => setConfirmDialog(null)}
              >
                إلغاء
              </button>
              <button
                style={{
                  flex: 1.5,
                  border: 0,
                  background: '#dc2626',
                  color: '#fff',
                  borderRadius: 10,
                  padding: 10,
                  font: '700 13px Cairo',
                  cursor: 'pointer'
                }}
                onClick={confirmDialog.onConfirm}
                disabled={actionLoading}
              >
                {confirmDialog.actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
