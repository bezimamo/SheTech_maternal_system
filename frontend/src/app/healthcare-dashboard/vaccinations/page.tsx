'use client';

import { useState, useEffect } from 'react';
import { vaccinationsApi, childrenApi, mothersApi } from '@/lib/healthcare-api';

interface VaccinationRecord {
  _id: string;
  childId: {
    _id: string;
    name: string;
    birthDate: string;
    motherId: {
      name: string;
      phone: string;
    };
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
  administeredBy?: {
    name: string;
    role: string;
  };
  batchNumber?: string;
  manufacturer?: string;
  adverseEvents?: string[];
  notes?: string;
  followUpRequired: boolean;
  followUpDate?: string;
  reminder3DaySent?: boolean;
  reminderSameDaySent?: boolean;
  reminderSent?: boolean;
}

export default function VaccinationsManagement() {
  const [vaccinationRecords, setVaccinationRecords] = useState<VaccinationRecord[]>([]);
  const [upcomingVaccinations, setUpcomingVaccinations] = useState<VaccinationRecord[]>([]);
  const [overdueVaccinations, setOverdueVaccinations] = useState<VaccinationRecord[]>([]);
  const [vaccines, setVaccines] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [mothers, setMothers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'overdue' | 'scheduled'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Schedule generation modal (kept for state compatibility — modal UI removed)
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedMotherId, setSelectedMotherId] = useState('');
  const [selectedChildId, setSelectedChildId] = useState('');
  const [childrenForMother, setChildrenForMother] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateSuccess, setGenerateSuccess] = useState(false);

  useEffect(() => {
    fetchVaccinationData();
  }, []);

  const fetchVaccinationData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        scheduledRecords,
        upcomingRecords,
        overdueRecords,
        allVaccines,
        allChildren,
        allMothers,
      ] = await Promise.all([
        vaccinationsApi.getVaccinationRecordsByStatus('SCHEDULED'),
        vaccinationsApi.getUpcomingVaccinations(7),
        vaccinationsApi.getOverdueVaccinations(),
        vaccinationsApi.getAllVaccines(),
        childrenApi.getAll(),
        mothersApi.getAll().catch(() => []),
      ]);

      // Get all records (scheduled + administered)
      const administeredRecords = await vaccinationsApi.getVaccinationRecordsByStatus('ADMINISTERED');
      const allRecords = [...scheduledRecords, ...administeredRecords];

      setVaccinationRecords(allRecords);
      setUpcomingVaccinations(upcomingRecords);
      setOverdueVaccinations(overdueRecords);
      setVaccines(allVaccines);
      setChildren(allChildren);
      setMothers(Array.isArray(allMothers) ? allMothers : []);
    } catch (err: any) {
      console.error('Error fetching vaccination data:', err);
      setError(err.message || 'Failed to load vaccination data');
    } finally {
      setLoading(false);
    }
  };

  // When mother is selected, filter children for that mother
  const handleMotherSelect = (motherId: string) => {
    setSelectedMotherId(motherId);
    setSelectedChildId('');
    setGenerateError(null);
    setGenerateSuccess(false);
    const filtered = children.filter((c: any) => {
      const cMotherId = c.motherId?._id?.toString() ?? c.motherId?.toString() ?? '';
      return cMotherId === motherId;
    });
    setChildrenForMother(filtered);
  };

  const handleGenerateSchedule = async () => {
    if (!selectedChildId) {
      setGenerateError('Please select a child first.');
      return;
    }
    setGenerating(true);
    setGenerateError(null);
    setGenerateSuccess(false);
    try {
      await vaccinationsApi.generateVaccinationSchedule(selectedChildId);
      setGenerateSuccess(true);
      setTimeout(() => {
        setShowScheduleModal(false);
        setSelectedMotherId('');
        setSelectedChildId('');
        setChildrenForMother([]);
        setGenerateSuccess(false);
        fetchVaccinationData();
      }, 1500);
    } catch (err: any) {
      setGenerateError(err.message || 'Failed to generate schedule');
    } finally {
      setGenerating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ADMINISTERED':
        return 'bg-green-100 text-green-800';
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-800';
      case 'MISSED':
        return 'bg-red-100 text-red-800';
      case 'DEFERRED':
        return 'bg-yellow-100 text-yellow-800';
      case 'CONTRAINDICATED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ADMINISTERED':
        return 'Administered';
      case 'SCHEDULED':
        return 'Scheduled';
      case 'MISSED':
        return 'Missed';
      case 'DEFERRED':
        return 'Deferred';
      case 'CONTRAINDICATED':
        return 'Contraindicated';
      default:
        return status;
    }
  };

  const getRecordsToShow = () => {
    switch (activeTab) {
      case 'upcoming':
        return upcomingVaccinations;
      case 'overdue':
        return overdueVaccinations;
      case 'scheduled':
        return vaccinationRecords.filter(r => r.status === 'SCHEDULED');
      default:
        return vaccinationRecords;
    }
  };

  const handleMarkAdministered = async (recordId: string) => {
    try {
      const record = vaccinationRecords.find(r => r._id === recordId);
      if (!record) return;

      const administrationData = {
        administeredDate: new Date(),
        administeredBy: {
          name: 'Current User', // This should come from auth context
          role: 'HEALTH_WORKER'
        },
        batchNumber: prompt('Enter batch number (optional):') || undefined,
        manufacturer: prompt('Enter manufacturer (optional):') || undefined,
      };
      
      // Mark current vaccination as administered
      await vaccinationsApi.markVaccinationAdministered(recordId, administrationData);
      
      // Check if next dose should be scheduled
      const vaccine = vaccines.find(v => v._id === record.vaccineId._id);
      if (vaccine && record.doseNumber < vaccine.dosesRequired) {
        // Calculate next vaccination date
        const administeredDate = new Date();
        const intervalWeeks = vaccine.intervalWeeks || 4; // Default 4 weeks
        const nextScheduledDate = new Date(administeredDate);
        nextScheduledDate.setDate(nextScheduledDate.getDate() + (intervalWeeks * 7));
        
        // Create next vaccination record
        const nextRecordData = {
          childId: record.childId._id,
          vaccineId: record.vaccineId._id,
          doseNumber: record.doseNumber + 1,
          scheduledDate: nextScheduledDate.toISOString(),
          status: 'SCHEDULED',
          createdBy: 'current-user-id', // This should come from auth context
          createdAtHospital: 'current-hospital-id', // This should come from auth context
        };
        
        try {
          await vaccinationsApi.createVaccinationRecord(nextRecordData);
          console.log('Next vaccination scheduled successfully:', {
            vaccine: vaccine.name,
            dose: record.doseNumber + 1,
            date: nextScheduledDate.toLocaleDateString()
          });
        } catch (scheduleError) {
          console.error('Error scheduling next vaccination:', scheduleError);
          // Don't fail the whole operation if next dose scheduling fails
        }
      }
      
      fetchVaccinationData(); // Refresh data
    } catch (err: any) {
      console.error('Error marking as administered:', err);
      setError('Failed to mark vaccination as administered');
    }
  };

  const handleMarkMissed = async (recordId: string) => {
    const reason = prompt('Please provide reason for missed vaccination:');
    if (reason?.trim()) {
      try {
        await vaccinationsApi.markVaccinationMissed(recordId, reason.trim());
        setError(null);
        alert(
          'Missed dose recorded on the vaccination card. A catch-up appointment was scheduled. You can continue with the next round of vaccines.',
        );
        fetchVaccinationData();
      } catch (err: any) {
        console.error('Error marking as missed:', err);
        setError(err.message || 'Failed to mark vaccination as missed');
      }
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

  // Calculate next vaccination date based on current dose and vaccine schedule
  const calculateNextVaccinationDate = (record: VaccinationRecord, vaccine: any) => {
    if (!vaccine || record.status !== 'ADMINISTERED') {
      return null;
    }

    // If this was the last required dose, no next vaccination
    if (record.doseNumber >= vaccine.dosesRequired) {
      return null;
    }

    // Calculate next dose date based on interval
    if (!record.administeredDate) return null;
    const administeredDate = new Date(record.administeredDate);
    const intervalWeeks = vaccine.intervalWeeks || 4; // Default 4 weeks
    const nextDate = new Date(administeredDate);
    nextDate.setDate(nextDate.getDate() + (intervalWeeks * 7));

    return nextDate;
  };

  // Get reminder dates for a vaccination
  const getReminderDates = (scheduledDate: string) => {
    const vaccinationDate = new Date(scheduledDate);
    const reminder3Day = new Date(vaccinationDate);
    reminder3Day.setDate(reminder3Day.getDate() - 3);
    
    const reminder2Day = new Date(vaccinationDate);
    reminder2Day.setDate(reminder2Day.getDate() - 2);
    
    const reminder1Day = new Date(vaccinationDate);
    reminder1Day.setDate(reminder1Day.getDate() - 1);

    return {
      vaccinationDate,
      reminder3Day,
      reminder2Day,
      reminder1Day
    };
  };

  // Check if reminders should be sent today
  const getPendingReminders = (record: VaccinationRecord) => {
    if (record.status !== 'SCHEDULED') return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for comparison
    
    const reminders = getReminderDates(record.scheduledDate);
    const pendingReminders = [];

    // Check 3-day reminder
    if (!record.reminder3DaySent && reminders.reminder3Day <= today) {
      pendingReminders.push({
        type: '3-day',
        date: reminders.reminder3Day,
        message: `Reminder: Your child's vaccination is in 3 days (${reminders.vaccinationDate.toLocaleDateString()})`
      });
    }

    // Check 2-day reminder
    if (!record.reminderSameDaySent && reminders.reminder2Day <= today) {
      pendingReminders.push({
        type: '2-day',
        date: reminders.reminder2Day,
        message: `Reminder: Your child's vaccination is in 2 days (${reminders.vaccinationDate.toLocaleDateString()})`
      });
    }

    // Check 1-day reminder
    if (!record.reminderSent && reminders.reminder1Day <= today) {
      pendingReminders.push({
        type: '1-day',
        date: reminders.reminder1Day,
        message: `Reminder: Your child's vaccination is tomorrow (${reminders.vaccinationDate.toLocaleDateString()})`
      });
    }

    return pendingReminders;
  };

  // Send reminder to mother (simulate SMS/phone call)
  const sendReminderToMother = async (record: VaccinationRecord, reminderType: string) => {
    try {
      const motherPhone = record.childId?.motherId?.phone;
      const motherName = record.childId?.motherId?.name;
      const childName = record.childId?.name;
      const vaccineName = record.vaccineId?.name;
      const vaccinationDate = new Date(record.scheduledDate).toLocaleDateString();

      if (!motherPhone) {
        console.error('Mother phone number not available');
        return;
      }

      // Create reminder message
      const message = `Dear ${motherName}, this is a reminder that ${childName}'s ${vaccineName} vaccination is scheduled for ${vaccinationDate}. Please ensure to attend the health center on time.`;

      // In a real implementation, this would integrate with SMS gateway or phone system
      console.log('REMINDER SENT:', {
        to: motherPhone,
        message: message,
        type: reminderType,
        vaccinationDate: vaccinationDate
      });

      // Update the record to mark reminder as sent
      const updateData = {
        reminderSent: reminderType === '1-day',
        reminder3DaySent: reminderType === '3-day',
        reminderSameDaySent: reminderType === '2-day',
        reminderSentDate: new Date()
      };

      await vaccinationsApi.updateVaccinationRecord(record._id, updateData);
      
      // Refresh data
      fetchVaccinationData();
    } catch (error) {
      console.error('Error sending reminder:', error);
    }
  };

  // Get next vaccination for a child
  const getNextVaccinationForChild = (childId: string) => {
    const childRecords = vaccinationRecords.filter(record => 
      record.childId._id === childId && 
      record.status === 'SCHEDULED'
    );
    
    if (childRecords.length === 0) return null;
    
    // Sort by scheduled date to get the earliest upcoming vaccination
    childRecords.sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
    
    return childRecords[0];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading vaccination data...</p>
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
            onClick={fetchVaccinationData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const recordsToShow = getRecordsToShow();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Vaccination Management</h1>
              <p className="text-sm text-gray-600">Manage immunization schedules and records</p>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="/healthcare-dashboard/children"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                + Record Vaccination
              </a>
              <a
                href="/healthcare-dashboard"
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
              >
                Back to Dashboard
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Scheduled</p>
                <p className="text-2xl font-bold text-gray-900">
                  {vaccinationRecords.filter(r => r.status === 'SCHEDULED').length}
                </p>
              </div>
              <div className="text-3xl text-blue-600">calendar</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Administered</p>
                <p className="text-2xl font-bold text-gray-900">
                  {vaccinationRecords.filter(r => r.status === 'ADMINISTERED').length}
                </p>
              </div>
              <div className="text-3xl text-green-600">checkmark</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Upcoming (7 days)</p>
                <p className="text-2xl font-bold text-gray-900">{upcomingVaccinations.length}</p>
              </div>
              <div className="text-3xl text-yellow-600">clock</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-gray-900">{overdueVaccinations.length}</p>
              </div>
              <div className="text-3xl text-red-600">warning</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('all')}
                className={`py-2 px-4 border-b-2 font-medium text-sm ${
                  activeTab === 'all'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                All Records
              </button>
              <button
                onClick={() => setActiveTab('scheduled')}
                className={`py-2 px-4 border-b-2 font-medium text-sm ${
                  activeTab === 'scheduled'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Scheduled
              </button>
              <button
                onClick={() => setActiveTab('upcoming')}
                className={`py-2 px-4 border-b-2 font-medium text-sm ${
                  activeTab === 'upcoming'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => setActiveTab('overdue')}
                className={`py-2 px-4 border-b-2 font-medium text-sm ${
                  activeTab === 'overdue'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overdue
              </button>
            </nav>
          </div>

          {/* Records List */}
          <div className="p-6">
            {recordsToShow.length === 0 ? (
              <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">vaccine</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No vaccination records found</h3>
                  <p className="text-gray-600 mb-6">
                    {activeTab === 'upcoming' 
                      ? 'No upcoming vaccinations in the next 7 days' 
                      : activeTab === 'overdue'
                      ? 'No overdue vaccinations'
                      : activeTab === 'scheduled'
                      ? 'No scheduled vaccinations'
                      : 'No vaccination records found'
                    }
                  </p>
                  <a
                    href="/healthcare-dashboard/children"
                    className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Go to Children to Record Vaccination
                  </a>
                </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Child
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vaccine
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dose
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Scheduled
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Administered
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Next Vaccination
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recordsToShow.map((record) => (
                      <tr key={record._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{record.childId?.name ?? '—'}</div>
                            <div className="text-xs text-gray-500">
                              {record.childId?.birthDate ? calculateAge(record.childId.birthDate) : '—'} | {record.childId?.motherId?.name ?? '—'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm text-gray-900">{record.vaccineId.name}</div>
                            <div className="text-xs text-gray-500">{record.vaccineId.code}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          Dose {record.doseNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(record.scheduledDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.administeredDate 
                            ? new Date(record.administeredDate).toLocaleDateString()
                            : '-'
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(record.status)}`}>
                            {getStatusText(record.status)}
                          </span>
                          {(record as any).isCatchUp && (
                            <span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                              Catch-up
                            </span>
                          )}
                          {record.followUpRequired && (
                            <span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                              Follow-up
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            {(() => {
                              const vaccine = vaccines.find(v => v._id === record.vaccineId._id);
                              const nextDate = calculateNextVaccinationDate(record, vaccine);
                              
                              if (nextDate) {
                                return (
                                  <div>
                                    <div className="font-medium text-gray-900">
                                      {nextDate.toLocaleDateString()}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      Dose {record.doseNumber + 1}
                                    </div>
                                  </div>
                                );
                              } else if (record.status === 'ADMINISTERED') {
                                return (
                                  <div className="text-gray-500">
                                    <div>Complete</div>
                                    <div className="text-xs">All doses given</div>
                                  </div>
                                );
                              } else {
                                return (
                                  <div className="text-gray-500">
                                    <div>-</div>
                                    <div className="text-xs">Pending</div>
                                  </div>
                                );
                              }
                            })()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex flex-col space-y-1">
                            <div className="flex space-x-2">
                              {record.status === 'SCHEDULED' && (
                                <>
                                  <button
                                    onClick={() => handleMarkAdministered(record._id)}
                                    className="text-green-600 hover:text-green-900"
                                  >
                                    Administer
                                  </button>
                                  <button
                                    onClick={() => handleMarkMissed(record._id)}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    Miss
                                  </button>
                                </>
                              )}
                            </div>
                            
                            {/* Reminder Actions */}
                            {record.status === 'SCHEDULED' && (
                              <div className="flex space-x-1">
                                {(() => {
                                  const pendingReminders = getPendingReminders(record);
                                  return pendingReminders.map((reminder, index) => (
                                    <button
                                      key={index}
                                      onClick={() => sendReminderToMother(record, reminder.type)}
                                      className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 transition-colors"
                                      title={`Send ${reminder.type} reminder to mother`}
                                    >
                                      {reminder.type}
                                    </button>
                                  ));
                                })()}
                                {getPendingReminders(record).length === 0 && (
                                  <span className="text-xs text-gray-500">Reminders sent</span>
                                )}
                              </div>
                            )}
                            
                            <div className="flex space-x-2">
                              <a
                                href={`/healthcare-dashboard/children/${record.childId._id}`}
                                className="text-blue-600 hover:text-blue-900 text-xs"
                              >
                                View Child
                              </a>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

    </div>
  );
}
