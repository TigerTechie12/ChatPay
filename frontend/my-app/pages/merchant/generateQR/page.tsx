"use client"
import { useState, useEffect, useCallback } from "react"
import axios from "axios"
import QRCode from "qrcode"
import { Download, Copy, Check, X } from "lucide-react"

const API = process.env.MERCHANT_BACKEND_URL

const ACCENTS = {
  green:  { text: "text-green-600" },
  blue:   { text: "text-blue-600"  },
  purple: { text: "text-purple-600"},
  orange: { text: "text-orange-500"},
}
type AccentKey = keyof typeof ACCENTS

export function GenerateQR() {
  const [amountPaise, setAmountPaise] = useState("")
  const [label, setLabel] = useState("")
  const [qrDataURL, setQrDataURL] = useState("")
  const [qrString, setQrString] = useState("")
  const [merchantId, setMerchantId] = useState<number | null>(null)
  const [merchantName, setMerchantName] = useState("My Store")
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [accent, setAccent] = useState<AccentKey>("green")
  const [showTweaks, setShowTweaks] = useState(false)

  useEffect(() => {
    const savedTheme = localStorage.getItem("merchant_theme") as "light" | "dark" | null
    if (savedTheme) setTheme(savedTheme)
    const savedAccent = localStorage.getItem("merchant_accent") as AccentKey | null
    if (savedAccent && savedAccent in ACCENTS) setAccent(savedAccent)

    const token = localStorage.getItem("merchant_token")
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]))
        if (payload.merchantId) setMerchantId(payload.merchantId)
        if (payload.name) setMerchantName(payload.name)
      } catch {}
    }
  }, [])

  const buildQrString = useCallback((paise: string, lbl: string, mid: number | null) => {
    if (!mid) return ""
    const amt = Number(paise) || 0
    return `chatpay://pay?merchantId=${mid}&amount=${amt}&label=${encodeURIComponent(lbl)}`
  }, [])

  useEffect(() => {
    const qs = buildQrString(amountPaise, label, merchantId)
    if (!qs) return
    setQrString(qs)
    QRCode.toDataURL(qs, { width: 260, margin: 2, color: { dark: "#0d1a2d", light: "#ffffff" } })
      .then(url => setQrDataURL(url))
      .catch(() => setQrDataURL(""))
  }, [amountPaise, label, merchantId, buildQrString])

  const amountINR = (Number(amountPaise) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })

  async function handleDownload() {
    setDownloading(true)
    try {
      const token = localStorage.getItem("merchant_token")
      const res = await axios.post(
        `${API}/api/qr/generate`,
        { amount: Number(amountPaise) || 0, label },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const url: string = res.data.dataURL
      const link = document.createElement("a")
      link.href = url
      link.download = `chatpay-qr-${label || "open"}.png`
      link.click()
    } catch {
      if (qrDataURL) {
        const link = document.createElement("a")
        link.href = qrDataURL
        link.download = `chatpay-qr-${label || "open"}.png`
        link.click()
      }
    } finally {
      setDownloading(false)
    }
  }

  function handleCopy() {
    if (!qrString) return
    navigator.clipboard.writeText(qrString).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function saveTheme(t: "light" | "dark") {
    setTheme(t)
    localStorage.setItem("merchant_theme", t)
  }
  function saveAccent(a: AccentKey) {
    setAccent(a)
    localStorage.setItem("merchant_accent", a)
  }

  const isDark = theme === "dark"
  const ac = ACCENTS[accent]
  const bg   = isDark ? "bg-gray-950"                 : "bg-[#f5f5f0]"
  const card = isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
  const tx   = isDark ? "text-gray-100"               : "text-gray-900"
  const sub  = isDark ? "text-gray-400"               : "text-gray-500"
  const lbl  = isDark ? "text-gray-500"               : "text-gray-400"
  const inp  = isDark
    ? "bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-600"
    : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"

  const shortId = merchantId ? `m_${String(merchantId).slice(0, 4)}` : "—"

  return (
    <div className={`min-h-screen ${bg} p-6 transition-colors duration-200`}>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${tx}`}>Generate QR</h1>
          <p className={`text-sm ${sub} mt-0.5`}>Create a static or amount-locked QR for this store</p>
        </div>
        <button
          onClick={() => setShowTweaks(v => !v)}
          className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${card} ${sub} hover:border-gray-400`}
        >
          Tweaks
        </button>
      </div>

      <div className="grid grid-cols-2 gap-5">

        <div className={`rounded-2xl border p-6 ${card}`}>
          <h2 className={`text-base font-semibold ${tx} mb-1`}>Parameters</h2>
          <p className={`text-sm ${sub} mb-5`}>
            Lock the amount for counter checkout, or leave at 0 for open-amount.
          </p>

          <div className="space-y-4">
            <div>
              <label className={`block text-sm ${sub} mb-1.5`}>Amount (paise) — 0 for open</label>
              <input
                type="number"
                value={amountPaise}
                onChange={e => setAmountPaise(e.target.value)}
                placeholder="0"
                min={0}
                className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-gray-400 transition-colors ${inp}`}
              />
              {Number(amountPaise) > 0 && (
                <p className={`text-xs font-mono mt-1.5 ${lbl}`}>displays as ₹{amountINR}</p>
              )}
            </div>

            <div>
              <label className={`block text-sm ${sub} mb-1.5`}>Label</label>
              <input
                type="text"
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="e.g. Coffee Shop"
                className={`w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-gray-400 transition-colors ${inp}`}
              />
            </div>

            {qrString && (
              <>
                <div className={`h-px ${isDark ? "bg-gray-800" : "bg-gray-100"}`} />
                <div>
                  <label className={`block text-sm ${sub} mb-1.5`}>Encoded URI</label>
                  <div className={`rounded-xl border px-4 py-3 text-xs font-mono break-all leading-relaxed ${isDark ? "border-gray-700 bg-gray-800 text-gray-300" : "border-gray-200 bg-gray-50 text-gray-600"}`}>
                    {qrString}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleDownload}
              disabled={!qrDataURL || downloading}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl text-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              {downloading ? "Saving…" : "Download PNG"}
            </button>
            <button
              onClick={handleCopy}
              disabled={!qrString}
              className={`flex-1 flex items-center justify-center gap-2 border font-semibold py-3.5 rounded-xl text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                isDark
                  ? "border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy URI"}
            </button>
          </div>
        </div>

        <div className="relative">
          <div className={`rounded-2xl border p-6 ${card}`}>
            <p className={`text-[10px] tracking-widest uppercase font-semibold ${lbl} text-center mb-5`}>Preview</p>

            <div className={`rounded-2xl border mx-auto max-w-xs overflow-hidden ${isDark ? "border-gray-700 bg-gray-800" : "border-gray-100 bg-white"}`}
              style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.10)" }}>

              <div className="px-6 pt-6 pb-2 text-center">
                <p className={`text-xs ${lbl} mb-0.5`}>Scan to pay</p>
                <p className={`text-lg font-bold ${tx}`}>{merchantName}</p>
              </div>

              <div className="flex items-center justify-center px-6 py-4">
                {qrDataURL ? (
                  <img src={qrDataURL} alt="QR Code" className="w-52 h-52 object-contain" />
                ) : (
                  <div className={`w-52 h-52 rounded-xl flex items-center justify-center text-sm ${isDark ? "bg-gray-700 text-gray-500" : "bg-gray-50 text-gray-400"}`}>
                    Enter parameters to preview
                  </div>
                )}
              </div>

              <div className="px-6 pb-5 text-center">
                {Number(amountPaise) > 0 ? (
                  <p className={`text-3xl font-bold tabular-nums font-mono ${ac.text}`}>
                    ₹{amountINR}
                  </p>
                ) : (
                  <p className={`text-sm ${lbl}`}>Open amount</p>
                )}
                {label && <p className={`text-sm ${sub} mt-1`}>{label}</p>}
                <p className={`text-[10px] font-mono mt-4 ${lbl}`}>Merchant ID {shortId}</p>
              </div>
            </div>
          </div>

          {showTweaks && (
            <div className={`absolute bottom-0 left-0 right-0 rounded-2xl border shadow-2xl p-5 z-20 ${card}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-base font-semibold ${tx}`}>Tweaks</h3>
                <button onClick={() => setShowTweaks(false)} className={`${sub} transition-colors`}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between mb-4">
                <p className={`text-sm ${sub}`}>Theme</p>
                <div className={`flex rounded-lg border overflow-hidden ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                  {(["light", "dark"] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => saveTheme(t)}
                      className={`px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                        theme === t
                          ? isDark ? "bg-gray-100 text-gray-900" : "bg-gray-900 text-white"
                          : isDark ? "bg-gray-800 text-gray-400 hover:text-gray-200" : "bg-white text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <p className={`text-sm ${sub}`}>Accent</p>
                <div className="flex gap-2">
                  {(Object.keys(ACCENTS) as AccentKey[]).map(a => (
                    <button
                      key={a}
                      onClick={() => saveAccent(a)}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        a === "green" ? "bg-green-500" :
                        a === "blue"  ? "bg-blue-500"  :
                        a === "purple"? "bg-purple-500":
                                        "bg-orange-400"
                      } ${accent === a ? "scale-125 ring-2 ring-offset-2 ring-gray-400" : "hover:scale-110"}`}
                    />
                  ))}
                </div>
              </div>

              <p className={`text-xs ${lbl}`}>Navigate via sidebar · state persists in localStorage</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default GenerateQR
