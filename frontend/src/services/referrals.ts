import { http } from "./http"

export type ReferralStatus =
  | "DRAFT"
  | "PENDING"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "SCHEDULED"
  | "CHECKED_IN"
  | "COMPLETED"
  | "EXPIRED"

export interface Referral {
  _id: string
  status: ReferralStatus
  referralCode?: string
  createdAt?: string
  updatedAt?: string
  emergency?: boolean
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  isUnlocked?: boolean
  // Populated/expanded fields (optional depending on endpoint)
  reasonForReferral?: string
  clinicalNotes?: string
  liaisonNote?: string
  attachments?: string[]
  motherId?: { _id: string; name?: string; phone?: string; age?: number } | string
  fromHospital?: { _id: string; name?: string } | string
  toHospital?: { _id: string; name?: string } | string
  createdBy?: { _id: string; fullName?: string; name?: string } | string
  decisionMeta?: {
    justification?: string
  }
  qrCodeUrl?: string
}

export async function createReferral(payload: any) {
  const { data } = await http.post("/referrals", payload)
  return data
}

export async function sendReferral(id: string, targetHospitalId: string, liaisonNote?: string) {
  const { data } = await http.patch(`/referrals/${id}/send`, { targetHospitalId, liaisonNote })
  return data
}

export async function incomingReferrals() {
  const { data } = await http.get<Referral[]>("/referrals/incoming")
  return data
}

export async function outboxReferrals() {
  const { data } = await http.get<Referral[]>("/referrals/liaison/outbox")
  return data
}

export async function checkedInReferrals() {
  const { data } = await http.get<Referral[]>("/referrals/checked-in")
  return data
}

export async function specialistQueue() {
  const { data } = await http.get<Referral[]>("/referrals/specialist/queue")
  return data
}

export async function respondReferral(
  id: string,
  payload: { status: "ACCEPTED" | "REJECTED"; justification?: string; appointmentDate?: string },
) {
  const { data } = await http.patch(`/referrals/${id}/respond`, payload)
  return data
}

export async function gateCheckIn(payload: any) {
  // Use proxy approach since app uses session-based authentication
  console.log('Making gateCheckIn call via proxy...')
  
  try {
    const { data } = await http.patch(`/referrals/gate-check-in`, payload)
    console.log('Gate check-in successful:', data)
    return data
  } catch (error: any) {
    console.log('Gate check-in failed:', error.response?.data?.message || error.message)
    throw error
  }
}

export async function unlockClinicalData(payload: any) {
  const { data } = await http.post(`/referrals/unlock`, payload)
  return data
}

export async function submitFeedback(id: string, feedbackNote: string) {
  const { data } = await http.patch(`/referrals/${id}/complete`, { feedbackNote })
  return data
}

export async function getReferral(id: string) {
  const { data } = await http.get<Referral>(`/referrals/${id}`)
  return data
}

export async function getDraftReferrals() {
  const { data } = await http.get<Referral[]>('/referrals/drafts')
  return data
}

export async function generateReferralQrCode(id: string) {
  const { data } = await http.post<Referral>(`/referrals/${id}/qr-code`)
  return data
}

