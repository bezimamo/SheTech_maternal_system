'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AddHospitalForm } from '@/components/AddHospitalForm';
import { AddUserForm } from '@/components/AddUserForm';
import { AddWoredaForm } from '@/components/AddWoredaForm';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { referralsApi, vaccinationsApi, childrenApi } from '@/lib/healthcare-api';

type Tab = 'overview' | 'hospitals' | 'health-centers' | 'admins' | 'analytics' | 'reports';

export default function MOHDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Data
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [refStats, setRefStats] = useState<any>({});
  const [childStats, setChildStats] = useState<any>({});
  const [vacStats, setVacStats] = useState<any>({});

  // Modals
  const [showHospitalModal, setShowHospitalModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showWoredaModal, setShowWoredaModal] = useState(false);
  const [editHospital, setEditHospital] = useState<any>(null);
  const [editUser, setEditUser] = useState<any>(null);
  const [userModalRoles, setUserModalRoles] = useState<string[] | undefined>(undefined);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [u, h, rs, cs, vs] = await Promise.all([
        api.getUsers().catch(() => []),
        api.getHospitals().catch(() => []),
        referralsApi.getAdminStats().catch(() => ({})),
        childrenApi.getStats().catch(() => ({})),
        vaccinationsApi.getVaccinationStats().catch(() => ({})),
      ]);
      setUsers(Array.isArray(u) ? u : []);
      setHospitals(Array.isArray(h) ? h : []);
      setRefStats(rs || {});
      setChildStats(cs || {});
      setVacStats(vs || {});
    } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const deleteUser = async (id: string) => {
    if (!confirm('Delete this user permanently?')) return;
    try { await api.deleteUser(id); fetchAll(); }
    catch (e: any) { alert(e.message || 'Delete failed'); }
  };

  const openAddHospital = (h?: any) => { setEditHospital(h || null); setShowHospitalModal(true); };
  const openAddUser = (roles?: string[], u?: any) => { setUserModalRoles(roles); setEditUser(u || null); setShowUserModal(true); };

  // Derived
  const q = search.toLowerCase();
  const allHospitals   = hospitals.filter(h => h.type === 'HOSPITAL');
  const allHCs         = hospitals.filter(h => h.type === 'HEALTH_CENTER');
  const superAdmins    = users.filter(u => u.role === 'SUPER_ADMIN');
  const systemAdmins   = users.filter(u => u.role === 'SYSTEM_ADMIN');
  const adminUsers     = [...superAdmins, ...systemAdmins];

  const fHospitals = allHospitals.filter(h => !q || h.name?.toLowerCase().includes(q) || h.location?.toLowerCase().includes(q));
  const fHCs       = allHCs.filter(h => !q || h.name?.toLowerCase().includes(q) || h.location?.toLowerCase().includes(q));
  const fAdmins    = adminUsers.filter(u => !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.role?.toLowerCase().includes(q));

  const TABS = [
    { id: 'overview'      as Tab, label: 'Overview',       icon: '📊' },
    { id: 'hospitals'     as Tab, label: 'Hospitals',      icon: '🏥' },
    { id: 'health-centers'as Tab, label: 'Health Centers', icon: '🏨' },
    { id: 'admins'        as Tab, label: 'Admins',         icon: '🛡️' },
    { id: 'analytics'     as Tab, label: 'Analytics',      icon: '📈' },
    { id: 'reports'       as Tab, label: 'Reports',        icon: '📋' },
  ];

  const roleBadge = (role: string) => {
    const m: Record<string,string> = {
      SUPER_ADMIN: 'bg-purple-100 text-purple-800',
      SYSTEM_ADMIN: 'bg-blue-100 text-blue-800',
    };
    return m[role] ?? 'bg-gray-100 text-gray-700';
  };

  return (
    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'MOH_ADMIN']}>
      <div className="min-h-screen bg-gray-50">

        {/* ── Header ── */}
        <header className="bg-gradient-to-r from-blue-700 to-purple-700 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap justify-between items-center py-4 gap-y-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">🏛️</div>
                <div>
                  <h1 className="text-xl font-bold">MOH Super Admin Dashboard</h1>
                  <p className="text-blue-200 text-xs">Ministry of Health — National System Management</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-blue-100 hidden sm:block">Welcome, <strong>{user?.name}</strong></span>
                <span className="text-xs bg-white/20 px-2 py-1 rounded-full font-semibold">{user?.role?.replace(/_/g,' ')}</span>
                <a href="/moh-dashboard/profile"
                  className="text-sm text-blue-200 hover:text-white underline whitespace-nowrap transition-colors">
                  My Profile
                </a>
                <button onClick={() => { logout(); router.push('/auth'); }}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* ── Tabs ── */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-1 overflow-x-auto">
              {TABS.map(t => (
                <button key={t.id} onClick={() => { setTab(t.id); setSearch(''); }}
                  className={`py-4 px-5 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    tab === t.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                  }`}>
                  {t.icon} {t.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">

          {/* ══ OVERVIEW ══ */}
          {tab === 'overview' && (<>
            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label:'Total Hospitals',    value: allHospitals.length,   color:'border-indigo-500', icon:'🏥' },
                { label:'Health Centers',     value: allHCs.length,         color:'border-teal-500',   icon:'🏨' },
                { label:'Super Admins',       value: superAdmins.length,    color:'border-purple-500', icon:'👑' },
                { label:'System Admins',      value: systemAdmins.length,   color:'border-blue-500',   icon:'🛡️' },
                { label:'Total Referrals',    value: refStats.total ?? 0,   color:'border-orange-500', icon:'🔄' },
                { label:'Completed Referrals',value: refStats.completed ?? 0,color:'border-green-500', icon:'✅' },
                { label:'Total Children',     value: childStats.total ?? 0, color:'border-pink-500',   icon:'👶' },
                { label:'Total Users',        value: users.length,          color:'border-gray-400',   icon:'👥' },
              ].map(s => (
                <div key={s.label} className={`bg-white rounded-xl shadow-sm p-4 border-l-4 ${s.color} flex items-center gap-3`}>
                  <span className="text-2xl">{s.icon}</span>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{loading ? '…' : s.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h2 className="text-base font-bold text-gray-900 mb-4">⚡ Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label:'Add Hospital',     icon:'🏥', color:'bg-indigo-600 hover:bg-indigo-700', action:() => openAddHospital() },
                  { label:'Add Health Center',icon:'🏨', color:'bg-teal-600 hover:bg-teal-700',    action:() => openAddHospital() },
                  { label:'Add Super Admin',  icon:'👑', color:'bg-purple-600 hover:bg-purple-700',action:() => openAddUser(['SUPER_ADMIN']) },
                  { label:'Add System Admin', icon:'🛡️', color:'bg-blue-600 hover:bg-blue-700',    action:() => openAddUser(['SYSTEM_ADMIN']) },
                  { label:'Add Woreda',       icon:'📍', color:'bg-green-600 hover:bg-green-700',  action:() => setShowWoredaModal(true) },
                ].map(a => (
                  <button key={a.label} onClick={a.action}
                    className={`${a.color} text-white rounded-xl p-4 flex flex-col items-center gap-2 transition-colors`}>
                    <span className="text-2xl">{a.icon}</span>
                    <span className="text-sm font-semibold">{a.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent facilities */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h2 className="text-base font-bold text-gray-900 mb-3">🏥 Recent Facilities</h2>
              <div className="divide-y divide-gray-50">
                {hospitals.slice(0,6).map((h:any) => (
                  <div key={h._id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{h.name}</p>
                      <p className="text-xs text-gray-400">{h.location} · {h.woredaId?.name || '—'}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${h.type==='HOSPITAL'?'bg-indigo-100 text-indigo-700':'bg-teal-100 text-teal-700'}`}>
                      {h.type==='HEALTH_CENTER'?'Health Center':h.type}
                    </span>
                  </div>
                ))}
                {hospitals.length===0 && !loading && <p className="text-sm text-gray-400 py-4 text-center">No facilities yet</p>}
              </div>
            </div>
          </>)}

          {/* ══ HOSPITALS TAB ══ */}
          {tab === 'hospitals' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">🏥 Hospitals</h2>
                  <p className="text-sm text-gray-500">{allHospitals.length} hospital{allHospitals.length !== 1 ? 's' : ''} registered</p>
                </div>
                <button onClick={() => openAddHospital()}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
                  + Add Hospital
                </button>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-4 border-b border-gray-100">
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name or location…"
                    className="w-full sm:w-80 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
                {loading ? (
                  <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
                ) : fHospitals.length === 0 ? (
                  <p className="text-center text-gray-400 py-12 text-sm">No hospitals found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>{['Name','Location','Contact','Woreda','Actions'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}</tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {fHospitals.map((h: any) => (
                          <tr key={h._id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">{h.name}</td>
                            <td className="px-4 py-3 text-gray-600">{h.location || '—'}</td>
                            <td className="px-4 py-3 text-gray-600">{h.contact || '—'}</td>
                            <td className="px-4 py-3 text-gray-600">{h.woredaId?.name || '—'}</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button onClick={() => openAddHospital(h)}
                                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700">Edit</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══ HEALTH CENTERS TAB ══ */}
          {tab === 'health-centers' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">🏨 Health Centers</h2>
                  <p className="text-sm text-gray-500">{allHCs.length} health center{allHCs.length !== 1 ? 's' : ''} registered</p>
                </div>
                <button onClick={() => openAddHospital()}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium">
                  + Add Health Center
                </button>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-4 border-b border-gray-100">
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name or location…"
                    className="w-full sm:w-80 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none" />
                </div>
                {loading ? (
                  <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" /></div>
                ) : fHCs.length === 0 ? (
                  <p className="text-center text-gray-400 py-12 text-sm">No health centers found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>{['Name','Location','Contact','Woreda','Actions'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}</tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {fHCs.map((h: any) => (
                          <tr key={h._id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">{h.name}</td>
                            <td className="px-4 py-3 text-gray-600">{h.location || '—'}</td>
                            <td className="px-4 py-3 text-gray-600">{h.contact || '—'}</td>
                            <td className="px-4 py-3 text-gray-600">{h.woredaId?.name || '—'}</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button onClick={() => openAddHospital(h)}
                                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700">Edit</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══ ADMINS TAB ══ */}
          {tab === 'admins' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">🛡️ Super & System Admins</h2>
                  <p className="text-sm text-gray-500">{superAdmins.length} super admin{superAdmins.length !== 1 ? 's' : ''} · {systemAdmins.length} system admin{systemAdmins.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openAddUser(['SUPER_ADMIN'])}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium">
                    + Super Admin
                  </button>
                  <button onClick={() => openAddUser(['SYSTEM_ADMIN'])}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                    + System Admin
                  </button>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-4 border-b border-gray-100">
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name, email or role…"
                    className="w-full sm:w-80 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none" />
                </div>
                {loading ? (
                  <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" /></div>
                ) : fAdmins.length === 0 ? (
                  <p className="text-center text-gray-400 py-12 text-sm">No admins found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>{['Name','Email','Role','Phone','Actions'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}</tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {fAdmins.map((u: any) => (
                          <tr key={u._id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                            <td className="px-4 py-3 text-gray-600 text-xs">{u.email}</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-1 rounded-full font-semibold ${roleBadge(u.role)}`}>
                                {u.role?.replace(/_/g,' ')}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{u.phoneNumber || '—'}</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button onClick={() => openAddUser(undefined, u)}
                                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700">Edit</button>
                                <button onClick={() => deleteUser(u._id)}
                                  className="px-3 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600">Delete</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══ REPORTS TAB ══ */}
          {tab === 'reports' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between print:hidden">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">📋 National Reports</h2>
                  <p className="text-sm text-gray-500">Generated: {new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</p>
                </div>
                <button onClick={() => window.print()}
                  className="flex items-center gap-2 px-5 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 text-sm font-medium">
                  🖨️ Print / Export PDF
                </button>
              </div>

              {/* Print header */}
              <div className="hidden print:block text-center mb-4 border-b pb-4">
                <h1 className="text-2xl font-bold">Ministry of Health — National Report</h1>
                <p className="text-gray-500 text-sm">Smart Maternal Health System · {new Date().toLocaleString()}</p>
              </div>

              {/* Referral Report */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-base font-bold text-gray-900 mb-1">🔄 Referral Report</h3>
                <p className="text-xs text-gray-400 mb-4">National referral statistics across all facilities</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    {label:'Total Referrals',   value:refStats.total??0,     bg:'bg-blue-50   border-blue-200',   text:'text-blue-900'},
                    {label:'Completed',         value:refStats.completed??0, bg:'bg-green-50  border-green-200',  text:'text-green-900'},
                    {label:'Pending',           value:refStats.pending??0,   bg:'bg-yellow-50 border-yellow-200', text:'text-yellow-900'},
                    {label:'Accepted',          value:refStats.accepted??0,  bg:'bg-indigo-50 border-indigo-200', text:'text-indigo-900'},
                    {label:'Rejected',          value:refStats.rejected??0,  bg:'bg-red-50    border-red-200',    text:'text-red-900'},
                    {label:'Checked In',        value:refStats.checkedIn??0, bg:'bg-purple-50 border-purple-200', text:'text-purple-900'},
                    {label:'Active',            value:refStats.active??0,    bg:'bg-orange-50 border-orange-200', text:'text-orange-900'},
                    {label:'Expired',           value:refStats.expired??0,   bg:'bg-gray-50   border-gray-200',   text:'text-gray-900'},
                  ].map(s => (
                    <div key={s.label} className={`rounded-lg p-4 border ${s.bg}`}>
                      <p className={`text-xs font-medium mb-1 opacity-70 ${s.text}`}>{s.label}</p>
                      <p className={`text-3xl font-bold ${s.text}`}>{loading?'…':s.value}</p>
                      {(refStats.total??0)>0 && <p className="text-xs opacity-50 mt-1">{Math.round(((s.value as number)/(refStats.total||1))*100)}%</p>}
                    </div>
                  ))}
                </div>
                {(refStats.total??0)>0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Completion Rate</span>
                      <span className="font-semibold">{Math.round(((refStats.completed??0)/(refStats.total||1))*100)}%</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{width:`${Math.round(((refStats.completed??0)/(refStats.total||1))*100)}%`}}/>
                    </div>
                  </div>
                )}
              </div>

              {/* Children & Vaccination Report */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-base font-bold text-gray-900 mb-1">👶 Children & Vaccination Report</h3>
                <p className="text-xs text-gray-400 mb-4">Child health status and immunization coverage</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    {label:'Total Children',          value:childStats.total??0,           bg:'bg-pink-50   border-pink-200',   text:'text-pink-900'},
                    {label:'Healthy',                 value:childStats.healthy??0,         bg:'bg-green-50  border-green-200',  text:'text-green-900'},
                    {label:'Needs Attention',         value:childStats.needsAttention??0,  bg:'bg-yellow-50 border-yellow-200', text:'text-yellow-900'},
                    {label:'Critical',                value:childStats.critical??0,        bg:'bg-red-50    border-red-200',    text:'text-red-900'},
                    {label:'Vaccinations Scheduled',  value:vacStats.scheduled??0,         bg:'bg-blue-50   border-blue-200',   text:'text-blue-900'},
                    {label:'Vaccinations Given',      value:vacStats.administered??0,      bg:'bg-indigo-50 border-indigo-200', text:'text-indigo-900'},
                    {label:'Vaccinations Missed',     value:vacStats.missed??0,            bg:'bg-orange-50 border-orange-200', text:'text-orange-900'},
                    {label:'Coverage Rate',           value:`${Math.round(vacStats.coverageRate??0)}%`, bg:'bg-teal-50 border-teal-200', text:'text-teal-900'},
                  ].map(s => (
                    <div key={s.label} className={`rounded-lg p-4 border ${s.bg}`}>
                      <p className={`text-xs font-medium mb-1 opacity-70 ${s.text}`}>{s.label}</p>
                      <p className={`text-3xl font-bold ${s.text}`}>{loading?'…':s.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Vaccination Coverage</span>
                    <span className="font-semibold">{Math.round(vacStats.coverageRate??0)}%</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${(vacStats.coverageRate??0)>=80?'bg-green-500':(vacStats.coverageRate??0)>=50?'bg-yellow-500':'bg-red-500'}`}
                      style={{width:`${Math.min(vacStats.coverageRate??0,100)}%`}}/>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {(vacStats.coverageRate??0)>=80?'✅ Good coverage':(vacStats.coverageRate??0)>=50?'⚠️ Moderate — improvement needed':'🔴 Low — urgent action required'}
                  </p>
                </div>
              </div>

              {/* Facilities & Admin Report */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-base font-bold text-gray-900 mb-1">🏥 Facilities & Administration Report</h3>
                <p className="text-xs text-gray-400 mb-4">Infrastructure and system administration overview</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    {label:'Total Hospitals',      value:allHospitals.length,  bg:'bg-indigo-50 border-indigo-200', text:'text-indigo-900'},
                    {label:'Total Health Centers', value:allHCs.length,        bg:'bg-teal-50   border-teal-200',   text:'text-teal-900'},
                    {label:'Total Facilities',     value:hospitals.length,     bg:'bg-gray-50   border-gray-200',   text:'text-gray-900'},
                    {label:'Super Admins',         value:superAdmins.length,   bg:'bg-purple-50 border-purple-200', text:'text-purple-900'},
                    {label:'System Admins',        value:systemAdmins.length,  bg:'bg-blue-50   border-blue-200',   text:'text-blue-900'},
                    {label:'Total System Users',   value:users.length,         bg:'bg-slate-50  border-slate-200',  text:'text-slate-900'},
                  ].map(s => (
                    <div key={s.label} className={`rounded-lg p-4 border ${s.bg}`}>
                      <p className={`text-xs font-medium mb-1 opacity-70 ${s.text}`}>{s.label}</p>
                      <p className={`text-3xl font-bold ${s.text}`}>{loading?'…':s.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Print footer */}
              <div className="hidden print:block text-center text-xs text-gray-400 mt-8 border-t pt-4">
                Smart Maternal Health System — Ministry of Health Ethiopia · {new Date().toLocaleString()}
              </div>
            </div>
          )}

          {/* ══ ANALYTICS TAB ══ */}
          {tab === 'analytics' && (            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900">📈 National Analytics</h2>

              {/* Referral report */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-base font-semibold text-gray-800 mb-4">🔄 Referral Report</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label:'Total Referrals',    value: refStats.total     ?? 0, color:'bg-blue-50   text-blue-800',   bar:'bg-blue-500' },
                    { label:'Pending',            value: refStats.pending   ?? 0, color:'bg-yellow-50 text-yellow-800', bar:'bg-yellow-500' },
                    { label:'Accepted',           value: refStats.accepted  ?? 0, color:'bg-green-50  text-green-800',  bar:'bg-green-500' },
                    { label:'Completed',          value: refStats.completed ?? 0, color:'bg-indigo-50 text-indigo-800', bar:'bg-indigo-500' },
                    { label:'Rejected',           value: refStats.rejected  ?? 0, color:'bg-red-50    text-red-800',    bar:'bg-red-500' },
                    { label:'Checked In',         value: refStats.checkedIn ?? 0, color:'bg-purple-50 text-purple-800', bar:'bg-purple-500' },
                    { label:'Expired',            value: refStats.expired   ?? 0, color:'bg-gray-50   text-gray-700',   bar:'bg-gray-400' },
                    { label:'Active',             value: refStats.active    ?? 0, color:'bg-orange-50 text-orange-800', bar:'bg-orange-500' },
                  ].map(s => {
                    const total = refStats.total || 1;
                    const pct = Math.round((s.value / total) * 100);
                    return (
                      <div key={s.label} className={`rounded-xl p-4 ${s.color}`}>
                        <p className="text-xs font-medium opacity-70">{s.label}</p>
                        <p className="text-3xl font-bold mt-1">{loading ? '…' : s.value}</p>
                        <div className="mt-2 h-1.5 bg-black/10 rounded-full overflow-hidden">
                          <div className={`h-full ${s.bar} rounded-full`} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-xs mt-1 opacity-60">{pct}% of total</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Children report */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-base font-semibold text-gray-800 mb-4">👶 Children & Vaccination Report</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label:'Total Children',       value: childStats.total        ?? 0, color:'bg-pink-50   text-pink-800' },
                    { label:'Healthy',              value: childStats.healthy      ?? 0, color:'bg-green-50  text-green-800' },
                    { label:'Needs Attention',      value: childStats.needsAttention??0, color:'bg-yellow-50 text-yellow-800' },
                    { label:'Critical',             value: childStats.critical     ?? 0, color:'bg-red-50    text-red-800' },
                    { label:'Vaccinations Scheduled',value: vacStats.scheduled     ?? 0, color:'bg-blue-50   text-blue-800' },
                    { label:'Vaccinations Given',   value: vacStats.administered   ?? 0, color:'bg-indigo-50 text-indigo-800' },
                    { label:'Vaccinations Missed',  value: vacStats.missed         ?? 0, color:'bg-orange-50 text-orange-800' },
                    { label:'Coverage Rate',        value: `${Math.round(vacStats.coverageRate ?? 0)}%`, color:'bg-teal-50 text-teal-800' },
                  ].map(s => (
                    <div key={s.label} className={`rounded-xl p-4 ${s.color}`}>
                      <p className="text-xs font-medium opacity-70">{s.label}</p>
                      <p className="text-3xl font-bold mt-1">{loading ? '…' : s.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Facilities summary */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-base font-semibold text-gray-800 mb-4">🏥 Facilities Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label:'Total Hospitals',    value: allHospitals.length, color:'bg-indigo-50 text-indigo-800' },
                    { label:'Total Health Centers',value: allHCs.length,      color:'bg-teal-50   text-teal-800' },
                    { label:'Total Facilities',   value: hospitals.length,    color:'bg-gray-50   text-gray-800' },
                    { label:'Super Admins',        value: superAdmins.length, color:'bg-purple-50 text-purple-800' },
                    { label:'System Admins',       value: systemAdmins.length,color:'bg-blue-50   text-blue-800' },
                    { label:'Total Admin Users',   value: adminUsers.length,  color:'bg-slate-50  text-slate-800' },
                  ].map(s => (
                    <div key={s.label} className={`rounded-xl p-4 ${s.color}`}>
                      <p className="text-xs font-medium opacity-70">{s.label}</p>
                      <p className="text-3xl font-bold mt-1">{loading ? '…' : s.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
      {showHospitalModal && (
        <AddHospitalForm
          onClose={() => { setShowHospitalModal(false); setEditHospital(null); }}
          onSuccess={() => { fetchAll(); setShowHospitalModal(false); setEditHospital(null); }}
          hospitalToEdit={editHospital}
        />
      )}
      {showUserModal && (
        <AddUserForm
          onClose={() => { setShowUserModal(false); setEditUser(null); setUserModalRoles(undefined); }}
          onSuccess={() => { fetchAll(); setShowUserModal(false); setEditUser(null); setUserModalRoles(undefined); }}
          userToEdit={editUser}
          allowedRoles={userModalRoles}
        />
      )}
      {showWoredaModal && (
        <AddWoredaForm
          onClose={() => setShowWoredaModal(false)}
          onSuccess={() => { fetchAll(); setShowWoredaModal(false); }}
        />
      )}
    </ProtectedRoute>
  );
}
