'use client';

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { api } from '@/lib/api';
import { AddHospitalForm } from '@/components/AddHospitalForm';
import { useAuth } from '@/contexts/AuthContext';

export default function SystemDashboardHospitals() {
  const { user, logout } = useAuth();
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddHospital, setShowAddHospital] = useState(false);
  const [editingHospital, setEditingHospital] = useState<any>(null);

  useEffect(() => {
    fetchHospitals();
  }, []);

  const fetchHospitals = async () => {
    try {
      const response = await api.getHospitals();
      setHospitals(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Failed to fetch hospitals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddHospitalSuccess = () => {
    fetchHospitals();
    setShowAddHospital(false);
    setEditingHospital(null);
  };

  const handleEditHospital = (hospital: any) => {
    setEditingHospital(hospital);
    setShowAddHospital(true);
  };

  const handleDeleteHospital = async (hospitalId: string) => {
    if (!window.confirm('Are you sure you want to delete this hospital?')) return;
    
    try {
      await api.deleteHospital(hospitalId);
      fetchHospitals();
    } catch (error) {
      console.error('Failed to delete hospital:', error);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole={['SYSTEM_ADMIN']}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole={['SYSTEM_ADMIN']}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center">
                <div className="h-10 w-10 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">System Dashboard - Hospitals</h1>
                  <p className="text-sm text-gray-500">Manage hospitals in your region</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">Welcome, {user?.name}</span>
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

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Hospital Management</h2>
                  <button
                    onClick={() => setShowAddHospital(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                  >
                    Add New Hospital
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Woreda
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Region
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {hospitals.map((hospital) => (
                      <tr key={hospital._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{hospital.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {hospital.woredaId?.name || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {hospital.woredaId?.regionId?.name || hospital.woredaId?.city || hospital.location || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {new Date(hospital.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleEditHospital(hospital)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteHospital(hospital._id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {hospitals.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No hospitals found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {showAddHospital && (
        <AddHospitalForm
          onClose={() => {
            setShowAddHospital(false);
            setEditingHospital(null);
          }}
          onSuccess={handleAddHospitalSuccess}
          hospitalToEdit={editingHospital}
        />
      )}
    </ProtectedRoute>
  );
}
