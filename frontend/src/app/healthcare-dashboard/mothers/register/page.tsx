'use client';

import { useState, useEffect } from 'react';
import { mothersApi } from '@/lib/healthcare-api';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

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
  region: string;
  woredaId: string;
  healthCenter: string;
  motherId: string; // For existing mother selection
  bloodType: string;
  rhFactor: string;
  hivStatus: string;
  hepatitisB: string;
  hypertension: boolean;
  diabetes: boolean;
  anemia: boolean;
  previousCSection: boolean;
}

export default function RegisterMother() {
  const { user: currentUser } = useAuth();

  // ── ALL useState hooks MUST be declared first ──────────────────────────────
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    age: '',
    region: '',
    woredaId: '',
    healthCenter: '',
    motherId: '',
    address: '',
    emergencyContact: '',
    medicalHistory: '',
    expectedDeliveryDate: '',
    gravida: '',
    para: '',
    lmp: '',
    bloodType: '',
    rhFactor: '',
    hivStatus: '',
    hepatitisB: '',
    hypertension: false,
    diabetes: false,
    anemia: false,
    previousCSection: false,
  });

  const [userHospital, setUserHospital] = useState<any>(null);
  const [availableHospitals, setAvailableHospitals] = useState<any[]>([]);
  const [filteredHospitals, setFilteredHospitals] = useState<any[]>([]);
  const [mothers, setMothers] = useState<any[]>([]);
  const [filteredMothers, setFilteredMothers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [emergencyPhoneError, setEmergencyPhoneError] = useState<string | null>(null);
  const [woredas, setWoredas] = useState<any[]>([]);
  const [filteredWoredas, setFilteredWoredas] = useState<any[]>([]);
  const [loadingWoredas, setLoadingWoredas] = useState(true);
  const [loadingHospitals, setLoadingHospitals] = useState(true);
  const [loadingMothers, setLoadingMothers] = useState(true);
  const [selectedWoredaName, setSelectedWoredaName] = useState('');
  const [lastGeneratedEmail, setLastGeneratedEmail] = useState('');  // ← ADDED
  const [lastGeneratedPassword, setLastGeneratedPassword] = useState('');  // ← ADDED

  // Check if user has permission to register mothers
  const allowedRoles = ['HOSPITAL_ADMIN', 'HEALTH_CENTER_ADMIN', 'DOCTOR', 'NURSE', 'MIDWIFE'];
  const canRegisterMothers = currentUser && allowedRoles.includes(currentUser.role);

  // Ethiopian regions (constant — defined before effects)
  const ethiopianRegions = [
    'Addis Ababa', 'Afar', 'Amhara', 'Benishangul-Gumuz', 'Dire Dawa',
    'Gambela', 'Harari', 'Oromia', 'Sidama', 'Somali', 'South West Ethiopia Peoples',
    "Southern Nations, Nationalities, and Peoples' (SNNPR)", 'Tigray'
  ];

  const fetchWoredasFromDatabase = async () => {
    setLoadingWoredas(true);
    try {
      const woredaData = await api.getWoredas();
      setWoredas(Array.isArray(woredaData) ? woredaData : []);
    } catch (err) {
      console.error('Failed to fetch woredas:', err);
      setWoredas([]);
    } finally {
      setLoadingWoredas(false);
    }
  };

  const fetchHospitalsFromDatabase = async () => {
    setLoadingHospitals(true);
    try {
      const hospitalData = await api.getHospitals();
      if (Array.isArray(hospitalData)) {
        setAvailableHospitals(hospitalData);
        setFilteredHospitals(hospitalData);
        if (currentUser?.hospitalId) {
          const found = hospitalData.find((h: any) => h._id === currentUser.hospitalId);
          if (found) {
            setUserHospital(found);
            setFormData(prev => ({ ...prev, healthCenter: found._id }));
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch hospitals:', err);
    } finally {
      setLoadingHospitals(false);
    }
  };

  const fetchMothersFromDatabase = async () => {
    setLoadingMothers(true);
    try {
      const mothersData = await mothersApi.getAll();
      if (Array.isArray(mothersData)) {
        setMothers(mothersData);
        setFilteredMothers(mothersData);
      }
    } catch (err) {
      console.error('Failed to fetch mothers:', err);
      setMothers([]);
      setFilteredMothers([]);
    } finally {
      setLoadingMothers(false);
    }
  };

  useEffect(() => {
    fetchWoredasFromDatabase();
    fetchHospitalsFromDatabase();
    fetchMothersFromDatabase();
  }, []);

  // Auto-assign woreda and health center based on logged-in user
  useEffect(() => {
    if (!currentUser) return;

    const autoAssignFields = async () => {
      try {
        if (currentUser.hospitalId) {
          setFormData(prev => ({ ...prev, healthCenter: currentUser.hospitalId }));
          try {
            const hospitals = await api.getHospitals();
            const foundHospital = hospitals.find((h: any) => h._id === currentUser.hospitalId);
            if (foundHospital) {
              setUserHospital(foundHospital);
              const hospitalWoredaId = foundHospital.woredaId?._id || foundHospital.woredaId || foundHospital.woreda;
              if (hospitalWoredaId) {
                setFormData(prev => ({ ...prev, woredaId: hospitalWoredaId }));
                try {
                  const woredaList = await api.getWoredas();
                  const hospitalWoreda = woredaList.find((w: any) => w._id === hospitalWoredaId);

                  // Try to get region from various possible fields
                  const regionVal = hospitalWoreda?.regionId?.name || hospitalWoreda?.regionId || hospitalWoreda?.region || currentUser.assignedRegion;
                  if (regionVal) {
                    setFormData(prev => ({ ...prev, region: regionVal.toString() }));
                  }
                } catch { /* silent */ }
              }
            }
          } catch { /* silent */ }
        } else if (currentUser.woredaId) {
          setFormData(prev => ({ ...prev, woredaId: currentUser.woredaId }));
          try {
            const woredaList = await api.getWoredas();
            const userWoreda = woredaList.find((w: any) => w._id === currentUser.woredaId);
            const regionVal = userWoreda?.regionId?.name || userWoreda?.regionId || userWoreda?.region || currentUser.assignedRegion;
            if (regionVal) {
              setFormData(prev => ({ ...prev, region: regionVal.toString() }));
            }
          } catch { /* silent */ }
        } else if (currentUser.assignedRegion) {
          setFormData(prev => ({ ...prev, region: currentUser.assignedRegion }));
        } else if (currentUser.regionId) {
          setFormData(prev => ({ ...prev, region: currentUser.regionId }));
        }
      } catch (err) {
        console.error('Error in auto-assignment:', err);
      }
    };

    autoAssignFields();
  }, [currentUser]);

  useEffect(() => {
    if (formData.region && woredas.length > 0) {
      setFilteredWoredas(woredas.filter(w => w.region === formData.region));
    } else {
      setFilteredWoredas(woredas);
    }
  }, [formData.region, woredas]);

  useEffect(() => {
    if (formData.woredaId && availableHospitals.length > 0) {
      setFilteredHospitals(availableHospitals.filter(h =>
        h.woreda === formData.woredaId || h.woredaId === formData.woredaId
      ));
    } else {
      setFilteredHospitals(availableHospitals);
    }
  }, [formData.woredaId, availableHospitals]);

  useEffect(() => {
    if (formData.healthCenter && mothers.length > 0) {
      setFilteredMothers(mothers.filter(m =>
        m.healthCenter === formData.healthCenter || m.assignedHealthCenter === formData.healthCenter
      ));
    } else {
      setFilteredMothers([]);
    }
  }, [formData.healthCenter, mothers]);

  // Permission gate — must be AFTER all hooks
  if (!canRegisterMothers) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
          <div className="text-center">
            <div className="text-red-600 text-6xl mb-4">🚫</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              Only healthcare workers (Doctors, Nurses, Midwives, or Hospital Administrators) can register mothers.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Your current role: <strong>{currentUser?.role || 'Unknown'}</strong>
            </p>
            <button
              onClick={() => window.history.back()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

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
    const { name, value, type, checked } = e.target as HTMLInputElement;
    console.log(`Input changed - ${name}:`, value);
    
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
        [name]: type === 'checkbox' ? checked : value
      }));
    }

    // Real-time Ethiopian phone validation
    if (name === 'phone') {
      setPhoneError(value ? validateEthiopianPhone(value) : null);
    }
    if (name === 'emergencyContact') {
      setEmergencyPhoneError(value ? validateEthiopianPhone(value) : null);
    }

    // Implement 4-level cascading logic
    if (name === 'region') {
      // Filter woredas based on selected region
      if (value) {
        const woredasInRegion = woredas.filter(woreda => woreda.region === value);
        setFilteredWoredas(woredasInRegion);
        console.log('Woredas in region:', woredasInRegion);

        // Clear dependent selections
        setFormData(prev => ({
          ...prev,
          woredaId: '',
          healthCenter: '',
          motherId: ''
        }));
        setFilteredHospitals([]);
        setFilteredMothers([]);
      } else {
        // If no region selected, show all woredas
        setFilteredWoredas(woredas);
        setFilteredHospitals([]);
        setFilteredMothers([]);
      }
    }

    if (name === 'woredaId') {
      const selectedWoreda = woredas.find(w => w._id === value);
      setSelectedWoredaName(selectedWoreda?.name || '');
      console.log('Selected woreda name:', selectedWoreda?.name);

      // Filter hospitals based on selected woreda
      if (value) {
        const hospitalsInWoreda = availableHospitals.filter(hospital => {
          return hospital.woreda === value || hospital.woredaId === value;
        });
        console.log('Hospitals in woreda:', hospitalsInWoreda);
        setFilteredHospitals(hospitalsInWoreda);

        // Clear dependent selections
        setFormData(prev => ({
          ...prev,
          healthCenter: '',
          motherId: ''
        }));
        setFilteredMothers([]);
      } else {
        // If no woreda selected, clear hospitals and mothers
        setFilteredHospitals([]);
        setFilteredMothers([]);
      }
    }

    if (name === 'healthCenter') {
      // Filter mothers based on selected health center
      if (value) {
        const mothersInFacility = mothers.filter(mother => {
          return mother.healthCenter === value || mother.assignedHealthCenter === value;
        });
        console.log('Mothers in facility:', mothersInFacility);
        setFilteredMothers(mothersInFacility);

        // Clear mother selection
        setFormData(prev => ({
          ...prev,
          motherId: ''
        }));
      } else {
        // If no health center selected, clear mothers
        setFilteredMothers([]);
        setFormData(prev => ({
          ...prev,
          motherId: ''
        }));
      }
    }
  };

  /**
   * Ethiopian phone number formats accepted:
   *  09XXXXXXXX  — Ethio Telecom mobile (10 digits)
   *  07XXXXXXXX  — Safaricom Ethiopia mobile (10 digits)
   *  +2519XXXXXXX — International format mobile
   *  +2517XXXXXXX — International format mobile
   *  0116XXXXXX  — Addis Ababa landline (10 digits)
   */
  const validateEthiopianPhone = (value: string): string | null => {
    if (!value) return null; // empty is handled by required
    const cleaned = value.replace(/[\s\-()]/g, '');
    const patterns = [
      /^09\d{8}$/,          // 09XXXXXXXX
      /^07\d{8}$/,          // 07XXXXXXXX
      /^\+2519\d{8}$/,      // +2519XXXXXXXX
      /^\+2517\d{8}$/,      // +2517XXXXXXXX
      /^2519\d{8}$/,        // 2519XXXXXXXX (without +)
      /^2517\d{8}$/,        // 2517XXXXXXXX (without +)
      /^011[0-9]\d{6}$/,    // Addis landline 0116XXXXXX
    ];
    if (patterns.some(p => p.test(cleaned))) return null;
    return 'Enter a valid Ethiopian number: 09XXXXXXXX, 07XXXXXXXX, or +2519XXXXXXXX';
  };

  const handleHospitalSelect = (hospitalId: string) => {
    const selectedHospital = filteredHospitals.find(h => h._id === hospitalId);
    if (selectedHospital) {
      setUserHospital(selectedHospital);
      setFormData(prev => ({
        ...prev,
        healthCenter: hospitalId
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log('=== FORM SUBMIT DEBUG ===');
      console.log('Current formData before validation:', formData);

      if (!formData.region) {
        // If region is missing, try to infer it from currentUser before throwing error
        if (currentUser?.assignedRegion) {
          formData.region = currentUser.assignedRegion;
        } else if (userHospital?.woredaId?.regionId?.name) {
          formData.region = userHospital.woredaId.regionId.name;
        } else {
          // If we still can't find it, but we have a health center/woreda, we can skip this check
          // as the backend doesn't strictly require the region string name.
          if (!formData.woredaId && !formData.healthCenter) {
            throw new Error('Please select a region first');
          }
        }
      }

      if (!formData.woredaId) {
        console.error('woredaId is empty! Available woredas:', woredas);
        throw new Error('Please select a woreda');
      }

      if (!formData.healthCenter) {
        if (filteredHospitals.length === 0) {
          throw new Error(`No health centers found in ${selectedWoredaName}. Please contact administrator to add health centers to this woreda.`);
        } else {
          throw new Error('Please select a health center from the available options');
        }
      }

      // Validate that the woredaId is a valid MongoDB ObjectId
      const isValidObjectId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);
      if (!isValidObjectId(formData.woredaId)) {
        console.error('Invalid woredaId format:', formData.woredaId);
        throw new Error(`Invalid woreda ID format. Received: "${formData.woredaId}"`);
      }

      // Validate Ethiopian phone numbers before submitting
      const phoneValidationError = validateEthiopianPhone(formData.phone);
      if (phoneValidationError) {
        setPhoneError(phoneValidationError);
        throw new Error('Please enter a valid Ethiopian phone number for the mother.');
      }
      if (formData.emergencyContact) {
        const emergencyValidationError = validateEthiopianPhone(formData.emergencyContact);
        if (emergencyValidationError) {
          setEmergencyPhoneError(emergencyValidationError);
          throw new Error('Please enter a valid Ethiopian phone number for the emergency contact.');
        }
      }

      // Debug logging
      console.log('=== MOTHER REGISTRATION DEBUG ===');
      console.log('userHospital:', userHospital);
      console.log('userHospital._id:', userHospital?._id);
      console.log('userHospital.woredaId:', userHospital?.woredaId);
      console.log('userHospital.woredaId type:', typeof userHospital?.woredaId);

      const extractedWoredaId = userHospital?.woredaId?._id || userHospital?.woredaId;
      console.log('extractedWoredaId:', extractedWoredaId);

      // Validation check
      if (!userHospital?._id) {
        throw new Error('Please select your health center before registering a mother.');
      }

      if (!extractedWoredaId) {
        throw new Error('Health center does not have a valid woreda assigned. Please contact your administrator.');
      }

      // Phone validation
      if (!formData.phone || !/^09\d{8}$/.test(formData.phone)) {
        throw new Error('Phone number must start with 09 followed by 8 digits (e.g., 0911234567)');
      }

      // Generate temporary credentials for mother (using EMAIL)
      const tempEmail = `mother_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@maternal.com`;
      const tempPassword = Math.random().toString(36).substr(-8) + Math.random().toString(36).substr(-8) + Math.random().toString(36).substr(-4);

      const motherData = {
        name: formData.name,
        phone: formData.phone,
        age: parseInt(formData.age),
        address: formData.address,
        emergencyContact: formData.emergencyContact || undefined,
        medicalHistory: formData.medicalHistory || undefined,
        expectedDeliveryDate: formData.expectedDeliveryDate || undefined,
        gravida: formData.gravida ? parseInt(formData.gravida) : undefined,
        para: formData.para ? parseInt(formData.para) : undefined,
        lmp: formData.lmp || undefined,
        woredaId: extractedWoredaId,
        healthCenter: userHospital?._id,
        registeredBy: currentUser?.name || 'Unknown',
        email: tempEmail,
        password: tempPassword,
        bloodType: formData.bloodType || undefined,
        rhFactor: formData.rhFactor || undefined,
        hivStatus: formData.hivStatus || undefined,
        hepatitisB: formData.hepatitisB || undefined,
        hypertension: formData.hypertension,
        diabetes: formData.diabetes,
        anemia: formData.anemia,
        previousCSection: formData.previousCSection,
      };

      console.log('motherData.woredaId:', motherData.woredaId);
      console.log('motherData.healthCenter:', motherData.healthCenter);
      console.log('Generated temp email:', tempEmail);
      console.log('Generated temp password:', tempPassword);
      console.log('=== END DEBUG ===');

      console.log('Submitting mother data:', JSON.stringify(motherData, null, 2));
      console.log('woredaId being sent:', motherData.woredaId);
      console.log('woredaId type:', typeof motherData.woredaId);

      const result = await mothersApi.create(motherData);
      console.log('API Response:', result);

      setLastGeneratedEmail(tempEmail);
      setLastGeneratedPassword(tempPassword);
      setSuccess(true);

      setFormData({
        name: '',
        phone: '',
        age: '',
        region: '',
        woredaId: '',
        healthCenter: '',
        motherId: '',
        address: '',
        emergencyContact: '',
        medicalHistory: '',
        expectedDeliveryDate: '',
        gravida: '',
        para: '',
        lmp: '',
        bloodType: '',
        rhFactor: '',
        hivStatus: '',
        hepatitisB: '',
        hypertension: false,
        diabetes: false,
        anemia: false,
        previousCSection: false,
      });
      setSelectedWoredaName('');
    } catch (err: any) {
      console.error('Registration error details:', err);
      setError(err.message || 'Failed to register mother');
    } finally {
      setLoading(false);
    }
  };

  // Success screen - NO useState hooks here!
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
          <div className="text-center">
            <div className="text-green-600 text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Mother Registered Successfully!</h2>
            <p className="text-gray-600 mb-6">The mother has been registered in the system.</p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">Mobile App Login Credentials</h3>
              <p className="text-sm text-blue-700 mb-4">Please give these credentials to the mother for her mobile application login:</p>

              <div className="space-y-2">
                <div className="bg-white p-3 rounded border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email:</label>
                  <div className="font-mono text-lg bg-gray-100 p-2 rounded border border-gray-300 break-all">
                    {lastGeneratedEmail}
                  </div>
                </div>

                <div className="bg-white p-3 rounded border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password:</label>
                  <div className="font-mono text-lg bg-gray-100 p-2 rounded border border-gray-300">
                    {lastGeneratedPassword}
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                <p className="text-sm text-yellow-800">
                  <strong className="text-yellow-900">Important:</strong> Mother should change these credentials on her first login to the mobile app for security.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <a
                href="/healthcare-dashboard/mothers"
                className="block w-full px-4 py-2 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition-colors"
              >
                View All Mothers
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
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Register Mother</h1>
              <p className="text-sm text-gray-600">Add a new mother to the system</p>
            </div>
            <a
              href="/healthcare-dashboard"
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Back to Dashboard
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <span className="text-red-600 mr-2">❌</span>
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    placeholder="09XXXXXXXX or +2519XXXXXXXX"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${phoneError ? 'border-red-400 bg-red-50' : 'border-gray-300'
                      }`}
                  />
                  {phoneError ? (
                    <p className="text-xs text-red-600 mt-1">⚠ {phoneError}</p>
                  ) : formData.phone && !phoneError ? (
                    <p className="text-xs text-green-600 mt-1">✓ Valid Ethiopian number</p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1">Format: 09XXXXXXXX, 07XXXXXXXX, or +2519XXXXXXXX</p>
                  )}
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


                <div className="md:col-span-2">
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                    Address *
                  </label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

              </div>
            </div>

            {/* Location & Facility Assignment - Auto-assigned from logged-in user */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Location & Facility Assignment</h2>

              {/* Current User Facility Summary */}
              {currentUser && (
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold">
                          {currentUser.name?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-gray-900">Your Assigned Facility</h3>
                      {userHospital ? (
                        <div className="mt-1">
                          <div className="font-medium text-gray-900">
                            {userHospital.name}
                          </div>
                          <div className="text-sm text-gray-600">
                            {userHospital.type === 'HEALTH_CENTER' ? 'Health Center' : 'Hospital'} •
                            {(() => {
                              const woreda = woredas.find(w => w._id === formData.woredaId);
                              return woreda ? ` ${woreda.name}` : '';
                            })()}
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-600">
                          No facility assigned to your profile
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Automatic Assignment:</strong> Region, Woreda, and Facility are automatically assigned based on your logged-in profile.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Region Display - Auto-assigned from logged-in user */}
                <div>
                  <label htmlFor="region" className="block text-sm font-medium text-gray-700 mb-2">
                    Region *
                  </label>
                  <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                    {formData.region || 'No region assigned'}
                  </div>
                  {formData.region && (
                    <p className="text-xs text-green-600 mt-1">
                      Automatically assigned from your profile
                    </p>
                  )}
                </div>

                {/* Woreda Display - Auto-assigned from logged-in user */}
                <div>
                  <label htmlFor="woredaId" className="block text-sm font-medium text-gray-700 mb-2">
                    Woreda *
                  </label>
                  <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                    {(() => {
                      if (formData.woredaId) {
                        const woreda = woredas.find(w => w._id === formData.woredaId);
                        return woreda ? woreda.name : 'Loading woreda...';
                      }
                      return loadingWoredas ? 'Loading...' : 'No woreda assigned';
                    })()}
                  </div>
                  {formData.woredaId && (
                    <p className="text-xs text-green-600 mt-1">
                      Automatically assigned from your profile
                    </p>
                  )}
                </div>

                {/* Health Center Display - Auto-assigned from logged-in user */}
                <div>
                  <label htmlFor="healthCenter" className="block text-sm font-medium text-gray-700 mb-2">
                    Assigned Facility *
                  </label>
                  {userHospital ? (
                    <div className="w-full px-3 py-3 border border-gray-200 rounded-lg bg-blue-50">
                      <div className="flex items-center space-x-2">
                        <div className="flex-shrink-0">
                          <div className={`w-3 h-3 rounded-full ${userHospital.type === 'HEALTH_CENTER' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {userHospital.name}
                          </div>
                          <div className="text-sm text-gray-600">
                            {userHospital.type === 'HEALTH_CENTER' ? 'Health Center' : 'Hospital'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                      {loadingHospitals ? 'Loading facility information...' : 'No facility assigned'}
                    </div>
                  )}
                  <p className="text-xs text-green-600 mt-1">
                    <strong>✓</strong> Automatically assigned from your profile
                  </p>
                </div>

                {/* Mother Dropdown */}
                <div>
                  <label htmlFor="motherId" className="block text-sm font-medium text-gray-700 mb-2">
                    Existing Mother (Optional)
                  </label>
                  <select
                    id="motherId"
                    name="motherId"
                    value={formData.motherId}
                    onChange={handleInputChange}
                    disabled={loadingMothers || !formData.healthCenter}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">
                      {!formData.healthCenter
                        ? 'Please select a health center first'
                        : loadingMothers
                          ? 'Loading mothers...'
                          : filteredMothers.length === 0
                            ? 'No mothers found in this facility'
                            : 'Select Existing Mother (Optional)'
                      }
                    </option>
                    {filteredMothers.map((mother) => (
                      <option key={mother._id} value={mother._id}>
                        {mother.name} - {mother.phone}
                      </option>
                    ))}
                  </select>
                  {formData.healthCenter && filteredMothers.length > 0 && (
                    <p className="text-xs text-green-600 mt-1">
                      Found {filteredMothers.length} mother(s) in this facility
                    </p>
                  )}
                  {formData.motherId && (
                    <p className="text-xs text-blue-600 mt-1">
                      Selected mother will be updated. Leave blank to register new mother.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Medical Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="emergencyContact" className="block text-sm font-medium text-gray-700 mb-2">
                    Emergency Contact
                  </label>
                  <input
                    type="tel"
                    id="emergencyContact"
                    name="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={handleInputChange}
                    placeholder="09XXXXXXXX or +2519XXXXXXXX"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${emergencyPhoneError ? 'border-red-400 bg-red-50' : 'border-gray-300'
                      }`}
                  />
                  {emergencyPhoneError ? (
                    <p className="text-xs text-red-600 mt-1">⚠ {emergencyPhoneError}</p>
                  ) : formData.emergencyContact && !emergencyPhoneError ? (
                    <p className="text-xs text-green-600 mt-1">✓ Valid Ethiopian number</p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-1">Format: 09XXXXXXXX, 07XXXXXXXX, or +2519XXXXXXXX</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Registered By
                  </label>
                  <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg">
                    {currentUser ? `${currentUser.name} - ${currentUser.role}` : 'Loading...'}
                  </div>
                </div>

                <div className="md:col-span-2">
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
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Pregnancy Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <label htmlFor="bloodType" className="block text-sm font-medium text-gray-700 mb-2">
                    Blood Type
                  </label>
                  <select
                    id="bloodType"
                    name="bloodType"
                    value={formData.bloodType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Blood Type</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="rhFactor" className="block text-sm font-medium text-gray-700 mb-2">
                    RH Factor
                  </label>
                  <select
                    id="rhFactor"
                    name="rhFactor"
                    value={formData.rhFactor}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select RH Factor</option>
                    <option value="Positive">Positive (+)</option>
                    <option value="Negative">Negative (-)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="hivStatus" className="block text-sm font-medium text-gray-700 mb-2">
                    HIV Status
                  </label>
                  <select
                    id="hivStatus"
                    name="hivStatus"
                    value={formData.hivStatus}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select HIV Status</option>
                    <option value="Positive">Positive</option>
                    <option value="Negative">Negative</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="hepatitisB" className="block text-sm font-medium text-gray-700 mb-2">
                    Hepatitis B Status
                  </label>
                  <select
                    id="hepatitisB"
                    name="hepatitisB"
                    value={formData.hepatitisB}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Hepatitis B Status</option>
                    <option value="Positive">Positive</option>
                    <option value="Negative">Negative</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>

                {/* Risk Factors */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Factors</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="hypertension"
                          name="hypertension"
                          checked={formData.hypertension}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">Hypertension</span>
                      </label>
                    </div>
                    <div>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="diabetes"
                          name="diabetes"
                          checked={formData.diabetes}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">Diabetes</span>
                      </label>
                    </div>
                    <div>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="anemia"
                          name="anemia"
                          checked={formData.anemia}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">Anemia</span>
                      </label>
                    </div>
                    <div>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="previousCSection"
                          name="previousCSection"
                          checked={formData.previousCSection}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm font-medium text-gray-700">Previous C-Section</span>
                      </label>
                    </div>
                  </div>
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

            <div className="flex justify-end space-x-4">
              <a
                href="/healthcare-dashboard"
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </a>
              <button
                type="submit"
                disabled={loading || loadingWoredas || loadingHospitals}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
              >
                {loading ? 'Registering...' : 'Register Mother'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}