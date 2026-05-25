'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { mothersApi, pregnancyApi, childrenApi, vaccinationsApi, referralsApi } from '@/lib/healthcare-api';
import { api } from '@/lib/api';

interface ReportData {
  totalMothers: number;
  activeMothers: number;
  deliveredMothers: number;
  highRiskMothers: number;
  totalPregnancies: number;
  lowRiskPregnancies: number;
  moderateRiskPregnancies: number;
  highRiskPregnancies: number;
  emergencyPregnancies: number;
  totalChildren: number;
  healthyChildren: number;
  needsAttentionChildren: number;
  criticalChildren: number;
  overdueVaccinations: number;
  upcomingVaccinations: number;
  administeredVaccinations: number;
  missedVaccinations: number;
  totalOutboundReferrals: number;
  pendingOutbound: number;
  completedOutbound: number;
  totalInboundReferrals: number;
  pendingInbound: number;
  totalStaff: number;
  staffByRole: Record<string, number>;
  recentReferrals: any[];
}

const EMPTY: ReportData = {
  totalMothers: 0, activeMothers: 0, deliveredMothers: 0, highRiskMothers: 0,
  totalPregnancies: 0, lowRiskPregnancies: 0, moderateRiskPregnancies: 0,
  highRiskPregnancies: 0, emergencyPregnancies: 0,
  totalChildren: 0, healthyChildren: 0, needsAttentionChildren: 0, criticalChildren: 0,
  overdueVaccinations: 0, upcomingVaccinations: 0, administeredVaccinations: 0, missedVaccinations: 0,
  totalOutboundReferrals: 0, pendingOutbound: 0, completedOutbound: 0,
  totalInboundReferrals: 0, pendingInbound: 0,
  totalStaff: 0, staffByRole: {}, recentReferrals: [],
};

const STAFF_ROLES = ['DOCTOR', 'NURSE', 'MIDWIFE', 'DISPATCHER', 'LIAISON_OFFICER',
  'HOSPITAL_APPROVER', 'GATEKEEPER', 'SPECIALIST'];

function cnt<T>(arr: T[], pred: (x: T) => boolean) {
  return Array.isArray(arr) ? arr.filter(pred).length : 0;
}
function pct(part: number, total: number) {
  return total ? `${Math.round((part / total) * 100)}%` : '0%';
}
function statusColor(s: string) {
  const m: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700', ACCEPTED: 'bg-blue-100 text-blue-700',
    COMPLETED: 'bg-green-100 text-green-700', REJECTED: 'bg-red-100 text-red-700',
    EXPIRED: 'bg-orange-100 text-orange-700', DRAFT: 'bg-gray-100 text-gray-700',
    CHECKED_IN: 'bg-indigo-100 text-indigo-700',
  };
  return m[s] ?? 'bg-gray-100 text-gray-700';
}

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div className={`bg-white rounded-lg shadow p-5 border-l-4 ${color}`}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function BarRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const w = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-700">{label}</span>
        <span className="text-gray-500">{value} <span className="text-gray-400">({pct(value, total)})</span></span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${w}%` }} />
      </div>
    </div>
  );
}

export default function HealthCenterReportsPage() {
  const { user, logout } = useAuth();
  const [data, setData] = useState<ReportData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mothers, pregnancies, children, overdueVax, upcomingVax, outbound, inbound, users] =
        await Promise.allSettled([
          mothersApi.getAll(),
          pregnancyApi.getAll(),
          childrenApi.getAll(),
          vaccinationsApi.getOverdueVaccinations(),
          vaccinationsApi.getUpcomingVaccinations(7),
          referralsApi.getOutbox(),
          referralsApi.getAll('inbound'),
          api.getUsers(),
        ]);

      const m = mothers.status === 'fulfilled' && Array.isArray(mothers.value) ? mothers.value : [];
      const p = pregnancies.status === 'fulfilled' && Array.isArray(pregnancies.value) ? pregnancies.value : [];
      const c = children.status === 'fulfilled' && Array.isArray(children.value) ? children.value : [];
      const ov = overdueVax.status === 'fulfilled' && Array.isArray(overdueVax.value) ? overdueVax.value : [];
      const uv = upcomingVax.status === 'fulfilled' && Array.isArray(upcomingVax.value) ? upcomingVax.value : [];
      const ob = outbound.status === 'fulfilled' && Array.isArray(outbound.value) ? outbound.value : [];
      const ib = inbound.status === 'fulfilled' && Array.isArray(inbound.value) ? inbound.value : [];
      const u = users.status === 'fulfilled' && Array.isArray(users.value) ? users.value : [];

      const staffByRole: Record<string, number> = {};
      let totalStaff = 0;
      for (const role of STAFF_ROLES) {
        const n = cnt(u, (x: any) => x.role === role);
        staffByRole[role] = n;
        totalStaff += n;
      }

      const allReferrals = [
        ...ob.map((r: any) => ({ ...r, _dir: 'OUT' })),
        ...ib.map((r: any) => ({ ...r, _dir: 'IN' })),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);

      setData({
        totalMothers: m.length,
        activeMothers: cnt(m, (x: any) => x.status === 'ACTIVE'),
        deliveredMothers: cnt(m, (x: any) => x.status === 'DELIVERED'),
        highRiskMothers: cnt(m, (x: any) => x.highRisk === true),
        totalPregnancies: p.length,
        lowRiskPregnancies: cnt(p, (x: any) => x.riskLevel === 'LOW'),
        moderateRiskPregnancies: cnt(p, (x: any) => x.riskLevel === 'MODERATE'),
        highRiskPregnancies: cnt(p, (x: any) => x.riskLevel === 'HIGH'),
        emergencyPregnancies: cnt(p, (x: any) => x.emergency === true),
        totalChildren: c.length,
        healthyChildren: cnt(c, (x: any) => x.healthStatus === 'HEALTHY'),
        needsAttentionChildren: cnt(c, (x: any) => x.healthStatus === 'NEEDS_ATTENTION'),
        criticalChildren: cnt(c, (x: any) => x.healthStatus === 'CRITICAL'),
        overdueVaccinations: ov.length,
        upcomingVaccinations: uv.length,
        administeredVaccinations: 0,
        missedVaccinations: 0,
        totalOutboundReferrals: ob.length,
        pendingOutbound: cnt(ob, (x: any) => x.status === 'PENDING'),
        completedOutbound: cnt(ob, (x: any) => x.status === 'COMPLETED'),
        totalInboundReferrals: ib.length,
        pendingInbound: cnt(ib, (x: any) => x.status === 'PENDING'),
        totalStaff,
        staffByRole,
        recentReferrals: allReferrals,
      });
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return (
    <ProtectedRoute requiredRole="HEALTH_CENTER_ADMIN">
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b border-gray-200 print:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Health Center Reports</h1>
                  <p className="text-sm text-gray-500">{lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : 'Loading…'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Link href="/health-center-dashboard" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md border border-gray-200 hover:bg-gray-50">← Dashboard</Link>
                <button onClick={fetchAll} disabled={loading} className="px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors">{loading ? 'Refreshing…' : 'Refresh'}</button>
                <button onClick={() => window.print()} className="px-4 py-2 bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors">Print</button>
                <button onClick={() => logout()} className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors">Logout</button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow p-5 animate-pulse">
                  <div className="h-3 bg-gray-200 rounded mb-3 w-2/3" />
                  <div className="h-8 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Mothers" value={data.totalMothers} sub={`${data.highRiskMothers} high-risk`} color="border-teal-500" />
                <StatCard label="Pregnancy Visits" value={data.totalPregnancies} sub={`${data.emergencyPregnancies} emergency`} color="border-pink-500" />
                <StatCard label="Children Registered" value={data.totalChildren} sub={`${data.criticalChildren} critical`} color="border-purple-500" />
                <StatCard label="Total Staff" value={data.totalStaff} sub={`${data.staffByRole['NURSE'] ?? 0} nurses`} color="border-cyan-500" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Outbound Referrals" value={data.totalOutboundReferrals} sub={`${data.pendingOutbound} pending`} color="border-orange-500" />
                <StatCard label="Inbound Referrals" value={data.totalInboundReferrals} sub={`${data.pendingInbound} awaiting response`} color="border-indigo-500" />
                <StatCard label="Overdue Vaccinations" value={data.overdueVaccinations} sub="need immediate action" color="border-red-500" />
                <StatCard label="Upcoming Vaccinations" value={data.upcomingVaccinations} sub="next 7 days" color="border-green-500" />
              </div>

              {/* Maternal + Pregnancy */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">👩 Maternal Health</h2>
                  <div className="space-y-4">
                    <BarRow label="Active" value={data.activeMothers} total={data.totalMothers} color="bg-teal-500" />
                    <BarRow label="Delivered" value={data.deliveredMothers} total={data.totalMothers} color="bg-green-500" />
                    <BarRow label="High Risk" value={data.highRiskMothers} total={data.totalMothers} color="bg-red-500" />
                  </div>
                  {data.totalMothers === 0 && <p className="text-sm text-gray-400 mt-4 text-center">No mothers registered yet</p>}
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">🤰 Pregnancy Risk Levels</h2>
                  <div className="space-y-4">
                    <BarRow label="Low Risk" value={data.lowRiskPregnancies} total={data.totalPregnancies} color="bg-green-500" />
                    <BarRow label="Moderate Risk" value={data.moderateRiskPregnancies} total={data.totalPregnancies} color="bg-yellow-500" />
                    <BarRow label="High Risk" value={data.highRiskPregnancies} total={data.totalPregnancies} color="bg-red-500" />
                    <BarRow label="Emergency" value={data.emergencyPregnancies} total={data.totalPregnancies} color="bg-red-700" />
                  </div>
                  {data.totalPregnancies === 0 && <p className="text-sm text-gray-400 mt-4 text-center">No pregnancy visits recorded yet</p>}
                </div>
              </div>

              {/* Children + Vaccinations */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">👶 Child Health Status</h2>
                  <div className="space-y-4">
                    <BarRow label="Healthy" value={data.healthyChildren} total={data.totalChildren} color="bg-green-500" />
                    <BarRow label="Needs Attention" value={data.needsAttentionChildren} total={data.totalChildren} color="bg-yellow-500" />
                    <BarRow label="Critical" value={data.criticalChildren} total={data.totalChildren} color="bg-red-500" />
                  </div>
                  {data.totalChildren === 0 && <p className="text-sm text-gray-400 mt-4 text-center">No children registered yet</p>}
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">💉 Vaccination Summary</h2>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Upcoming (7d)', value: data.upcomingVaccinations, color: 'text-blue-600 bg-blue-50' },
                      { label: 'Overdue', value: data.overdueVaccinations, color: 'text-red-600 bg-red-50' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className={`rounded-lg p-4 ${color}`}>
                        <p className="text-2xl font-bold">{value}</p>
                        <p className="text-sm mt-1">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Staff */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">👥 Staff Breakdown</h2>
                {data.totalStaff === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No staff records found</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {STAFF_ROLES.map((role) => {
                      const n = data.staffByRole[role] ?? 0;
                      if (n === 0) return null;
                      return (
                        <div key={role} className="bg-gray-50 rounded-lg p-4 text-center">
                          <p className="text-2xl font-bold text-gray-800">{n}</p>
                          <p className="text-xs text-gray-500 mt-1">{role.replace(/_/g, ' ')}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Recent referrals */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">🕐 Recent Referrals (Last 10)</h2>
                {data.recentReferrals.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No referrals found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-left">
                          <th className="pb-3 pr-4 font-medium text-gray-600">Code</th>
                          <th className="pb-3 pr-4 font-medium text-gray-600">Patient</th>
                          <th className="pb-3 pr-4 font-medium text-gray-600">Direction</th>
                          <th className="pb-3 pr-4 font-medium text-gray-600">Status</th>
                          <th className="pb-3 font-medium text-gray-600">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.recentReferrals.map((r) => (
                          <tr key={r._id} className="hover:bg-gray-50">
                            <td className="py-3 pr-4 font-mono text-xs text-gray-600">{r.referralCode ?? r._id?.slice(-6)}</td>
                            <td className="py-3 pr-4 text-gray-800">{r.patientName ?? r.motherId?.name ?? '—'}</td>
                            <td className="py-3 pr-4">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r._dir === 'OUT' ? 'bg-orange-100 text-orange-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                {r._dir === 'OUT' ? '↑ Sent' : '↓ Received'}
                              </span>
                            </td>
                            <td className="py-3 pr-4">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(r.status)}`}>{r.status}</span>
                            </td>
                            <td className="py-3 text-gray-500 text-xs">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
