'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { childrenApi, vaccinationsApi } from '@/lib/healthcare-api';

interface Child {
  _id: string;
  name: string;
  birthDate: string;
  motherId: {
    _id: string;
    name: string;
    phone: string;
  };
  gender: 'MALE' | 'FEMALE';
  birthHospital: {
    _id: string;
    name: string;
    type: string;
  };
  deliveredBy: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  birthWeight?: number;
  birthHeight?: number;
  healthStatus: 'HEALTHY' | 'NEEDS_ATTENTION' | 'CRITICAL';
  registrationDate: string;
  deceased: boolean;
  pncVisitDay1?: boolean;
  pncVisitDay3?: boolean;
  pncVisitDay7?: boolean;
  protectedAtBirth?: boolean;
}

export default function ChildDetail() {
  const params = useParams();
  const router = useRouter();
  const childId = params.id as string;

  const [child, setChild] = useState<Child | null>(null);
  const [growthHistory, setGrowthHistory] = useState<any[]>([]);
  const [latestGrowth, setLatestGrowth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pncUpdating, setPncUpdating] = useState<string | null>(null);
  const [pncSuccess, setPncSuccess] = useState<string | null>(null);
  const [counselingPrompts, setCounselingPrompts] = useState<any>(null);

  const FALLBACK_PROMPTS = {
    exclusiveBreastfeeding: {
      title: "Exclusive Breastfeeding Guidance",
      text: "Exclusive breastfeeding is medically sufficient for an infant up to 6 months of age. Breast milk provides vital, bioavailable nutrients required for optimal initial growth and immune system development."
    },
    nutritionalTransition: {
      title: "Nutritional Transition Guidance",
      text: "Upon reaching 6 months of age, the infant should be introduced to appropriate solid, semi-solid, or soft complementary foods alongside continued breastfeeding. Additional nutrition can be prepared from varied groups including cereals, meats, eggs, vegetables, and fruits. Breastfeeding should ideally continue up to 2 years of age and beyond."
    },
    heliotherapy: {
      title: "Heliotherapy (Sunlight) Guidance",
      text: "Infants require daily exposure to direct, safe sunlight for approximately 20 to 30 minutes. Natural sunlight exposure is critical for synthesizing Vitamin D, promoting bone density, and maintaining overall skin health."
    },
    polioPrevention: {
      title: "Polio Prevention Awareness",
      text: "Compliance with the oral and inactivated polio vaccine series directly prevents poliomyelitis, protecting children against permanent acute flaccid paralysis and lifelong physical disability."
    },
    clinicalCareSeeking: {
      title: "Clinical Care Seeking Directive",
      text: "Caregivers are advised that if an infant displays any sign of systemic illness, lethargy, poor feeding, or persistent adverse events following immunization (AEFI), they must seek immediate medical evaluation at the nearest designated health care facility."
    }
  };

  useEffect(() => {
    if (childId) {
      fetchChildData();
    }
  }, [childId]);

  const fetchChildData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [childData, growthData, latestGrowthData, prompts] = await Promise.all([
        childrenApi.getById(childId),
        childrenApi.getGrowthRecords(childId),
        childrenApi.getLatestGrowthRecord(childId).catch(() => null),
        vaccinationsApi.getCounselingGuidance().catch(() => null)
      ]);

      setChild(childData);
      setGrowthHistory(growthData);
      setLatestGrowth(latestGrowthData);
      setCounselingPrompts(prompts);
    } catch (err: any) {
      console.error('Error fetching child data:', err);
      setError(err.message || 'Failed to load child data');
    } finally {
      setLoading(false);
    }
  };

  const handlePncUpdate = async (field: 'pncVisitDay1' | 'pncVisitDay3' | 'pncVisitDay7', currentValue: boolean) => {
    if (!child) return;
    setPncUpdating(field);
    setPncSuccess(null);
    try {
      const updated = await childrenApi.update(childId, { [field]: !currentValue });
      setChild(prev => prev ? { ...prev, [field]: !currentValue } : prev);
      setPncSuccess(field);
      setTimeout(() => setPncSuccess(null), 3000);
    } catch (err: any) {
      console.error('Failed to update PNC visit:', err);
      alert('Failed to update PNC visit. Please try again.');
    } finally {
      setPncUpdating(null);
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return 'bg-green-100 text-green-800';
      case 'NEEDS_ATTENTION':
        return 'bg-yellow-100 text-yellow-800';
      case 'CRITICAL':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getHealthStatusText = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return 'Healthy';
      case 'NEEDS_ATTENTION':
        return 'Needs Attention';
      case 'CRITICAL':
        return 'Critical';
      default:
        return status;
    }
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    const ageInDays = Math.floor((today.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
    
    if (ageInDays < 28) {
      return `${ageInDays} days`;
    } else if (ageInDays < 365) {
      const months = Math.floor(ageInDays / 30);
      return `${months} months`;
    } else {
      const years = Math.floor(ageInDays / 365);
      const remainingMonths = Math.floor((ageInDays % 365) / 30);
      return `${years}y ${remainingMonths}m`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading child details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">error</div>
          <p className="text-red-600 text-lg">{error}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">child</div>
          <p className="text-gray-600">Child not found</p>
          <button
            onClick={() => router.push('/healthcare-dashboard/children')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Children
          </button>
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
              <h1 className="text-2xl font-bold text-gray-900">Child Details</h1>
              <p className="text-sm text-gray-600">
                {child.name} - {calculateAge(child.birthDate)}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href={`/healthcare-dashboard/children/${childId}/growth`}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Add Growth Record
              </a>
              <a
                href={`/healthcare-dashboard/children`}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Back to Children
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Child Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Name</h3>
                  <p className="text-lg font-medium text-gray-900">{child.name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Age</h3>
                  <p className="text-lg font-medium text-gray-900">{calculateAge(child.birthDate)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Gender</h3>
                  <p className="text-lg font-medium text-gray-900">
                    {child.gender === 'MALE' ? 'Male' : 'Female'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Health Status</h3>
                  <span className={`inline-flex px-2 py-1 text-sm font-semibold rounded-full ${getHealthStatusColor(child.healthStatus)}`}>
                    {getHealthStatusText(child.healthStatus)}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Birth Date</h3>
                  <p className="text-lg font-medium text-gray-900">
                    {new Date(child.birthDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Registration Date</h3>
                  <p className="text-lg font-medium text-gray-900">
                    {new Date(child.registrationDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Birth Information */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Birth Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Birth Hospital</h3>
                  <p className="text-lg font-medium text-gray-900">{child.birthHospital.name}</p>
                  <p className="text-sm text-gray-600">{child.birthHospital.type}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Delivered By</h3>
                  <p className="text-lg font-medium text-gray-900">{child.deliveredBy.name}</p>
                  <p className="text-sm text-gray-600">{child.deliveredBy.role}</p>
                </div>
                {child.birthWeight && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Birth Weight</h3>
                    <p className="text-lg font-medium text-gray-900">{child.birthWeight}g</p>
                  </div>
                )}
                {child.birthHeight && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Birth Height</h3>
                    <p className="text-lg font-medium text-gray-900">{child.birthHeight}cm</p>
                  </div>
                )}
              </div>
            </div>

            {/* Newborn Care & Protection */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Newborn Care &amp; Protection</h2>
                <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2 py-1 rounded-full">
                  Click a visit to update status
                </span>
              </div>

              {/* PNC Interactive Visit Cards */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Post-Natal Care (PNC) Visits</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                  {/* Day 1 */}
                  {[
                    { field: 'pncVisitDay1' as const, label: 'Day 1 Visit', day: '1', description: 'Within 24 hours of birth', value: child.pncVisitDay1 },
                    { field: 'pncVisitDay3' as const, label: 'Day 3 Visit', day: '3', description: '48–72 hours after birth', value: child.pncVisitDay3 },
                    { field: 'pncVisitDay7' as const, label: 'Day 7 Visit', day: '7', description: 'One week after birth', value: child.pncVisitDay7 },
                  ].map(({ field, label, day, description, value }) => (
                    <button
                      key={field}
                      id={`pnc-visit-${day}`}
                      onClick={() => handlePncUpdate(field, !!value)}
                      disabled={pncUpdating === field}
                      className={`relative w-full text-left p-4 rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        value
                          ? 'border-green-400 bg-green-50 focus:ring-green-400'
                          : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 focus:ring-blue-400'
                      } ${
                        pncUpdating === field ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 ${
                          value ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {pncUpdating === field ? (
                            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                            </svg>
                          ) : value ? '✓' : day}
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          value ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {value ? 'Done' : 'Pending'}
                        </span>
                      </div>
                      <div className="mt-3">
                        <p className="text-sm font-semibold text-gray-900">{label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
                      </div>
                      {pncSuccess === field && (
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-green-400 rounded-b-xl"/>
                      )}
                      {!value && (
                        <p className="text-xs text-blue-600 mt-2 font-medium">Click to mark completed →</p>
                      )}
                      {value && (
                        <p className="text-xs text-gray-400 mt-2">Click to undo</p>
                      )}
                    </button>
                  ))}
                </div>

                {/* PNC completion summary banner */}
                <div className={`mt-4 p-3 rounded-lg flex items-center space-x-3 ${
                  child.pncVisitDay1 && child.pncVisitDay3 && child.pncVisitDay7
                    ? 'bg-green-50 border border-green-200'
                    : (!child.pncVisitDay1 && !child.pncVisitDay3 && !child.pncVisitDay7)
                      ? 'bg-gray-50 border border-gray-200'
                      : 'bg-yellow-50 border border-yellow-200'
                }`}>
                  <span className="text-xl">
                    {child.pncVisitDay1 && child.pncVisitDay3 && child.pncVisitDay7 ? '🎉' :
                     (!child.pncVisitDay1 && !child.pncVisitDay3 && !child.pncVisitDay7) ? '📋' : '⏳'}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {[child.pncVisitDay1, child.pncVisitDay3, child.pncVisitDay7].filter(Boolean).length} / 3 PNC visits completed
                    </p>
                    <p className="text-xs text-gray-500">
                      {child.pncVisitDay1 && child.pncVisitDay3 && child.pncVisitDay7
                        ? 'All post-natal care visits are complete. Great work!'
                        : 'Update each visit as it is conducted by the healthcare team.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Neonatal Tetanus Protection */}
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Neonatal Tetanus Protection</h3>
                <div className={`p-4 rounded-xl border-2 flex items-center space-x-3 ${
                  child.protectedAtBirth
                    ? 'bg-green-50 border-green-300'
                    : 'bg-yellow-50 border-yellow-300'
                }`}>
                  <span className="text-3xl">{child.protectedAtBirth ? '🛡️' : '⚠️'}</span>
                  <div>
                    <span className={`font-semibold block text-sm ${child.protectedAtBirth ? 'text-green-800' : 'text-yellow-800'}`}>
                      {child.protectedAtBirth ? 'Protected at Birth' : 'Not Protected at Birth'}
                    </span>
                    <span className="text-xs text-gray-600 block mt-0.5">
                      {child.protectedAtBirth
                        ? 'Newborn is protected against neonatal tetanus.'
                        : 'No maternal tetanus immunizations recorded.'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mother Information */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Mother Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Mother Name</h3>
                  <p className="text-lg font-medium text-gray-900">{child.motherId?.name ?? 'Unknown'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Contact</h3>
                  <p className="text-lg font-medium text-gray-900">{child.motherId?.phone ?? '—'}</p>
                </div>
              </div>
              <div className="mt-6 flex space-x-4">
                {child.motherId?._id && (
                  <>
                    <a
                      href={`/healthcare-dashboard/mothers/${child.motherId._id}`}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      View Mother Details
                    </a>
                    <a
                      href={`/healthcare-dashboard/pregnancy/mother/${child.motherId._id}`}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      View Pregnancy History
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* Pediatric Health Education & Counseling Guidance */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>📚</span> Pediatric Health Education &amp; Counseling
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Active parental guidance and clinical directives to support infant growth and immune development.
              </p>
              
              <div className="space-y-4">
                {[
                  { key: 'exclusiveBreastfeeding', icon: '🍼', color: 'from-blue-50 to-blue-100/50 border-blue-200 text-blue-900' },
                  { key: 'nutritionalTransition', icon: '🥣', color: 'from-orange-50 to-orange-100/50 border-orange-200 text-orange-900' },
                  { key: 'heliotherapy', icon: '☀️', color: 'from-yellow-50 to-yellow-100/50 border-yellow-200 text-yellow-900' },
                  { key: 'polioPrevention', icon: '🛡️', color: 'from-purple-50 to-purple-100/50 border-purple-200 text-purple-900' },
                  { key: 'clinicalCareSeeking', icon: '🏥', color: 'from-red-50 to-red-100/50 border-red-200 text-red-900' },
                ].map(promptSlot => {
                  const promptData = (counselingPrompts || FALLBACK_PROMPTS)[promptSlot.key];
                  if (!promptData) return null;
                  
                  return (
                    <div key={promptSlot.key} className={`flex items-start gap-4 p-4 rounded-xl border bg-gradient-to-br ${promptSlot.color}`}>
                      <span className="text-3xl p-1 bg-white rounded-lg shadow-sm">{promptSlot.icon}</span>
                      <div>
                        <h4 className="font-bold text-sm">{promptData.title}</h4>
                        <p className="text-xs leading-relaxed mt-1 text-gray-700">{promptData.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Latest Growth Record */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Latest Growth Record</h2>
              {latestGrowth ? (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Age at Measurement</h3>
                    <p className="text-lg font-medium text-gray-900">{latestGrowth.ageMonths} months</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Weight</h3>
                    <p className="text-lg font-medium text-gray-900">{latestGrowth.weight} kg</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Height</h3>
                    <p className="text-lg font-medium text-gray-900">{latestGrowth.height} cm</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Growth Status</h3>
                    <span className={`inline-flex px-2 py-1 text-sm font-semibold rounded-full ${
                      latestGrowth.growthStatus === 'NORMAL' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {latestGrowth.growthStatus.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Measured</h3>
                    <p className="text-sm text-gray-600">
                      {new Date(latestGrowth.measurementDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-gray-400 text-4xl mb-2">growth</div>
                  <p className="text-gray-600">No growth records yet</p>
                  <a
                    href={`/healthcare-dashboard/children/${childId}/growth`}
                    className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add First Growth Record
                  </a>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <a
                  href={`/healthcare-dashboard/children/${childId}/growth`}
                  className="block w-full px-4 py-2 bg-green-600 text-white text-center rounded-lg hover:bg-green-700 transition-colors"
                >
                  Add Growth Record
                </a>
                <a
                  href={`/healthcare-dashboard/vaccinations/child/${childId}`}
                  className="block w-full px-4 py-2 bg-purple-600 text-white text-center rounded-lg hover:bg-purple-700 transition-colors"
                >
                  View Vaccinations
                </a>
                {child.motherId?._id && (
                  <a
                    href={`/healthcare-dashboard/mothers/${child.motherId._id}`}
                    className="block w-full px-4 py-2 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    View Mother
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
