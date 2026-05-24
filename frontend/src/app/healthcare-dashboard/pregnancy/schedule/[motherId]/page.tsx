'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { pregnancyApi, mothersApi } from '@/lib/healthcare-api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Visit {
  _id: string;
  visitDate: string;
  visitType: 'ANC' | 'PNC' | 'EMERGENCY' | 'CUSTOM';
  visitStatus: 'SCHEDULED' | 'COMPLETED' | 'MISSED' | 'RESCHEDULED';
  visitNumber?: number;
  gestationalAge: number;
  week: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH';
  manualOverride: boolean;
  overrideReason?: string;
  retrospectiveEntry?: boolean;
  deviatesFromWhoSchedule?: boolean;
  whoDeviationNote?: string;
  notes?: string;
  healthWorkerId?: { name: string; role: string };
}

interface Vaccine {
  _id: string;
  vaccineName: string;
  doseNumber: number;
  givenDate: string;
  nextDoseDate?: string;
  status: 'GIVEN' | 'SCHEDULED' | 'MISSED';
  manualOverride?: boolean;
}

interface FullSchedule {
  visits: Visit[];
  vaccines: Vaccine[];
  nextVisit: Visit | null;
  overdueVisits: Visit[];
  warnings: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED:   'bg-blue-100 text-blue-800',
  COMPLETED:   'bg-green-100 text-green-800',
  MISSED:      'bg-red-100 text-red-800',
  RESCHEDULED: 'bg-yellow-100 text-yellow-800',
};

const RISK_STYLES: Record<string, string> = {
  LOW:      'bg-green-100 text-green-700',
  MODERATE: 'bg-yellow-100 text-yellow-700',
  HIGH:     'bg-red-100 text-red-700',
};

const TYPE_STYLES: Record<string, string> = {
  ANC:       'bg-blue-50 border-blue-300',
  PNC:       'bg-purple-50 border-purple-300',
  EMERGENCY: 'bg-red-50 border-red-400',
  CUSTOM:    'bg-gray-50 border-gray-300',
};

function fmt(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function daysUntil(d: string) {
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 0) return `${Math.abs(diff)} days ago`;
  return `In ${diff} days`;
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AncSchedulePage() {
  const params = useParams();
  const router = useRouter();
  const motherId = params.motherId as string;

  const [mother, setMother] = useState<any>(null);
  const [schedule, setSchedule] = useState<FullSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'vaccines'>('timeline');

  // Modals
  const [showReschedule, setShowReschedule] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);

  // Maternal Vaccine Modal State
  const [showMaternalVaccine, setShowMaternalVaccine] = useState(false);
  const [maternalForm, setMaternalForm] = useState({
    vaccineName: 'Td1',
    doseNumber: '1',
    givenDate: new Date().toISOString().split('T')[0],
    batchNumber: '',
    notes: '',
  });
  const [maternalLoading, setMaternalLoading] = useState(false);
  const [maternalError, setMaternalError] = useState<string | null>(null);

  // Reschedule form
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  // Manual visit form
  const [manualForm, setManualForm] = useState({
    visitDate: '',
    visitType: 'ANC' as 'ANC' | 'PNC' | 'EMERGENCY' | 'CUSTOM',
    notes: '',
    overrideReason: '',
    retrospectiveEntry: false,
    gestationalAge: '',
    week: '',
    riskLevel: 'LOW' as 'LOW' | 'MODERATE' | 'HIGH',
  });
  const [creatingManual, setCreatingManual] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  // Complete action
  const [completing, setCompleting] = useState<string | null>(null);

  const openMaternalVaccineModal = () => {
    // Find highest Td/TT dose in schedule
    const tdDoses = (schedule?.vaccines || [])
      .filter(v => (v.vaccineName.startsWith('Td') || v.vaccineName.startsWith('TT')) && v.status === 'GIVEN')
      .map(v => v.doseNumber);
    const highestDose = tdDoses.length > 0 ? Math.max(...tdDoses) : 0;
    const nextDose = Math.min(5, highestDose + 1);
    
    setMaternalForm({
      vaccineName: `Td${nextDose}`,
      doseNumber: nextDose.toString(),
      givenDate: new Date().toISOString().split('T')[0],
      batchNumber: '',
      notes: '',
    });
    setMaternalError(null);
    setShowMaternalVaccine(true);
  };

  const handleVaccineNameChange = (name: string) => {
    let doseNum = '1';
    if (name.startsWith('Td')) {
      doseNum = name.slice(2);
    } else if (name.startsWith('TT')) {
      doseNum = name.slice(2);
    }
    setMaternalForm(p => ({ ...p, vaccineName: name, doseNumber: doseNum }));
  };

  const handleRecordMaternalVaccine = async (e: React.FormEvent) => {
    e.preventDefault();
    setMaternalLoading(true);
    setMaternalError(null);
    try {
      await pregnancyApi.recordMaternalVaccine({
        motherId,
        vaccineName: maternalForm.vaccineName,
        doseNumber: parseInt(maternalForm.doseNumber),
        givenDate: maternalForm.givenDate,
        batchNumber: maternalForm.batchNumber || undefined,
        notes: maternalForm.notes || undefined,
      });
      setShowMaternalVaccine(false);
      await load();
    } catch (err: any) {
      setMaternalError(err.message || 'Failed to record vaccine dose');
    } finally {
      setMaternalLoading(false);
    }
  };

  useEffect(() => { load(); }, [motherId]);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const [mothers, sched] = await Promise.all([
        mothersApi.getAll(),
        pregnancyApi.getFullSchedule(motherId),
      ]);
      setMother(mothers.find((m: any) => m._id === motherId) ?? null);
      setSchedule(sched);
    } catch (err: any) {
      setError(err.message || 'Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (visitId: string) => {
    setCompleting(visitId);
    try {
      await pregnancyApi.completeVisit(visitId);
      await load();
    } catch (err: any) {
      alert(err.message || 'Failed to complete visit');
    } finally {
      setCompleting(null);
    }
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisit) return;
    setRescheduling(true);
    setRescheduleError(null);
    try {
      await pregnancyApi.rescheduleVisit(selectedVisit._id, rescheduleDate, rescheduleReason);
      setShowReschedule(false);
      setRescheduleDate('');
      setRescheduleReason('');
      await load();
    } catch (err: any) {
      setRescheduleError(err.message || 'Failed to reschedule');
    } finally {
      setRescheduling(false);
    }
  };

  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingManual(true);
    setManualError(null);
    try {
      await pregnancyApi.createManualVisit({
        motherId,
        visitDate: manualForm.visitDate,
        visitType: manualForm.visitType,
        notes: manualForm.notes || undefined,
        overrideReason: manualForm.overrideReason,
        retrospectiveEntry: manualForm.retrospectiveEntry,
        gestationalAge: manualForm.gestationalAge ? parseInt(manualForm.gestationalAge) : undefined,
        week: manualForm.week ? parseInt(manualForm.week) : undefined,
        riskLevel: manualForm.riskLevel,
      });
      setShowManual(false);
      setManualForm({ visitDate: '', visitType: 'ANC', notes: '', overrideReason: '', retrospectiveEntry: false, gestationalAge: '', week: '', riskLevel: 'LOW' });
      await load();
    } catch (err: any) {
      setManualError(err.message || 'Failed to create visit');
    } finally {
      setCreatingManual(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
        <p className="mt-4 text-gray-600">Loading schedule...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-600 text-lg mb-4">{error}</p>
        <button onClick={load} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Retry</button>
      </div>
    </div>
  );

  const { visits = [], vaccines = [], nextVisit, overdueVisits = [], warnings = [] } = schedule ?? {};

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-between items-center py-4 gap-y-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">ANC Schedule</h1>
              <p className="text-sm text-gray-600">
                {mother ? `${mother.name} · ${mother.phone}` : 'Loading mother...'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowManual(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
                + Manual Visit
              </button>
              <a href="/healthcare-dashboard/pregnancy"
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm">
                Back
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
            <p className="font-semibold text-yellow-800 mb-2">⚠️ WHO Schedule Warnings</p>
            {warnings.map((w, i) => <p key={i} className="text-sm text-yellow-700">{w}</p>)}
          </div>
        )}

        {/* Overdue alerts */}
        {overdueVisits.length > 0 && (
          <div className="bg-red-50 border border-red-300 rounded-lg p-4">
            <p className="font-semibold text-red-800 mb-2">🚨 {overdueVisits.length} Overdue Visit{overdueVisits.length > 1 ? 's' : ''}</p>
            {overdueVisits.map(v => (
              <div key={v._id} className="flex items-center justify-between text-sm text-red-700 mt-1">
                <span>Visit on {fmt(v.visitDate)} — {v.visitType} (Week {v.gestationalAge})</span>
                <button onClick={() => { setSelectedVisit(v); setShowReschedule(true); }}
                  className="ml-4 px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700">
                  Reschedule
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Next visit banner */}
        {nextVisit && (
          <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Next Scheduled Visit</p>
              <p className="text-xl font-bold text-blue-900">{fmt(nextVisit.visitDate)}</p>
              <p className="text-sm text-blue-700">
                {daysUntil(nextVisit.visitDate)} · Week {nextVisit.gestationalAge} · {nextVisit.visitType}
                {nextVisit.manualOverride && <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Manual Override</span>}
              </p>
            </div>
            <button onClick={() => handleComplete(nextVisit._id)} disabled={completing === nextVisit._id}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm disabled:opacity-60">
              {completing === nextVisit._id ? 'Marking…' : '✓ Mark Completed'}
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200 flex">
            {(['timeline', 'vaccines'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                {tab === 'timeline' ? `📅 Visit Timeline (${visits.length})` : `💉 Vaccines (${vaccines.length})`}
              </button>
            ))}
          </div>

          {/* Visit Timeline */}
          {activeTab === 'timeline' && (
            <div className="p-6">
              {visits.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-lg mb-2">No visits recorded yet</p>
                  <button onClick={() => setShowManual(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                    Create First Visit
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {visits.sort((a, b) => new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime()).map(visit => (
                    <div key={visit._id}
                      className={`border rounded-lg p-4 ${TYPE_STYLES[visit.visitType] ?? 'bg-white border-gray-200'}`}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900">{fmt(visit.visitDate)}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[visit.visitStatus]}`}>
                              {visit.visitStatus}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                              {visit.visitType}
                            </span>
                            {visit.visitNumber && (
                              <span className="text-xs text-gray-500">Visit #{visit.visitNumber}</span>
                            )}
                            {visit.manualOverride && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                                ✏️ Manual Override
                              </span>
                            )}
                            {visit.retrospectiveEntry && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                                Retrospective
                              </span>
                            )}
                            {visit.deviatesFromWhoSchedule && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                                ⚠️ WHO Deviation
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            Week {visit.gestationalAge} ·{' '}
                            <span className={`text-xs px-1.5 py-0.5 rounded ${RISK_STYLES[visit.riskLevel]}`}>
                              {visit.riskLevel} Risk
                            </span>
                          </p>
                          {visit.overrideReason && (
                            <p className="text-xs text-orange-700 mt-1">Reason: {visit.overrideReason}</p>
                          )}
                          {visit.whoDeviationNote && (
                            <p className="text-xs text-yellow-700 mt-1">{visit.whoDeviationNote}</p>
                          )}
                          {visit.notes && (
                            <p className="text-xs text-gray-500 mt-1">{visit.notes}</p>
                          )}
                          {visit.healthWorkerId && (
                            <p className="text-xs text-gray-400 mt-1">By {visit.healthWorkerId.name}</p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 flex-shrink-0">
                          {visit.visitStatus === 'SCHEDULED' && (
                            <>
                              <button onClick={() => handleComplete(visit._id)}
                                disabled={completing === visit._id}
                                className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-60">
                                {completing === visit._id ? '…' : '✓ Complete'}
                              </button>
                              <button onClick={() => { setSelectedVisit(visit); setShowReschedule(true); }}
                                className="px-3 py-1 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600">
                                Reschedule
                              </button>
                            </>
                          )}
                          {visit.visitStatus === 'MISSED' && (
                            <button onClick={() => { setSelectedVisit(visit); setShowReschedule(true); }}
                              className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700">
                              Reschedule
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Vaccines */}
          {activeTab === 'vaccines' && (
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900">Maternal Vaccination Records</h3>
                <button
                  onClick={openMaternalVaccineModal}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
                >
                  + Record Vaccine Dose
                </button>
              </div>

              {/* Td Immunization Progress Tracker */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6 mb-6">
                <h3 className="text-sm font-bold text-blue-900 mb-4 flex items-center gap-2">
                  <span>🛡️</span> Maternal Td (Tetanus Diphtheria) Protection Status
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {[
                    { key: 'Td1', label: 'Td1', desc: 'ANC contact / early as possible', duration: 'Baseline entry' },
                    { key: 'Td2', label: 'Td2', desc: 'At least 4 weeks after Td1', duration: 'Up to 3 years protection' },
                    { key: 'Td3', label: 'Td3', desc: 'At least 6 months after Td2', duration: 'Up to 5 years protection' },
                    { key: 'Td4', label: 'Td4', desc: 'At least 1 year after Td3', duration: 'Up to 10 years protection' },
                    { key: 'Td5', label: 'Td5', desc: 'At least 1 year after Td4', duration: 'Lifelong immunity' },
                  ].map(tdSlot => {
                    const administered = (vaccines as Vaccine[]).find(v => (v.vaccineName === tdSlot.key || v.vaccineName === tdSlot.key.replace('Td', 'TT')) && v.status === 'GIVEN');
                    const isNext = !administered && (vaccines as Vaccine[]).filter(v => v.status === 'GIVEN' && (v.vaccineName.startsWith('Td') || v.vaccineName.startsWith('TT'))).length === parseInt(tdSlot.key.slice(2)) - 1;
                    
                    return (
                      <div key={tdSlot.key} className={`border rounded-xl p-4 flex flex-col justify-between transition-all duration-300 ${
                        administered 
                          ? 'bg-white border-green-200 shadow-sm text-green-900' 
                          : isNext
                          ? 'bg-blue-50 border-blue-200 shadow-sm text-blue-900 ring-2 ring-blue-500/20'
                          : 'bg-gray-50/50 border-gray-100 text-gray-500'
                      }`}>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-sm">{tdSlot.label}</span>
                            {administered ? (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">Given</span>
                            ) : isNext ? (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold animate-pulse">Next</span>
                            ) : (
                              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Pending</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mb-2">{tdSlot.desc}</p>
                        </div>
                        <div className={`text-[11px] font-semibold mt-2 pt-2 border-t ${administered ? 'border-green-100 text-green-600' : 'border-gray-100 text-gray-400'}`}>
                          🛡️ {tdSlot.duration}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {vaccines.length === 0 ? (
                <p className="text-center text-gray-400 py-12">No vaccines recorded yet</p>
              ) : (
                <div className="space-y-3">
                  {(vaccines as Vaccine[]).map(v => (
                    <div key={v._id} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm hover:shadow transition-shadow">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-gray-900">{v.vaccineName} — Dose {v.doseNumber}</p>
                          <p className="text-sm text-gray-600 mt-1">Given: {fmt(v.givenDate)}</p>
                          {v.nextDoseDate && (
                            <p className="text-sm text-blue-600 font-medium mt-1">
                              📅 Next dose recommended: {fmt(v.nextDoseDate)} ({daysUntil(v.nextDoseDate)})
                            </p>
                          )}
                          {v.clinicalProtection && (
                            <p className="text-xs text-green-600 font-semibold mt-2 flex items-center gap-1">
                              🛡️ Protection Duration: {v.clinicalProtection}
                            </p>
                          )}
                          {v.manualOverride && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 mt-2 inline-block">Manual Override</span>
                          )}
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                          v.status === 'GIVEN' ? 'bg-green-100 text-green-800 border-green-200' :
                          v.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                          'bg-red-100 text-red-800 border-red-200'
                        }`}>
                          {v.status === 'GIVEN' ? 'Administered' : v.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ── Reschedule Modal ── */}
      {showReschedule && selectedVisit && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Reschedule Visit</h3>
            <p className="text-sm text-gray-500 mb-4">
              Current date: {fmt(selectedVisit.visitDate)} · {selectedVisit.visitType}
            </p>
            {rescheduleError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                ❌ {rescheduleError}
              </div>
            )}
            <form onSubmit={handleReschedule} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Date *</label>
                <input type="date" required value={rescheduleDate}
                  onChange={e => setRescheduleDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Override Reason *</label>
                <textarea required rows={3} value={rescheduleReason}
                  onChange={e => setRescheduleReason(e.target.value)}
                  placeholder="Why is this visit being rescheduled?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                <p className="text-xs text-gray-400 mt-1">Required for audit trail. This will be logged.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={rescheduling}
                  className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm font-medium disabled:opacity-60">
                  {rescheduling ? 'Rescheduling…' : 'Confirm Reschedule'}
                </button>
                <button type="button" onClick={() => { setShowReschedule(false); setRescheduleError(null); }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Manual Visit Modal ── */}
      {showManual && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Manual Visit</h3>
            {manualError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                ❌ {manualError}
              </div>
            )}
            <form onSubmit={handleCreateManual} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Visit Date *</label>
                  <input type="date" required value={manualForm.visitDate}
                    onChange={e => setManualForm(p => ({ ...p, visitDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Visit Type *</label>
                  <select required value={manualForm.visitType}
                    onChange={e => setManualForm(p => ({ ...p, visitType: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                    <option value="ANC">ANC (Antenatal)</option>
                    <option value="PNC">PNC (Postnatal)</option>
                    <option value="EMERGENCY">Emergency</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gestational Age (weeks)</label>
                  <input type="number" min="1" max="42" value={manualForm.gestationalAge}
                    onChange={e => setManualForm(p => ({ ...p, gestationalAge: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Risk Level</label>
                  <select value={manualForm.riskLevel}
                    onChange={e => setManualForm(p => ({ ...p, riskLevel: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                    <option value="LOW">Low</option>
                    <option value="MODERATE">Moderate</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Override Reason *</label>
                <textarea required rows={2} value={manualForm.overrideReason}
                  onChange={e => setManualForm(p => ({ ...p, overrideReason: e.target.value }))}
                  placeholder="Why is this visit being created manually?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                <p className="text-xs text-gray-400 mt-1">Required for audit trail.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea rows={2} value={manualForm.notes}
                  onChange={e => setManualForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="retro" checked={manualForm.retrospectiveEntry}
                  onChange={e => setManualForm(p => ({ ...p, retrospectiveEntry: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                <label htmlFor="retro" className="text-sm text-gray-700">
                  Retrospective entry (visit already occurred in the past)
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={creatingManual}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-60">
                  {creatingManual ? 'Creating…' : 'Create Visit'}
                </button>
                <button type="button" onClick={() => { setShowManual(false); setManualError(null); }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Record Maternal Vaccine Modal ── */}
      {showMaternalVaccine && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Record Maternal Vaccine</h3>
            {maternalError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                ❌ {maternalError}
              </div>
            )}
            <form onSubmit={handleRecordMaternalVaccine} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vaccine Name *</label>
                <select 
                  value={maternalForm.vaccineName} 
                  onChange={e => handleVaccineNameChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Td1">Td1 (Tetanus Diphtheria 1)</option>
                  <option value="Td2">Td2 (Tetanus Diphtheria 2)</option>
                  <option value="Td3">Td3 (Tetanus Diphtheria 3)</option>
                  <option value="Td4">Td4 (Tetanus Diphtheria 4)</option>
                  <option value="Td5">Td5 (Tetanus Diphtheria 5)</option>
                  <option value="INFLUENZA">Seasonal Influenza</option>
                  <option value="TT1">TT1 (Tetanus Toxoid 1 - Legacy)</option>
                  <option value="TT2">TT2 (Tetanus Toxoid 2 - Legacy)</option>
                  <option value="TT3">TT3 (Tetanus Toxoid 3 - Legacy)</option>
                  <option value="TT4">TT4 (Tetanus Toxoid 4 - Legacy)</option>
                  <option value="TT5">TT5 (Tetanus Toxoid 5 - Legacy)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dose Number *</label>
                <input 
                  type="number" 
                  min="1" 
                  max="5" 
                  required 
                  value={maternalForm.doseNumber}
                  onChange={e => setMaternalForm(p => ({ ...p, doseNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Administered *</label>
                <input 
                  type="date" 
                  required 
                  value={maternalForm.givenDate}
                  onChange={e => setMaternalForm(p => ({ ...p, givenDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number</label>
                <input 
                  type="text" 
                  value={maternalForm.batchNumber}
                  onChange={e => setMaternalForm(p => ({ ...p, batchNumber: e.target.value }))}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea 
                  rows={2} 
                  value={maternalForm.notes}
                  onChange={e => setMaternalForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Optional notes"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" 
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="submit" 
                  disabled={maternalLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-60"
                >
                  {maternalLoading ? 'Saving…' : 'Save Vaccine Dose'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowMaternalVaccine(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
