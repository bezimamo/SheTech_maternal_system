'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AddHospitalForm } from '@/components/AddHospitalForm';
import { AddUserForm } from '@/components/AddUserForm';
import { AddWoredaForm } from '@/components/AddWoredaForm';
import { UserManagement } from '@/components/UserManagement';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { referralsApi } from '@/lib/healthcare-api';

interface ReferralStats {
  total: number;
  active: number;
  pending: number;
  accepted: number;
  checkedIn: number;
  completed: number;
  rejected: number;
  expired: number;
}

export default function MOHDashboard() {
  const { user, logout } = useAuth();
  const [showAddHospital, setShowAddHospital] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddWoreda, setShowAddWoreda] = useState(false);
  const [showReferralStats, setShowReferralStats] = useState(false);
  
  // Real data states
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSystemAdmins: 0,
    totalNursesMidwives: 0,
    totalHospitals: 0,
  });
  const [referralStats, setReferralStats] = useState<ReferralStats>({
    total: 0,
    active: 0,
    pending: 0,
    accepted: 0,
    checkedIn: 0,
    completed: 0,
    rejected: 0,
    expired: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  const handleAddHospitalSuccess = () => {
    // Refresh data or show success message
    alert('Hospital added successfully!');
  };

  const handleAddUserSuccess = () => {
    // Refresh data or show success message
    alert('User added successfully!');
  };

  const handleAddWoredaSuccess = () => {
    // Refresh data or show success message
    alert('Woreda added successfully!');
  };

  React.useEffect(() => {
    if (!user) return;
    fetchDashboardData();

    const refreshTimer = setInterval(() => {
      fetchDashboardData();
    }, 20000);

    return () => clearInterval(refreshTimer);
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [usersResponse, hospitalsResponse, referralStatsResponse] = await Promise.all([
        api.getUsers(),
        api.getHospitals(),
        referralsApi.getAdminStats().catch(() => ({ total: 0, pending: 0, accepted: 0, checkedIn: 0, completed: 0, rejected: 0, expired: 0, active: 0 })),
      ]);

      const users = Array.isArray(usersResponse) ? usersResponse : [];
      const hospitals = Array.isArray(hospitalsResponse) ? hospitalsResponse : [];

      // Calculate stats
      const newStats = {
        totalUsers: users.length,
        totalSystemAdmins: users.filter(u => u.role === 'SYSTEM_ADMIN').length,
        totalNursesMidwives: users.filter(u => u.role === 'NURSE' || u.role === 'MIDWIFE').length,
        totalHospitals: hospitals.length,
      };

      // Generate recent activity from real data
      const activities: any[] = [];
      
      // Add recent users
      const recentUsers = users
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 3);
      
      recentUsers.forEach((user: any) => {
        activities.push({
          type: 'user',
          message: `New user "${user.name}" registered as ${user.role.replace('_', ' ')}`,
          timestamp: user.createdAt,
          color: 'green'
        });
      });

      // Add recent hospitals
      const recentHospitals = hospitals
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 2);
      
      recentHospitals.forEach((hospital: any) => {
        activities.push({
          type: 'hospital',
          message: `New hospital "${hospital.name}" registered`,
          timestamp: hospital.createdAt,
          color: 'blue'
        });
      });

      // Sort activities by timestamp
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Set referral stats and recent activity
      setReferralStats(referralStatsResponse || { total: 0, pending: 0, accepted: 0, checkedIn: 0, completed: 0, rejected: 0, expired: 0, active: 0 });
      setStats(newStats);
      setRecentActivity(activities.slice(0, 5)); // Show top 5 activities
    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error);
      if (error?.name === 'UnauthorizedError' || error?.message === 'Unauthorized') {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredRole={['SUPER_ADMIN', 'SYSTEM_ADMIN']}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap justify-between items-center py-4 gap-y-2">
              <div className="flex items-center">
                <div className="h-10 w-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">MOH Dashboard</h1>
                  <p className="text-sm text-gray-500">Ministry of Health Administration</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-700 whitespace-nowrap">Welcome, {user?.name}</span>
                <Link href="/moh-dashboard/profile" className="text-sm text-blue-600 hover:underline whitespace-nowrap">
                  My Profile
                </Link>
                <button
                  onClick={logout}
                  className="whitespace-nowrap bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors duration-200 text-sm"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {loading ? '...' : stats.totalUsers}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-cyan-100 rounded-lg">
                    <svg className="h-6 w-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">System Admins</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {loading ? '...' : stats.totalSystemAdmins}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Nurses / Midwives</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {loading ? '...' : stats.totalNursesMidwives}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <svg className="h-6 w-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Hospitals</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {loading ? '...' : stats.totalHospitals}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Referral Statistics */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Referral Statistics</h2>
                <button
                  onClick={() => setShowReferralStats(!showReferralStats)}
                  className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors duration-200"
                >
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  {showReferralStats ? 'Hide Stats' : 'View Stats'}
                  <svg className={`h-5 w-5 ml-2 transform transition-transform ${showReferralStats ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              {showReferralStats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-600">Total Referrals</p>
                    <p className="text-3xl font-semibold text-gray-900">{referralStats.total}</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-3xl font-semibold text-gray-900">{referralStats.pending}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-600">Active</p>
                    <p className="text-3xl font-semibold text-gray-900">{referralStats.active}</p>
                  </div>
                  <div className="bg-indigo-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-600">Completed</p>
                    <p className="text-3xl font-semibold text-gray-900">{referralStats.completed}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button 
                  onClick={() => setShowAddHospital(true)}
                  className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Hospital
                </button>
                <button 
                  onClick={() => setShowAddUser(true)}
                  className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                >
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Add User
                </button>
                <button 
                  onClick={() => setShowAddWoreda(true)}
                  className="flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200"
                >
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Add Woreda
                </button>
                <Link href="/moh-dashboard/users" className="flex items-center justify-center px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200">
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v10l7-5-7-5z" />
                  </svg>
                  View Users
                </Link>
                <Link href="/moh-dashboard/woredas" className="flex items-center justify-center px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200">
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  View Woredas
                </Link>
                <Link href="/moh-dashboard/hospitals" className="flex items-center justify-center px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors duration-200">
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  View Hospitals
                </Link>
                <Link href="/moh-dashboard/regions" className="flex items-center justify-center px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors duration-200">
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Manage Regions
                </Link>
              </div>
            </div>

            
            
            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
              <div className="space-y-4">
                {recentActivity.length === 0 ? (
                  <p className="text-sm text-gray-500">No recent activity found.</p>
                ) : (
                  recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className={`w-2 h-2 bg-${activity.color}-600 rounded-full`}></div>
                      <p className="text-sm text-gray-600">{activity.message}</p>
                      <span className="text-xs text-gray-400">
                        {new Date(activity.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
      {showAddHospital && (
        <AddHospitalForm 
          onClose={() => setShowAddHospital(false)} 
          onSuccess={handleAddHospitalSuccess} 
        />
      )}
      {showAddUser && (
        <AddUserForm 
          onClose={() => setShowAddUser(false)} 
          onSuccess={handleAddUserSuccess} 
        />
      )}
      {showAddWoreda && (
        <AddWoredaForm 
          onClose={() => setShowAddWoreda(false)} 
          onSuccess={handleAddWoredaSuccess} 
        />
      )}
    </ProtectedRoute>
  );
}
