"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import { useRouter } from 'next/navigation';

import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { useAuth } from '@/contexts/AuthContext';
import { useCheckedInReferrals, useIncomingReferrals, useOutboxReferrals, useRespondReferral, useDraftReferrals, useSendReferral } from "@/hooks/useReferrals"
import { gateCheckIn } from "@/services/referrals"

function pickName(obj: any) {
  return obj?.fullName ?? obj?.name ?? "—"
}

function getDestinationId(r: any): string | null {
  if (!r?.toHospital) return null
  if (typeof r.toHospital === "object") return r.toHospital._id ?? null
  return r.toHospital
}

function formatDestination(r: any): string {
  if (!r?.toHospital) return "Not set — ask the referral creator to choose a destination"
  if (typeof r.toHospital === "object") {
    const type = r.toHospital.type === "HEALTH_CENTER" ? "Health Center" : "Hospital"
    return `${r.toHospital.name} (${type})`
  }
  return "—"
}

const StatCard = ({ title, value, color, icon }: { title: string; value: number; color: string; icon: string }) => (
  <div className="bg-white rounded-lg shadow-md p-6 border-l-4" style={{ borderLeftColor: color }}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
      </div>
      <div className={`text-3xl ${color}`}>
        {icon}
      </div>
    </div>
  </div>
);

export default function LiaisonDashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const incoming = useIncomingReferrals()
  const outbox = useOutboxReferrals()
  const checkedIn = useCheckedInReferrals()
  const drafts = useDraftReferrals()
  const respond = useRespondReferral()
  const send = useSendReferral()

  const [sendingId, setSendingId] = React.useState<string | null>(null)
  const [incomingFilter, setIncomingFilter] = React.useState('ALL')

  const filteredIncoming = React.useMemo(() => {
    if (!incoming.data) return [];
    if (incomingFilter === 'ALL') return incoming.data;
    return incoming.data.filter((r: any) => r.status === incomingFilter);
  }, [incoming.data, incomingFilter]);

  const [checkinCode, setCheckinCode] = React.useState("")
  const [isSubmittingCheckin, setIsSubmittingCheckin] = React.useState(false)
  const [isScanningCheckin, setIsScanningCheckin] = React.useState(false)
  const [cameraSupported, setCameraSupported] = React.useState(false)
  const [barcodeSupported, setBarcodeSupported] = React.useState(false)
  const videoRef = React.useRef<HTMLVideoElement | null>(null)
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const rafRef = React.useRef<number | null>(null)
  const scanningRef = React.useRef(false)
  const jsQRRef = React.useRef<any>(null)

  const canCheckIn = user?.role === "LIAISON_OFFICER"

  React.useEffect(() => {
    const cameraAvailable =
      typeof window !== "undefined" &&
      "mediaDevices" in navigator &&
      "getUserMedia" in navigator.mediaDevices
    setCameraSupported(!!cameraAvailable)
    setBarcodeSupported(!!cameraAvailable && "BarcodeDetector" in window)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  async function stopScanner() {
    scanningRef.current = false
    setIsScanningCheckin(false)
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  async function startScanner() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      })
      streamRef.current = stream
      scanningRef.current = true
      setIsScanningCheckin(true)

      const waitForVideo = async () => {
        let attempts = 0
        while (!videoRef.current && attempts < 10) {
          await new Promise((resolve) => requestAnimationFrame(resolve))
          attempts += 1
        }
      }
      await waitForVideo()

      if (!videoRef.current) {
        toast.error("Unable to attach camera preview. Refresh and try again.")
        await stopScanner()
        return
      }

      videoRef.current.srcObject = stream
      await videoRef.current.play()

      const hasNativeDetector = "BarcodeDetector" in window
      let detector: any = null
      let ctx: CanvasRenderingContext2D | null = null

      if (hasNativeDetector) {
        const Detector = (window as any).BarcodeDetector
        detector = new Detector({ formats: ["qr_code"] })
      } else {
        const jsqrModule = await import("jsqr")
        jsQRRef.current = jsqrModule.default ?? jsqrModule
        const canvas = document.createElement("canvas")
        canvasRef.current = canvas
        ctx = canvas.getContext("2d")
      }

      const scanLoop = async () => {
        if (!videoRef.current || !scanningRef.current) return
        try {
          if (hasNativeDetector) {
            const barcodes = await detector.detect(videoRef.current)
            if (barcodes?.length > 0) {
              const val = barcodes[0]?.rawValue
              if (val) {
                setCheckinCode(val)
                toast.success("QR scanned")
                await stopScanner()
                return
              }
            }
          } else if (ctx && canvasRef.current) {
            const canvas = canvasRef.current
            canvas.width = videoRef.current.videoWidth
            canvas.height = videoRef.current.videoHeight
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const result = jsQRRef.current(imageData.data, canvas.width, canvas.height)
            if (result?.data) {
              setCheckinCode(result.data)
              toast.success("QR scanned")
              await stopScanner()
              return
            }
          }
        } catch {
          // Ignore per-frame detection errors and continue scanning.
        }
        rafRef.current = requestAnimationFrame(scanLoop)
      }

      rafRef.current = requestAnimationFrame(scanLoop)
    } catch (err: any) {
      toast.error(err?.message ?? "Could not start camera scanner")
      await stopScanner()
    }
  }

  async function onSubmitCheckIn(e: React.FormEvent) {
    e.preventDefault()
    if (!checkinCode.trim()) {
      toast.error("Please enter or scan a referral code before checking in")
      return
    }

    setIsSubmittingCheckin(true)
    try {
      await gateCheckIn({ referralCode: checkinCode.trim() })
      toast.success("Mother checked in")
      setCheckinCode("")
      incoming.refetch()
      outbox.refetch()
      checkedIn.refetch()
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? err?.message ?? "Check-in failed")
    } finally {
      setIsSubmittingCheckin(false)
    }
  }

  const handleLogout = () => {
    logout();
    router.push('/auth');
  };

  const handleRefresh = () => {
    incoming.refetch()
    outbox.refetch()
    checkedIn.refetch()
    drafts.refetch()
    toast.success("Dashboard Refreshed")
  }

  return (
    <ProtectedRoute requiredRole={["LIAISON_OFFICER", "DOCTOR", "NURSE", "MIDWIFE", "HOSPITAL_ADMIN", "HEALTH_CENTER_ADMIN"]}>
      <div className="min-h-screen bg-gray-50">
        
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap justify-between items-center py-4 gap-y-2">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Liaison Officer Dashboard</h1>
                <p className="text-sm text-gray-600">Finalize, send, and track maternal referrals.</p>
              </div>
              <div className="flex items-center gap-3">
                <a href="/liaison-dashboard/profile" className="text-sm text-blue-600 hover:underline whitespace-nowrap">
                  My Profile
                </a>
                <button
                  onClick={handleRefresh}
                  className="whitespace-nowrap px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Refresh
                </button>
                <button
                  onClick={handleLogout}
                  className="whitespace-nowrap px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Drafts (Pending Send)"
              value={drafts.data?.length ?? 0}
              color="text-yellow-600"
              icon="📝"
            />
            <StatCard
              title="Incoming Referrals"
              value={incoming.data?.length ?? 0}
              color="text-orange-600"
              icon="📥"
            />
            <StatCard
              title="Outbox (Sent)"
              value={outbox.data?.length ?? 0}
              color="text-blue-600"
              icon="📤"
            />
            <StatCard
              title="Checked-in Mothers"
              value={checkedIn.data?.length ?? 0}
              color="text-purple-600"
              icon="✅"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Gate Check-In Actions (Left Col) */}
            {canCheckIn && (
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-md p-6 h-full">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Gate Check-in</h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Scan the referral QR code or enter the referral code to check in the mother.
                  </p>
                  
                  <form onSubmit={onSubmitCheckIn} className="space-y-4">
                    <input
                      type="text"
                      value={checkinCode}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCheckinCode(e.target.value)}
                      placeholder="Referral code or scanned QR value"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        {cameraSupported && !isScanningCheckin && (
                          <button type="button" onClick={startScanner} className="flex-1 px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                            Scan QR
                          </button>
                        )}
                        {cameraSupported && isScanningCheckin && (
                          <button type="button" onClick={stopScanner} className="flex-1 px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium">
                            Stop Scanner
                          </button>
                        )}
                      </div>
                      {!cameraSupported && (
                        <p className="text-xs text-gray-500">
                          Camera scanning is unavailable in this browser. Use the referral code field instead.
                        </p>
                      )}
                    </div>
                    
                    {isScanningCheckin && (
                      <video
                        ref={videoRef}
                        className="w-full h-48 object-cover rounded-md border border-gray-200 bg-black"
                        autoPlay
                        playsInline
                        muted
                      />
                    )}
                    
                    <button 
                      type="submit" 
                      disabled={!checkinCode.trim() || isSubmittingCheckin} 
                      className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {isSubmittingCheckin ? "Checking in..." : "Check-in Mother"}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Referrals Lists (Right Col) */}
            <div className={`lg:col-span-${canCheckIn ? '2' : '3'} space-y-6`}>
              
              {/* Drafts */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">📝 Drafts (Action Required)</h2>
                </div>
                {drafts.isLoading && <p className="text-sm text-gray-600">Loading...</p>}
                {(drafts.data ?? []).length === 0 && !drafts.isLoading && (
                  <p className="text-sm text-gray-500">No draft referrals waiting.</p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(drafts.data ?? []).slice(0, 8).map((r) => (
                    <div key={r._id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <p className="font-medium text-gray-900">Referral #{r.referralCode ?? r._id.slice(-6)}</p>
                      <p className="text-sm text-gray-600 mt-1">Patient: {typeof r.motherId === "object" ? pickName(r.motherId) : "—"}</p>
                      <p className="text-sm text-gray-600">By: {typeof r.createdBy === "object" ? pickName(r.createdBy) : "—"}</p>
                      
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-sm text-gray-700 mb-2">
                          <span className="font-medium">Destination:</span>{" "}
                          {formatDestination(r)}
                        </p>
                        <div className="flex gap-2">
                          <button
                            className="flex-1 text-sm px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                            disabled={!getDestinationId(r) || sendingId === r._id}
                            onClick={async () => {
                              const dest = getDestinationId(r)
                              if (!dest) return
                              setSendingId(r._id)
                              try {
                                await send.mutateAsync({ id: r._id, targetHospitalId: dest })
                                toast.success("Referral sent")
                                drafts.refetch()
                                outbox.refetch()
                              } catch (err: any) {
                                toast.error(err?.response?.data?.message ?? err?.message ?? "Send failed")
                              } finally {
                                setSendingId(null)
                              }
                            }}
                          >
                            {sendingId === r._id ? "Sending…" : "Send"}
                          </button>
                          <Link href={`/referrals/${r._id}`} className="text-sm px-3 py-1.5 border border-gray-300 text-gray-700 rounded hover:bg-gray-100 text-center">
                            View
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Incoming */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">📥 Incoming Referrals</h2>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-medium">
                      Total: {(incoming.data ?? []).length}
                    </span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded font-medium">
                      Accepted: {(incoming.data ?? []).filter((r: any) => r.status === 'ACCEPTED').length}
                    </span>
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded font-medium">
                      Rejected: {(incoming.data ?? []).filter((r: any) => r.status === 'REJECTED').length}
                    </span>
                    <select
                      value={incomingFilter}
                      onChange={(e) => setIncomingFilter(e.target.value)}
                      className="ml-2 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="ALL">View All</option>
                      <option value="PENDING">Pending</option>
                      <option value="ACCEPTED">Accepted</option>
                      <option value="REJECTED">Rejected</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>
                </div>
                
                {incoming.isLoading && <p className="text-sm text-gray-600">Loading...</p>}
                {filteredIncoming.length === 0 && !incoming.isLoading && (
                  <p className="text-sm text-gray-500">No incoming referrals match the filter.</p>
                )}
                
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {filteredIncoming.map((r: any) => (
                    <div key={r._id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">#{r.referralCode ?? r._id.slice(-6)}</p>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            r.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                            r.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                            r.status === 'CHECKED_IN' ? 'bg-purple-100 text-purple-800' :
                            r.status === 'COMPLETED' ? 'bg-gray-100 text-gray-800' :
                            'bg-orange-100 text-orange-800'
                          }`}>
                            {r.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">Mother: {typeof r.motherId === "object" ? pickName(r.motherId) : "—"}</p>
                        <p className="text-sm text-gray-600">From: {typeof r.fromHospital === "object" ? pickName(r.fromHospital) : "—"}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Received: {new Date(r.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex sm:flex-col gap-2">
                        <Link href={`/referrals/${r._id}`} className="text-sm px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 text-center font-medium">
                          Open
                        </Link>
                        {r.status === "PENDING" && (
                          <div className="flex gap-2">
                            <button
                              className="text-sm px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700"
                              onClick={async () => {
                                try {
                                  await respond.mutateAsync({ id: r._id, payload: { status: "ACCEPTED" } })
                                  toast.success("Accepted")
                                  incoming.refetch()
                                  outbox.refetch()
                                  checkedIn.refetch()
                                } catch (err: any) {
                                  toast.error(err?.response?.data?.message ?? err?.message ?? "Accept failed")
                                }
                              }}
                            >
                              Accept
                            </button>
                            <button
                              className="text-sm px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700"
                              onClick={async () => {
                                const justification = window.prompt("Rejection reason:")
                                if (!justification?.trim()) {
                                  toast.error("Justification is required to reject.")
                                  return
                                }
                                try {
                                  await respond.mutateAsync({
                                    id: r._id,
                                    payload: { status: "REJECTED", justification: justification.trim() },
                                  })
                                  toast.success("Rejected")
                                  incoming.refetch()
                                  outbox.refetch()
                                } catch (err: any) {
                                  toast.error(err?.response?.data?.message ?? err?.message ?? "Reject failed")
                                }
                              }}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Outbox */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">📤 Outbox (Sent)</h2>
                {outbox.isLoading && <p className="text-sm text-gray-600">Loading...</p>}
                {(outbox.data ?? []).length === 0 && !outbox.isLoading && (
                  <p className="text-sm text-gray-500">No sent referrals.</p>
                )}
                <div className="space-y-3">
                  {(outbox.data ?? []).slice(0, 8).map((r) => (
                    <div key={r._id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">#{r.referralCode ?? r._id.slice(-6)}</p>
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">{r.status}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">Mother: {typeof r.motherId === "object" ? pickName(r.motherId) : "—"}</p>
                        <p className="text-sm text-gray-600">To: {typeof r.toHospital === "object" ? pickName(r.toHospital) : "—"}</p>
                      </div>
                      <Link href={`/referrals/${r._id}`} className="text-sm px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 text-center font-medium">
                        View
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              {/* Checked-In */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">✅ Checked-in Mothers</h2>
                {checkedIn.isLoading && <p className="text-sm text-gray-600">Loading...</p>}
                {(checkedIn.data ?? []).length === 0 && !checkedIn.isLoading && (
                  <p className="text-sm text-gray-500">No checked-in referrals.</p>
                )}
                <div className="space-y-3">
                  {(checkedIn.data ?? []).slice(0, 8).map((r) => (
                    <div key={r._id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">#{r.referralCode ?? r._id.slice(-6)}</p>
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">{r.status}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">Mother: {typeof r.motherId === "object" ? pickName(r.motherId) : "—"}</p>
                        <p className="text-sm text-gray-600">From: {typeof r.fromHospital === "object" ? pickName(r.fromHospital) : "—"}</p>
                      </div>
                      <Link href={`/referrals/${r._id}`} className="text-sm px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 text-center font-medium">
                        Review
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
