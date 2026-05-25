'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

export default function HealthCenterAnalyticsPage() {
  const { user, logout } = useAuth();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChart, setSelectedChart] = useState('patients');

  useEffect(() => {
    fetchAnalytics();
  }, [selectedChart]);

  const fetchAnalytics = async () => {
    try {
      // Simulate analytics data - in real app, this would come from API
      const mockAnalytics = {
        patientTrends: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          data: [8, 12, 10, 15, 18, 20, 14]
        },
        staffPerformance: {
          doctors: { present: 2, absent: 1, total: 3 },
          nurses: { present: 6, absent: 2, total: 8 },
          midwives: { present: 4, absent: 0, total: 4 }
        },
        serviceLoad: {
          anc: { current: 15, capacity: 20, percentage: 75 },
          pnc: { current: 8, capacity: 10, percentage: 80 },
          vaccination: { current: 25, capacity: 30, percentage: 83 },
          emergency: { current: 3, capacity: 5, percentage: 60 }
        },
        monthlyStats: {
          ancVisits: 120,
          pncVisits: 45,
          vaccinations: 210,
          deliveries: 12
        }
      };
      
      setAnalytics(mockAnalytics);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderPatientTrends = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Patient Visits Trend</h3>
      <div className="h-64 flex items-end justify-between space-x-2">
        {analytics?.patientTrends.labels.map((label: string, index: number) => (
          <div key={label} className="flex flex-col items-center flex-1">
            <div 
              className="w-full bg-teal-500 rounded-t transition-all duration-300 hover:bg-teal-600"
              style={{ height: `${(analytics.patientTrends.data[index] / Math.max(...analytics.patientTrends.data)) * 100}%` }}
            ></div>
            <span className="text-xs text-gray-500 mt-2">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStaffPerformance = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Staff Presence</h3>
      <div className="space-y-6">
        {Object.entries(analytics?.staffPerformance || {}).map(([role, data]: [string, any]) => (
          <div key={role}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 capitalize">{role}</span>
              <span className="text-sm text-gray-500">{data.present}/{data.total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-green-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${(data.present / data.total) * 100}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderServiceLoad = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Capacity</h3>
      <div className="space-y-4">
        {Object.entries(analytics?.serviceLoad || {}).map(([service, data]: [string, any]) => (
          <div key={service}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 uppercase">{service}</span>
              <span className="text-sm text-gray-500">{data.current}/{data.capacity}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-300 ${
                  data.percentage > 90 ? 'bg-red-500' : 
                  data.percentage > 75 ? 'bg-yellow-500' : 
                  'bg-teal-500'
                }`}
                style={{ width: `${data.percentage}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <ProtectedRoute requiredRole="HEALTH_CENTER_ADMIN">
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-lg flex items-center justify-center">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Health Center Analytics</h1>
                  <p className="text-sm text-gray-500">Service usage and staff insights</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/health-center-dashboard"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Back to Dashboard
                </Link>
                <button
                  onClick={() => logout()}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors duration-200"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {/* Chart Selector */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Insights</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedChart('patients')}
                  className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
                    selectedChart === 'patients' 
                      ? 'bg-teal-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Visit Trends
                </button>
                <button
                  onClick={() => setSelectedChart('staff')}
                  className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
                    selectedChart === 'staff' 
                      ? 'bg-teal-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Staffing
                </button>
                <button
                  onClick={() => setSelectedChart('services')}
                  className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
                    selectedChart === 'services' 
                      ? 'bg-teal-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Service Load
                </button>
              </div>
            </div>

            {/* Main Chart */}
            {loading ? (
              <div className="bg-white rounded-lg shadow p-6 h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
              </div>
            ) : (
              <div className="mb-8">
                {selectedChart === 'patients' && renderPatientTrends()}
                {selectedChart === 'staff' && renderStaffPerformance()}
                {selectedChart === 'services' && renderServiceLoad()}
              </div>
            )}

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {!loading && (
                <>
                  <div className="bg-white rounded-lg shadow p-6">
                    <p className="text-sm font-medium text-gray-500">Monthly ANC Visits</p>
                    <p className="text-2xl font-semibold text-gray-900">{analytics?.monthlyStats.ancVisits}</p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <p className="text-sm font-medium text-gray-500">Monthly PNC Visits</p>
                    <p className="text-2xl font-semibold text-gray-900">{analytics?.monthlyStats.pncVisits}</p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <p className="text-sm font-medium text-gray-500">Vaccinations Given</p>
                    <p className="text-2xl font-semibold text-gray-900">{analytics?.monthlyStats.vaccinations}</p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <p className="text-sm font-medium text-gray-500">Health Center Deliveries</p>
                    <p className="text-2xl font-semibold text-gray-900">{analytics?.monthlyStats.deliveries}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
