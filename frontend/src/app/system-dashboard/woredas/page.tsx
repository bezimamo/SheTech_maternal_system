'use client';

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { api } from '@/lib/api';
import { AddWoredaForm } from '@/components/AddWoredaForm';
import { useAuth } from '@/contexts/AuthContext';

export default function SystemDashboardWoredas() {
  const { user, logout } = useAuth();
  const [woredas, setWoredas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddWoreda, setShowAddWoreda] = useState(false);
  const [editingWoreda, setEditingWoreda] = useState<any>(null);

  useEffect(() => {
    fetchWoredas();
  }, []);

  const fetchWoredas = async () => {
    try {
      const response = await api.getWoredas();
      setWoredas(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Failed to fetch woredas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWoredaSuccess = () => {
    fetchWoredas();
    setShowAddWoreda(false);
    setEditingWoreda(null);
  };

  const handleEditWoreda = (woreda: any) => {
    setEditingWoreda(woreda);
    setShowAddWoreda(true);
  };

  const handleDeleteWoreda = async (woredaId: string) => {
    if (!window.confirm('Are you sure you want to delete this woreda?')) return;
    
    try {
      await api.deleteWoreda(woredaId);
      fetchWoredas();
    } catch (error) {
      console.error('Failed to delete woreda:', error);
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
                <div className="h-10 w-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">System Dashboard - Woredas</h1>
                  <p className="text-sm text-gray-500">Manage woredas in your region</p>
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
                  <h2 className="text-xl font-semibold text-gray-900">Woreda Management</h2>
                  <button
                    onClick={() => setShowAddWoreda(true)}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors duration-200"
                  >
                    Add New Woreda
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
                    {woredas.map((woreda) => (
                      <tr key={woreda._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{woreda.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {woreda.regionId?.name || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {new Date(woreda.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleEditWoreda(woreda)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteWoreda(woreda._id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {woredas.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No woredas found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {showAddWoreda && (
        <AddWoredaForm
          onClose={() => {
            setShowAddWoreda(false);
            setEditingWoreda(null);
          }}
          onSuccess={handleAddWoredaSuccess}
          woredaToEdit={editingWoreda}
        />
      )}
    </ProtectedRoute>
  );
}
