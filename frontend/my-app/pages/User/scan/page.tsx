"use client"
import { useEffect, useRef, useState, useCallback } from "react"
import axios from "axios"
import { Bell, Loader2, CheckCircle2, X } from "lucide-react"

const API = process.env.NEXT_PUBLIC_USER_BACKEND_URL

interface MerchantInfo { id: number; name: string; verified: boolean }
interface ParsedQR { merchantId: number; amount: number | null; label: string }

function parseQR(raw: string): ParsedQR | null {
  try {
    const urlStr = raw.replace(/^payapp:\/\//, "https://x/").replace(/^chatpay:\/\//, "https://x/")
    const url = new URL(urlStr)
    const merchantId = parseInt(url.searchParams.get("merchantId") || "")
    if (isNaN(merchantId)) return null
    const amt = url.searchParams.get("amount")
    return {
      merchantId,
      amount: amt ? parseFloat(amt) : null,
      label: url.searchParams.get("label")?.replace(/\+/g, " ") ?? "",
    }
  } catch { return null }
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
}

const AVATAR_COLORS = ["bg-orange-500","bg-teal-600","bg-green-600","bg-blue-500","bg-purple-500","bg-red-500"]
function avatarColor(name: string) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length
  return AVATAR_COLORS[Math.abs(h)]
}

export function ScanPay() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const detectorRef = useRef<any>(null)
  const detectedRef = useRef(false)

  const [camError, setCamError] = useState("")
  const [detected, setDetected] = useState(false)
  const [rawQR, setRawQR] = useState("")
  const [parsed, setParsed] = useState<ParsedQR | null>(null)
  const [merchant, setMerchant] = useState<MerchantInfo | null>(null)
  const [customAmount, setCustomAmount] = useState("")
  const [fetchingMerchant, setFetchingMerchant] = useState(false)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState("")
  const [success, setSuccess] = useState(false)

  async function fetchMerchant(merchantId: number) {
    setFetchingMerchant(true)
    try {
      const token = localStorage.getItem("token")
      const res = await axios.get(`${API}/merchant/${merchantId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setMerchant(res.data)
    } catch {
      setMerchant({ id: merchantId, name: "Unknown Merchant", verified: false })
    } finally {
      setFetchingMerchant(false)
    }
  }

  const scan = useCallback(async () => {
    if (!videoRef.current || !detectorRef.current || detectedRef.current) return
    if (videoRef.current.readyState >= videoRef.current.HAVE_ENOUGH_DATA) {
      try {
        const codes = await detectorRef.current.detect(videoRef.current)
        if (codes.length > 0) {
          const raw: string = codes[0].rawValue
          const p = parseQR(raw)
          if (p) {
            detectedRef.current = true
            setDetected(true)
            setRawQR(raw)
            setParsed(p)
            if (p.amount) setCustomAmount(String(p.amount))
            fetchMerchant(p.merchantId)
            return
          }
        }
      } catch {}
    }
    rafRef.current = requestAnimationFrame(scan)
  }, [])

  useEffect(() => {
    async function startCamera() {
      if (!("BarcodeDetector" in window)) {
        setCamError("QR scanning requires Chrome 83+ or Edge. Please use a supported browser.")
        return
      }
      try {
        detectorRef.current = new (window as any).BarcodeDetector({ formats: ["qr_code"] })
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        rafRef.current = requestAnimationFrame(scan)
      } catch (e: any) {
        if (e.name === "NotAllowedError")
          setCamError("Camera permission denied. Please allow camera access and reload.")
        else
          setCamError("Could not access camera: " + e.message)
      }
    }
    startCamera()
    return () => {
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [scan])

  async function handlePay() {
    if (!parsed || !merchant) return
    const amt = parseFloat(customAmount)
    if (!amt || amt <= 0) { setPayError("Enter a valid amount"); return }
    setPayError("")
    setPaying(true)
    try {
      const token = localStorage.getItem("token")
      await axios.post(
        `${API}/transfer/merchant`,
        { amount: amt, merchantId: merchant.id, label: parsed.label },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setSuccess(true)
    } catch (e: any) {
      setPayError(e.response?.data?.message || "Payment failed. Please try again.")
    } finally {
      setPaying(false)
    }
  }

  function reset() {
    detectedRef.current = false
    setDetected(false)
    setRawQR("")
    setParsed(null)
    setMerchant(null)
    setCustomAmount("")
    setPayError("")
    setSuccess(false)
    rafRef.current = requestAnimationFrame(scan)
  }

  const payAmount = parseFloat(customAmount) || 0

  return (
    <div className="min-h-screen bg-[#f5f5f0] p-6">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scan &amp; Pay</h1>
          <p className="text-sm text-gray-500 mt-0.5">Point your camera at a merchant QR</p>
        </div>
        <button className="relative p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
          <Bell className="w-5 h-5 text-gray-600" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
      </div>

      <div className="flex justify-center">
        <div
          className="relative flex-shrink-0"
          style={{
            width: 360,
            height: 660,
            borderRadius: "2.8rem",
            background: "#0d0d0d",
            border: "12px solid #1c1c1c",
            boxShadow: "0 0 0 2px #2a2a2a, 0 40px 100px rgba(0,0,0,0.55)",
            overflow: "hidden",
          }}
        >
          {camError ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-950 px-8 text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center text-3xl">📷</div>
              <p className="text-gray-400 text-sm leading-relaxed">{camError}</p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />

              <div className="absolute inset-0 bg-black/45 pointer-events-none" />

              <button
                onClick={reset}
                className="absolute top-5 right-5 z-20 w-9 h-9 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="absolute top-6 left-0 right-0 flex justify-center z-20 pointer-events-none">
                <span className={`text-sm font-medium px-3 py-1 rounded-full transition-colors ${
                  detected
                    ? "bg-green-500/20 text-green-400 border border-green-400/40"
                    : "text-white/50"
                }`}>
                  {detected ? "QR detected" : "Scanning…"}
                </span>
              </div>

              {!detected && (
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                  <div className="relative w-52 h-52">
                    {[
                      "top-0 left-0 border-t-2 border-l-2 rounded-tl-lg",
                      "top-0 right-0 border-t-2 border-r-2 rounded-tr-lg",
                      "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-lg",
                      "bottom-0 right-0 border-b-2 border-r-2 rounded-br-lg",
                    ].map((cls, i) => (
                      <div key={i} className={`absolute w-8 h-8 border-green-400 ${cls}`} />
                    ))}
                    <div
                      className="absolute inset-x-2 h-px bg-gradient-to-r from-transparent via-green-400 to-transparent"
                      style={{ animation: "sweep 2s ease-in-out infinite" }}
                    />
                  </div>
                </div>
              )}

              {detected && (
                <div className="absolute bottom-0 left-0 right-0 bg-white z-30 rounded-t-3xl shadow-2xl">
                  <div className="flex justify-center pt-3 pb-0.5">
                    <div className="w-10 h-1 rounded-full bg-gray-200" />
                  </div>

                  <div className="px-5 pb-6 pt-2 max-h-96 overflow-y-auto">
                    {success ? (
                      <div className="flex flex-col items-center py-5 gap-3">
                        <CheckCircle2 className="w-14 h-14 text-green-500" />
                        <p className="text-base font-bold text-gray-900">Payment successful!</p>
                        <p className="text-xs text-gray-400">
                          ₹{payAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })} paid to {merchant?.name}
                        </p>
                        <button
                          onClick={reset}
                          className="mt-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-colors"
                        >
                          Scan another
                        </button>
                      </div>
                    ) : fetchingMerchant ? (
                      <div className="flex items-center justify-center py-10">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 mb-5">
                          <div className={`w-12 h-12 rounded-2xl ${avatarColor(merchant?.name ?? "M")} flex items-center justify-center text-white font-bold text-base flex-shrink-0`}>
                            {getInitials(merchant?.name ?? "M")}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 text-sm">{merchant?.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {parsed?.label || "Merchant"} · {merchant?.verified ? "Verified merchant" : "Unverified"}
                            </p>
                          </div>
                          {merchant?.verified && (
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full flex-shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                              Trusted
                            </span>
                          )}
                        </div>

                        <div className="text-center mb-2">
                          <p className="text-[10px] tracking-widest text-gray-400 uppercase mb-2">Amount to Pay</p>
                          {parsed?.amount ? (
                            <p className="text-4xl font-bold text-gray-900 tabular-nums">
                              ₹{parsed.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </p>
                          ) : (
                            <div className="flex items-center justify-center border border-gray-200 rounded-xl px-3 py-2 mx-4">
                              <span className="text-2xl text-gray-400 mr-1">₹</span>
                              <input
                                type="number"
                                value={customAmount}
                                onChange={e => { setCustomAmount(e.target.value); setPayError("") }}
                                placeholder="0"
                                className="text-3xl font-bold text-gray-900 outline-none bg-transparent w-28 tabular-nums text-center placeholder:text-gray-300"
                                autoFocus
                              />
                            </div>
                          )}
                        </div>

                        <p className="text-[9px] text-gray-400 text-center font-mono truncate px-4 mb-0.5">{rawQR}</p>
                        <p className="text-[10px] text-gray-400 text-center mb-4">From HDFC ChatPay Wallet</p>

                        {payError && (
                          <p className="text-xs text-red-500 text-center mb-3">{payError}</p>
                        )}

                        <button
                          onClick={handlePay}
                          disabled={paying || payAmount <= 0}
                          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-200 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl text-sm transition-colors flex items-center justify-center gap-2"
                        >
                          {paying ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                          ) : (
                            `Confirm Payment · ₹${payAmount > 0 ? payAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}`
                          )}
                        </button>

                        <button
                          onClick={reset}
                          className="w-full text-gray-500 hover:text-gray-800 text-sm font-medium py-3 transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes sweep {
          0%   { top: 4px; opacity: 0.9; }
          50%  { top: calc(100% - 4px); opacity: 0.7; }
          100% { top: 4px; opacity: 0.9; }
        }
      `}</style>
    </div>
  )
}

export default ScanPay
