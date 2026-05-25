'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { referralsApi } from '@/lib/healthcare-api';
import { useAuth } from '@/contexts/AuthContext';

type ReferralStatus = 'DRAFT' | 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'SCHEDULED' | 'CHECKED_IN' | 'COMPLETED' | 'EXPIRED';

interface Referral {
  _id: string;
  referralCode: string;
  motherId: any;
  pregnancyId?: any;
  fromHospital: any;
  toHospital: any;
  createdBy: any;
  status: ReferralStatus;
  urgency: string;
  reasonForReferral: string;
  clinicalNotes?: string;
  liaisonNote?: string;
  createdAt: string;
  activityLog: any[];
  // Frontend convenience aliases
  targetHospitalId?: string;  // Maps to toHospital
  attachedFiles?: string[];   // Maps to attachments
}

export default function ReferralManagement() {
  const { logout, user } = useAuth();
  const router = useRouter();
  const [incomingReferralsData, setIncomingReferrals] = useState<Referral[]>([]);
  const [sentReferralsData, setSentReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'incoming' | 'sent'>('incoming');
  const canUnlockReferral =
    !!user?.role && ['DOCTOR', 'NURSE', 'MIDWIFE', 'SPECIALIST'].includes(user.role);

  useEffect(() => {
    fetchReferrals();
  }, []);

  const fetchReferrals = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [incoming, sent] = await Promise.all([
        referralsApi.getAll('inbound').catch(() => []),
        referralsApi.getOutbox().catch(() => [])
      ]);

      setIncomingReferrals(Array.isArray(incoming) ? incoming : []);
      setSentReferrals(Array.isArray(sent) ? sent : []);
    } catch (err) {
      console.error('Error fetching referrals:', err);
      setError('Failed to load referrals');
    } finally {
      setLoading(false);
    }
  };

  const handleRespondToReferral = async (referralId: string, response: 'ACCEPT' | 'REJECT', note?: string) => {
    try {
      await referralsApi.respond(referralId, {
        status: response === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED',
        justification: note,
      });
      await fetchReferrals(); // Refresh data
    } catch (err: any) {
      console.error('Error responding to referral:', err);
      setError(err?.message || 'Failed to respond to referral');
    }
  };

  const handleUnlockReferral = async (referralCode: string) => {
    try {
      await referralsApi.unlock({ referralCode });
      await fetchReferrals();
    } catch (err: any) {
      console.error('Error unlocking referral:', err);
      setError(err?.message || 'Failed to unlock referral');
    }
  };

  const handleSendReferral = async (referralId: string, targetHospitalId: string, liaisonNote?: string) => {
    try {
      // Find the referral in the current data to verify stored targetHospitalId
      const referral = [...incomingReferralsData, ...sentReferralsData].find((r) => r._id === referralId);
      if (referral && referral.targetHospitalId && referral.targetHospitalId !== targetHospitalId) {
        setError('Destination hospital mismatch: liaison selection does not match referral creator’s chosen facility.');
        return;
      }
      await referralsApi.send(referralId, targetHospitalId, liaisonNote);
      await fetchReferrals(); // Refresh data
    } catch (err: any) {
      console.error('Error sending referral:', err);
      setError(err?.message || 'Failed to send referral');
    }
  };

  const getStatusColor = (status: ReferralStatus) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'ACCEPTED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'SCHEDULED': return 'bg-blue-100 text-blue-800';
      case 'CHECKED_IN': return 'bg-purple-100 text-purple-800';
      case 'COMPLETED': return 'bg-emerald-100 text-emerald-800';
      case 'EXPIRED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const ReferralCard = ({ referral, isIncoming }: { referral: Referral; isIncoming: boolean }) => (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Referral #{referral.referralCode || referral._id?.slice(-8)}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Created: {referral.createdAt ? new Date(referral.createdAt).toLocaleDateString() : 'Unknown'}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(referral.status)}`}>
          {referral.status}
        </span>
      </div>

      <div className="mb-4 space-y-1">
        <p className="text-sm text-gray-600">
          <span className="font-medium">Mother:</span>{" "}
          {referral.motherId?.name || referral.motherId?.fullName || "-"}{" "}
          {referral.motherId?.age ? `(${referral.motherId.age}y)` : ""}
          {referral.motherId?.phone ? ` • ${referral.motherId.phone}` : ""}
        </p>
        <p className="text-sm text-gray-600">
          <span className="font-medium">Reason:</span> {referral.reasonForReferral || "-"}
        </p>
        {referral.liaisonNote && (
          <p className="text-sm text-gray-600">
            <span className="font-medium">Liaison note:</span> {referral.liaisonNote}
          </p>
        )}
        <p className="text-sm text-gray-600">
          <span className="font-medium">From:</span> {referral.fromHospital?.name || referral.fromHospital || "-"}
        </p>
        <p className="text-sm text-gray-600">
          <span className="font-medium">To:</span> {referral.toHospital?.name || referral.toHospital || "-"}
        </p>
        <p className="text-sm text-gray-600">
          <span className="font-medium">By:</span> {referral.createdBy?.fullName || referral.createdBy?.name || "-"}
        </p>
      </div>

      {referral.targetHospitalId && (
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Target Hospital:</span> {referral.targetHospitalId}
          </p>
        </div>
      )}

      {referral.attachedFiles && referral.attachedFiles.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Attached Files:</span> {referral.attachedFiles.length}
          </p>
        </div>
      )}

      <div className="flex space-x-3">
        {isIncoming && referral.status === 'CHECKED_IN' && canUnlockReferral && (
          <>
            <button
              onClick={() => handleUnlockReferral(referral.referralCode)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Unlock Clinical Data
            </button>
          </>
        )}
        {isIncoming && referral.status === 'PENDING' && (
          <p className="text-xs text-gray-600 self-center">Waiting for gate check-in before decision.</p>
        )}
        
        
        <button
          onClick={() => router.push(`/referrals/${referral._id}`)}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          View Details
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading referrals...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Referral Management</h1>
              <p className="text-sm text-gray-600">Manage incoming and outgoing referrals</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/healthcare-dashboard')}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => router.push('/healthcare-dashboard/referrals')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Create Referral
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <span className="text-red-600 mr-2">⚠️</span>
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('incoming')}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'incoming'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Incoming Referrals ({incomingReferralsData.length})
              </button>
              <button
                onClick={() => setActiveTab('sent')}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'sent'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Sent Referrals ({sentReferralsData.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Referrals List */}
        <div className="space-y-6">
          {activeTab === 'incoming' && (
            <>
              {incomingReferralsData.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-6 text-center">
                  <div className="text-gray-400 text-6xl mb-4">📥</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Incoming Referrals</h3>
                  <p className="text-gray-600">You don't have any incoming referrals at the moment.</p>
                </div>
              ) : (
                incomingReferralsData.map((referral) => (
                  <ReferralCard key={referral._id} referral={referral} isIncoming={true} />
                ))
              )}
            </>
          )}

          {activeTab === 'sent' && (
            <>
              {sentReferralsData.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-6 text-center">
                  <div className="text-gray-400 text-6xl mb-4">📤</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Sent Referrals</h3>
                  <p className="text-gray-600">You haven't sent any referrals yet.</p>
                  <button
                    onClick={() => router.push('/healthcare-dashboard/referrals/create')}
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Create Your First Referral
                  </button>
                </div>
              ) : (
                sentReferralsData.map((referral) => (
                  <ReferralCard key={referral._id} referral={referral} isIncoming={false} />
                ))
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
