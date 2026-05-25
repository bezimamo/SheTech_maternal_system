'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { vaccinationsApi, childrenApi } from '@/lib/healthcare-api';

interface VaccinationRecord {
  _id: string;
  childId: {
    _id: string;
    name: string;
    birthDate: string;
    motherId?: { name: string; phone: string };
  };
  vaccineId: {
    _id: string;
    name: string;
    code: string;
    category: string;
    recommendedAge: string;
  };
  doseNumber: number;
  scheduledDate: string;
  administeredDate?: string;
  status: 'SCHEDULED' | 'ADMINISTERED' | 'MISSED' | 'DEFERRED' | 'CONTRAINDICATED';
  administeredBy?: { name: string; role: string };
  batchNumber?: string;
  manufacturer?: string;
  injectionSite?: string;
  notes?: string;
  followUpRequired: boolean;
  followUpDate?: string;
  isCatchUp?: boolean;
  originalScheduleDate?: string;
  missReason?: string;
  weightKg?: number;
  ageDays?: number;
}

interface AdministerForm {
  administeredDate: string;
  nextScheduledDate: string;
  batchNumber: string;
  manufacturer: string;
  injectionSite: string;
  notes: string;
  weightKg?: string;
  ageDays?: string;
}

const VACCINE_BLOCKS = [
  {
    number: 1,
    name: 'Block 1: Birth / Neonatal Doses',
    description: 'Crucial baseline doses administered at birth to establish early immunity.',
    vaccines: ['BCG', 'OPV0', 'HEPB']
  },
  {
    number: 2,
    name: 'Block 2: First Multidose Series (6 Weeks)',
    description: 'First series of routine multidose vaccinations to protect against polio, rotavirus, pneumonia, etc.',
    vaccines: ['OPV', 'PENTA', 'PCV', 'ROTA'],
    doseNumber: 1
  },
  {
    number: 3,
    name: 'Block 3: Second Multidose Series (10 Weeks)',
    description: 'Second series of routine vaccinations to strengthen antibody levels.',
    vaccines: ['OPV', 'PENTA', 'PCV', 'ROTA'],
    doseNumber: 2
  },
  {
    number: 4,
    name: 'Block 4: Third Multidose Series (14 Weeks)',
    description: 'Third series of routine vaccinations, introducing IPV for comprehensive polio protection.',
    vaccines: ['OPV', 'PENTA', 'PCV', 'ROTA', 'IPV'],
    doseNumber: 3
  },
  {
    number: 5,
    name: 'Block 5: Micronutrient & Endemic Interventions',
    description: 'Endemic disease vaccinations and key micronutrient supplementations.',
    vaccines: ['VITA', 'MALARIA1']
  },
  {
    number: 6,
    name: 'Block 6: Subsequent Interventions',
    description: 'Follow-up endemic vaccine doses and subsequent subsequent pediatric interventions.',
    vaccines: ['MALARIA2']
  }
];

const getRecordBlockNumber = (code: string, doseNumber: number): number => {
  const c = (code || '').toUpperCase().trim();
  if (c === 'BCG' || c === 'OPV0' || c === 'HEPB') {
    return 1;
  }
  if (c === 'OPV' || c === 'PENTA' || c === 'PCV' || c === 'ROTA') {
    if (doseNumber === 1) return 2;
    if (doseNumber === 2) return 3;
    if (doseNumber === 3) return 4;
  }
  if (c === 'IPV') {
    return 4;
  }
  if (c === 'VITA' || c === 'VIT_A' || c === 'MALARIA1') {
    return 5;
  }
  if (c === 'MALARIA2') {
    return 6;
  }
  return 1; // Default fallback
};

// A dose counts as "resolved" (no longer blocking the next block) when it has been
// administered, contraindicated, OR recorded as missed (catch-up will be handled separately).
const isResolved = (status: string) =>
  status === 'ADMINISTERED' || status === 'CONTRAINDICATED' || status === 'MISSED';

const getBlockStatus = (blockNum: number, records: VaccinationRecord[]) => {
  // For block 1, only count non-catch-up records so duplicate catch-ups don't inflate totals
  if (blockNum === 1) {
    const blockRecords = records.filter(
      r => getRecordBlockNumber(r.vaccineId?.code, r.doseNumber) === 1 && !r.isCatchUp,
    );
    if (blockRecords.length === 0) return 'READY';
    const completed = blockRecords.filter(r => isResolved(r.status)).length;
    return completed === blockRecords.length ? 'COMPLETED' : 'IN_PROGRESS';
  }

  // Check if previous blocks are all resolved (administered, contraindicated, or missed)
  for (let b = 1; b < blockNum; b++) {
    const prevBlockRecords = records.filter(
      r => getRecordBlockNumber(r.vaccineId?.code, r.doseNumber) === b && !r.isCatchUp,
    );
    if (prevBlockRecords.length === 0) continue;
    const prevResolved = prevBlockRecords.filter(r => isResolved(r.status)).length;
    if (prevResolved < prevBlockRecords.length) {
      return 'LOCKED';
    }
  }

  // Check current block (exclude catch-up records from progress count)
  const blockRecords = records.filter(
    r => getRecordBlockNumber(r.vaccineId?.code, r.doseNumber) === blockNum && !r.isCatchUp,
  );
  if (blockRecords.length === 0) return 'READY';
  const completed = blockRecords.filter(r => isResolved(r.status)).length;
  if (completed === blockRecords.length) return 'COMPLETED';
  if (completed > 0) return 'IN_PROGRESS';
  return 'READY';
};

export default function ChildVaccinations() {
  const params = useParams();
  const router = useRouter();
  const childId = params.id as string;

  const [child, setChild] = useState<any>(null);
  const [vaccinationRecords, setVaccinationRecords] = useState<VaccinationRecord[]>([]);
  const [allVaccines, setAllVaccines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tomorrowStr = new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0];

  // Administer modal
  const [showAdministerModal, setShowAdministerModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<VaccinationRecord | null>(null);
  const [administerForm, setAdministerForm] = useState<AdministerForm>({
    administeredDate: new Date().toISOString().split('T')[0],
    nextScheduledDate: '',
    batchNumber: '',
    manufacturer: '',
    injectionSite: 'Left Thigh',
    notes: '',
    weightKg: '',
    ageDays: '',
  });
  const [administerLoading, setAdministerLoading] = useState(false);
  const [administerError, setAdministerError] = useState<string | null>(null);

  // Add new vaccination modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    vaccineId: '',
    doseNumber: '1',
    scheduledDate: '',
    administeredDate: new Date().toISOString().split('T')[0],
    nextScheduledDate: '',
    batchNumber: '',
    manufacturer: '',
    injectionSite: 'Left Thigh',
    notes: '',
    status: 'ADMINISTERED' as 'ADMINISTERED' | 'SCHEDULED',
    weightKg: '',
    ageDays: '',
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Auto-calculate next vaccination date
  const calculateNextVaccinationDate = (vaccineId: string, administeredDate: string, currentDose: string) => {
    if (!vaccineId || !administeredDate) return '';
    
    const vaccine = allVaccines.find(v => v._id === vaccineId);
    if (!vaccine) return '';
    
    const doseNumber = parseInt(currentDose);
    if (doseNumber >= vaccine.dosesRequired) return ''; // No next dose needed
    
    const administered = new Date(administeredDate);
    const intervalWeeks = vaccine.intervalWeeks || 4; // Default 4 weeks
    const nextDate = new Date(administered);
    nextDate.setDate(nextDate.getDate() + (intervalWeeks * 7));
    
    return nextDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  };

  // Handle vaccine selection change
  const handleVaccineChange = (vaccineId: string) => {
    setAddForm(p => ({ ...p, vaccineId }));
    
    // Auto-calculate next dose date if status is ADMINISTERED
    if (addForm.status === 'ADMINISTERED' && addForm.administeredDate) {
      const nextDate = calculateNextVaccinationDate(vaccineId, addForm.administeredDate, addForm.doseNumber);
      setAddForm(p => ({ ...p, nextScheduledDate: nextDate }));
    }
  };

  // Handle administered date change
  const handleAdministeredDateChange = (date: string) => {
    setAddForm(p => ({ ...p, administeredDate: date }));
    
    // Auto-calculate next dose date if status is ADMINISTERED and vaccine is selected
    if (addForm.status === 'ADMINISTERED' && addForm.vaccineId) {
      const nextDate = calculateNextVaccinationDate(addForm.vaccineId, date, addForm.doseNumber);
      setAddForm(p => ({ ...p, nextScheduledDate: nextDate }));
    }
  };

  // Handle dose number change
  const handleDoseNumberChange = (doseNumber: string) => {
    setAddForm(p => ({ ...p, doseNumber }));
    
    // Auto-calculate next dose date if status is ADMINISTERED
    if (addForm.status === 'ADMINISTERED' && addForm.vaccineId && addForm.administeredDate) {
      const nextDate = calculateNextVaccinationDate(addForm.vaccineId, addForm.administeredDate, doseNumber);
      setAddForm(p => ({ ...p, nextScheduledDate: nextDate }));
    }
  };

  useEffect(() => {
    if (childId) fetchData();
  }, [childId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [childData, vaccinationData, vaccineList] = await Promise.all([
        childrenApi.getById(childId),
        vaccinationsApi.getVaccinationRecordsByChild(childId),
        vaccinationsApi.getAllVaccines().catch(() => []),
      ]);
      setChild(childData);
      setVaccinationRecords(vaccinationData);
      setAllVaccines(Array.isArray(vaccineList) ? vaccineList : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load vaccination data');
    } finally {
      setLoading(false);
    }
  };

  const openAdministerModal = (record: VaccinationRecord) => {
    setSelectedRecord(record);
    const birth = new Date(child?.birthDate || new Date());
    const today = new Date();
    const ageInDays = Math.max(0, Math.floor((today.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24)));

    setAdministerForm({
      administeredDate: new Date().toISOString().split('T')[0],
      nextScheduledDate: '',
      batchNumber: '',
      manufacturer: '',
      injectionSite: record.vaccineId?.code === 'OPV' || record.vaccineId?.code === 'ROTA' || record.vaccineId?.code === 'OPV0' ? 'Oral' : 'Left Thigh',
      notes: '',
      weightKg: '',
      ageDays: ageInDays.toString(),
    });
    setAdministerError(null);
    setShowAdministerModal(true);
  };

  const handleAdminister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    
    if (administerForm.nextScheduledDate) {
      const nextDate = new Date(administerForm.nextScheduledDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (nextDate <= today) {
        setAdministerError('Next scheduled date must be in the future.');
        return;
      }
    }
    
    setAdministerLoading(true);
    setAdministerError(null);
    try {
      await vaccinationsApi.markVaccinationAdministered(selectedRecord._id, {
        administeredDate: administerForm.administeredDate,
        batchNumber: administerForm.batchNumber || undefined,
        manufacturer: administerForm.manufacturer || undefined,
        injectionSite: administerForm.injectionSite || undefined,
        notes: administerForm.notes || undefined,
        weightKg: administerForm.weightKg ? parseFloat(administerForm.weightKg) : undefined,
        ageDays: administerForm.ageDays ? parseInt(administerForm.ageDays) : undefined,
      });

      // If health worker set a next dose date, create a new scheduled record
      if (administerForm.nextScheduledDate) {
        await vaccinationsApi.createVaccinationRecord({
          childId,
          vaccineId: selectedRecord.vaccineId._id,
          doseNumber: selectedRecord.doseNumber + 1,
          scheduledDate: administerForm.nextScheduledDate,
          status: 'SCHEDULED',
        });
      }

      setShowAdministerModal(false);
      await fetchData();
    } catch (err: any) {
      setAdministerError(err.message || 'Failed to record vaccination');
    } finally {
      setAdministerLoading(false);
    }
  };

  const handleAddVaccination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.vaccineId) { setAddError('Please select a vaccine.'); return; }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (addForm.status === 'SCHEDULED' && addForm.scheduledDate) {
      const scheduledDate = new Date(addForm.scheduledDate);
      if (scheduledDate <= today) {
        setAddError('Scheduled date must be in the future.');
        return;
      }
    }
    
    if (addForm.nextScheduledDate) {
      const nextDate = new Date(addForm.nextScheduledDate);
      if (nextDate <= today) {
        setAddError('Next scheduled date must be in the future.');
        return;
      }
    }
    
    setAddLoading(true);
    setAddError(null);
    try {
      await vaccinationsApi.createVaccinationRecord({
        childId,
        vaccineId: addForm.vaccineId,
        doseNumber: parseInt(addForm.doseNumber),
        scheduledDate: addForm.status === 'SCHEDULED' ? addForm.scheduledDate : addForm.administeredDate,
        administeredDate: addForm.status === 'ADMINISTERED' ? addForm.administeredDate : undefined,
        status: addForm.status,
        batchNumber: addForm.batchNumber || undefined,
        manufacturer: addForm.manufacturer || undefined,
        injectionSite: addForm.injectionSite || undefined,
        notes: addForm.notes || undefined,
        weightKg: addForm.weightKg ? parseFloat(addForm.weightKg) : undefined,
        ageDays: addForm.ageDays ? parseInt(addForm.ageDays) : undefined,
      });

      // If next dose date provided, create a scheduled follow-up
      if (addForm.nextScheduledDate && addForm.status === 'ADMINISTERED') {
        await vaccinationsApi.createVaccinationRecord({
          childId,
          vaccineId: addForm.vaccineId,
          doseNumber: parseInt(addForm.doseNumber) + 1,
          scheduledDate: addForm.nextScheduledDate,
          status: 'SCHEDULED',
        });
      }

      setShowAddModal(false);
      setAddForm({
        vaccineId: '', doseNumber: '1', scheduledDate: '',
        administeredDate: new Date().toISOString().split('T')[0],
        nextScheduledDate: '', batchNumber: '', manufacturer: '',
        injectionSite: 'Left Thigh', notes: '', status: 'ADMINISTERED',
        weightKg: '', ageDays: '',
      });
      await fetchData();
    } catch (err: any) {
      setAddError(err.message || 'Failed to add vaccination');
    } finally {
      setAddLoading(false);
    }
  };

  const handleMarkMissed = async (recordId: string) => {
    const reason = prompt('Reason for missed vaccination:');
    if (!reason) return;
    try {
      await vaccinationsApi.markVaccinationMissed(recordId, reason);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to mark as missed');
    }
  };

  const calculateAge = (birthDate: string) => {
    const days = Math.floor((Date.now() - new Date(birthDate).getTime()) / 86400000);
    if (days < 28) return `${days} days`;
    if (days < 365) return `${Math.floor(days / 30)} months`;
    const y = Math.floor(days / 365);
    return `${y}y ${Math.floor((days % 365) / 30)}m`;
  };

  const statusColor = (s: string) => ({
    ADMINISTERED: 'bg-green-100 text-green-800',
    SCHEDULED: 'bg-blue-100 text-blue-800',
    MISSED: 'bg-red-100 text-red-800',
    DEFERRED: 'bg-yellow-100 text-yellow-800',
    CONTRAINDICATED: 'bg-gray-100 text-gray-800',
  }[s] ?? 'bg-gray-100 text-gray-800');

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>
  );

  if (error || !child) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-600 text-lg mb-4">{error || 'Child not found'}</p>
        <button onClick={() => router.back()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Go Back</button>
      </div>
    </div>
  );

  const administered = vaccinationRecords.filter(r => r.status === 'ADMINISTERED').length;
  const scheduled = vaccinationRecords.filter(r => r.status === 'SCHEDULED').length;
  const missed = vaccinationRecords.filter(r => r.status === 'MISSED').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-between items-center py-4 gap-y-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Child Vaccinations</h1>
              <p className="text-sm text-gray-600">
                {child.name} — {calculateAge(child.birthDate)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
                + Add Vaccination
              </button>
              <a href={`/healthcare-dashboard/children/${childId}`}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm">
                Back to Child
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Child info */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{child.name}</h2>
              <p className="text-sm text-gray-600">
                {calculateAge(child.birthDate)} · {child.gender === 'MALE' ? 'Male' : 'Female'}
              </p>
              <p className="text-sm text-gray-600">
                Mother: {child.motherId?.name ?? '—'} · {child.motherId?.phone ?? '—'}
              </p>
            </div>
            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
              child.healthStatus === 'HEALTHY' ? 'bg-green-100 text-green-800' :
              child.healthStatus === 'NEEDS_ATTENTION' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {child.healthStatus?.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-5 border-l-4 border-green-500 text-center">
            <p className="text-2xl font-bold text-gray-900">{administered}</p>
            <p className="text-sm text-gray-500">Administered</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5 border-l-4 border-blue-500 text-center">
            <p className="text-2xl font-bold text-gray-900">{scheduled}</p>
            <p className="text-sm text-gray-500">Scheduled</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5 border-l-4 border-red-500 text-center">
            <p className="text-2xl font-bold text-gray-900">{missed}</p>
            <p className="text-sm text-gray-500">Missed</p>
          </div>
        </div>

        {/* Milestone Blocks Visual Grouping */}
        <div className="space-y-8">
          <h2 className="text-2xl font-bold text-gray-900">Infant Immunization Milestone Blocks</h2>
          {VACCINE_BLOCKS.map(block => {
            // Exclude catch-up records from block display totals — they are supplementary
            const blockRecords = vaccinationRecords.filter(
              r => getRecordBlockNumber(r.vaccineId?.code, r.doseNumber) === block.number && !r.isCatchUp,
            );
            const blockStatus = getBlockStatus(block.number, vaccinationRecords);
            
            // Calculate progress percentage — resolved = administered, contraindicated, or missed
            const completedCount = blockRecords.filter(r => isResolved(r.status)).length;
            const totalCount = blockRecords.length;
            const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
            
            let blockStatusColor = 'bg-gray-100 text-gray-700 border-gray-200';
            let statusText = 'Locked';
            let bgStyle = 'bg-gray-50/50 border-gray-200 opacity-60';
            
            if (blockStatus === 'COMPLETED') {
              blockStatusColor = 'bg-green-100 text-green-800 border-green-200';
              statusText = 'Completed';
              bgStyle = 'bg-white border-green-200 shadow-sm';
            } else if (blockStatus === 'IN_PROGRESS') {
              blockStatusColor = 'bg-blue-100 text-blue-800 border-blue-200';
              statusText = 'In Progress';
              bgStyle = 'bg-white border-blue-200 shadow-sm ring-1 ring-blue-50';
            } else if (blockStatus === 'READY') {
              blockStatusColor = 'bg-yellow-100 text-yellow-800 border-yellow-200';
              statusText = 'Ready to Begin';
              bgStyle = 'bg-white border-yellow-200 shadow-sm ring-1 ring-yellow-50';
            } else {
              bgStyle = 'bg-gray-50 border-dashed border-gray-200 grayscale-[50%]';
            }

            return (
              <div key={block.number} className={`border rounded-2xl p-6 transition-all duration-300 ${bgStyle}`}>
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-xl font-bold text-gray-900">{block.name}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${blockStatusColor}`}>
                        {statusText}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{block.description}</p>
                  </div>
                  
                  {blockRecords.length > 0 && (
                    <div className="text-right flex flex-col items-end">
                      <div className="text-xs text-gray-500 font-medium mb-1">
                        Doses Administered: {completedCount} / {totalCount}
                      </div>
                      <div className="w-32 bg-gray-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${
                            blockStatus === 'COMPLETED' ? 'bg-green-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {blockStatus === 'LOCKED' ? (
                  <div className="bg-red-50/50 border border-red-200/50 rounded-xl p-4 flex items-center space-x-3 text-red-800 text-sm">
                    <span className="text-lg">🛑</span>
                    <span><strong>Clinical Constraint:</strong> You must complete all primary foundational doses in previous milestone blocks before administering vaccinations in this block.</span>
                  </div>
                ) : blockRecords.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No vaccines configured for this block.</p>
                ) : (
                  <div className="overflow-x-auto mt-4 border border-gray-100 rounded-xl">
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead className="bg-gray-50/50">
                        <tr>
                          {['Vaccine', 'Dose', 'Scheduled Date', 'Administered Date', 'Encounter Metrics', 'Status', 'Actions'].map(h => (
                            <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {blockRecords.map(record => (
                          <tr key={record._id} className="hover:bg-gray-50/60 transition-colors">
                            <td className="px-5 py-4 whitespace-nowrap">
                              <p className="text-sm font-bold text-gray-900">{record.vaccineId?.name ?? '—'}</p>
                              <p className="text-xs text-blue-600 font-mono mt-0.5">{record.vaccineId?.code ?? ''}</p>
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-700">
                              Dose {record.doseNumber}
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-600">
                              {record.scheduledDate ? new Date(record.scheduledDate).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-700">
                              {record.administeredDate ? new Date(record.administeredDate).toLocaleDateString() : '—'}
                              {record.batchNumber && <p className="text-xs text-gray-400 mt-0.5">Batch: {record.batchNumber}</p>}
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-600">
                              {record.status === 'ADMINISTERED' ? (
                                <div className="space-y-0.5 text-xs">
                                  {record.weightKg ? <p>Weight: <span className="font-semibold text-gray-900">{record.weightKg} kg</span></p> : null}
                                  {record.ageDays ? <p>Age: <span className="font-semibold text-gray-900">{record.ageDays} days</span></p> : null}
                                  {!record.weightKg && !record.ageDays && <span className="text-gray-400">—</span>}
                                </div>
                              ) : '—'}
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap">
                              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${statusColor(record.status)}`}>
                                {record.status}
                              </span>
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap text-sm font-semibold">
                              <div className="flex gap-2">
                                {record.status === 'SCHEDULED' && (
                                  <>
                                    <button onClick={() => openAdministerModal(record)}
                                      className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors shadow-sm">
                                      Administer
                                    </button>
                                    <button onClick={() => handleMarkMissed(record._id)}
                                      className="px-3 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-colors shadow-sm">
                                      Missed
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* ── Administer Modal ── */}
      {showAdministerModal && selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Record Vaccination</h3>
            <p className="text-sm text-gray-500 mb-4">
              {selectedRecord.vaccineId?.name} — Dose {selectedRecord.doseNumber}
            </p>
            {administerError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">❌ {administerError}</div>
            )}
            <form onSubmit={handleAdminister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Administered *</label>
                <input type="date" required value={administerForm.administeredDate}
                  onChange={e => setAdministerForm(p => ({ ...p, administeredDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Next Dose Date <span className="text-gray-400 font-normal">(optional — leave blank if no next dose)</span>
                </label>
                <input type="date" value={administerForm.nextScheduledDate} min={tomorrowStr}
                  onChange={e => setAdministerForm(p => ({ ...p, nextScheduledDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                <p className="text-xs text-gray-400 mt-1">If set, a new scheduled record will be created for the next dose.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number</label>
                  <input type="text" value={administerForm.batchNumber}
                    onChange={e => setAdministerForm(p => ({ ...p, batchNumber: e.target.value }))}
                    placeholder="Optional"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Injection Site</label>
                  <select value={administerForm.injectionSite}
                    onChange={e => setAdministerForm(p => ({ ...p, injectionSite: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                    <option>Left Thigh</option>
                    <option>Right Thigh</option>
                    <option>Left Arm</option>
                    <option>Right Arm</option>
                    <option>Oral</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight at Encounter (kg)</label>
                  <input type="number" step="0.01" min="0.1" max="30" value={administerForm.weightKg}
                    onChange={e => setAdministerForm(p => ({ ...p, weightKg: e.target.value }))}
                    placeholder="e.g. 4.5"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age at Encounter (days)</label>
                  <input type="number" min="0" max="2000" value={administerForm.ageDays}
                    onChange={e => setAdministerForm(p => ({ ...p, ageDays: e.target.value }))}
                    placeholder="e.g. 45"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea rows={2} value={administerForm.notes}
                  onChange={e => setAdministerForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={administerLoading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-60">
                  {administerLoading ? 'Saving…' : '✓ Save Record'}
                </button>
                <button type="button" onClick={() => setShowAdministerModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Vaccination Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Vaccination Record</h3>
            {addError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">❌ {addError}</div>
            )}
            <form onSubmit={handleAddVaccination} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vaccine *</label>
                  <select required value={addForm.vaccineId}
                    onChange={e => handleVaccineChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                    <option value="">Select vaccine…</option>
                    {VACCINE_BLOCKS.map(block => {
                      const blockVaccines = allVaccines.filter(v => block.vaccines.includes((v.code || '').toUpperCase()));
                      if (blockVaccines.length === 0) return null;
                      return (
                        <optgroup key={block.number} label={block.name}>
                          {blockVaccines.map(v => (
                            <option key={`${block.number}-${v._id}`} value={v._id}>{v.name} ({v.code})</option>
                          ))}
                        </optgroup>
                      );
                    })}
                    {(() => {
                      const allBlockCodes = new Set(VACCINE_BLOCKS.flatMap(b => b.vaccines));
                      const otherVaccines = allVaccines.filter(v => !allBlockCodes.has((v.code || '').toUpperCase()));
                      if (otherVaccines.length === 0) return null;
                      return (
                        <optgroup label="Other Vaccines">
                          {otherVaccines.map(v => (
                            <option key={`other-${v._id}`} value={v._id}>{v.name} ({v.code})</option>
                          ))}
                        </optgroup>
                      );
                    })()}
                  </select>
                  {addForm.vaccineId && (() => {
                    const vaccine = allVaccines.find(v => v._id === addForm.vaccineId);
                    return vaccine ? (
                      <p className="text-xs text-gray-500 mt-1">
                        💉 {vaccine.dosesRequired} doses required, {vaccine.intervalWeeks || 4} weeks apart
                      </p>
                    ) : null;
                  })()}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dose Number *</label>
                  <input type="number" required min="1" max="10" value={addForm.doseNumber}
                    onChange={e => handleDoseNumberChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                  <select value={addForm.status}
                    onChange={e => setAddForm(p => ({ ...p, status: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                    <option value="ADMINISTERED">Administered (given today)</option>
                    <option value="SCHEDULED">Scheduled (future date)</option>
                  </select>
                </div>
                {addForm.status === 'ADMINISTERED' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date Administered *</label>
                    <input type="date" required value={addForm.administeredDate}
                      onChange={e => handleAdministeredDateChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date *</label>
                    <input type="date" required value={addForm.scheduledDate} min={tomorrowStr}
                      onChange={e => setAddForm(p => ({ ...p, scheduledDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                  </div>
                )}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Next Vaccination Date <span className="text-gray-400 font-normal">
                      {addForm.status === 'ADMINISTERED' ? '(recommended for next dose)' : '(if this is part of a series)'}
                    </span>
                  </label>
                  <input type="date" value={addForm.nextScheduledDate} min={tomorrowStr}
                    onChange={e => setAddForm(p => ({ ...p, nextScheduledDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                  {addForm.status === 'ADMINISTERED' && (
                    <p className="text-xs text-gray-500 mt-1">
                      💡 Recommended: Calculate based on vaccine schedule (usually 4-8 weeks apart)
                    </p>
                  )}
                  {addForm.status === 'SCHEDULED' && (
                    <p className="text-xs text-gray-500 mt-1">
                      💡 Optional: Only if this vaccination has follow-up doses
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number</label>
                  <input type="text" value={addForm.batchNumber}
                    onChange={e => setAddForm(p => ({ ...p, batchNumber: e.target.value }))}
                    placeholder="Optional"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Injection Site</label>
                  <select value={addForm.injectionSite}
                    onChange={e => setAddForm(p => ({ ...p, injectionSite: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                    <option>Left Thigh</option>
                    <option>Right Thigh</option>
                    <option>Left Arm</option>
                    <option>Right Arm</option>
                    <option>Oral</option>
                  </select>
                </div>
                {addForm.status === 'ADMINISTERED' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Patient Weight (kg)</label>
                      <input type="number" step="0.01" min="0.1" max="30" value={addForm.weightKg}
                        onChange={e => setAddForm(p => ({ ...p, weightKg: e.target.value }))}
                        placeholder="e.g. 4.5"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Age at Encounter (days)</label>
                      <input type="number" min="0" max="2000" value={addForm.ageDays}
                        onChange={e => setAddForm(p => ({ ...p, ageDays: e.target.value }))}
                        placeholder="e.g. 45"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </>
                )}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea rows={2} value={addForm.notes}
                    onChange={e => setAddForm(p => ({ ...p, notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={addLoading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-60">
                  {addLoading ? 'Saving…' : 'Save Vaccination'}
                </button>
                <button type="button" onClick={() => { setShowAddModal(false); setAddError(null); }}
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
