'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { UserList } from '@/components/UserList';
import { AddUserForm } from '@/components/AddUserForm';
import { useAuth } from '@/contexts/AuthContext';

export default function HealthCenterUsersPage() {
  const { user, logout } = useAuth();
  const [showAddUser, setShowAddUser] = useState(false);

  return (
    <ProtectedRoute requiredRole="HEALTH_CENTER_ADMIN">
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-lg flex items-center justify-center">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Health Center Staff</h1>
                  <p className="text-sm text-gray-500">View and manage staff at your health center.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/health-center-dashboard"
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  ← Dashboard
                </Link>
                <button
                  onClick={() => setShowAddUser(true)}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Add Staff
                </button>
                <button
                  onClick={() => logout()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <UserList showOrgColumns={false} />
        </main>

        {showAddUser && (
          <AddUserForm
            onClose={() => setShowAddUser(false)}
            onSuccess={() => setShowAddUser(false)}
            allowedRoles={['DOCTOR', 'NURSE', 'MIDWIFE', 'DISPATCHER', 'LIAISON_OFFICER', 'HOSPITAL_APPROVER', 'SPECIALIST', 'GATEKEEPER']}
            hideHospitalSelect={true}
            fixedHospitalId={
              typeof user?.hospitalId === 'string'
                ? user.hospitalId
                : (user?.hospitalId as any)?._id
            }
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
