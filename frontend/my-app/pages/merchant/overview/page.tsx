"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import axios from "axios"
import { Bell, Download, X } from "lucide-react"
import QRCode from "qrcode"
import { MerchantLayout } from "@/components/MerchantLayout"

const API = process.env.NEXT_PUBLIC_MERCHANT_BACKEND_URL
const WS_URL = process.env.NEXT_PUBLIC_MERCHANT_BACKEND_URL

const AVATAR_COLORS = [
  "bg-orange-500","bg-teal-600","bg-green-600","bg-blue-500",
  "bg-purple-500","bg-red-500","bg-pink-500","bg-indigo-500",
]

function avatarColor(name: string) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length
  return AVATAR_COLORS[Math.abs(h)]
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
}

function formatAmount(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
}

function formatTime(ts: string | number) {
  return new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })
}

const ACCENTS = {
  green:  { dot: "bg-green-500",  btn: "bg-green-500 hover:bg-green-600",  text: "text-green-600"  },
  blue:   { dot: "bg-blue-500",   btn: "bg-blue-500 hover:bg-blue-600",    text: "text-blue-600"   },
  purple: { dot: "bg-purple-500", btn: "bg-purple-500 hover:bg-purple-600",text: "text-purple-600" },
  orange: { dot: "bg-orange-400", btn: "bg-orange-400 hover:bg-orange-500",text: "text-orange-500" },
}
type AccentKey = keyof typeof ACCENTS

export function MerchantOverview() {
  const [totalBalance, setTotalBalance] = useState(0)
  const [locked, setLocked] = useState(0)
  const [transactions, setTransactions] = useState<any[]>([])
  const [qrDataURL, setQrDataURL] = useState("")
  const [qrString, setQrString] = useState("")
  const [wsConnected, setWsConnected] = useState(false)
  const [merchantName, setMerchantName] = useState("My Store")
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [accent, setAccent] = useState<AccentKey>("green")
  const [showTweaks, setShowTweaks] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const qrRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const savedTheme = localStorage.getItem("merchant_theme") as "light" | "dark" | null
    if (savedTheme) setTheme(savedTheme)
    const savedAccent = localStorage.getItem("merchant_accent") as AccentKey | null
    if (savedAccent && savedAccent in ACCENTS) setAccent(savedAccent)

    const token = localStorage.getItem("merchant_token")
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]))
        if (payload.name) setMerchantName(payload.name)
      } catch {}
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem("merchant_token")
    const headers = { Authorization: `Bearer ${token}` }

    Promise.all([
      axios.get(`${API}/api/v1/merchant/balance`, { headers }),
      axios.get(`${API}/api/v1/merchant/transactions`, { headers }),
      axios.get(`${API}/api/v1/qr/list`, { headers }),
    ]).then(([balRes, txRes, qrRes]) => {
      setTotalBalance(balRes.data.totalBalance ?? 0)
      setLocked(balRes.data.locked ?? 0)
      setTransactions(txRes.data.merchantPayments ?? [])

      const qrList: any[] = qrRes.data.qrList ?? []
      if (qrList.length > 0 && qrList[0].code) {
        const code = qrList[0].code
        setQrString(code)
        QRCode.toDataURL(code, { width: 240, margin: 2 }).then(url => setQrDataURL(url))
      }
    }).catch(console.error)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem("merchant_token")
    if (!token) return
    const ws = new WebSocket(`${WS_URL}?token=${token}`)
    wsRef.current = ws
    ws.onopen = () => setWsConnected(true)
    ws.onclose = () => setWsConnected(false)
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        setTransactions(prev => [data, ...prev])
      } catch {}
    }
    return () => ws.close()
  }, [])

  function saveTheme(t: "light" | "dark") {
    setTheme(t)
    localStorage.setItem("merchant_theme", t)
  }
  function saveAccent(a: AccentKey) {
    setAccent(a)
    localStorage.setItem("merchant_accent", a)
  }

  function downloadQR() {
    if (!qrDataURL) return
    const link = document.createElement("a")
    link.href = qrDataURL
    link.download = "chatpay-qr.png"
    link.click()
  }

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayTxns = transactions.filter(t => new Date(t.timestamp) >= todayStart)
  const todayReceipts = todayTxns.reduce((s, t) => s + (t.amount ?? 0), 0)

  const allAmounts = transactions.map(t => t.amount ?? 0)
  const avgTicket = allAmounts.length ? allAmounts.reduce((a, b) => a + b, 0) / allAmounts.length : 0

  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7); weekAgo.setHours(0, 0, 0, 0)
  const twoWeeksAgo = new Date(); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14); twoWeeksAgo.setHours(0, 0, 0, 0)
  const thisWeek = transactions.filter(t => new Date(t.timestamp) >= weekAgo)
  const prevWeek = transactions.filter(t => new Date(t.timestamp) >= twoWeeksAgo && new Date(t.timestamp) < weekAgo)
  const thisAvg = thisWeek.length ? thisWeek.reduce((s, t) => s + t.amount, 0) / thisWeek.length : 0
  const prevAvg = prevWeek.length ? prevWeek.reduce((s, t) => s + t.amount, 0) / prevWeek.length : 0
  const avgChange = prevAvg ? Math.round(((thisAvg - prevAvg) / prevAvg) * 100) : 0

  const isDark = theme === "dark"
  const ac = ACCENTS[accent]

  const bg    = isDark ? "bg-gray-950"                    : "bg-[#f5f5f0]"
  const card  = isDark ? "bg-gray-900 border-gray-800"    : "bg-white border-gray-200"
  const tx    = isDark ? "text-gray-100"                  : "text-gray-900"
  const sub   = isDark ? "text-gray-400"                  : "text-gray-500"
  const lbl   = isDark ? "text-gray-500"                  : "text-gray-400"
  const div   = isDark ? "divide-gray-800"                : "divide-gray-100"

  return (
    <MerchantLayout>
    <div className={`min-h-screen ${bg} p-4 sm:p-6 transition-colors duration-200`}>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${tx}`}>Overview</h1>
          <p className={`text-sm ${sub} mt-0.5 flex items-center gap-1.5`}>
            {merchantName}
            <span className="inline-flex items-center gap-1 text-green-500 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              live
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTweaks(v => !v)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${card} ${sub} hover:border-gray-400`}
          >
            Tweaks
          </button>
          <button className={`relative p-2 rounded-xl border ${card} transition-colors`}>
            <Bell className={`w-5 h-5 ${sub}`} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <div className={`rounded-2xl border p-5 ${card}`}>
          <p className={`text-[10px] tracking-widest uppercase font-semibold ${lbl} mb-3`}>Total Earnings</p>
          <p className={`text-2xl font-bold tabular-nums ${ac.text}`}>{formatAmount(totalBalance)}</p>
          <p className={`text-xs ${lbl} mt-1`}>Lifetime</p>
        </div>
        <div className={`rounded-2xl border p-5 ${card}`}>
          <p className={`text-[10px] tracking-widest uppercase font-semibold ${lbl} mb-3`}>Today's Receipts</p>
          <p className={`text-2xl font-bold tabular-nums ${ac.text}`}>{formatAmount(todayReceipts)}</p>
          <p className={`text-xs ${lbl} mt-1`}>{todayTxns.length} transactions</p>
        </div>
        <div className={`rounded-2xl border p-5 ${card}`}>
          <p className={`text-[10px] tracking-widest uppercase font-semibold ${lbl} mb-3`}>Pending Payout</p>
          <p className="text-2xl font-bold tabular-nums text-amber-500">{formatAmount(locked)}</p>
          <p className={`text-xs ${lbl} mt-1`}>Next: 6:00 PM</p>
        </div>
        <div className={`rounded-2xl border p-5 ${card}`}>
          <p className={`text-[10px] tracking-widest uppercase font-semibold ${lbl} mb-3`}>Avg. Ticket</p>
          <p className={`text-2xl font-bold tabular-nums ${tx}`}>{formatAmount(avgTicket)}</p>
          <p className={`text-xs mt-1 ${avgChange >= 0 ? "text-green-500" : "text-red-500"}`}>
            {avgChange >= 0 ? "+" : ""}{avgChange}% vs. last week
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        <div className={`lg:col-span-3 rounded-2xl border p-6 ${card}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className={`text-base font-semibold ${tx}`}>Recent payments</h2>
              <p className={`text-sm ${sub}`}>
                Live feed · socket {wsConnected ? "connected" : "disconnected"}
              </p>
            </div>
            <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
              wsConnected
                ? "bg-green-50 text-green-700 border border-green-100"
                : isDark ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-500"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
              {wsConnected ? "Live" : "Offline"}
            </span>
          </div>

          <div className={`divide-y ${div} max-h-[480px] overflow-y-auto`}>
            {transactions.length === 0 ? (
              <p className={`py-10 text-center text-sm ${lbl}`}>No payments yet</p>
            ) : (
              transactions.map((t: any, i) => {
                const name = t.userName ?? `User ${t.userId ?? i}`
                const via = t.via ?? "QR"
                return (
                  <div key={i} className="flex items-center gap-4 py-3.5">
                    <div className={`w-10 h-10 rounded-full ${avatarColor(String(name))} flex items-center justify-center text-white text-sm font-semibold flex-shrink-0`}>
                      {getInitials(String(name))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm ${tx}`}>{name}</p>
                      <p className={`text-xs ${lbl} mt-0.5`}>{formatTime(t.timestamp)} · via {via}</p>
                    </div>
                    <p className={`font-semibold tabular-nums text-sm ${ac.text}`}>
                      +{formatAmount(t.amount ?? 0)}
                    </p>
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                      ● Success
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-2 relative">

          <div className={`rounded-2xl border p-6 ${card}`}>
            <h2 className={`text-base font-semibold ${tx}`}>Your QR</h2>
            <p className={`text-sm ${sub} mb-4`}>Display at counter · accepts any ChatPay wallet</p>

            <div className={`rounded-xl border ${isDark ? "border-gray-700 bg-gray-800" : "border-gray-100 bg-gray-50"} p-4 flex items-center justify-center`}>
              {qrDataURL ? (
                <img src={qrDataURL} alt="Merchant QR" className="w-52 h-52 object-contain" />
              ) : (
                <div className={`w-52 h-52 flex items-center justify-center text-sm ${lbl}`}>
                  No QR generated yet
                </div>
              )}
            </div>

            {merchantName && (
              <p className={`text-xs font-medium text-center mt-3 ${sub}`}>{merchantName}</p>
            )}
            {qrString && (
              <p className={`text-[10px] font-mono text-center mt-0.5 truncate ${lbl}`}>{qrString}</p>
            )}

            <button
              onClick={downloadQR}
              disabled={!qrDataURL}
              className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed bg-gray-900 hover:bg-gray-800 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download QR
            </button>
          </div>

          {showTweaks && (
            <div className={`absolute bottom-0 left-0 right-0 rounded-2xl border shadow-2xl p-5 z-20 ${card}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-base font-semibold ${tx}`}>Tweaks</h3>
                <button onClick={() => setShowTweaks(false)} className={`${sub} hover:${tx} transition-colors`}>
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
                      className={`w-7 h-7 rounded-full ${ACCENTS[a].dot} transition-transform ${
                        accent === a ? "scale-125 ring-2 ring-offset-2 ring-gray-400" : "hover:scale-110"
                      }`}
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
    </MerchantLayout>
  )
}

export default MerchantOverview
