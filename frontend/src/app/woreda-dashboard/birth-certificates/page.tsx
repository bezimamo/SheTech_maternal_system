'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { childrenApi } from '@/lib/healthcare-api';

interface Child {
  _id: string;
  name: string;
  birthDate: string;
  gender: 'MALE' | 'FEMALE';
  birthWeight?: number;
  birthHeight?: number;
  apgarScore?: number;
  deliveryType?: string;
  healthStatus: string;
  registrationDate: string;
  verified: boolean;
  verifiedAt?: string;
  certificateNumber?: string;
  certificateIssuedDate?: string;
  fatherName?: string;
  fatherPhone?: string;
  birthLocation?: string;
  sentToWoreda?: boolean;
  sentToWoredaAt?: string;
  sentToWoredaBy?: string;
  motherId?: { _id: string; name: string; phone: string; age?: number; address?: string };
  birthHospital?: { _id: string; name: string; type: string };
  deliveredBy?: { _id: string; name: string; role: string };
}

interface CertificateForm {
  fatherName: string;
  fatherPhone: string;
  birthLocation: string;
}

export default function BirthCertificatesPage() {
  const { user, logout } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'issued'>('all');

  // Issue certificate modal
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [certForm, setCertForm] = useState<CertificateForm>({ fatherName: '', fatherPhone: '', birthLocation: '' });
  const [issuing, setIssuing] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);

  // Certificate preview
  const [showPreview, setShowPreview] = useState(false);
  const [previewChild, setPreviewChild] = useState<Child | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchChildren(); }, []);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      setError(null);
      // woredaId is normalized to a string in AuthContext, but guard against object shape
      const woredaId = user?.woredaId
        ? typeof user.woredaId === 'string'
          ? user.woredaId
          : (user.woredaId as any)?._id?.toString() ?? (user.woredaId as any)?.toString()
        : null;
      if (!woredaId) throw new Error('No woreda assigned to your account. Contact your administrator.');
      const data = await childrenApi.getByWoreda(woredaId);
      setChildren(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load children');
    } finally {
      setLoading(false);
    }
  };

  const openIssueModal = (child: Child) => {
    setSelectedChild(child);
    setCertForm({
      fatherName: child.fatherName || '',
      fatherPhone: child.fatherPhone || '',
      birthLocation: child.birthLocation || '',
    });
    setIssueError(null);
    setShowIssueModal(true);
  };

  const handleIssueCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChild) return;
    setIssuing(true);
    setIssueError(null);
    try {
      const updated = await childrenApi.issueBirthCertificate(selectedChild._id, certForm);
      setChildren(prev => prev.map(c => c._id === updated._id ? updated : c));
      setShowIssueModal(false);
      // Show the certificate preview immediately
      setPreviewChild(updated);
      setShowPreview(true);
    } catch (err: any) {
      setIssueError(err.message || 'Failed to issue certificate');
    } finally {
      setIssuing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const filtered = children.filter(c => {
    const matchSearch =
      !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.motherId?.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.certificateNumber?.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'all' ||
      (filter === 'pending' && !c.verified) ||
      (filter === 'issued' && c.verified);
    return matchSearch && matchFilter;
  });

  const pending = children.filter(c => !c.verified).length;
  const issued = children.filter(c => c.verified).length;
  const sentToWoreda = children.filter(c => !c.verified && c.sentToWoreda).length;

  return (
    <ProtectedRoute requiredRole="WOREDA_ADMIN">
      <div className="min-h-screen bg-gray-50 print:bg-white">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 print:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap justify-between items-center py-4 gap-y-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-gradient-to-r from-green-600 to-teal-600 rounded-lg flex items-center justify-center">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Birth Certificates</h1>
                  <p className="text-sm text-gray-500">Woreda: {typeof user?.woredaId === 'string' ? user.woredaId : (user?.woredaId as any)?._id || 'Not Assigned'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link href="/woreda-dashboard" className="text-sm text-blue-600 hover:underline whitespace-nowrap">← Dashboard</Link>
                <button onClick={() => logout()} className="whitespace-nowrap bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm">Logout</button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 print:hidden">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-5 border-l-4 border-blue-500">
              <p className="text-sm text-gray-500">Total Registered</p>
              <p className="text-3xl font-bold text-gray-900">{children.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-5 border-l-4 border-yellow-500">
              <p className="text-sm text-gray-500">Pending Certificate</p>
              <p className="text-3xl font-bold text-gray-900">{pending}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-5 border-l-4 border-blue-400">
              <p className="text-sm text-gray-500">Sent to Woreda</p>
              <p className="text-3xl font-bold text-gray-900">{sentToWoreda}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-5 border-l-4 border-green-500">
              <p className="text-sm text-gray-500">Certificates Issued</p>
              <p className="text-3xl font-bold text-gray-900">{issued}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-3 items-center">
            <input
              type="text"
              placeholder="Search by child name, mother, or certificate number..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 min-w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
            />
            <div className="flex gap-2">
              {(['all', 'pending', 'issued'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === f ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}>
                  {f === 'all' ? 'All' : f === 'pending' ? 'Pending' : 'Issued'}
                </button>
              ))}
            </div>
            <button onClick={fetchChildren} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              Refresh
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}

          {/* Loading */}
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-400 text-lg">No children found</p>
              <p className="text-gray-400 text-sm mt-1">Children registered at facilities in your woreda will appear here</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Child</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Birth Date</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Mother</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Facility</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Delivered By</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Certificate No.</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(child => (
                    <tr key={child._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{child.name || '(Unnamed)'}</p>
                        <p className="text-xs text-gray-500">{child.gender}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {new Date(child.birthDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-900">{child.motherId?.name || '—'}</p>
                        <p className="text-xs text-gray-500">{child.motherId?.phone || ''}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-900">{child.birthHospital?.name || '—'}</p>
                        <p className="text-xs text-gray-500">{child.birthHospital?.type || ''}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{child.deliveredBy?.name || '—'}</td>
                      <td className="px-4 py-3">
                        {child.verified ? (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            ✓ Issued
                          </span>
                        ) : child.sentToWoreda ? (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            📨 Sent to Woreda
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">
                        {child.certificateNumber || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {!child.verified ? (
                            <button
                              onClick={() => openIssueModal(child)}
                              className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700"
                            >
                              Issue Certificate
                            </button>
                          ) : (
                            <button
                              onClick={() => { setPreviewChild(child); setShowPreview(true); }}
                              className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
                            >
                              View / Print
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>

        {/* Issue Certificate Modal */}
        {showIssueModal && selectedChild && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 print:hidden">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Issue Birth Certificate</h3>
              <p className="text-sm text-gray-500 mb-4">
                Child: <strong>{selectedChild.name || '(Unnamed)'}</strong> — Born {new Date(selectedChild.birthDate).toLocaleDateString()}
              </p>

              {issueError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{issueError}</div>
              )}

              {/* Read-only birth info summary */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4 text-sm space-y-2">
                <h4 className="font-medium text-gray-700 mb-2">Birth Information (from hospital record)</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-gray-500">Mother:</span> <span className="font-medium">{selectedChild.motherId?.name || '—'}</span></div>
                  <div><span className="text-gray-500">Phone:</span> <span className="font-medium">{selectedChild.motherId?.phone || '—'}</span></div>
                  <div><span className="text-gray-500">Gender:</span> <span className="font-medium">{selectedChild.gender}</span></div>
                  <div><span className="text-gray-500">Birth Weight:</span> <span className="font-medium">{selectedChild.birthWeight ? `${selectedChild.birthWeight}g` : '—'}</span></div>
                  <div><span className="text-gray-500">Delivery Type:</span> <span className="font-medium">{selectedChild.deliveryType || '—'}</span></div>
                  <div><span className="text-gray-500">Facility:</span> <span className="font-medium">{selectedChild.birthHospital?.name || '—'}</span></div>
                  <div><span className="text-gray-500">Delivered By:</span> <span className="font-medium">{selectedChild.deliveredBy?.name || '—'}</span></div>
                  <div><span className="text-gray-500">Apgar Score:</span> <span className="font-medium">{selectedChild.apgarScore ?? '—'}</span></div>
                </div>
              </div>

              <form onSubmit={handleIssueCertificate} className="space-y-4">
                <h4 className="font-medium text-gray-700 text-sm">Additional Information for Certificate</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Father's Name</label>
                  <input type="text" value={certForm.fatherName}
                    onChange={e => setCertForm({ ...certForm, fatherName: e.target.value })}
                    placeholder="Enter father's full name (optional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Father's Phone</label>
                  <input type="text" value={certForm.fatherPhone}
                    onChange={e => setCertForm({ ...certForm, fatherPhone: e.target.value })}
                    placeholder="e.g. 09XXXXXXXX (optional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Birth Location (ward/room)</label>
                  <input type="text" value={certForm.birthLocation}
                    onChange={e => setCertForm({ ...certForm, birthLocation: e.target.value })}
                    placeholder="e.g. Maternity Ward, Room 3 (optional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={issuing}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-60">
                    {issuing ? 'Issuing…' : '✓ Issue Certificate'}
                  </button>
                  <button type="button" onClick={() => setShowIssueModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Certificate Preview Modal */}
        {showPreview && previewChild && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 print:hidden">
            <div className="bg-white rounded-lg w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="text-lg font-semibold">Birth Certificate Preview</h3>
                <div className="flex gap-2">
                  <button onClick={handlePrint}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                    🖨️ Print
                  </button>
                  <button onClick={() => setShowPreview(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm hover:bg-gray-300">
                    Close
                  </button>
                </div>
              </div>
              <div ref={printRef} className="p-8">
                <BirthCertificateDocument child={previewChild} />
              </div>
            </div>
          </div>
        )}

        {/* Printable certificate — only visible when printing */}
        {previewChild && (
          <div className="hidden print:block p-8">
            <BirthCertificateDocument child={previewChild} />
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

// ── Birth Certificate Document Component ──────────────────────────────────────
function BirthCertificateDocument({ child }: { child: Child }) {
  return (
    <div className="border-4 border-green-700 p-8 font-serif" style={{ minHeight: '600px' }}>
      {/* Header */}
      <div className="text-center mb-6">
        <p className="text-sm text-gray-600 uppercase tracking-widest">Federal Democratic Republic of Ethiopia</p>
        <p className="text-sm text-gray-600 uppercase tracking-widest">Ministry of Health</p>
        <h1 className="text-3xl font-bold text-green-800 mt-2 mb-1">BIRTH CERTIFICATE</h1>
        <p className="text-sm text-gray-500">Smart Maternal Health System</p>
        <div className="border-t-2 border-b-2 border-green-700 py-1 mt-3">
          <p className="text-sm font-semibold text-green-800">
            Certificate No: <span className="font-mono">{child.certificateNumber}</span>
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="space-y-4 text-sm">
        <p className="text-center text-gray-700 italic mb-4">
          This is to certify that the following child was born and registered in accordance with the laws of Ethiopia.
        </p>

        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
          <Row label="Full Name of Child" value={child.name || '(Not provided)'} />
          <Row label="Date of Birth" value={new Date(child.birthDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} />
          <Row label="Gender" value={child.gender} />
          <Row label="Birth Weight" value={child.birthWeight ? `${child.birthWeight} grams` : '—'} />
          <Row label="Birth Height" value={child.birthHeight ? `${child.birthHeight} cm` : '—'} />
          <Row label="Apgar Score" value={child.apgarScore?.toString() ?? '—'} />
          <Row label="Delivery Type" value={child.deliveryType || '—'} />
          <Row label="Birth Location" value={child.birthLocation || '—'} />
        </div>

        <div className="border-t border-gray-300 pt-3 mt-3">
          <p className="font-semibold text-gray-700 mb-2">Parent / Guardian Information</p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            <Row label="Mother's Name" value={child.motherId?.name || '—'} />
            <Row label="Mother's Phone" value={child.motherId?.phone || '—'} />
            <Row label="Father's Name" value={child.fatherName || '—'} />
            <Row label="Father's Phone" value={child.fatherPhone || '—'} />
            <Row label="Address" value={child.motherId?.address || '—'} />
          </div>
        </div>

        <div className="border-t border-gray-300 pt-3 mt-3">
          <p className="font-semibold text-gray-700 mb-2">Registration Information</p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            <Row label="Birth Facility" value={child.birthHospital?.name || '—'} />
            <Row label="Facility Type" value={child.birthHospital?.type || '—'} />
            <Row label="Delivered By" value={child.deliveredBy?.name || '—'} />
            <Row label="Registration Date" value={new Date(child.registrationDate).toLocaleDateString()} />
            <Row label="Certificate Issued" value={child.certificateIssuedDate ? new Date(child.certificateIssuedDate).toLocaleDateString() : '—'} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-10 grid grid-cols-2 gap-8">
        <div className="text-center">
          <div className="border-t border-gray-400 pt-2 mt-8">
            <p className="text-xs text-gray-600">Woreda Administrator Signature</p>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-gray-400 pt-2 mt-8">
            <p className="text-xs text-gray-600">Official Stamp</p>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-gray-400 mt-6">
        Issued on {child.certificateIssuedDate ? new Date(child.certificateIssuedDate).toLocaleDateString() : '—'} •
        Certificate No: {child.certificateNumber} •
        Smart Maternal Health System
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-gray-500 text-xs uppercase tracking-wide">{label}</span>
      <p className="font-medium text-gray-900 border-b border-dotted border-gray-300 pb-0.5">{value}</p>
    </div>
  );
}
