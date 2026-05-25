'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AddUserForm } from '@/components/AddUserForm';
import { AddWoredaForm } from '@/components/AddWoredaForm';
import { AddHospitalForm } from '@/components/AddHospitalForm';
import { AddHealthCenterForm } from '@/components/AddHealthCenterForm';
import { UserManagement } from '@/components/UserManagement';
import { HospitalWoredaList } from '@/components/HospitalWoredaList';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { referralsApi } from '@/lib/healthcare-api';

export default function SystemDashboard() {
  const { user, logout } = useAuth();
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddWoredaAdmin, setShowAddWoredaAdmin] = useState(false);
  const [showAddWoreda, setShowAddWoreda] = useState(false);
  const [showAddHospital, setShowAddHospital] = useState(false);
  const [showAddHealthCenter, setShowAddHealthCenter] = useState(false);
  const [showHospitalsList, setShowHospitalsList] = useState(false);
  
  // Store filtered facility data
  const [filteredHospitals, setFilteredHospitals] = useState<any[]>([]);
  
  // Real data states
  const [stats, setStats] = useState({
    totalSystemAdmins: 0,
    totalUsers: 0,
    totalHospitals: 0,
  });
  const [referralStats, setReferralStats] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    checkedIn: 0,
    completed: 0,
    rejected: 0,
    expired: 0,
    active: 0,
  });
  const [showReferralStats, setShowReferralStats] = useState(false);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only fetch when user is authenticated
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

      // Data is already filtered by backend based on user role and region
      const usersInRegion = users;
      const regionalHospitals = hospitals;

      // Store filtered facility data
      setFilteredHospitals(regionalHospitals);

      // Calculate stats
      const newStats = {
        totalSystemAdmins: usersInRegion.filter(u => u.role === 'SYSTEM_ADMIN').length,
        totalUsers: usersInRegion.length,
        totalHospitals: regionalHospitals.length,
      };

      // Set referral stats
      setReferralStats(referralStatsResponse || { total: 0, pending: 0, accepted: 0, checkedIn: 0, completed: 0, rejected: 0, expired: 0, active: 0 });

      // Generate recent activities from recent user creations in region
      const activities = usersInRegion
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map((user: any) => ({
          id: user._id,
          type: 'user_created',
          message: `${user.name} (${user.role.replace('_', ' ')}) created`,
          timestamp: user.createdAt,
          color: getActivityColor(user.role)
        }));

      setStats(newStats);
      setRecentActivities(activities);
    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error);
      if (error?.name === 'UnauthorizedError' || error?.message === 'Unauthorized') {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const getActivityColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'bg-purple-600';
      case 'SYSTEM_ADMIN': return 'bg-blue-600';
      case 'WOREDA_ADMIN': return 'bg-green-600';
      case 'HOSPITAL_ADMIN': return 'bg-yellow-600';
      case 'HEALTH_CENTER_ADMIN': return 'bg-teal-600';
      case 'DOCTOR': return 'bg-red-600';
      case 'NURSE': return 'bg-pink-600';
      case 'MIDWIFE': return 'bg-indigo-600';
      case 'DISPATCHER': return 'bg-orange-600';
      case 'EMERGENCY_ADMIN': return 'bg-red-600';
            default: return 'bg-gray-600';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - past.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  };

  const handleAddUserSuccess = () => {
    setShowAddUser(false);
    fetchDashboardData();
  };

  const handleAddWoredaAdminSuccess = () => {
    setShowAddWoredaAdmin(false);
    fetchDashboardData();
  };

  const handleAddWoredaSuccess = () => {
    setShowAddWoreda(false);
    fetchDashboardData();
  };

  const handleAddHospitalSuccess = () => {
    setShowAddHospital(false);
    fetchDashboardData();
  };

  const handleAddHealthCenterSuccess = () => {
    setShowAddHealthCenter(false);
    fetchDashboardData();
  };

  return (
    <ProtectedRoute requiredRole={["SYSTEM_ADMIN"]}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap justify-between items-center py-4 gap-y-2">
              <div className="flex items-center">
                <div className="h-10 w-10 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">System Admin Dashboard</h1>
                  <p className="text-sm text-gray-500">Region: {user?.assignedRegion || 'System Administration'}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-700 whitespace-nowrap">Welcome, {user?.name}</span>
                <Link href="/system-dashboard/profile" className="text-sm text-blue-600 hover:underline whitespace-nowrap">
                  My Profile
                </Link>
                <button
                  onClick={fetchDashboardData}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  Refresh
                </button>
                <button
                  onClick={() => logout()}
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
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {loading ? '...' : stats.totalUsers}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors" 
                     onClick={() => setShowHospitalsList(!showHospitalsList)}>
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
                  <div className="ml-auto">
                    <svg className={`h-5 w-5 text-gray-400 transform transition-transform ${showHospitalsList ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors" 
                     onClick={() => setShowReferralStats(!showReferralStats)}>
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Referrals</p>
                    <p className="text-xs text-gray-500">Click to view stats</p>
                  </div>
                  <div className="ml-auto">
                    <svg className={`h-5 w-5 text-gray-400 transform transition-transform ${showReferralStats ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Expandable Facility Lists */}
            {showHospitalsList && (
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Hospitals and Woredas in {user?.assignedRegion || 'Your Region'}</h3>
                <HospitalWoredaList 
                  showHospitals={true} 
                  showWoredas={true} 
                />
              </div>
            )}

            {/* Referral Stats */}
            {showReferralStats && (
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Referral Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-600">Total Referrals</p>
                        <p className="text-xl font-bold text-gray-900">{referralStats.total}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <svg className="h-5 w-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-600">Pending</p>
                        <p className="text-xl font-bold text-gray-900">{referralStats.pending}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-600">Accepted</p>
                        <p className="text-xl font-bold text-gray-900">{referralStats.accepted}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-600">Checked In</p>
                        <p className="text-xl font-bold text-gray-900">{referralStats.checkedIn}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-indigo-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <svg className="h-5 w-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-600">Completed</p>
                        <p className="text-xl font-bold text-gray-900">{referralStats.completed}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-red-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-600">Rejected</p>
                        <p className="text-xl font-bold text-gray-900">{referralStats.rejected}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-600">Expired</p>
                        <p className="text-xl font-bold text-gray-900">{referralStats.expired}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-orange-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <svg className="h-5 w-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-600">Active</p>
                        <p className="text-xl font-bold text-gray-900">{referralStats.active}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Regional Administration</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button 
                  onClick={() => setShowAddWoredaAdmin(true)}
                  className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                >
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Create Woreda Admin
                </button>
                <button 
                  onClick={() => setShowAddWoreda(true)}
                  className="flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200"
                >
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Create Woreda
                </button>
                <button 
                  onClick={() => setShowAddHospital(true)}
                  className="flex items-center justify-center px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                >
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Create Hospital
                </button>
                <button 
                  onClick={() => setShowAddHealthCenter(true)}
                  className="flex items-center justify-center px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors duration-200"
                >
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Create Health Center
                </button>
                <button 
                  onClick={() => setShowAddUser(true)}
                  className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Create Staff
                </button>
                <Link href="/system-dashboard/users" className="flex items-center justify-center px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200">
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v10l7-5-7-5z" />
                  </svg>
                  View Users
                </Link>
                <Link href="/system-dashboard/woredas" className="flex items-center justify-center px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200">
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  View Woredas
                </Link>
                <Link href="/system-dashboard/hospitals" className="flex items-center justify-center px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors duration-200">
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  View Hospitals
                </Link>
              </div>
            </div>

            {/* User Management Section */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <UserManagement />
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
              <div className="space-y-4">
                {loading ? (
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                    <p className="text-sm text-gray-400">Loading recent activities...</p>
                  </div>
                ) : recentActivities.length > 0 ? (
                  recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-center space-x-3">
                      <div className={`w-2 h-2 ${activity.color} rounded-full`}></div>
                      <p className="text-sm text-gray-600">{activity.message}</p>
                      <p className="text-xs text-gray-400">{formatTimeAgo(activity.timestamp)}</p>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <p className="text-sm text-gray-400">No recent activities</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
      {showAddUser && (
        <AddUserForm 
          onClose={() => setShowAddUser(false)} 
          onSuccess={handleAddUserSuccess}
          allowedRoles={['SYSTEM_ADMIN', 'WOREDA_ADMIN', 'HOSPITAL_ADMIN', 'HEALTH_CENTER_ADMIN', 'DOCTOR', 'NURSE', 'MIDWIFE', 'DISPATCHER', 'LIAISON_OFFICER', 'HOSPITAL_APPROVER', 'SPECIALIST', 'GATEKEEPER', 'EMERGENCY_ADMIN']}
        />
      )}
      {showAddWoredaAdmin && (
        <AddUserForm 
          onClose={() => setShowAddWoredaAdmin(false)} 
          onSuccess={handleAddWoredaAdminSuccess}
          allowedRoles={['WOREDA_ADMIN']}
        />
      )}
      {showAddWoreda && (
        <AddWoredaForm 
          onClose={() => setShowAddWoreda(false)} 
          onSuccess={handleAddWoredaSuccess} 
        />
      )}
      {showAddHospital && (
        <AddHospitalForm 
          onClose={() => setShowAddHospital(false)} 
          onSuccess={handleAddHospitalSuccess} 
        />
      )}
      {showAddHealthCenter && (
        <AddHealthCenterForm 
          onClose={() => setShowAddHealthCenter(false)} 
          onSuccess={handleAddHealthCenterSuccess}
        />
      )}
    </ProtectedRoute>
  );
}
