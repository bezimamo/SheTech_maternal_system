"use client"

import * as React from "react"
import { useRouter, useParams } from "next/navigation"
import { toast } from "sonner"

import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { uploadReferralDoc } from "@/services/files"
import { submitFeedback } from "@/services/referrals"
import { useReferral, useRespondReferral, useSendReferral } from "@/hooks/useReferrals"
import type { User } from "@/types/auth"
import { hospitalsApi, referralsApi, mothersApi } from "@/lib/healthcare-api"
import { API_BASE } from "@/lib/api"

function statusVariant(status?: string) {
  switch (status) {
    case "ACCEPTED":
      return "success"
    case "REJECTED":
      return "danger"
    case "PENDING":
      return "warning"
    case "COMPLETED":
      return "secondary"
    default:
      return "outline"
  }
}

export default function ReferralDetailsPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const router = useRouter()

  const referral = useReferral(id)
  const respond = useRespondReferral()
  const send = useSendReferral()

  const user = React.useMemo<User | null>(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }, [])

  // Extract hospital IDs from referral data
  const fromHospitalId =
    typeof (referral.data as any)?.fromHospital === "object"
      ? (referral.data as any)?.fromHospital?._id
      : (referral.data as any)?.fromHospital

  const toHospitalId =
    typeof (referral.data as any)?.toHospital === "object"
      ? (referral.data as any)?.toHospital?._id
      : (referral.data as any)?.toHospital

  // isSenderFacility: true if the current user's facility created this referral
  const userFacilityId = (user as any)?.facilityId ?? user?.hospitalId
  const isSenderHospital = !!userFacilityId && !!fromHospitalId && userFacilityId === fromHospitalId
  const isReceiverHospital = !!userFacilityId && !!toHospitalId && userFacilityId === toHospitalId

  // Fetch full mother details for medical information
  React.useEffect(() => {
    const motherId = referral.data
      ? typeof referral.data.motherId === 'object'
        ? referral.data.motherId?._id
        : referral.data.motherId
      : null

    if (!motherId) {
      setMotherDetails(null)
      return
    }

    // Use mothersApi.getById which includes the Authorization header
    mothersApi.getById(motherId)
      .then((data: any) => {
        setMotherDetails(data)
      })
      .catch((err: any) => {
        console.error('Error fetching mother details:', err)
        setMotherDetails(null)
      })
  }, [referral.data?.motherId])

  // Load all hospitals once for name resolution (from/to hospital display)
  React.useEffect(() => {
    hospitalsApi.getAll().then((data: any[]) => {
      setAllHospitals(Array.isArray(data) ? data : []);
    }).catch(() => {});
  }, [])

  // Helper: resolve a hospital field (populated object OR plain ID) to a display name
  const resolveHospitalName = (field: any): string => {
    if (!field) return '—';
    // Already populated object
    if (typeof field === 'object' && field.name) {
      const type = field.type ? ` (${field.type === 'HEALTH_CENTER' ? 'Health Center' : 'Hospital'})` : '';
      return `${field.name}${type}`;
    }
    // Plain ID — look up in allHospitals
    const hid = typeof field === 'string' ? field : field._id;
    const found = allHospitals.find((h: any) => h._id === hid);
    if (found) {
      const type = found.type ? ` (${found.type === 'HEALTH_CENTER' ? 'Health Center' : 'Hospital'})` : '';
      return `${found.name}${type}`;
    }
    return hid ? `ID: ${String(hid).slice(-6)}` : '—';
  };

  // Move loadHospitals outside useEffect so it can be called from JSX
  const loadHospitals = async () => {
    setIsLoadingHospitals(true)
    try {
      const data = await hospitalsApi.getAll()
      const list = Array.isArray(data)
        ? data.filter((hospital) => {
            const currentHospitalId = typeof fromHospitalId === 'object' ? fromHospitalId?._id : fromHospitalId
            return hospital._id !== currentHospitalId
          })
        : []
      setHospitals(list)
    } catch (err: any) {
      console.error('Error loading hospitals:', err)
      setHospitals([])
    } finally {
      setIsLoadingHospitals(false)
    }
  }

  const isLiaisonOfficer = user?.role === 'LIAISON_OFFICER'

  React.useEffect(() => {
    const canSend = ['LIAISON_OFFICER', 'DOCTOR', 'NURSE', 'MIDWIFE', 'HOSPITAL_ADMIN', 'HEALTH_CENTER_ADMIN'].includes(user?.role ?? '')
    if (canSend && referral.data?.status === 'DRAFT' && isSenderHospital && !isLiaisonOfficer) {
      loadHospitals()
    }
  }, [user?.role, referral.data?.status, fromHospitalId, isSenderHospital, isLiaisonOfficer])

  const [targetHospitalId, setTargetHospitalId] = React.useState("")
  const [selectedHospital, setSelectedHospital] = React.useState<any>(null)
  const [hospitalSearch, setHospitalSearch] = React.useState("")
  const [hospitals, setHospitals] = React.useState<any[]>([])
  const [allHospitals, setAllHospitals] = React.useState<any[]>([])
  const [isLoadingHospitals, setIsLoadingHospitals] = React.useState(false)
  const filteredHospitals = React.useMemo(() => {
    const query = hospitalSearch.toLowerCase().trim()
    return hospitals.filter((hospital) =>
      hospital.name?.toLowerCase().includes(query) ||
      hospital.type?.toLowerCase().includes(query) ||
      hospital.location?.toLowerCase().includes(query),
    )
  }, [hospitals, hospitalSearch])
  const [liaisonNote, setLiaisonNote] = React.useState("")
  const [feedbackNote, setFeedbackNote] = React.useState("")
  const [file, setFile] = React.useState<File | null>(null)
  const [isUploading, setIsUploading] = React.useState(false)
  const [unlockCode, setUnlockCode] = React.useState("")
  const [isUnlocking, setIsUnlocking] = React.useState(false)
  const [qrDataUrl, setQrDataUrl] = React.useState<string | null>(null)
  const [generatingQr, setGeneratingQr] = React.useState(false)
  const [motherDetails, setMotherDetails] = React.useState<any>(null)
  const canUploadAttachments =
    isSenderHospital && ['DOCTOR', 'LIAISON_OFFICER', 'NURSE', 'MIDWIFE', 'HEALTH_CENTER_ADMIN', 'HOSPITAL_ADMIN'].includes(user?.role ?? '')
  const canViewAttachments =
    isSenderHospital || (isReceiverHospital && !!(referral.data as any)?.isUnlocked)
  const canGenerateQr =
    isSenderHospital &&
    ['LIAISON_OFFICER', 'DOCTOR', 'HEALTH_CENTER_ADMIN', 'HOSPITAL_ADMIN'].includes(user?.role ?? '') &&
    ['PENDING', 'ACCEPTED'].includes(referral.data?.status ?? '')

  React.useEffect(() => {
    const url = (referral.data as any)?.qrCodeUrl
    if (url) setQrDataUrl(url)
  }, [(referral.data as any)?.qrCodeUrl])

  async function generateQr() {
    setGeneratingQr(true)
    try {
      const updated = await referralsApi.generateQrCode(id)
      if (updated?.qrCodeUrl) {
        setQrDataUrl(updated.qrCodeUrl)
      }
      toast.success('QR code generated and saved to Cloudinary')
      referral.refetch()
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? err?.message ?? "Could not generate QR code")
    } finally {
      setGeneratingQr(false)
    }
  }

  async function onUpload() {
    if (!file) return
    setIsUploading(true)
    try {
      await uploadReferralDoc(id, file)
      toast.success("File attached")
      setFile(null)
      referral.refetch()
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? err?.message ?? "Upload failed")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <ProtectedRoute
      requiredRole={[
        "DOCTOR",
        "NURSE",
        "MIDWIFE",
        "LIAISON_OFFICER",
        "HOSPITAL_ADMIN",
        "HEALTH_CENTER_ADMIN",
        "HOSPITAL_APPROVER",
        "SPECIALIST",
        "GATEKEEPER",
      ]}
    >
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-4xl p-6 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Referral Details</h1>
              <p className="text-sm text-slate-600">Track and act on referral lifecycle.</p>
            </div>
            <Badge variant={statusVariant(referral.data?.status) as any}>
              {referral.data?.status ?? "—"}
            </Badge>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {referral.isLoading && <p className="text-slate-600">Loading...</p>}
              {referral.isError && <p className="text-red-600">Failed to load referral.</p>}
              {referral.data && (
                <>
                  {/* Urgency / Emergency */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Urgency:</span>
                    <span className={`ml-1 px-3 py-1 rounded-full text-xs font-medium ${
                      (referral.data as any)?.urgency === 'EMERGENCY' ? 'bg-red-100 text-red-800 border border-red-200' :
                      (referral.data as any)?.urgency === 'URGENT' ? 'bg-orange-100 text-orange-800' :
                      'bg-green-100 text-green-800 border border-green-200'
                    }`}>
                      {(referral.data as any)?.urgency === 'EMERGENCY' ? '🚨 EMERGENCY' :
                       (referral.data as any)?.urgency === 'URGENT' ? '⚠️ URGENT' :
                       (referral.data as any)?.urgency ?? '✅ Routine'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Referral Code:</span>
                    <span className="font-mono font-medium text-sm">{referral.data.referralCode ?? "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Status:</span>
                    <Badge variant={statusVariant(referral.data?.status) as any}>
                      {referral.data?.status ?? "—"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Patient Name:</span>
                    <span className="font-medium">
                      {(referral.data as any)?.patientName ||
                       (typeof referral.data?.motherId === 'object' ? referral.data?.motherId?.name : '') ||
                       '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Patient Phone:</span>
                    <span className="font-medium">
                      {(referral.data as any)?.patientPhone ||
                       (typeof referral.data?.motherId === 'object' ? referral.data?.motherId?.phone : '') ||
                       '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Referred By:</span>
                    <span className="font-medium">
                      {typeof referral.data?.createdBy === 'object'
                        ? (referral.data.createdBy as any)?.name || (referral.data.createdBy as any)?.fullName
                        : (referral.data as any)?.doctorName || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">From Facility:</span>
                    <span className="font-medium">
                      {resolveHospitalName((referral.data as any)?.fromHospital)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">To Facility:</span>
                    <span className="font-medium">
                      {(referral.data as any)?.toHospital
                        ? resolveHospitalName((referral.data as any)?.toHospital)
                        : 'Not assigned yet'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Created:</span>
                    <span className="font-medium">
                      {referral.data?.createdAt
                        ? new Date(referral.data.createdAt).toLocaleString('en-US', {
                            year: 'numeric', month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })
                        : '—'}
                    </span>
                  </div>
                                    
                  {canGenerateQr && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3 text-sm text-slate-700">
                        Generate a QR code (stored in Cloudinary) so the mother can use it at gate check-in. The code encodes the referral and mother IDs.
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button disabled={generatingQr} onClick={generateQr}>
                          {qrDataUrl ? "Regenerate QR Code" : "Generate QR Code"}
                        </Button>
                        {qrDataUrl && (
                          <a
                            href={qrDataUrl}
                            download={`referral-${referral.data.referralCode}.png`}
                            className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-100"
                          >
                            Download QR PNG
                          </a>
                        )}
                      </div>
                      {qrDataUrl && (
                        <div className="mt-4 flex justify-center">
                          <img
                            src={qrDataUrl}
                            alt="Referral QR code"
                            className="h-72 w-72 rounded-md border border-slate-200 bg-white p-3"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Reason for Referral */}
          {(referral.data as any)?.reasonForReferral && (
            <Card>
              <CardHeader>
                <CardTitle>Reason for Referral</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <p className="text-sm leading-relaxed text-slate-700">
                    {(referral.data as any).reasonForReferral}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Clinical Notes */}
          {(referral.data as any)?.clinicalNotes && (
            <Card>
              <CardHeader>
                <CardTitle>Clinical Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm leading-relaxed text-blue-800">
                    {(referral.data as any).clinicalNotes}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Liaison Notes */}
          {(referral.data as any)?.liaisonNote && (
            <Card>
              <CardHeader>
                <CardTitle>Liaison Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <p className="text-sm leading-relaxed text-amber-800">
                    {(referral.data as any).liaisonNote}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Medical Information */}
          {(motherDetails || (referral.data as any)?.motherSnapshot) && (
            <Card>
              <CardHeader>
                <CardTitle>Medical Information & Risk Factors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Basic Medical Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-slate-700">Basic Information</h4>
                      <div className="space-y-1">
                        <p className="text-sm"><span className="font-medium">Blood Type:</span> {motherDetails?.bloodType ?? (referral.data as any)?.motherSnapshot?.bloodType ?? 'Unknown'}</p>
                        <p className="text-sm"><span className="font-medium">RH Factor:</span> {motherDetails?.rhFactor ?? (referral.data as any)?.motherSnapshot?.rhFactor ?? 'Unknown'}</p>
                        <p className="text-sm"><span className="font-medium">HIV Status:</span> {motherDetails?.hivStatus ?? (referral.data as any)?.motherSnapshot?.hivStatus ?? 'Unknown'}</p>
                        <p className="text-sm"><span className="font-medium">Hepatitis B:</span> {motherDetails?.hepatitisB ?? (referral.data as any)?.motherSnapshot?.hepatitisB ?? 'Unknown'}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-slate-700">Risk Factors</h4>
                      <div className="space-y-1">
                        <p className="text-sm"><span className="font-medium">Hypertension:</span> 
                          <span className={`ml-1 px-2 py-1 rounded text-xs ${motherDetails?.hypertension ?? (referral.data as any)?.motherSnapshot?.hypertension ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                            {motherDetails?.hypertension ?? (referral.data as any)?.motherSnapshot?.hypertension ? 'YES' : 'NO'}
                          </span>
                        </p>
                        <p className="text-sm"><span className="font-medium">Diabetes:</span> 
                          <span className={`ml-1 px-2 py-1 rounded text-xs ${motherDetails?.diabetes ?? (referral.data as any)?.motherSnapshot?.diabetes ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                            {motherDetails?.diabetes ?? (referral.data as any)?.motherSnapshot?.diabetes ? 'YES' : 'NO'}
                          </span>
                        </p>
                        <p className="text-sm"><span className="font-medium">Anemia:</span> 
                          <span className={`ml-1 px-2 py-1 rounded text-xs ${motherDetails?.anemia ?? (referral.data as any)?.motherSnapshot?.anemia ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                            {motherDetails?.anemia ?? (referral.data as any)?.motherSnapshot?.anemia ? 'YES' : 'NO'}
                          </span>
                        </p>
                        <p className="text-sm"><span className="font-medium">Previous C-Section:</span> 
                          <span className={`ml-1 px-2 py-1 rounded text-xs ${motherDetails?.previousCSection ?? (referral.data as any)?.motherSnapshot?.previousCSection ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                            {motherDetails?.previousCSection ?? (referral.data as any)?.motherSnapshot?.previousCSection ? 'YES' : 'NO'}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Pregnancy Information */}
                  {(motherDetails?.pregnancies?.[0] || (referral.data as any)?.motherSnapshot?.pregnancyInfo) && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium text-slate-700 mb-2">Current Pregnancy</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <p className="text-sm"><span className="font-medium">Gestational Age:</span> {motherDetails?.pregnancies?.[0]?.gestationalAge ?? (referral.data as any)?.motherSnapshot?.pregnancyInfo?.gestationalAge ?? 'Unknown'}</p>
                        <p className="text-sm"><span className="font-medium">EDD:</span> {motherDetails?.pregnancies?.[0]?.edd ? new Date(motherDetails.pregnancies[0].edd).toLocaleDateString() : (referral.data as any)?.motherSnapshot?.pregnancyInfo?.edd ? new Date((referral.data as any).motherSnapshot.pregnancyInfo.edd).toLocaleDateString() : 'Unknown'}</p>
                        <p className="text-sm"><span className="font-medium">Parity:</span> {motherDetails?.parity ?? (referral.data as any)?.motherSnapshot?.parity ?? 'Unknown'}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Unlock for receiving hospital staff */}
          {(referral.data as any)?.isUnlocked && referral.data?.status === "COMPLETED" && (
            <Card>
              <CardHeader>
                <CardTitle>Referral Completed</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-700">
                This referral has been unlocked and marked completed. You should now have access to the full referral details and attached documents.
              </CardContent>
            </Card>
          )}

          {(['LIAISON_OFFICER', 'DOCTOR', 'NURSE', 'MIDWIFE', 'HOSPITAL_ADMIN', 'HEALTH_CENTER_ADMIN'].includes(user?.role ?? '') && referral.data?.status === 'DRAFT' && isSenderHospital) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🏥 Send Referral to Receiving Facility
                </CardTitle>
                <CardDescription>
                  {isLiaisonOfficer
                    ? 'Send this referral to the destination facility chosen when the draft was created'
                    : 'Choose from available hospitals, clinics, or health centers to send this referral to the receiving liaison officer'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="mb-2 text-sm font-medium text-slate-700">
                    {isLiaisonOfficer ? '🏥 Destination Facility' : '🏥 Select Destination Facility'}
                  </div>
                  {isLiaisonOfficer ? (
                    <div className="p-3 bg-blue-50 rounded-lg text-sm text-slate-800">
                      {toHospitalId
                        ? resolveHospitalName((referral.data as any)?.toHospital)
                        : 'No destination set on this draft. Ask the referral creator to choose a destination facility.'}
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <select
                          value={targetHospitalId}
                          onChange={(e) => {
                            const hospital = hospitals.find(h => h._id === e.target.value)
                            setSelectedHospital(hospital || null)
                            setTargetHospitalId(e.target.value)
                          }}
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Choose a facility...</option>
                          {hospitals.map((hospital) => (
                            <option key={hospital._id} value={hospital._id}>
                              {hospital.name} - {hospital.type} ({hospital.location})
                            </option>
                          ))}
                        </select>
                        {isLoadingHospitals && (
                          <div className="text-xs text-slate-500 mt-1">Loading hospitals...</div>
                        )}
                      </div>
                      {selectedHospital && (
                        <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                          <strong>Selected:</strong> {selectedHospital.name} - {selectedHospital.type}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div>
                  <div className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    📝 Optional Liaison Note
                    <span className="text-xs text-slate-500 font-normal">(Will be visible to receiving liaison officer)</span>
                  </div>
                  <textarea
                    value={liaisonNote}
                    onChange={(e) => setLiaisonNote(e.target.value)}
                    placeholder="Add important information, special instructions, or context for the receiving liaison officer..."
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                  <div className="text-xs text-slate-500 mt-1">
                    💡 This note will help the receiving liaison officer understand the referral context and priority
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    disabled={send.isPending || !(isLiaisonOfficer ? toHospitalId : targetHospitalId)}
                    onClick={async () => {
                      try {
                        const destId = isLiaisonOfficer ? toHospitalId : targetHospitalId
                        if (!destId) return
                        await send.mutateAsync({ id, targetHospitalId: destId, liaisonNote })
                        toast.success('Referral sent successfully')
                        referral.refetch()
                      } catch (err: any) {
                        toast.error(err?.response?.data?.message ?? err?.message ?? 'Send failed')
                      }
                    }}
                  >
                    Send Referral
                  </Button>
                  {!isLiaisonOfficer && (
                    <Button variant="secondary" onClick={() => {
                      setSelectedHospital(null)
                      setTargetHospitalId("")
                      setHospitalSearch("")
                      setLiaisonNote("")
                    }}>
                      Clear
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {isReceiverHospital &&
            ["DOCTOR", "NURSE", "MIDWIFE", "LIAISON_OFFICER", "HOSPITAL_ADMIN", "HEALTH_CENTER_ADMIN"].includes(user?.role ?? "") &&
            referral.data?.status === "PENDING" && (
              <Card>
              <CardHeader>
                <CardTitle>Respond (Accept / Reject)</CardTitle>
                <CardDescription>
                  Review this incoming referral and accept or reject before gate check-in.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  disabled={respond.isPending}
                  onClick={async () => {
                    try {
                      await respond.mutateAsync({ id, payload: { status: "ACCEPTED" } })
                      toast.success("Accepted")
                      referral.refetch()
                    } catch (err: any) {
                      toast.error(err?.response?.data?.message ?? err?.message ?? "Action failed")
                    }
                  }}
                >
                  Accept
                </Button>
                <Button
                  variant="destructive"
                  disabled={respond.isPending}
                  onClick={async () => {
                    try {
                      await respond.mutateAsync({
                        id,
                        payload: { status: "REJECTED", justification: "Rejected by receiving hospital" },
                      })
                      toast.success("Rejected")
                      referral.refetch()
                    } catch (err: any) {
                      toast.error(err?.response?.data?.message ?? err?.message ?? "Action failed")
                    }
                  }}
                >
                  Reject
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Attached Files */}
          {referral.data?.attachments && Array.isArray(referral.data.attachments) && referral.data.attachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📎 Attached Documents
                  <Badge variant="secondary" className="text-xs">
                    {referral.data.attachments.length} file{referral.data.attachments.length > 1 ? 's' : ''}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Medical documents, test results, and other relevant files attached to this referral
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3">
                  {referral.data.attachments.map((url: string, idx: number) => {
                    const fileName = url.split('/').pop() || `Document ${idx + 1}`;
                    const fileExt = fileName.split('.').pop()?.toLowerCase();
                    const getFileIcon = (ext: string) => {
                      switch(ext) {
                        case 'pdf': return '📄';
                        case 'doc':
                        case 'docx': return '📝';
                        case 'jpg':
                        case 'jpeg':
                        case 'png': return '🖼️';
                        case 'xls':
                        case 'xlsx': return '📊';
                        default: return '📎';
                      }
                    };
                    
                    return (
                      <div key={`${url}-${idx}`} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getFileIcon(fileExt || '')}</span>
                          <div>
                            <p className="font-medium text-sm text-slate-900">{fileName}</p>
                            <p className="text-xs text-slate-500">
                              {fileExt ? fileExt.toUpperCase() : 'Unknown'} • Document {idx + 1}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors"
                          >
                            👁️ View
                          </a>
                          <a
                            href={url}
                            download={fileName}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200 transition-colors"
                          >
                            ⬇️ Download
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons for Health Workers */}
          {isSenderHospital && (['DOCTOR', 'NURSE', 'MIDWIFE', 'LIAISON_OFFICER', 'HEALTH_CENTER_ADMIN', 'HOSPITAL_ADMIN'].includes(user?.role ?? '')) && (
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
                <CardDescription>
                  Manage this referral - edit details or delete if needed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  {/* Edit Button - Not available for LIAISON_OFFICER */}
                  {user?.role !== 'LIAISON_OFFICER' && (
                    <Button
                      onClick={() => router.push(`/healthcare-dashboard/referrals/create/${typeof referral.data?.motherId === 'object' ? referral.data.motherId?._id : referral.data?.motherId}?referralId=${referral.data?._id}`)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      ✏️ Edit Referral
                    </Button>
                  )}
                  
                  {/* Delete Button - Only for DRAFT status */}
                  {referral.data?.status === 'DRAFT' && (
                    <Button
                      variant="destructive"
                      onClick={async () => {
                        if (window.confirm('Are you sure you want to delete this referral? This action cannot be undone.')) {
                          try {
                            await referralsApi.delete(referral.data!._id)
                            toast.success("Referral deleted successfully")
                            router.push('/healthcare-dashboard/referrals')
                          } catch (err: any) {
                            toast.error(err?.response?.data?.message ?? err?.message ?? "Delete failed")
                          }
                        }
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      🗑️ Delete Referral
                    </Button>
                  )}
                </div>
                
                {/* Status-specific guidance */}
                <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                  {referral.data?.status === 'DRAFT' && (
                    <p>💡 <strong>Draft Status:</strong> You can edit this referral or delete it. When ready, send it to the target hospital.</p>
                  )}
                  {referral.data?.status === 'SENT' && (
                    <p>💡 <strong>Sent Status:</strong> You can edit this referral if needed. The target hospital will review and respond.</p>
                  )}
                  {referral.data?.status === 'ACCEPTED' && (
                    <p>💡 <strong>Accepted Status:</strong> You can edit this referral if needed. The receiving hospital has accepted this referral.</p>
                  )}
                  {referral.data?.status === 'REJECTED' && (
                    <>
                      <p>💡 <strong>Rejected Status:</strong> You can edit this referral and resend it if needed.</p>
                      {referral.data?.decisionMeta?.justification && (
                        <p className="text-xs text-rose-700">
                          Rejection reason: {referral.data.decisionMeta.justification}
                        </p>
                      )}
                    </>
                  )}
                  {referral.data?.status === 'COMPLETED' && (
                    <p>💡 <strong>Completed Status:</strong> This referral has been completed. You can still edit the details if needed.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </ProtectedRoute>
  )
}

