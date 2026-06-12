'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface HospitalWoredaListProps {
  showHospitals?: boolean;
  showWoredas?: boolean;
  preFilteredHospitals?: any[];
  preFilteredWoredas?: any[];
}

export function HospitalWoredaList({ 
  showHospitals = true, 
  showWoredas = true, 
  preFilteredHospitals, 
  preFilteredWoredas 
}: HospitalWoredaListProps) {
  const { user } = useAuth();
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [woredas, setWoredas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingHospital, setEditingHospital] = useState<any>(null);
  const [editingWoreda, setEditingWoreda] = useState<any>(null);

  const handleEditHospital = (hospital: any) => {
    setEditingHospital(hospital);
  };

  const handleEditWoreda = (woreda: any) => {
    setEditingWoreda(woreda);
  };


  useEffect(() => {
    // Use pre-filtered data if provided, otherwise fetch and filter
    if (preFilteredHospitals !== undefined && preFilteredWoredas !== undefined) {
      setHospitals(preFilteredHospitals);
      setWoredas(preFilteredWoredas);
      setLoading(false);
    } else {
      fetchData();
    }
  }, [preFilteredHospitals, preFilteredWoredas]);

  const fetchData = async () => {
    try {
      const [hospitalsResponse, woredasResponse] = await Promise.all([
        api.getHospitals(),
        api.getWoredas()
      ]);

      // Data is already filtered by the backend based on user role and permissions
      const filteredHospitals = Array.isArray(hospitalsResponse) ? hospitalsResponse : [];
      const filteredWoredas = Array.isArray(woredasResponse) ? woredasResponse : [];

      setHospitals(filteredHospitals);
      setWoredas(filteredWoredas);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showHospitals && (
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Hospitals ({hospitals.length})</h3>
          {hospitals.length === 0 ? (
            <p className="text-gray-500">No hospitals found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[680px] w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {hospitals.map((hospital: any) => (
                    <tr key={hospital._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{hospital.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {hospital.type || 'HOSPITAL'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {hospital.location || '-'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {hospital.woredaId?.regionId?.name || hospital.woredaId?.city || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEditHospital(hospital)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showWoredas && (
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Woredas ({woredas.length})</h3>
          {woredas.length === 0 ? (
            <p className="text-gray-500">No woredas found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[560px] w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Region</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {woredas.map((woreda: any) => (
                    <tr key={woreda._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{woreda.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{woreda.city || '-'}</div>
                        <div className="text-xs text-gray-500">{woreda.regionId?.name || woreda.region || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleEditWoreda(woreda)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
