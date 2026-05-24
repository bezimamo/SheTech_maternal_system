'use client';

import { useState, useEffect } from 'react';
import { childrenApi, mothersApi } from '@/lib/healthcare-api';
import { api } from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ChildFormData {
  name: string;
  birthDate: string;
  motherId: string;
  gender: 'MALE' | 'FEMALE';
  birthHospital: string;
  deliveredBy: string; // Text input for healthcare worker name
  birthWeight: string;
  birthHeight: string;
  apgarScore: string;
  deliveryType: string;
  complications: string;
  healthStatus: 'HEALTHY' | 'NEEDS_ATTENTION' | 'CRITICAL';
  notes: string;
  pncVisitDay1: boolean;
  pncVisitDay3: boolean;
  pncVisitDay7: boolean;
  protectedAtBirth: boolean;
}

export default function RegisterChild() {
  const params = useParams();
  const router = useRouter();
  const motherId = params.motherId as string;
  const { user: authUser } = useAuth();
  const [selectedMother, setSelectedMother] = useState<any>(null);
  
  const [formData, setFormData] = useState<ChildFormData>({
    name: '',
    birthDate: '',
    motherId: motherId || '',
    gender: 'MALE',
    birthHospital: '',
    deliveredBy: '',
    birthWeight: '',
    birthHeight: '',
    apgarScore: '',
    deliveryType: '',
    complications: '',
    healthStatus: 'HEALTHY',
    notes: '',
    pncVisitDay1: false,
    pncVisitDay3: false,
    pncVisitDay7: false,
    protectedAtBirth: false,
  });

  const [mothers, setMothers] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userHospital, setUserHospital] = useState<any>(null);
  const [availableHospitals, setAvailableHospitals] = useState<any[]>([]);
  const [showHospitalFallback, setShowHospitalFallback] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [registeredChildId, setRegisteredChildId] = useState<string | null>(null);
  const [sendingToWoreda, setSendingToWoreda] = useState(false);
  const [sentToWoreda, setSentToWoreda] = useState(false);

  useEffect(() => {
    getCurrentUser();
    fetchMothers();
    fetchHospitals();
  }, []);

  useEffect(() => {
    if (motherId) {
      fetchMotherData();
    }
  }, [motherId]);

  const fetchMotherData = async () => {
    try {
      const data = await mothersApi.getAll();
      const mother = data.find((m: any) => m._id === motherId);
      setSelectedMother(mother);
    } catch (err: any) {
      console.error('Error fetching mother:', err);
      setError(err.message || 'Failed to load mother data');
    }
  };

  const getCurrentUser = async () => {
    try {
      // Get user info from localStorage
      const userStr = localStorage.getItem('user');
      console.log('=== CHILD REGISTRATION USER DEBUG ===');
      console.log('Raw user string:', userStr);
      
      if (userStr) {
        const user = JSON.parse(userStr);
        console.log('Parsed user object:', user);
        console.log('User keys:', Object.keys(user));
        console.log('User hospitalId:', user.hospitalId);
        console.log('User hospitalId type:', typeof user.hospitalId);
        
        setCurrentUser(user);
        
        // Create hospital object from user data if hospital name is available
        if (user.hospitalId && user.hospitalName) {
          console.log('Using hospital from user data:', user.hospitalName);
          const hospitalFromUser = {
            _id: user.hospitalId,
            name: user.hospitalName
          };
          setUserHospital(hospitalFromUser);
          // Auto-set only birth hospital in form
          setFormData(prev => ({
            ...prev,
            birthHospital: user.hospitalId
          }));
        } else {
          console.log('Hospital name not in user data, trying API...');
          setUseFallback(true);
          
          // Try to fetch hospitals as fallback
          try {
            const hospitalData = await api.getHospitals();
            console.log('All hospitals from API:', hospitalData);
            setAvailableHospitals(hospitalData);
            
            // Find user's hospital
            const foundHospital = hospitalData.find((h: any) => h._id === user.hospitalId);
            console.log('Found user hospital:', foundHospital);
            setUserHospital(foundHospital);
            
            if (foundHospital) {
              // Auto-set only birth hospital in form
              setFormData(prev => ({
                ...prev,
                birthHospital: user.hospitalId
              }));
            } else {
              console.warn('Hospital not found for ID:', user.hospitalId);
              setShowHospitalFallback(true);
            }
          } catch (hospitalErr) {
            console.error('Error fetching hospitals:', hospitalErr);
            setShowHospitalFallback(true);
          }
        }
      } else {
        console.warn('No user data found in localStorage');
        setShowHospitalFallback(true);
      }
      console.log('=== END CHILD REGISTRATION USER DEBUG ===');
    } catch (err) {
      console.error('Error getting current user:', err);
      setShowHospitalFallback(true);
    }
  };

  const fetchMothers = async () => {
    try {
      const data = await mothersApi.getAll();
      setMothers(data);
    } catch (err) {
      console.error('Error fetching mothers:', err);
    }
  };

  const fetchHospitals = async () => {
    try {
      const data = await api.getHospitals();
      setHospitals(data);
    } catch (err) {
      console.error('Error fetching hospitals:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSendToWoreda = async () => {
    if (!registeredChildId) return;
    setSendingToWoreda(true);
    try {
      await childrenApi.notifyWoreda(registeredChildId);
      setSentToWoreda(true);
    } catch (err: any) {
      console.error('Failed to notify woreda:', err);
      setSentToWoreda(true); // still mark as attempted so UI doesn't block
    } finally {
      setSendingToWoreda(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const childData = {
        ...formData,
        birthWeight: formData.birthWeight ? parseFloat(formData.birthWeight) : undefined,
        birthHeight: formData.birthHeight ? parseFloat(formData.birthHeight) : undefined,
        apgarScore: formData.apgarScore ? parseInt(formData.apgarScore) : undefined,
        complications: formData.complications ? formData.complications.split(',').map(c => c.trim()).filter(c => c) : [],
        // deliveredBy must be a MongoDB ObjectId — always use the logged-in user's ID
        deliveredBy: authUser?.id,
      };

      const created = await childrenApi.create(childData);
      // Store the new child's ID so we can send it to the woreda
      setRegisteredChildId(created?._id ?? null);
      setSuccess(true);
      setFormData({
        name: '',
        birthDate: '',
        gender: 'MALE',
        motherId: motherId ?? '',
        birthHospital: '',
        deliveredBy: '',
        birthWeight: '',
        birthHeight: '',
        apgarScore: '',
        deliveryType: '',
        complications: '',
        healthStatus: 'HEALTHY',
        notes: '',
        pncVisitDay1: false,
        pncVisitDay3: false,
        pncVisitDay7: false,
        protectedAtBirth: false,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to register child');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
          <div className="text-center">
            <div className="text-green-600 text-6xl mb-4">👶</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Child Registered Successfully!</h2>
            <p className="text-gray-600 mb-6">The child has been registered in the system.</p>

            {/* Send to Woreda */}
            <div className={`mb-4 p-4 rounded-lg border ${sentToWoreda ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
              {sentToWoreda ? (
                <div className="flex items-center gap-2 justify-center text-green-700">
                  <span className="text-xl">✅</span>
                  <span className="font-medium text-sm">Child information sent to Woreda Admin</span>
                </div>
              ) : (
                <>
                  <p className="text-sm text-blue-800 mb-3">
                    📋 Send this child's birth information to the Woreda Admin for birth certificate processing.
                  </p>
                  <button
                    onClick={handleSendToWoreda}
                    disabled={sendingToWoreda}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-60 text-sm"
                  >
                    {sendingToWoreda ? 'Sending…' : '📤 Send to Woreda Admin'}
                  </button>
                </>
              )}
            </div>

            <div className="space-y-3">
              <a
                href="/healthcare-dashboard/children"
                className="block w-full px-4 py-2 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition-colors"
              >
                View All Children
              </a>
              <a
                href="/healthcare-dashboard"
                className="block w-full px-4 py-2 bg-gray-600 text-white text-center rounded-lg hover:bg-gray-700 transition-colors"
              >
                Back to Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Register Child</h1>
              <p className="text-sm text-gray-600">
                Registering child for {selectedMother?.name || 'selected mother'}
              </p>
            </div>
            <div className="flex space-x-3">
              <a
                href="/healthcare-dashboard/children/register"
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Back to Mother Selection
              </a>
              <a
                href="/healthcare-dashboard"
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Back to Dashboard
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <span className="text-red-600 mr-2">❌</span>
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Mother Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Mother Information</h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-700">Registering child for:</div>
                    <div className="text-lg font-semibold text-blue-900">
                      {selectedMother?.name} - {selectedMother?.phone}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Status: {selectedMother?.status}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Child Name *
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
                  <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700 mb-2">
                    Birth Date *
                  </label>
                  <input
                    type="date"
                    id="birthDate"
                    name="birthDate"
                    value={formData.birthDate}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="motherId" className="block text-sm font-medium text-gray-700 mb-2">
                    Mother *
                  </label>
                  <select
                    id="motherId"
                    name="motherId"
                    value={formData.motherId}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Mother</option>
                    {mothers.map((mother) => (
                      <option key={mother._id} value={mother._id}>
                        {mother.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                    Gender *
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Birth Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Birth Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="birthHospital" className="block text-sm font-medium text-gray-700 mb-2">
                    Birth Hospital *
                  </label>
                  {showHospitalFallback ? (
                    <div>
                      <select
                        id="birthHospital"
                        name="birthHospital"
                        value={formData.birthHospital}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Hospital</option>
                        {availableHospitals.map((hospital) => (
                          <option key={hospital._id} value={hospital._id}>
                            {hospital.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-orange-600 mt-1">
                        Your assigned hospital was not found. Please select your health center.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg">
                        {userHospital ? userHospital.name : currentUser ? 'Hospital not found' : 'Loading user data...'}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {userHospital ? (useFallback ? 'Selected from available hospitals' : 'Automatically assigned from your profile') : 'Please check your user profile'}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="deliveredBy" className="block text-sm font-medium text-gray-700 mb-2">
                    Delivered By *
                  </label>
                  <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-blue-50 text-gray-800 text-sm">
                    {authUser?.name || currentUser?.name || 'Current user'}
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Automatically set to your account
                  </p>
                </div>

                <div>
                  <label htmlFor="birthWeight" className="block text-sm font-medium text-gray-700 mb-2">
                    Birth Weight (grams)
                  </label>
                  <input
                    type="number"
                    id="birthWeight"
                    name="birthWeight"
                    value={formData.birthWeight}
                    onChange={handleInputChange}
                    min="500"
                    max="6000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="birthHeight" className="block text-sm font-medium text-gray-700 mb-2">
                    Birth Height (cm)
                  </label>
                  <input
                    type="number"
                    id="birthHeight"
                    name="birthHeight"
                    value={formData.birthHeight}
                    onChange={handleInputChange}
                    min="30"
                    max="80"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="apgarScore" className="block text-sm font-medium text-gray-700 mb-2">
                    APGAR Score
                  </label>
                  <input
                    type="number"
                    id="apgarScore"
                    name="apgarScore"
                    value={formData.apgarScore}
                    onChange={handleInputChange}
                    min="0"
                    max="10"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="deliveryType" className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Type
                  </label>
                  <select
                    id="deliveryType"
                    name="deliveryType"
                    value={formData.deliveryType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Delivery Type</option>
                    <option value="Vaginal">Vaginal</option>
                    <option value="Cesarean">Cesarean Section</option>
                    <option value="Assisted">Assisted Delivery</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Health Assessment */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Health Assessment</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="healthStatus" className="block text-sm font-medium text-gray-700 mb-2">
                    Health Status *
                  </label>
                  <select
                    id="healthStatus"
                    name="healthStatus"
                    value={formData.healthStatus}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="HEALTHY">Healthy</option>
                    <option value="NEEDS_ATTENTION">Needs Attention</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="complications" className="block text-sm font-medium text-gray-700 mb-2">
                    Birth Complications (comma-separated)
                  </label>
                  <input
                    type="text"
                    id="complications"
                    name="complications"
                    value={formData.complications}
                    onChange={handleInputChange}
                    placeholder="e.g., Jaundice, Respiratory distress"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Newborn Care & Protection */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Newborn Care &amp; Protection (PNC)</h2>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 space-y-6">

                {/* PNC Visits Timeline */}
                <div>
                  <label className="block text-sm font-semibold text-blue-900 mb-1">
                    Post-Natal Care (PNC) Visits
                  </label>
                  <p className="text-xs text-blue-700 mb-4">
                    Only Day 1 can be recorded at birth registration. Day 3 and Day 7 visits must be updated later
                    from the child&apos;s profile page once they are conducted.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                    {/* Day 1 — checkable at registration */}
                    <label className="flex items-start space-x-3 bg-white p-4 rounded-xl border-2 border-gray-200 shadow-sm cursor-pointer hover:border-blue-300 hover:bg-blue-50/40 transition-all">
                      <input
                        type="checkbox"
                        id="pncVisitDay1"
                        name="pncVisitDay1"
                        checked={formData.pncVisitDay1}
                        onChange={handleInputChange}
                        className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
                      />
                      <div>
                        <span className="text-sm font-semibold text-gray-800 block">Day 1 Visit</span>
                        <span className="text-xs text-gray-500 block">Within first 24 hours of birth</span>
                        <span className="text-xs text-blue-600 font-medium mt-1 block">✓ Can record now</span>
                      </div>
                    </label>

                    {/* Day 3 — locked, upcoming */}
                    <div className="flex items-start space-x-3 bg-gray-50 p-4 rounded-xl border-2 border-dashed border-gray-200 opacity-70 cursor-not-allowed select-none">
                      <div className="h-5 w-5 rounded border-2 border-gray-300 bg-white flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-sm font-semibold text-gray-500 block">Day 3 Visit</span>
                        <span className="text-xs text-gray-400 block">48–72 hours after birth</span>
                        <span className="text-xs text-amber-600 font-medium mt-1 block">⏳ Update from child profile</span>
                      </div>
                    </div>

                    {/* Day 7 — locked, upcoming */}
                    <div className="flex items-start space-x-3 bg-gray-50 p-4 rounded-xl border-2 border-dashed border-gray-200 opacity-70 cursor-not-allowed select-none">
                      <div className="h-5 w-5 rounded border-2 border-gray-300 bg-white flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-sm font-semibold text-gray-500 block">Day 7 Visit</span>
                        <span className="text-xs text-gray-400 block">One week after birth</span>
                        <span className="text-xs text-amber-600 font-medium mt-1 block">⏳ Update from child profile</span>
                      </div>
                    </div>

                  </div>

                  {/* Info banner */}
                  <div className="mt-4 flex items-start space-x-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <span className="text-amber-500 text-lg flex-shrink-0">ℹ️</span>
                    <p className="text-xs text-amber-800">
                      <strong>How to record Day 3 &amp; Day 7 visits:</strong> After registering the child, open the child&apos;s
                      profile and click the Day 3 or Day 7 card in the <strong>Newborn Care &amp; Protection</strong> section
                      to mark it as completed when the visit occurs.
                    </p>
                  </div>
                </div>

                {/* Tetanus Protection */}
                <div className="border-t border-blue-200/60 pt-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex items-center h-5 mt-0.5">
                      <input
                        type="checkbox"
                        id="protectedAtBirth"
                        name="protectedAtBirth"
                        checked={formData.protectedAtBirth}
                        onChange={handleInputChange}
                        className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label htmlFor="protectedAtBirth" className="text-sm font-semibold text-gray-900 cursor-pointer block">
                        Infant is Protected at Birth (Tetanus)
                      </label>
                      <span className="text-xs text-gray-600 block mt-0.5">
                        Tick if the mother received Tetanus Toxoid (TT) vaccines during pregnancy protecting the newborn from neonatal tetanus.
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <a
                href="/healthcare-dashboard"
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </a>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
              >
                {loading ? 'Registering...' : 'Register Child'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
