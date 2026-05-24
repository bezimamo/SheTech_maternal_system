'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { mothersApi } from '@/lib/healthcare-api';
import { api } from '@/lib/api';

interface Mother {
  _id: string;
  name: string;
  phone: string;
  age: number;
  address: string;
  healthCenter: {
    _id: string;
    name: string;
    type: string;
  };
  status: 'ACTIVE' | 'DELIVERED' | 'INACTIVE';
  registrationDate: string;
  expectedDeliveryDate?: string;
  highRisk: boolean;
  medicalHistory?: string;
  emergencyContact?: string;
  gravida?: number;
  para?: number;
  lmp?: string;
  registeredBy?: string;
}

interface FormData {
  name: string;
  phone: string;
  age: string;
  address: string;
  emergencyContact: string;
  medicalHistory: string;
  expectedDeliveryDate: string;
  gravida: string;
  para: string;
  lmp: string;
}

export default function EditMother() {
  const params = useParams();
  const router = useRouter();
  const motherId = params.id as string;

  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    age: '',
    address: '',
    emergencyContact: '',
    medicalHistory: '',
    expectedDeliveryDate: '',
    gravida: '',
    para: '',
    lmp: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [mother, setMother] = useState<Mother | null>(null);

  useEffect(() => {
    loadMother();
  }, [motherId]);

  const loadMother = async () => {
    try {
      setLoading(true);
      const motherData = await mothersApi.getById(motherId);
      setMother(motherData);
      
      // Populate form with existing data
      setFormData({
        name: motherData.name || '',
        phone: motherData.phone || '',
        age: motherData.age?.toString() || '',
        address: motherData.address || '',
        emergencyContact: motherData.emergencyContact || '',
        medicalHistory: motherData.medicalHistory || '',
        expectedDeliveryDate: motherData.expectedDeliveryDate || '',
        gravida: motherData.gravida?.toString() || '',
        para: motherData.para?.toString() || '',
        lmp: motherData.lmp || '',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load mother data');
    } finally {
      setLoading(false);
    }
  };

  // Helper to calculate Expected Delivery Date (EDD) based on Last Menstrual Period (LMP)
  // Standard pregnancy length is 280 days (40 weeks) from the start of LMP.
  const calculateEDD = (lmpDateStr: string): string => {
    if (!lmpDateStr) return '';
    const lmpDate = new Date(lmpDateStr);
    if (isNaN(lmpDate.getTime())) return '';
    const eddDate = new Date(lmpDate.getTime());
    eddDate.setDate(eddDate.getDate() + 280);
    return eddDate.toISOString().split('T')[0];
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'lmp') {
      const calculatedEdd = calculateEDD(value);
      setFormData(prev => ({
        ...prev,
        lmp: value,
        expectedDeliveryDate: calculatedEdd
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const updateData = {
        ...formData,
        age: parseInt(formData.age),
        gravida: formData.gravida ? parseInt(formData.gravida) : undefined,
        para: formData.para ? parseInt(formData.para) : undefined,
      };

      await mothersApi.update(motherId, updateData);
      setSuccess(true);
      
      // Redirect back to mother details after 2 seconds
      setTimeout(() => {
        router.push(`/healthcare-dashboard/mothers/${motherId}`);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to update mother');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !mother) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading mother data...</div>
      </div>
    );
  }

  if (error && !mother) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Edit Mother Information</h1>
            <p className="text-sm text-gray-600 mt-1">
              Update information for: {mother?.name}
            </p>
          </div>

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 m-4 rounded-lg">
              Mother information updated successfully! Redirecting...
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 m-4 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-2">
                      Age *
                    </label>
                    <input
                      type="number"
                      id="age"
                      name="age"
                      value={formData.age}
                      onChange={handleInputChange}
                      required
                      min="15"
                      max="50"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                      Address *
                    </label>
                    <textarea
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      required
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Medical Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Medical Information</h3>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="emergencyContact" className="block text-sm font-medium text-gray-700 mb-2">
                      Emergency Contact *
                    </label>
                    <input
                      type="tel"
                      id="emergencyContact"
                      name="emergencyContact"
                      value={formData.emergencyContact}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="medicalHistory" className="block text-sm font-medium text-gray-700 mb-2">
                      Medical History
                    </label>
                    <textarea
                      id="medicalHistory"
                      name="medicalHistory"
                      value={formData.medicalHistory}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="gravida" className="block text-sm font-medium text-gray-700 mb-2">
                      Gravida (Number of Pregnancies)
                    </label>
                    <input
                      type="number"
                      id="gravida"
                      name="gravida"
                      value={formData.gravida}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="para" className="block text-sm font-medium text-gray-700 mb-2">
                      Para (Number of Births)
                    </label>
                    <input
                      type="number"
                      id="para"
                      name="para"
                      value={formData.para}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Pregnancy Information */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Pregnancy Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="lmp" className="block text-sm font-medium text-gray-700 mb-2">
                    Last Menstrual Period (LMP)
                  </label>
                  <input
                    type="date"
                    id="lmp"
                    name="lmp"
                    value={formData.lmp}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="expectedDeliveryDate" className="block text-sm font-medium text-gray-700 mb-2">
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    id="expectedDeliveryDate"
                    name="expectedDeliveryDate"
                    value={formData.expectedDeliveryDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="mt-8 flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.push(`/healthcare-dashboard/mothers/${motherId}`)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
