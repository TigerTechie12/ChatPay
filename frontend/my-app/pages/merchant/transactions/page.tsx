"use client"
import { useState, useEffect, useRef } from "react"
import axios from "axios"
import { Bell, X } from "lucide-react"

const API = process.env.NEXT_PUBLIC_MERCHANT_BACKEND_URL
const WS_URL = process.env.NEXT_PUBLIC_MERCHANT_BACKEND_URL

const AVATAR_COLORS = [
  "bg-orange-500","bg-teal-600","bg-green-600","bg-blue-500",
  "bg-purple-500","bg-red-500","bg-pink-500","bg-indigo-500",
]
function avatarColor(seed: string) {
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length
  return AVATAR_COLORS[Math.abs(h)]
}
function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
}
function formatAmount(paise: number) {
  return `+₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
}
function formatDateTime(ts: string) {
  const d = new Date(ts)
  const day = d.getDate().toString().padStart(2, "0")
  const mon = d.toLocaleString("en-IN", { month: "short" })
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })
  return `${day} ${mon} · ${time}`
}

const ACCENTS = {
  green:  { text: "text-green-600" },
  blue:   { text: "text-blue-600"  },
  purple: { text: "text-purple-600"},
  orange: { text: "text-orange-500"},
}
type AccentKey = keyof typeof ACCENTS

export function MerchantTransactions() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [fetching, setFetching] = useState(true)
  const [wsConnected, setWsConnected] = useState(false)
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [accent, setAccent] = useState<AccentKey>("green")
  const [showTweaks, setShowTweaks] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const savedTheme = localStorage.getItem("merchant_theme") as "light" | "dark" | null
    if (savedTheme) setTheme(savedTheme)
    const savedAccent = localStorage.getItem("merchant_accent") as AccentKey | null
    if (savedAccent && savedAccent in ACCENTS) setAccent(savedAccent)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem("merchant_token")
    axios.get(`${API}/api/merchant/transactions`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(res => {
      setTransactions(res.data.merchantPayments ?? [])
    }).catch(console.error).finally(() => setFetching(false))
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

  const isDark = theme === "dark"
  const ac = ACCENTS[accent]
  const bg   = isDark ? "bg-gray-950"                 : "bg-[#f5f5f0]"
  const card = isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
  const tx   = isDark ? "text-gray-100"               : "text-gray-900"
  const sub  = isDark ? "text-gray-400"               : "text-gray-500"
  const lbl  = isDark ? "text-gray-500"               : "text-gray-400"
  const thd  = isDark ? "text-gray-500 border-gray-800" : "text-gray-400 border-gray-100"
  const row  = isDark ? "border-gray-800 hover:bg-gray-800/50" : "border-gray-50 hover:bg-gray-50/80"

  return (
    <div className={`min-h-screen ${bg} p-6 transition-colors duration-200`}>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${tx}`}>Transactions</h1>
          <p className={`text-sm ${sub} mt-0.5 flex items-center gap-1.5`}>
            {fetching ? "Loading…" : `${transactions.length} recent`} · live feed
            {wsConnected && (
              <span className="inline-flex items-center gap-1 text-green-500 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              </span>
            )}
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

      <div className={`relative rounded-2xl border ${card}`}>
        <table className="w-full">
          <thead>
            <tr className={`border-b ${thd}`}>
              <th className={`text-[10px] font-semibold tracking-widest uppercase text-left px-6 py-4 ${thd}`}>Payer</th>
              <th className={`text-[10px] font-semibold tracking-widest uppercase text-left px-4 py-4 ${thd}`}>Method</th>
              <th className={`text-[10px] font-semibold tracking-widest uppercase text-left px-4 py-4 ${thd}`}>Time</th>
              <th className={`text-[10px] font-semibold tracking-widest uppercase text-right px-4 py-4 ${thd}`}>Amount</th>
              <th className={`text-[10px] font-semibold tracking-widest uppercase text-left px-6 py-4 ${thd}`}>Status</th>
            </tr>
          </thead>
          <tbody>
            {fetching ? (
              <tr>
                <td colSpan={5} className={`py-16 text-center text-sm ${lbl}`}>Loading…</td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={5} className={`py-16 text-center text-sm ${lbl}`}>No transactions yet</td>
              </tr>
            ) : (
              transactions.map((t: any, i) => {
                const name = t.userName ?? `User ${t.userId ?? i}`
                const via = t.via ?? "QR"
                const status = t.status ?? "SUCCESS"
                const statusLabel = status.charAt(0) + status.slice(1).toLowerCase()
                const statusStyle =
                  status === "SUCCESS" || status === "COMPLETED"
                    ? "bg-green-50 text-green-700"
                    : status === "PROCESSING"
                    ? "bg-amber-50 text-amber-700"
                    : status === "QUEUED"
                    ? "bg-gray-100 text-gray-500"
                    : status === "FAILED"
                    ? "bg-red-50 text-red-600"
                    : "bg-gray-100 text-gray-500"
                const dotStyle =
                  status === "SUCCESS" || status === "COMPLETED" ? "bg-green-500"
                  : status === "PROCESSING" ? "bg-amber-500"
                  : status === "QUEUED" ? "bg-gray-400"
                  : status === "FAILED" ? "bg-red-500"
                  : "bg-gray-400"

                return (
                  <tr key={t.id ?? i} className={`border-b last:border-0 transition-colors ${row}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full ${avatarColor(String(name))} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                          {getInitials(String(name))}
                        </div>
                        <span className={`text-sm font-semibold ${tx}`}>{name}</span>
                      </div>
                    </td>
                    <td className={`px-4 py-4 text-sm ${sub}`}>{via}</td>
                    <td className={`px-4 py-4 text-sm font-mono ${sub}`}>{formatDateTime(t.timestamp)}</td>
                    <td className={`px-4 py-4 text-sm font-semibold tabular-nums text-right ${ac.text}`}>
                      {formatAmount(t.amount ?? 0)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusStyle}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${dotStyle}`} />
                        {statusLabel}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        {showTweaks && (
          <div className={`absolute top-0 right-0 w-72 rounded-2xl border shadow-2xl p-5 z-20 ${card}`}>
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
                      a === "green"  ? "bg-green-500"  :
                      a === "blue"   ? "bg-blue-500"   :
                      a === "purple" ? "bg-purple-500" :
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
  )
}

export default MerchantTransactions
