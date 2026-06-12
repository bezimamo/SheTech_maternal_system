'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { mothersApi, hospitalsApi, referralsApi, filesApi, pregnancyApi } from '@/lib/healthcare-api';
import { useAuth } from '@/contexts/AuthContext';
import { 
  CreateMaternalReferralRequest, 
  UrgencyLevel, 
  RiskLevel,
  URGENCY_CONFIG,
  RISK_CONFIG
} from '@/types/referral';

export default function CreateMaternalReferral() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const router = useRouter();
  
  const [formData, setFormData] = useState<CreateMaternalReferralRequest>({
    motherId: '',
    fromHospital: '',
    toHospital: '', // Only set by liaison officer when sending
    urgency: UrgencyLevel.ROUTINE,
    riskLevel: RiskLevel.LOW,
    gestationalAge: undefined,
    expectedDeliveryDate: '',
    gravida: undefined,
    para: undefined,
    clinicalCondition: '',
    reasonForReferral: '',
    clinicalNotes: '',
    doctorName: user?.name || '',
  });

  const [mothers, setMothers] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [selectedMother, setSelectedMother] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [authLoading]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user) {
        router.push('/auth');
        return;
      }

      const [mothersData, hospitalsData] = await Promise.all([
        mothersApi.getAll().catch(() => []),
        hospitalsApi.getAll().catch(() => []),
      ]);

      setMothers(Array.isArray(mothersData) ? mothersData : []);
      setHospitals(Array.isArray(hospitalsData) ? hospitalsData : []);
      
      // Set from hospital based on user
      setFormData(prev => ({
        ...prev,
        fromHospital: user.hospitalId || '',
        doctorName: user.name || 'Doctor',
      }));
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
 
    // When mother is selected, fetch her details and latest visit
    if (name === 'motherId' && value) {
      const mother = mothers.find((m: any) => m._id === value);
      if (mother) {
        setSelectedMother(mother);
        
        // Pre-fill from mother record first
        setFormData(prev => ({
          ...prev,
          expectedDeliveryDate: mother.expectedDeliveryDate ? new Date(mother.expectedDeliveryDate).toISOString().split('T')[0] : prev.expectedDeliveryDate,
          gravida: mother.gravida || prev.gravida,
          para: mother.para || prev.para,
          riskLevel: mother.highRisk ? RiskLevel.HIGH : RiskLevel.LOW,
        }));
 
        // Then fetch latest visit for more detailed clinical info
        try {
          const visits = await pregnancyApi.getByMotherId(value);
          if (Array.isArray(visits) && visits.length > 0) {
            // Sort by date descending
            const latestVisit = [...visits].sort((a, b) => 
              new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()
            )[0];
 
            setFormData(prev => ({
              ...prev,
              gestationalAge: latestVisit.gestationalAge || latestVisit.week || prev.gestationalAge,
              riskLevel: latestVisit.riskLevel === 'HIGH' ? RiskLevel.HIGH : 
                         latestVisit.riskLevel === 'MODERATE' ? RiskLevel.HIGH : // Map moderate to high for safety in referral
                         RiskLevel.LOW,
              clinicalCondition: latestVisit.clinicalCondition || latestVisit.notes || prev.clinicalCondition,
            }));
          }
        } catch (err) {
          console.error('Error fetching latest pregnancy visit:', err);
        }
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Limit to 5MB
      if (file.size > 5 * 1024 * 1024) {
        setError('File size exceeds 5MB limit');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.motherId || !formData.reasonForReferral) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Map maternal form data to backend DTO structure
      const referralData = {
        motherId: formData.motherId,
        fromHospital: formData.fromHospital,
        toHospital: formData.toHospital || undefined, // For draft, may be undefined
        urgency: formData.urgency,
        riskLevel: formData.riskLevel,
        gestationalAge: Number(formData.gestationalAge) || undefined,
        expectedDeliveryDate: formData.expectedDeliveryDate || undefined,
        gravida: Number(formData.gravida) || undefined,
        para: Number(formData.para) || undefined,
        clinicalCondition: formData.clinicalCondition || undefined,
        patientName: selectedMother?.name || 'Unknown Mother',
        patientPhone: selectedMother?.phone || '',
        reasonForReferral: formData.reasonForReferral,
        clinicalNotes: `${formData.clinicalNotes || ''}${formData.gestationalAge ? `\nGestational Age: ${formData.gestationalAge} weeks` : ''}${formData.expectedDeliveryDate ? `\nEDD: ${formData.expectedDeliveryDate}` : ''}${formData.gravida ? `\nGravida: ${formData.gravida}` : ''}${formData.para ? `\nPara: ${formData.para}` : ''}${formData.clinicalCondition ? `\nClinical Condition: ${formData.clinicalCondition}` : ''}`.trim(),
        doctorName: formData.doctorName,
      };

      const response = await referralsApi.create(referralData);
      console.log('Maternal referral created:', response);

      // If a file was selected, upload it
      if (selectedFile && response._id) {
        try {
          setUploadingFile(true);
          await filesApi.uploadReferralDoc(response._id, selectedFile);
          console.log('Referral file uploaded successfully');
        } catch (fileErr) {
          console.error('Error uploading referral file:', fileErr);
          // Don't fail the whole process if file upload fails, but inform the user
          setError('Referral created, but file upload failed. You can try uploading it later.');
        } finally {
          setUploadingFile(false);
        }
      }

      setSuccess(true);
      
      // Redirect to referral details after 2 seconds
      setTimeout(() => {
        router.push(`/healthcare-dashboard/maternal-referrals/${response._id}`);
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Referral Created</h2>
          <p className="text-gray-600 mb-4">Maternal referral created successfully</p>
          <p className="text-sm text-gray-500">Redirecting to referral details...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Create Maternal Referral</h1>
              <p className="text-sm text-gray-600">Create a new maternal care referral</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/healthcare-dashboard/maternal-referrals')}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Back to Referrals
              </button>
              <button
                onClick={() => {
                  logout();
                  router.push('/auth');
                }}
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
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Mother Selection and Destination Facility */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Mother *
                </label>
                <select
                  name="motherId"
                  value={formData.motherId}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a mother</option>
                  {mothers.map((mother) => (
                    <option key={mother._id} value={mother._id}>
                      {mother.name} - {mother.phone} - {mother.age} years
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Destination Facility/Hospital
                </label>
                <select
                  name="toHospital"
                  value={formData.toHospital}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select destination facility</option>
                  {hospitals.map((hospital) => (
                    <option key={hospital._id} value={hospital._id}>
                      {hospital.name} ({hospital.type || 'HOSPITAL'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Maternal Information */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Maternal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gestational Age (weeks)
                  </label>
                  <input
                    type="number"
                    name="gestationalAge"
                    value={formData.gestationalAge || ''}
                    onChange={handleInputChange}
                    min="0"
                    max="42"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., 32"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    name="expectedDeliveryDate"
                    value={formData.expectedDeliveryDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gravida
                  </label>
                  <input
                    type="number"
                    name="gravida"
                    value={formData.gravida || ''}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Number of pregnancies"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Para
                  </label>
                  <input
                    type="number"
                    name="para"
                    value={formData.para || ''}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Number of births"
                  />
                </div>
              </div>
            </div>

            {/* Risk and Urgency */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Risk Level *
                </label>
                <div className="space-y-2">
                  {Object.values(RiskLevel).map((level) => (
                    <label key={level} className="flex items-center">
                      <input
                        type="radio"
                        name="riskLevel"
                        value={level}
                        checked={formData.riskLevel === level}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${RISK_CONFIG[level].bgColor} ${RISK_CONFIG[level].color}`}>
                        {RISK_CONFIG[level].label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Urgency Level *
                </label>
                <div className="space-y-2">
                  {Object.values(UrgencyLevel).map((level) => (
                    <label key={level} className="flex items-center">
                      <input
                        type="radio"
                        name="urgency"
                        value={level}
                        checked={formData.urgency === level}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${URGENCY_CONFIG[level].bgColor} ${URGENCY_CONFIG[level].color}`}>
                        {URGENCY_CONFIG[level].label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Clinical Information */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Clinical Condition
              </label>
              <textarea
                name="clinicalCondition"
                value={formData.clinicalCondition}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Describe the current clinical condition..."
              />
            </div>

            {/* Referral Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Referral *
              </label>
              <textarea
                name="reasonForReferral"
                value={formData.reasonForReferral}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Describe the reason for this referral..."
                required
              />
            </div>

            {/* Clinical Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Clinical Notes
              </label>
              <textarea
                name="clinicalNotes"
                value={formData.clinicalNotes}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Additional clinical notes..."
              />
            </div>

            {/* File Attachment */}
            <div className="border-t pt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attach Medical Document (PDF, Image, Max 5MB)
              </label>
              <div className="mt-1 flex items-center">
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>
              {selectedFile && (
                <p className="mt-2 text-sm text-gray-600 flex items-center">
                  <span className="mr-2">📎</span>
                  {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.push('/healthcare-dashboard/maternal-referrals')}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || uploadingFile || !formData.motherId || !formData.reasonForReferral}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Creating...' : uploadingFile ? 'Uploading Document...' : 'Create Referral'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
