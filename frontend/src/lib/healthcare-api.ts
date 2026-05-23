import { API_BASE, handleResponse } from './api';

function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };

  try {
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('token') ||
        localStorage.getItem('auth_token') ||
        sessionStorage.getItem('token')
      : null;
    if (token) headers['Authorization'] = `Bearer ${token}`;
  } catch { /* SSR or private browsing */ }

  return headers;
}

function getFetchOptions(method: string = 'GET', body?: any, extraHeaders: Record<string, string> = {}): RequestInit {
  const options: RequestInit = {
    method,
    headers: getAuthHeaders(extraHeaders),
    credentials: 'include', // Include cookies for authentication
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  return options;
}

// Mother Management APIs
export const mothersApi = {
  // Create mother
  create: (motherData: any) =>
    fetch(`${API_BASE}/mothers`, getFetchOptions('POST', motherData)).then(handleResponse),

  // Get all mothers
  getAll: () =>
    fetch(`${API_BASE}/mothers`, getFetchOptions()).then(handleResponse),

  // Get mother by ID
  getById: (id: string) =>
    fetch(`${API_BASE}/mothers/${id}`, getFetchOptions()).then(handleResponse),

  // Update mother
  update: (id: string, motherData: any) =>
    fetch(`${API_BASE}/mothers/${id}`, getFetchOptions('PATCH', motherData)).then(handleResponse),

  // Delete mother
  delete: (id: string) =>
    fetch(`${API_BASE}/mothers/${id}`, getFetchOptions('DELETE')).then(handleResponse),

  // Search mothers
  search: (query: string) =>
    fetch(`${API_BASE}/mothers/search?q=${encodeURIComponent(query)}`, getFetchOptions()).then(handleResponse),

  // Get mothers by health worker
  getByHealthWorker: (healthWorkerId: string) =>
    fetch(`${API_BASE}/mothers/health-worker/${healthWorkerId}`, getFetchOptions()).then(handleResponse),
};

// Pregnancy Tracking APIs
export const pregnancyApi = {
  // Create pregnancy visit
  create: (pregnancyData: any) =>
    fetch(`${API_BASE}/pregnancy`, getFetchOptions('POST', pregnancyData)).then(handleResponse),

  // Get all pregnancy records
  getAll: () =>
    fetch(`${API_BASE}/pregnancy`, getFetchOptions()).then(handleResponse),

  // Get pregnancy records by mother
  getByMotherId: (motherId: string) =>
    fetch(`${API_BASE}/pregnancy/mother/${motherId}`, getFetchOptions()).then(handleResponse),

  // Get pregnancy by ID
  getById: (id: string) =>
    fetch(`${API_BASE}/pregnancy/${id}`, getFetchOptions()).then(handleResponse),

  // Update pregnancy record
  update: (id: string, pregnancyData: any) =>
    fetch(`${API_BASE}/pregnancy/${id}`, getFetchOptions('PATCH', pregnancyData)).then(handleResponse),

  // Mark visit as completed
  completeVisit: (id: string) =>
    fetch(`${API_BASE}/pregnancy/${id}/complete`, getFetchOptions('PATCH')).then(handleResponse),

  // Reschedule a visit (manual override — requires overrideReason)
  rescheduleVisit: (id: string, newDate: string, overrideReason: string) =>
    fetch(`${API_BASE}/pregnancy/${id}/reschedule`, getFetchOptions('PATCH', { newDate, overrideReason })).then(handleResponse),

  // Create a manual visit (ANC, PNC, Emergency, Custom)
  createManualVisit: (data: {
    motherId: string;
    visitDate: string;
    visitType: 'ANC' | 'PNC' | 'EMERGENCY' | 'CUSTOM';
    notes?: string;
    overrideReason: string;
    retrospectiveEntry?: boolean;
    gestationalAge?: number;
    week?: number;
    riskLevel?: 'LOW' | 'MODERATE' | 'HIGH';
  }) =>
    fetch(`${API_BASE}/pregnancy/manual`, getFetchOptions('POST', data)).then(handleResponse),

  // Full schedule: visits + vaccines + next visit + overdue + warnings
  getFullSchedule: (motherId: string) =>
    fetch(`${API_BASE}/pregnancy/full-schedule/${motherId}`, getFetchOptions()).then(handleResponse),

  // WHO ANC 8-visit grid with status
  getAncSchedule: (motherId: string) =>
    fetch(`${API_BASE}/pregnancy/anc-schedule/${motherId}`, getFetchOptions()).then(handleResponse),

  // Delete pregnancy record
  delete: (id: string) =>
    fetch(`${API_BASE}/pregnancy/${id}`, getFetchOptions('DELETE')).then(handleResponse),

  // Get pregnancy statistics
  getStats: () =>
    fetch(`${API_BASE}/pregnancy/stats`, getFetchOptions()).then(handleResponse),

  // Get high risk pregnancies
  getHighRisk: () =>
    fetch(`${API_BASE}/pregnancy/high-risk`, {
      headers: getAuthHeaders(),
    }).then(handleResponse),

  // Get upcoming visits
  getUpcomingVisits: () =>
    fetch(`${API_BASE}/pregnancy/upcoming-visits`, {
      headers: getAuthHeaders(),
    }).then(handleResponse),
};

// Child Monitoring APIs
export const childrenApi = {
  // Create child
  create: (childData: any) =>
    fetch(`${API_BASE}/children`, getFetchOptions('POST', childData)).then(handleResponse),

  // Get all children
  getAll: () =>
    fetch(`${API_BASE}/children`, getFetchOptions()).then(handleResponse),

  // Get child by ID
  getById: (id: string) =>
    fetch(`${API_BASE}/children/${id}`, getFetchOptions()).then(handleResponse),

  // Update child
  update: (id: string, childData: any) =>
    fetch(`${API_BASE}/children/${id}`, getFetchOptions('PATCH', childData)).then(handleResponse),

  // Delete child
  delete: (id: string) =>
    fetch(`${API_BASE}/children/${id}`, getFetchOptions('DELETE')).then(handleResponse),

  // Verify child registration (woreda admin only)
  verify: (id: string) =>
    fetch(`${API_BASE}/children/${id}/verify`, getFetchOptions('PATCH')).then(handleResponse),

  // Send child birth data to woreda admin (health worker)
  notifyWoreda: (id: string) =>
    fetch(`${API_BASE}/children/${id}/notify-woreda`, getFetchOptions('PATCH')).then(handleResponse),

  // Issue birth certificate (woreda admin)
  issueBirthCertificate: (id: string, data: { fatherName?: string; fatherPhone?: string; birthLocation?: string }) =>
    fetch(`${API_BASE}/children/${id}/issue-certificate`, getFetchOptions('PATCH', data)).then(handleResponse),

  // Get children by woreda
  getByWoreda: (woredaId: string) =>
    fetch(`${API_BASE}/children/woreda/${woredaId}`, getFetchOptions()).then(handleResponse),

  // Search children
  search: (query: string) =>
    fetch(`${API_BASE}/children/search?q=${encodeURIComponent(query)}`, getFetchOptions()).then(handleResponse),

  // Get children by mother
  getByMotherId: (motherId: string) =>
    fetch(`${API_BASE}/children/mother/${motherId}`, getFetchOptions()).then(handleResponse),

  // Get children statistics
  getStats: () =>
    fetch(`${API_BASE}/children/stats`, getFetchOptions()).then(handleResponse),

  // Get children needing follow-up
  getFollowUpNeeded: () =>
    fetch(`${API_BASE}/children/follow-up-needed`, getFetchOptions()).then(handleResponse),

  // Growth Records
  createGrowthRecord: (childId: string, growthData: any) =>
    fetch(`${API_BASE}/children/${childId}/growth-records`, getFetchOptions('POST', growthData)).then(handleResponse),

  getGrowthRecords: (childId: string) =>
    fetch(`${API_BASE}/children/${childId}/growth-records`, getFetchOptions()).then(handleResponse),

  getLatestGrowthRecord: (childId: string) =>
    fetch(`${API_BASE}/children/${childId}/growth-records/latest`, getFetchOptions()).then(handleResponse),

  updateGrowthRecord: (id: string, growthData: any) =>
    fetch(`${API_BASE}/children/growth-records/${id}`, getFetchOptions('PATCH', growthData)).then(handleResponse),

  deleteGrowthRecord: (id: string) =>
    fetch(`${API_BASE}/children/growth-records/${id}`, getFetchOptions('DELETE')).then(handleResponse),
};

// Mother TD Vaccination APIs (dedicated mother vaccination records)
export const motherVaccinationsApi = {
  getSchedule: (motherId: string) =>
    fetch(`${API_BASE}/mothers/vaccinations/schedule/${motherId}`, getFetchOptions()).then(handleResponse),

  getHistory: (motherId: string) =>
    fetch(`${API_BASE}/mothers/vaccinations/history/${motherId}`, getFetchOptions()).then(handleResponse),

  recordDose: (data: {
    motherId: string;
    doseNumber: number;
    administeredDate: string;
    batchNumber?: string;
    notes?: string;
    hospitalId?: string;
  }) =>
    fetch(`${API_BASE}/mothers/vaccinations/record`, getFetchOptions('POST', data)).then(handleResponse),

  getTdReference: () =>
    fetch(`${API_BASE}/mothers/vaccinations/schedule/td-doses`, getFetchOptions()).then(handleResponse),

  triggerReminders: () =>
    fetch(`${API_BASE}/mothers/vaccinations/reminders/trigger`, getFetchOptions('POST')).then(handleResponse),
};

// Vaccination APIs
export const vaccinationsApi = {
  // Vaccines
  getAllVaccines: () =>
    fetch(`${API_BASE}/vaccinations/vaccines`, getFetchOptions()).then(handleResponse),

  getVaccineById: (id: string) =>
    fetch(`${API_BASE}/vaccinations/vaccines/${id}`, getFetchOptions()).then(handleResponse),

  // Vaccination Records
  createVaccinationRecord: (recordData: any) =>
    fetch(`${API_BASE}/vaccinations/records`, getFetchOptions('POST', recordData)).then(handleResponse),

  getVaccinationRecordsByChild: (childId: string) =>
    fetch(`${API_BASE}/vaccinations/records/child/${childId}`, getFetchOptions()).then(handleResponse),

  getVaccinationRecordsByStatus: (status: string) =>
    fetch(`${API_BASE}/vaccinations/records/status/${status}`, getFetchOptions()).then(handleResponse),

  getUpcomingVaccinations: (days: number = 30) =>
    fetch(`${API_BASE}/vaccinations/records/upcoming?days=${days}`, getFetchOptions()).then(handleResponse),

  getOverdueVaccinations: () =>
    fetch(`${API_BASE}/vaccinations/records/overdue`, getFetchOptions()).then(handleResponse),

  // Schedule Management
  generateVaccinationSchedule: (childId: string) =>
    fetch(`${API_BASE}/vaccinations/schedule/${childId}`, getFetchOptions('POST')).then(handleResponse),

  // Action endpoints
  markVaccinationAdministered: (id: string, administrationData: any) =>
    fetch(`${API_BASE}/vaccinations/records/${id}/administer`, getFetchOptions('PATCH', administrationData)).then(handleResponse),

  markVaccinationMissed: (id: string, missReason: string) =>
    fetch(`${API_BASE}/vaccinations/records/${id}/miss`, getFetchOptions('PATCH', { missReason })).then(handleResponse),

  deferVaccination: (id: string, deferReason: string, newScheduledDate: string) =>
    fetch(`${API_BASE}/vaccinations/records/${id}/defer`, getFetchOptions('PATCH', { deferReason, newScheduledDate })).then(handleResponse),

  updateVaccinationRecord: (id: string, updateData: any) =>
    fetch(`${API_BASE}/vaccinations/records/${id}`, getFetchOptions('PATCH', updateData)).then(handleResponse),

  // Statistics
  getVaccinationStats: () =>
    fetch(`${API_BASE}/vaccinations/stats`, getFetchOptions()).then(handleResponse),
};

// Hospitals API
export const hospitalsApi = {
  // Get all hospitals
  getAll: () =>
    fetch(`${API_BASE}/hospitals`, getFetchOptions()).then(handleResponse),
};

// Referrals API
export const referralsApi = {
  // Create referral
  create: (data: any) =>
    fetch(`${API_BASE}/referrals`, getFetchOptions('POST', data)).then(handleResponse),

  // Update referral draft
  update: (id: string, data: any) =>
    fetch(`${API_BASE}/referrals/${id}`, getFetchOptions('PATCH', data)).then(handleResponse),

  // Send referral (liaison)
  send: (id: string, targetHospitalId: string, liaisonNote?: string) =>
    fetch(`${API_BASE}/referrals/${id}/send`, getFetchOptions('PATCH', { targetHospitalId, liaisonNote })).then(handleResponse),

  // Respond to referral
  respond: (id: string, data: any) =>
    fetch(`${API_BASE}/referrals/${id}/respond`, getFetchOptions('PATCH', data)).then(handleResponse),

  // Gate check-in
  checkIn: (data: any) =>
    fetch(`${API_BASE}/referrals/gate-check-in`, getFetchOptions('PATCH', data)).then(handleResponse),

  // Get referral by ID
  getById: (id: string) =>
    fetch(`${API_BASE}/referrals/${id}`, getFetchOptions()).then(handleResponse),

  // Update referral status
  updateStatus: (id: string, status: string, note?: string) =>
    fetch(`${API_BASE}/referrals/${id}/status`, getFetchOptions('PATCH', { status, note })).then(handleResponse),

  // Unlock clinical data
  unlock: (data: any) =>
    fetch(`${API_BASE}/referrals/unlock`, getFetchOptions('POST', data)).then(handleResponse),

  // Submit feedback
  complete: (id: string, data: any) =>
    fetch(`${API_BASE}/referrals/${id}/complete`, getFetchOptions('PATCH', data)).then(handleResponse),

  // Get referrals with type filter
  getAll: (type: 'inbound' | 'outbound' = 'outbound') =>
    fetch(`${API_BASE}/referrals?type=${type}`, getFetchOptions()).then(handleResponse),

  // Get liaison outbox
  getOutbox: () =>
    fetch(`${API_BASE}/referrals/liaison/outbox`, getFetchOptions()).then(handleResponse),

  // Get specialist queue
  getQueue: () =>
    fetch(`${API_BASE}/referrals/specialist/queue`, getFetchOptions()).then(handleResponse),

  // Get MOH/System referral stats
  getAdminStats: () =>
    fetch(`${API_BASE}/referrals/admin/stats`, getFetchOptions()).then(handleResponse),

  // Delete referral
  delete: (id: string) =>
    fetch(`${API_BASE}/referrals/${id}`, getFetchOptions('DELETE')).then(handleResponse),
};

// Files API
export const filesApi = {
  uploadReferralDoc: (referralId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('referralId', referralId);

    // Get token for manual fetch since getFetchOptions uses JSON.stringify
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('token') ||
        localStorage.getItem('auth_token') ||
        sessionStorage.getItem('token')
      : null;

    return fetch(`${API_BASE}/files/upload-referral-doc`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    }).then(handleResponse);
  },
};
