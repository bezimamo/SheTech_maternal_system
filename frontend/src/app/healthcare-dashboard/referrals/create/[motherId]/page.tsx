'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { mothersApi, pregnancyApi, childrenApi, hospitalsApi, referralsApi } from '@/lib/healthcare-api';
import { useAuth } from '@/contexts/AuthContext';
import { uploadReferralDoc } from '@/services/files';

interface ReferralFormData {
  motherId: string;
  pregnancyId?: string;
  childId?: string;
  reason: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  targetHospitalId: string;
  notes: string;
  emergency: boolean;
  attachments: File[];
}

export default function CreateReferral() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const userRole = user?.role;
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const motherId = params.motherId as string;
  const referralId = searchParams?.get('referralId');
  const [existingTargetHospitalId, setExistingTargetHospitalId] = useState<string>('');
  const [formData, setFormData] = useState<ReferralFormData>({
    motherId: motherId || '',
    pregnancyId: '',
    childId: '',
    reason: '',
    priority: 'MEDIUM',
    targetHospitalId: '',
    notes: '',
    emergency: false,
    attachments: [],
  });

  const [mothers, setMothers] = useState<any[]>([]);
  const [pregnancies, setPregnancies] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [selectedMother, setSelectedMother] = useState<any>(null);
  const [latestPregnancy, setLatestPregnancy] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userHospital, setUserHospital] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('Referral created successfully.');
  const [isEditMode, setIsEditMode] = useState(false);

  const normalizeEthiopianPhone = (phone?: string): string | null => {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');

    if (digits.startsWith('251') && digits.length === 12) {
      return `+${digits}`;
    }

    if (digits.startsWith('0') && digits.length === 10) {
      return `+251${digits.slice(1)}`;
    }

    if (digits.length === 9) {
      return `+251${digits}`;
    }

    return null;
  };

  // Fetch pregnancies for selected mother
  const fetchMotherPregnancies = async (mid: string) => {
    if (!mid) return;
    try {
      const data = await pregnancyApi.getByMotherId(mid).catch(() => []);
      const pregArray = Array.isArray(data) ? data : [];
      setPregnancies(pregArray);
      // Auto-select latest pregnancy
      if (pregArray.length > 0) {
        const latest = pregArray[pregArray.length - 1];
        setLatestPregnancy(latest);
        setFormData(prev => ({ ...prev, pregnancyId: latest._id }));
      }
    } catch (err) {
      console.error('Error fetching pregnancies:', err);
    }
  };

  useEffect(() => {
    // Only fetch data when auth is not loading
    if (!authLoading) {
      fetchData();
    }
  }, [authLoading]);

  const loadReferral = async (rid: string, mothersData: any[] = []) => {
    try {
      const referral = await referralsApi.getById(rid);
      if (!referral) {
        setError('Referral not found');
        return;
      }
      if (referral.status !== 'DRAFT') {
        setError('Only draft referrals can be edited');
        return;
      }

      if (referral.toHospital) {
        const hid = referral.toHospital._id || referral.toHospital;
        setExistingTargetHospitalId(hid);
        if (userRole !== 'LIAISON_OFFICER') {
          setFormData((prev) => ({ ...prev, targetHospitalId: hid }));
        }
      }

      const selectedMotherId = referral.motherId?._id ?? referral.motherId;
      setIsEditMode(true);
      setFormData(prev => ({
        ...prev,
        motherId: selectedMotherId,
        reason: referral.reasonForReferral ?? '',
        priority:
          referral.urgency === 'EMERGENCY'
            ? 'URGENT'
            : referral.urgency === 'URGENT'
            ? 'HIGH'
            : 'MEDIUM',
        notes: referral.clinicalNotes ?? '',
        emergency: referral.urgency === 'EMERGENCY',
      }));

      const selectedMother = mothersData.find((m: any) => m._id === selectedMotherId);
      if (selectedMother) {
        setSelectedMother(selectedMother);
      }

      if (selectedMotherId) {
        await fetchMotherPregnancies(selectedMotherId);
      }
    } catch (err: any) {
      console.error('Error loading referral for edit:', err);
      setError(err?.message || 'Failed to load referral for editing');
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if user is authenticated - token is stored in HTTP-only cookie
      console.log('Auth check:', { user: !!user, authLoading });
      
      if (!user) {
        // Only redirect if user is missing (token is in cookie)
        console.log('No user found, redirecting to login');
        router.push('/auth');
        return;
      }
      
      // Use user from AuthContext (already loaded)
      setCurrentUser(user);
      
      // User has woredaId directly, no need to fetch hospital
      setUserHospital({ woredaId: user.woredaId });

      const [mothersData, childrenData] = await Promise.all([
        mothersApi.getAll().catch(() => []),
        childrenApi.getAll().catch(() => []),
      ]);

      setMothers(Array.isArray(mothersData) ? mothersData : []);
      setChildren(Array.isArray(childrenData) ? childrenData : []);
      
      // Fetch real hospitals data
      const hospitalsData = await hospitalsApi.getAll();
      setHospitals(Array.isArray(hospitalsData) ? hospitalsData : []);

      // If referral edit mode is active, load the draft values
      if (referralId) {
        await loadReferral(referralId, mothersData);
      } else if (motherId) {
        const mother = mothersData.find((m: any) => m._id === motherId);
        if (mother) {
          setSelectedMother(mother);
          await fetchMotherPregnancies(motherId);
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // When mother is selected, fetch her pregnancies and update selectedMother
    if (name === 'motherId' && value) {
      const mother = mothers.find((m: any) => m._id === value);
      if (mother) {
        setSelectedMother(mother);
        fetchMotherPregnancies(value);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...files],
    }));
  };

  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

      // Validation: ensure required fields
      if (!formData.motherId || !formData.reason) {
        setError('Please fill in all required fields (mother and reason).');
        return;
      }
      // For non‑liaison officers, enforce destination facility selection
      if (userRole !== 'LIAISON_OFFICER') {
        if (!formData.targetHospitalId) {
          setError('Please select a destination facility.');
          return;
        }
      } else {
        // Liaison officer: if a destination was already set on an existing draft
        // and the liaison hasn't chosen a different one, keep the original.
        if (!formData.targetHospitalId && existingTargetHospitalId) {
          formData.targetHospitalId = existingTargetHospitalId;
        }
      }


    try {
      setSubmitting(true);
      setError(null);

      // Get selected mother info for patient details
      const selectedMotherInfo = mothers.find(m => m._id === formData.motherId) || selectedMother;
      if (!selectedMotherInfo) {
        setError('Mother information not found');
        return;
      }

      const normalizedPhone = normalizeEthiopianPhone(
        selectedMotherInfo.phone || selectedMotherInfo.phoneNumber,
      );

      if (!normalizedPhone) {
        setError('Invalid mother phone number format for referral');
        return;
      }

      // Map frontend priority to backend urgency
      const urgencyMap: Record<string, string> = {
        LOW: 'ROUTINE',
        MEDIUM: 'ROUTINE',
        HIGH: 'URGENT',
        URGENT: 'EMERGENCY',
      };

      // Map frontend data to backend DTO structure
      const referralData = {
        motherId: formData.motherId,
        fromHospital: user?.hospitalId,
        doctorName: user?.name || 'Doctor',
        patientName: selectedMotherInfo.fullName || selectedMotherInfo.name || 'Unknown',
        patientPhone: normalizedPhone,
        urgency: urgencyMap[formData.priority] ?? 'ROUTINE',
        reasonForReferral: formData.reason,
        clinicalNotes: formData.notes || undefined,
        // Destination is set by the creator; liaison sends using this value
        ...(formData.targetHospitalId || existingTargetHospitalId
          ? { toHospital: formData.targetHospitalId || existingTargetHospitalId }
          : {}),
      };

      console.log('Sending referral data:', referralData);
      console.log('User info:', user);
      console.log('Selected mother:', selectedMotherInfo);

      const response = referralId
        ? await referralsApi.update(referralId, referralData)
        : await referralsApi.create(referralData);

      console.log('Referral saved successfully:', response);

      // Upload any attached files
      const savedId = response?._id ?? referralId;
      if (savedId && formData.attachments.length > 0) {
        const uploadResults = await Promise.allSettled(
          formData.attachments.map(file => uploadReferralDoc(savedId, file))
        );
        const failed = uploadResults.filter(r => r.status === 'rejected').length;
        if (failed > 0) {
          console.warn(`${failed} file(s) failed to upload`);
        }
      }

      setSuccessMessage(
        referralId
          ? 'Referral draft updated successfully.'
          : 'Referral created as draft. Please send it from Manage Referrals.'
      );

      setSuccess(true);
      
      // Redirect to referrals management after 2 seconds
      setTimeout(() => {
        router.push('/healthcare-dashboard/referrals');
      }, 2000);
    } catch (err: any) {
      console.error('Error creating referral:', err);
      setError(err?.message || 'Failed to create referral');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading data...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-green-600 text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Referral Completed</h2>
          <p className="text-gray-600 mb-4">{successMessage}</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
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
              <h1 className="text-2xl font-bold text-gray-900">
                {isEditMode ? 'Edit Referral' : 'Create Referral'}
              </h1>
              <p className="text-sm text-gray-600">
                {isEditMode ? 'Update the draft referral before sending it.' : 'Refer a patient to another facility'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/healthcare-dashboard/referrals')}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={logout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <span className="text-red-600 mr-2">⚠️</span>
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Mother Information Display */}
          {selectedMother && (
            <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">Mother Medical Information</h3>
              
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <h4 className="text-md font-medium text-blue-900 mb-2">Basic Information</h4>
                  <p className="text-sm text-blue-700"><span className="font-medium">Name:</span> {selectedMother.name}</p>
                  <p className="text-sm text-blue-700"><span className="font-medium">Age:</span> {selectedMother.age} years</p>
                  <p className="text-sm text-blue-700"><span className="font-medium">Phone:</span> {selectedMother.phone}</p>
                  <p className="text-sm text-blue-700"><span className="font-medium">Address:</span> {selectedMother.address || 'N/A'}</p>
                  <p className="text-sm text-blue-700"><span className="font-medium">Health Center:</span> {(selectedMother.healthCenter as any)?.name || selectedMother.healthCenter || 'N/A'}</p>
                  <p className="text-sm text-blue-700"><span className="font-medium">Woreda:</span> {(selectedMother.woredaId as any)?.name || selectedMother.woredaId || 'N/A'}</p>
                </div>
                <div>
                  <h4 className="text-md font-medium text-blue-900 mb-2">Obstetric History</h4>
                  <p className="text-sm text-blue-700"><span className="font-medium">Gravida:</span> {selectedMother.gravida || 'Unknown'} (total pregnancies)</p>
                  <p className="text-sm text-blue-700"><span className="font-medium">Para:</span> {selectedMother.para || 'Unknown'} (live births)</p>
                  <p className="text-sm text-blue-700"><span className="font-medium">Living Children:</span> {selectedMother.livingChildren || 'Unknown'}</p>
                  <p className="text-sm text-blue-700"><span className="font-medium">Last Visit:</span> {selectedMother.lastVisitDate ? new Date(selectedMother.lastVisitDate as any).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>
              
              {/* Medical Conditions */}
              <div className="mb-6">
                <h4 className="text-md font-medium text-blue-900 mb-2">Medical Conditions & Risk Factors</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-blue-700"><span className="font-medium">Blood Type:</span> {selectedMother.bloodType || 'Unknown'}</p>
                    <p className="text-sm text-blue-700"><span className="font-medium">RH Factor:</span> {selectedMother.rhFactor || 'Unknown'}</p>
                    <p className="text-sm text-blue-700"><span className="font-medium">HIV Status:</span> {selectedMother.hivStatus || 'Unknown'}</p>
                    <p className="text-sm text-blue-700"><span className="font-medium">Hepatitis B:</span> {selectedMother.hepatitisB || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-700"><span className="font-medium">Hypertension:</span> {selectedMother.hypertension ? 'YES' : 'NO'}</p>
                    <p className="text-sm text-blue-700"><span className="font-medium">Diabetes:</span> {selectedMother.diabetes ? 'YES' : 'NO'}</p>
                    <p className="text-sm text-blue-700"><span className="font-medium">Anemia:</span> {selectedMother.anemia ? 'YES' : 'NO'}</p>
                    <p className="text-sm text-blue-700"><span className="font-medium">Previous C-Section:</span> {selectedMother.previousCSection ? 'YES' : 'NO'}</p>
                  </div>
                </div>
              </div>
              
              {/* Allergies */}
              {selectedMother.allergies && (
                <div className="mb-6">
                  <h4 className="text-md font-medium text-blue-900 mb-2">Allergies</h4>
                  <p className="text-sm text-blue-700">{selectedMother.allergies}</p>
                </div>
              )}
              
              {/* Current Pregnancy Details */}
              {latestPregnancy && (
                <div className="mb-6 p-4 bg-white rounded-lg border border-blue-200">
                  <h4 className="text-md font-medium text-blue-900 mb-2">Current Pregnancy Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-700"><span className="font-medium">LMP:</span> {latestPregnancy.lmp ? new Date(latestPregnancy.lmp as any).toLocaleDateString() : 'Unknown'}</p>
                      <p className="text-sm text-gray-700"><span className="font-medium">EDD:</span> {latestPregnancy.edd ? new Date(latestPregnancy.edd as any).toLocaleDateString() : 'Unknown'}</p>
                      <p className="text-sm text-gray-700"><span className="font-medium">Gestation:</span> {latestPregnancy.gestationalAge || 'Unknown'} weeks</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700"><span className="font-medium">Risk Level:</span> 
                        <span className={`ml-1 px-2 py-1 rounded-full text-xs font-medium ${
                          latestPregnancy.riskLevel === 'HIGH' ? 'bg-red-100 text-red-800' :
                          latestPregnancy.riskLevel === 'MODERATE' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {latestPregnancy.riskLevel || 'UNKNOWN'}
                        </span>
                      </p>
                      <p className="text-sm text-gray-700"><span className="font-medium">Emergency:</span> 
                        <span className={`ml-1 ${latestPregnancy.emergency ? 'text-red-600 font-medium' : 'text-green-600'}`}>
                          {latestPregnancy.emergency ? 'YES' : 'NO'}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700"><span className="font-medium">Last Visit:</span> {latestPregnancy.visitDate ? new Date(latestPregnancy.visitDate as any).toLocaleDateString() : 'N/A'}</p>
                      <p className="text-sm text-gray-700"><span className="font-medium">BP:</span> {latestPregnancy.bloodPressure || 'Unknown'}</p>
                      <p className="text-sm text-gray-700"><span className="font-medium">Weight:</span> {latestPregnancy.weight ? `${latestPregnancy.weight} kg` : 'Unknown'}</p>
                    </div>
                  </div>
                  {latestPregnancy.complications && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-700"><span className="font-medium">Complications:</span> {latestPregnancy.complications}</p>
                    </div>
                  )}
                  {latestPregnancy.notes && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-700"><span className="font-medium">Clinical Notes:</span> {latestPregnancy.notes}</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Previous Pregnancy Complications */}
              {selectedMother.previousComplications && (
                <div className="mb-6">
                  <h4 className="text-md font-medium text-blue-900 mb-2">Previous Pregnancy Complications</h4>
                  <p className="text-sm text-blue-700">{selectedMother.previousComplications}</p>
                </div>
              )}
              
              <div className="mt-4">
                <button
                  onClick={() => router.push('/healthcare-dashboard/referrals')}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  ← Select Different Mother
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Patient Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mother *
                </label>
                <select
                  name="motherId"
                  value={formData.motherId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                  disabled={!!motherId}
                >
                  <option value="">Select Mother</option>
                  {mothers.map((mother) => (
                    <option key={mother._id} value={mother._id}>
                      {mother.name} - {mother.phone}
                    </option>
                  ))}
                </select>
                {motherId && (
                  <p className="text-xs text-gray-500 mt-1">Mother pre-selected - click above to change</p>
                )}
              </div>
            </div>

            {/* Referral Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Referral *
                </label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Describe the reason for referral..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority Level
                </label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>
            
            {/* Destination Facility */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Destination Facility {userRole !== 'LIAISON_OFFICER' ? '*' : <span className="text-gray-400 font-normal">(Optional — can be set when sending)</span>}
              </label>
              <select
                name="targetHospitalId"
                value={formData.targetHospitalId}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required={userRole !== 'LIAISON_OFFICER'}
              >
                <option value="">Select Destination Facility…</option>
                {hospitals.map((h: any) => (
                  <option key={h._id} value={h._id}>{h.name} ({h.type === 'HEALTH_CENTER' ? 'Health Center' : 'Hospital'})</option>
                ))}
              </select>
            </div>

            {/* Additional Information */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Any additional information or special requirements..."
              />
            </div>

            {/* Emergency Checkbox */}
            <div className="flex items-center">
              <input
                type="checkbox"
                name="emergency"
                id="emergency"
                checked={formData.emergency}
                onChange={handleInputChange}
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
              />
              <label htmlFor="emergency" className="ml-2 block text-sm text-gray-700">
                Mark as Emergency (will be prioritized)
              </label>
            </div>

            {/* File Attachments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attach Medical Files <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                <input
                  type="file"
                  name="attachments"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.dicom"
                  onChange={handleFileChange}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Accepted: Images (JPG, PNG), PDF, Word, Excel, MRI/DICOM, lab results, X-rays, ultrasound reports
                </p>
                {formData.attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm font-medium text-gray-700">Selected Files ({formData.attachments.length}):</p>
                    <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                      {formData.attachments.map((file, index) => {
                        const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
                        const icon = ['jpg','jpeg','png','gif','webp'].includes(ext) ? '🖼️'
                          : ext === 'pdf' ? '📄'
                          : ['doc','docx'].includes(ext) ? '📝'
                          : ['xls','xlsx'].includes(ext) ? '📊'
                          : ['dcm','dicom'].includes(ext) ? '🩻'
                          : '📎';
                        return (
                          <li key={index} className="flex items-center justify-between px-3 py-2 bg-white text-sm">
                            <span className="flex items-center gap-2">
                              <span>{icon}</span>
                              <span className="text-gray-800 truncate max-w-xs">{file.name}</span>
                              <span className="text-gray-400 text-xs">({(file.size / 1024).toFixed(1)} KB)</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="text-red-500 hover:text-red-700 text-xs ml-2 shrink-0"
                            >
                              ✕ Remove
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.push('/healthcare-dashboard/referrals')}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Creating Referral...' : 'Create Referral'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
