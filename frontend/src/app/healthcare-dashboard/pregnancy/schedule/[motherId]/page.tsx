'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { pregnancyApi, mothersApi, motherVaccinationsApi } from '@/lib/healthcare-api';

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

interface TdSlot {
  doseNumber: number;
  label: string;
  status: string;
  visitDate?: string;
  targetDate?: string;
  visitId?: string;
}

interface MotherVaccineSchedule {
  vaccines: Vaccine[];
  vaccineSchedule: TdSlot[];
  nextAppointment?: { doseNumber: number; scheduledDate: string; label: string };
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
  const [motherVaccineSchedule, setMotherVaccineSchedule] = useState<MotherVaccineSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'vaccines'>('timeline');

  // Modals
  const [showReschedule, setShowReschedule] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);

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

  // Record TD dose
  const [showRecordVaccine, setShowRecordVaccine] = useState(false);
  const [recordDoseForm, setRecordDoseForm] = useState({
    doseNumber: 1,
    administeredDate: new Date().toISOString().split('T')[0],
    batchNumber: '',
    notes: '',
  });
  const [recordingVaccine, setRecordingVaccine] = useState(false);
  const [vaccineError, setVaccineError] = useState<string | null>(null);

  useEffect(() => { load(); }, [motherId]);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const [mothers, sched, motherVac] = await Promise.all([
        mothersApi.getAll(),
        pregnancyApi.getFullSchedule(motherId),
        motherVaccinationsApi.getSchedule(motherId).catch(() => null),
      ]);
      setMother(mothers.find((m: any) => m._id === motherId) ?? null);
      setSchedule(sched);
      setMotherVaccineSchedule(motherVac);
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

  const handleRecordVaccine = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecordingVaccine(true);
    setVaccineError(null);
    try {
      await motherVaccinationsApi.recordDose({
        motherId,
        doseNumber: recordDoseForm.doseNumber,
        administeredDate: recordDoseForm.administeredDate,
        batchNumber: recordDoseForm.batchNumber || undefined,
        notes: recordDoseForm.notes || undefined,
      });
      setShowRecordVaccine(false);
      setRecordDoseForm({
        doseNumber: 1,
        administeredDate: new Date().toISOString().split('T')[0],
        batchNumber: '',
        notes: '',
      });
      await load();
    } catch (err: any) {
      setVaccineError(err.message || 'Failed to record vaccination');
    } finally {
      setRecordingVaccine(false);
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

  const { visits = [], vaccines: legacyVaccines = [], nextVisit, overdueVisits = [], warnings = [] } = schedule ?? {};
  const vaccines = motherVaccineSchedule?.vaccines?.length
    ? motherVaccineSchedule.vaccines
    : legacyVaccines;
  const tdSchedule = motherVaccineSchedule?.vaccineSchedule ?? [];
  const vaccineWarnings = motherVaccineSchedule?.warnings ?? [];

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
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">TD Vaccination (TD1–TD5)</h3>
                <button
                  onClick={() => setShowRecordVaccine(true)}
                  className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                >
                  + Record TD Dose
                </button>
              </div>

              {motherVaccineSchedule?.nextAppointment && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                  Next: {motherVaccineSchedule.nextAppointment.label} on{' '}
                  {fmt(motherVaccineSchedule.nextAppointment.scheduledDate)} (
                  {daysUntil(motherVaccineSchedule.nextAppointment.scheduledDate)})
                </div>
              )}

              {vaccineWarnings.map((w, i) => (
                <div key={i} className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                  {w}
                </div>
              ))}

              {tdSchedule.length > 0 && (
                <div className="grid gap-2">
                  {tdSchedule.map(slot => (
                    <div key={slot.doseNumber} className="flex items-center justify-between border rounded-lg p-3 bg-white">
                      <div>
                        <p className="font-medium text-gray-900">{slot.label}</p>
                        <p className="text-xs text-gray-500">
                          {slot.visitDate ? fmt(slot.visitDate) : slot.targetDate ? `Target: ${fmt(slot.targetDate)}` : 'Not scheduled'}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        slot.status === 'GIVEN' ? 'bg-green-100 text-green-800' :
                        slot.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800' :
                        slot.status === 'MISSED' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {slot.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {vaccines.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No vaccines recorded yet</p>
              ) : (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">All Records</h4>
                  {(vaccines as Vaccine[]).map(v => (
                    <div key={v._id} className="border border-gray-200 rounded-lg p-4 bg-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{v.vaccineName} — Dose {v.doseNumber}</p>
                          <p className="text-sm text-gray-600">Given: {fmt(v.givenDate)}</p>
                          {v.nextDoseDate && (
                            <p className="text-sm text-blue-600">Next dose: {fmt(v.nextDoseDate)} ({daysUntil(v.nextDoseDate)})</p>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          v.status === 'GIVEN' ? 'bg-green-100 text-green-800' :
                          v.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {v.status}
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

      {/* ── Record TD Vaccine Modal ── */}
      {showRecordVaccine && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Record TD Vaccination</h3>
            {vaccineError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {vaccineError}
              </div>
            )}
            <form onSubmit={handleRecordVaccine} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dose *</label>
                <select
                  required
                  value={recordDoseForm.doseNumber}
                  onChange={e => setRecordDoseForm(p => ({ ...p, doseNumber: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  {[1, 2, 3, 4, 5].map(n => (
                    <option key={n} value={n}>TD{n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Administered Date *</label>
                <input
                  type="date"
                  required
                  value={recordDoseForm.administeredDate}
                  onChange={e => setRecordDoseForm(p => ({ ...p, administeredDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number</label>
                <input
                  type="text"
                  value={recordDoseForm.batchNumber}
                  onChange={e => setRecordDoseForm(p => ({ ...p, batchNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={recordDoseForm.notes}
                  onChange={e => setRecordDoseForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <p className="text-xs text-gray-500">
                The next TD dose will be scheduled automatically per WHO intervals.
              </p>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={recordingVaccine}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-60"
                >
                  {recordingVaccine ? 'Saving…' : 'Record Dose'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowRecordVaccine(false); setVaccineError(null); }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
    </div>
  );
}
