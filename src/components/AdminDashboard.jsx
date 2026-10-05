import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, ShieldCheck, Users, Briefcase, UserX, MapPin,
  Phone, MessageCircle, Star, Search, Edit3, Trash2, Power,
  ArrowRight, ArrowLeft, RefreshCw, CheckCircle, AlertTriangle, X,
  UserRound, Calendar, Shield, ExternalLink
} from 'lucide-react';
import {
  getAdminStats,
  getAllAccountsAdmin,
  deleteAccountCompleteAdmin,
  getAllProvidersAdmin,
  updateProviderAdmin,
  toggleProviderStatusAdmin,
  deleteProviderAdmin,
  getAllCustomersAdmin,
  updateCustomerAdmin,
  toggleCustomerStatusAdmin,
  deleteCustomerAdmin,
  bulkDeleteAdmin
} from '../services/adminService.js';
import { createUserProfile } from '../services/authService';
import { updatePrivatePageSEO, updateHomeSEO } from '../services/seoService';
import { isReviewEnvironment } from '../utils/envUtils.js';

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

  // All Accounts list state
  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountQuery, setAccountQuery] = useState('');
  const [accountRoleFilter, setAccountRoleFilter] = useState('all'); // 'all' | 'customer' | 'provider' | 'admin'

  // Selected Account for full detail card modal
  const [selectedAccountCard, setSelectedAccountCard] = useState(null);

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

  // Load all accounts
  const refreshAccounts = async () => {
    setAccountsLoading(true);
    try {
      const data = await getAllAccountsAdmin(seedProviders);
      setAccounts(data);
    } catch (err) {
      console.error('[Admin] Accounts load error:', err);
    } finally {
      setAccountsLoading(false);
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
      refreshAccounts();
      refreshProviders();
      refreshCustomers();
    }
  }, [isAdmin]);

  // Account deletion handler
  const handleDeleteAccountConfirm = (acc) => {
    if (!acc) return;
    const roleLabel = acc.role === 'provider' ? 'معلم مهني' : acc.role === 'admin' ? 'مشرف إدارة' : 'زبون مسجل';
    setConfirmDialog({
      title: `حذف حساب "${acc.fullName}" نهائياً`,
      message: `أنت على وشك حذف هذا الحساب (${roleLabel}) نهائياً من قاعدة بيانات Firestore. سيتم مسح مستند المستخدم وكافة البيانات المرتبطة به (التقييمات، المفضلة، الإشعارات) وتسجيل Tombstone دائم لمنع عودته.`,
      actionLabel: 'تأكيد الحذف النهائي الشامل',
      isDanger: true,
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await deleteAccountCompleteAdmin(acc.uid || acc.id, acc.role);
          const targetId = acc.uid || acc.id;
          setAccounts(prev => prev.filter(a => a.uid !== targetId && a.id !== targetId));
          setProviders(prev => prev.filter(p => p.id !== targetId));
          setCustomers(prev => prev.filter(c => c.uid !== targetId));
          if (selectedAccountCard && (selectedAccountCard.uid === targetId || selectedAccountCard.id === targetId)) {
            setSelectedAccountCard(null);
          }
          refreshStats();
          showToastMsg(`تم حذف حساب ${acc.fullName} وبياناته المرتبطة نهائياً 🗑️`);
        } catch (err) {
          showToastMsg('خطأ أثناء الحذف: ' + err.message);
        } finally {
          setActionLoading(false);
          setConfirmDialog(null);
        }
      }
    });
  };

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
            {isReviewEnvironment() && (
              <button
                className="btn-primary"
                onClick={handleLoginAsAdminDemo}
                disabled={actionLoading}
                style={{ padding: 12, background: '#0b315d' }}
              >
                {actionLoading ? 'جاري التحقق...' : '🔑 دخول تجريبي كمسؤول النظام (Admin Demo)'}
              </button>
            )}
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

  const filteredAdminAccounts = accounts.filter(a => {
    if (accountRoleFilter !== 'all' && a.role !== accountRoleFilter) {
      return false;
    }
    const q = accountQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (a.fullName && a.fullName.toLowerCase().includes(q)) ||
      (a.phone && a.phone.includes(q)) ||
      (a.cityId && a.cityId.toLowerCase().includes(q)) ||
      (a.uid && a.uid.toLowerCase().includes(q)) ||
      (a.professionName && a.professionName.toLowerCase().includes(q)) ||
      (a.role && a.role.toLowerCase().includes(q))
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
      <div style={{ display: 'flex', gap: 8, background: '#f1f5f9', padding: 4, borderRadius: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('stats')}
          style={{
            flex: 1,
            minWidth: 120,
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
          onClick={() => setActiveTab('accounts')}
          style={{
            flex: 1.2,
            minWidth: 140,
            border: 0,
            background: activeTab === 'accounts' ? '#fff' : 'transparent',
            color: activeTab === 'accounts' ? '#09569c' : '#64748b',
            boxShadow: activeTab === 'accounts' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
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
          <UserRound size={16} /> كافة الحسابات ({accounts.length})
        </button>
        <button
          onClick={() => setActiveTab('providers')}
          style={{
            flex: 1,
            minWidth: 120,
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
            minWidth: 120,
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

      {/* TAB: ALL REGISTERED ACCOUNTS MANAGEMENT */}
      {activeTab === 'accounts' && (
        <div>
          {/* Controls Bar */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
              <input
                className="form-input"
                style={{ margin: 0, paddingLeft: 34 }}
                placeholder="بحث باسم الحساب، الهاتف، المعرف UID، أو المدينة..."
                value={accountQuery}
                onChange={e => setAccountQuery(e.target.value)}
              />
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 10, top: 12 }} />
            </div>

            {/* Role Filter Buttons */}
            <div style={{ display: 'flex', gap: 6, background: '#e2e8f0', padding: 4, borderRadius: 10 }}>
              {[
                { id: 'all', label: 'الكل' },
                { id: 'customer', label: 'زبناء' },
                { id: 'provider', label: 'معلمون' },
                { id: 'admin', label: 'مشرفون' }
              ].map(rf => (
                <button
                  key={rf.id}
                  onClick={() => setAccountRoleFilter(rf.id)}
                  style={{
                    border: 0,
                    background: accountRoleFilter === rf.id ? '#fff' : 'transparent',
                    color: accountRoleFilter === rf.id ? '#09569c' : '#64748b',
                    padding: '6px 12px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {rf.label}
                </button>
              ))}
            </div>

            <button
              onClick={refreshAccounts}
              disabled={accountsLoading}
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
          </div>

          {/* Accounts List */}
          {accountsLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
              <span className="spinner"></span> جاري استرجاع الحسابات المسجلة من Firestore...
            </div>
          ) : filteredAdminAccounts.length === 0 ? (
            <div className="review-empty-state">لا توجد حسابات مسجلة تطابق البحث</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredAdminAccounts.map(acc => {
                const isPro = acc.role === 'provider';
                const isAdm = acc.role === 'admin';
                return (
                  <div
                    key={acc.uid || acc.id}
                    onClick={() => setSelectedAccountCard(acc)}
                    style={{
                      background: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 14,
                      padding: 14,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 12,
                      cursor: 'pointer',
                      transition: 'border-color 0.2s, box-shadow 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#09569c'; e.currentTarget.style.boxShadow = '0 3px 10px rgba(9,86,156,0.08)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 10,
                          background: isAdm ? '#f3e8ff' : isPro ? '#e0efff' : '#f1f5f9',
                          color: isAdm ? '#7e22ce' : isPro ? '#09569c' : '#475569',
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: 20
                        }}
                      >
                        {isAdm ? '🛡️' : isPro ? '👷‍♂️' : '👤'}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: 15, color: '#0b315d' }}>{acc.fullName}</strong>
                          <span
                            style={{
                              background: isAdm ? '#f3e8ff' : isPro ? '#dbeafe' : '#f1f5f9',
                              color: isAdm ? '#6b21a8' : isPro ? '#1e40af' : '#475569',
                              padding: '2px 8px',
                              borderRadius: 8,
                              fontSize: 11,
                              fontWeight: 700
                            }}
                          >
                            {isAdm ? 'مشرف إدارة' : isPro ? 'معلم مهني' : 'زبون'}
                          </span>
                          <span
                            style={{
                              background: acc.isActive !== false ? '#dcfce7' : '#fee2e2',
                              color: acc.isActive !== false ? '#15803d' : '#b91c1c',
                              padding: '2px 8px',
                              borderRadius: 8,
                              fontSize: 11,
                              fontWeight: 700
                            }}
                          >
                            {acc.isActive !== false ? 'نشط' : 'معطل'}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <span>📱 {acc.phone || 'بدون هاتف'}</span>
                          <span>📍 {acc.cityId || 'المغرب'}</span>
                          {acc.professionName && <span>🔨 {acc.professionName}</span>}
                          <span style={{ color: '#09569c', fontWeight: 600 }}>👈 اضغط لعرض بطاقة الحساب الكاملة</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedAccountCard(acc)}
                        title="عرض البطاقة الكاملة للمعلومات"
                        style={{
                          border: '1px solid #cbd5e1',
                          background: '#f8fafc',
                          color: '#09569c',
                          borderRadius: 8,
                          padding: '6px 12px',
                          font: '700 12px Cairo',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <UserRound size={13} /> عرض البطاقة
                      </button>
                      <button
                        onClick={() => handleDeleteAccountConfirm(acc)}
                        title="حذف الحساب نهائياً مع كافة بياناته في Firestore"
                        style={{
                          border: '1px solid #fecaca',
                          background: '#fef2f2',
                          color: '#dc2626',
                          borderRadius: 8,
                          padding: '6px 12px',
                          font: '700 12px Cairo',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <Trash2 size={13} /> حذف الحساب
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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

      {/* FULL ACCOUNT DETAILS MODAL / CARD */}
      {selectedAccountCard && (
        <div className="modal-overlay" onClick={() => setSelectedAccountCard(null)}>
          <div
            className="modal-box"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}
          >
            {/* Modal Header */}
            <div className="modal-header" style={{ alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: selectedAccountCard.role === 'admin' ? '#f3e8ff' : selectedAccountCard.role === 'provider' ? '#e0efff' : '#f1f5f9',
                    color: selectedAccountCard.role === 'admin' ? '#7e22ce' : selectedAccountCard.role === 'provider' ? '#09569c' : '#475569',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 26
                  }}
                >
                  {selectedAccountCard.role === 'admin' ? '🛡️' : selectedAccountCard.role === 'provider' ? '👷‍♂️' : '👤'}
                </div>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: 18, color: '#0b315d' }}>
                    {selectedAccountCard.fullName}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        background: selectedAccountCard.role === 'admin' ? '#f3e8ff' : selectedAccountCard.role === 'provider' ? '#dbeafe' : '#f1f5f9',
                        color: selectedAccountCard.role === 'admin' ? '#6b21a8' : selectedAccountCard.role === 'provider' ? '#1e40af' : '#475569',
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700
                      }}
                    >
                      {selectedAccountCard.role === 'admin' ? 'مشرف إدارة (Admin)' : selectedAccountCard.role === 'provider' ? 'معلم مهني (Provider)' : 'زبون (Customer)'}
                    </span>
                    <span
                      style={{
                        background: selectedAccountCard.isActive !== false ? '#dcfce7' : '#fee2e2',
                        color: selectedAccountCard.isActive !== false ? '#15803d' : '#b91c1c',
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700
                      }}
                    >
                      {selectedAccountCard.isActive !== false ? 'نشط' : 'معطل'}
                    </span>
                  </div>
                </div>
              </div>
              <button className="close-btn" onClick={() => setSelectedAccountCard(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Information Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 0' }}>
              {/* UID Box */}
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 2 }}>المعرف الفريد (Firebase UID)</span>
                <code style={{ fontSize: 12, color: '#0b315d', wordBreak: 'break-all', fontWeight: 600 }}>
                  {selectedAccountCard.uid || selectedAccountCard.id}
                </code>
              </div>

              {/* Contact Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>رقم الهاتف</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <strong style={{ fontSize: 13, color: '#0b315d' }}>{selectedAccountCard.phone || 'غير مسجل'}</strong>
                    {selectedAccountCard.phone && (
                      <a href={`tel:${selectedAccountCard.phone}`} style={{ color: '#09569c' }} title="اتصال">
                        <Phone size={14} />
                      </a>
                    )}
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>الواتساب</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <strong style={{ fontSize: 13, color: '#0b315d' }}>{selectedAccountCard.whatsapp || selectedAccountCard.phone || 'غير متوفر'}</strong>
                    {(selectedAccountCard.whatsapp || selectedAccountCard.phone) && (
                      <a
                        href={`https://wa.me/${selectedAccountCard.whatsapp || selectedAccountCard.phone}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#16a34a' }}
                        title="واتساب"
                      >
                        <MessageCircle size={14} />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* City & Profession */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 2 }}>المدينة</span>
                  <strong style={{ fontSize: 13, color: '#0b315d' }}>📍 {selectedAccountCard.cityId || 'المغرب'}</strong>
                </div>

                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 2 }}>المهنة والتخصص</span>
                  <strong style={{ fontSize: 13, color: '#0b315d' }}>
                    {selectedAccountCard.professionName ? `🔨 ${selectedAccountCard.professionName}` : 'زبون مستفيد'}
                  </strong>
                </div>
              </div>

              {/* Provider details if provider */}
              {selectedAccountCard.role === 'provider' && (
                <div style={{ background: '#eff6ff', padding: '10px 14px', borderRadius: 10, border: '1px solid #bfdbfe' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: '#1e40af', fontWeight: 700 }}>إحصائيات وتقييم الحرفي</span>
                    <span style={{ fontSize: 12, color: '#b45309', fontWeight: 700 }}>
                      ⭐ {selectedAccountCard.rating || '5.0'} ({selectedAccountCard.reviewsCount || 0} تقييم)
                    </span>
                  </div>
                  {selectedAccountCard.bio && (
                    <p style={{ margin: 0, fontSize: 12, color: '#1e3a8a', lineHeight: 1.5 }}>
                      {selectedAccountCard.bio}
                    </p>
                  )}
                </div>
              )}

              {/* Metadata */}
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12, color: '#475569' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>تاريخ التسجيل:</span>
                  <strong>{new Date(selectedAccountCard.createdAt || 0).toLocaleDateString('ar-MA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>حالة التخزين:</span>
                  <span style={{ color: '#16a34a', fontWeight: 600 }}>مستند حقيقي محفوظ في Firestore</span>
                </div>
              </div>

              {/* Security info box */}
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 12, fontSize: 12, color: '#991b1b', lineHeight: 1.5 }}>
                🛡️ <strong>حماية وأمان الحذف:</strong> عملية الحذف محمية حصرياً بصلاحيات الإدارة عبر Firebase Authentication وقواعد Firestore Security Rules. عند التأكيد، سيتم مسح مستند المستخدم وكافة سجلاته المرتبطة (التقييمات، المفضلة، الإشعارات) مع تسجيل Tombstone دائم.
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: 10, borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
              <button
                style={{
                  flex: 1,
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#475569',
                  borderRadius: 10,
                  padding: '10px',
                  font: '700 13px Cairo',
                  cursor: 'pointer'
                }}
                onClick={() => setSelectedAccountCard(null)}
              >
                إغلاق
              </button>
              <button
                style={{
                  flex: 2,
                  border: 0,
                  background: '#dc2626',
                  color: '#fff',
                  borderRadius: 10,
                  padding: '10px',
                  font: '700 13px Cairo',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
                onClick={() => handleDeleteAccountConfirm(selectedAccountCard)}
                disabled={actionLoading}
              >
                <Trash2 size={16} /> حذف الحساب نهائياً مع كافة بياناته
              </button>
            </div>
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
