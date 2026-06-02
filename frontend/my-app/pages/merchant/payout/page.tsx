"use client"
import { useState, useEffect } from "react"
import axios from "axios"
import { Bell, Loader2, X } from "lucide-react"
import { MerchantLayout } from "@/components/MerchantLayout"

const API = process.env.NEXT_PUBLIC_MERCHANT_BACKEND_URL

const IFSC_BANK_MAP: Record<string, string> = {
  HDFC: "HDFC", SBIN: "SBI", UTIB: "Axis", ICIC: "ICICI",
  KKBK: "Kotak", PUNB: "PNB", BARB: "Bank of Baroda", UBIN: "Union",
}
function bankFromIfsc(ifsc: string) {
  const prefix = ifsc.slice(0, 4).toUpperCase()
  return IFSC_BANK_MAP[prefix] ?? ifsc.slice(0, 4).toUpperCase()
}

function formatAmount(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
}
function formatDate(ts: string) {
  const d = new Date(ts)
  const day = d.getDate().toString().padStart(2, "0")
  const mon = d.toLocaleString("en-IN", { month: "short" })
  return `${day} ${mon} ${d.getFullYear()}`
}
function formatShortDate(ts: string) {
  const d = new Date(ts)
  const day = d.getDate().toString().padStart(2, "0")
  const mon = d.toLocaleString("en-IN", { month: "short" })
  return `${day} ${mon}`
}

const STATUS_STYLE: Record<string, { badge: string; dot: string; label: string }> = {
  SUCCESS:      { badge: "bg-green-50 text-green-700",   dot: "bg-green-500",  label: "Success"    },
  COMPLETED:    { badge: "bg-green-50 text-green-700",   dot: "bg-green-500",  label: "Success"    },
  PROCESSING:   { badge: "bg-amber-50 text-amber-700",   dot: "bg-amber-500",  label: "Processing" },
  QUEUED:       { badge: "bg-gray-100 text-gray-500",    dot: "bg-gray-400",   label: "Queued"     },
  FAILED:       { badge: "bg-red-50 text-red-600",       dot: "bg-red-500",    label: "Failed"     },
  RETRYPENDING: { badge: "bg-orange-50 text-orange-700", dot: "bg-orange-400", label: "Retrying"   },
}

const ACCENTS = {
  green:  { text: "text-green-600",  btn: "bg-green-600 hover:bg-green-700"  },
  blue:   { text: "text-blue-600",   btn: "bg-blue-600 hover:bg-blue-700"    },
  purple: { text: "text-purple-600", btn: "bg-purple-600 hover:bg-purple-700"},
  orange: { text: "text-orange-500", btn: "bg-orange-500 hover:bg-orange-600"},
}
type AccentKey = keyof typeof ACCENTS

interface LinkedAccount { accountNumber: string; ifscCode: string }

export function MerchantPayout() {
  const [locked, setLocked] = useState(0)
  const [payouts, setPayouts] = useState<any[]>([])
  const [fetching, setFetching] = useState(true)
  const [account, setAccount] = useState<LinkedAccount | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ amount: "", accountNumber: "", ifscCode: "", provider: "NEFT" })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")
  const [successId, setSuccessId] = useState<number | null>(null)
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [accent, setAccent] = useState<AccentKey>("green")
  const [showTweaks, setShowTweaks] = useState(false)

  useEffect(() => {
    const savedTheme = localStorage.getItem("merchant_theme") as "light" | "dark" | null
    if (savedTheme) setTheme(savedTheme)
    const savedAccent = localStorage.getItem("merchant_accent") as AccentKey | null
    if (savedAccent && savedAccent in ACCENTS) setAccent(savedAccent)

    const saved = localStorage.getItem("merchant_linked_account")
    if (saved) {
      const acc = JSON.parse(saved)
      setAccount(acc)
      setForm(f => ({ ...f, accountNumber: acc.accountNumber, ifscCode: acc.ifscCode }))
    }

    const token = localStorage.getItem("merchant_token")
    const headers = { Authorization: `Bearer ${token}` }
    Promise.all([
      axios.get(`${API}/api/v1/merchant/balance`, { headers }),
      axios.get(`${API}/api/v1/merchant/payouts`, { headers }),
    ]).then(([balRes, payRes]) => {
      setLocked(balRes.data.locked ?? 0)
      setPayouts(payRes.data.payouts ?? [])
    }).catch(console.error).finally(() => setFetching(false))
  }, [])

  const lastPayout = payouts.find(p => p.status === "SUCCESS" || p.status === "COMPLETED")

  async function handleManualPayout() {
    setFormError("")
    const amt = parseFloat(form.amount)
    if (!amt || amt <= 0) { setFormError("Enter a valid amount in rupees"); return }
    if (!form.accountNumber || !form.ifscCode) { setFormError("Account number and IFSC are required"); return }
    setSubmitting(true)
    try {
      const token = localStorage.getItem("merchant_token")
      const res = await axios.post(
        `${API}/api/v1/merchant/manual/withdraw`,
        { amount: amt, provider: form.provider, accountNumber: form.accountNumber, ifscCode: form.ifscCode.toUpperCase() },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      localStorage.setItem("merchant_linked_account", JSON.stringify({ accountNumber: form.accountNumber, ifscCode: form.ifscCode.toUpperCase() }))
      setAccount({ accountNumber: form.accountNumber, ifscCode: form.ifscCode.toUpperCase() })
      setSuccessId(res.data.id)
      setShowModal(false)
      setPayouts(prev => [{
        id: res.data.id,
        amount: amt * 100,
        status: "QUEUED",
        accountNumber: form.accountNumber,
        ifscCode: form.ifscCode.toUpperCase(),
        startedAt: new Date().toISOString(),
      }, ...prev])
    } catch (e: any) {
      setFormError(e.response?.data?.message || "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  function saveTheme(t: "light" | "dark") { setTheme(t); localStorage.setItem("merchant_theme", t) }
  function saveAccent(a: AccentKey) { setAccent(a); localStorage.setItem("merchant_accent", a) }

  const isDark = theme === "dark"
  const ac = ACCENTS[accent]
  const bg   = isDark ? "bg-gray-950"                 : "bg-[#f5f5f0]"
  const card = isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
  const tx   = isDark ? "text-gray-100"               : "text-gray-900"
  const sub  = isDark ? "text-gray-400"               : "text-gray-500"
  const lbl  = isDark ? "text-gray-500"               : "text-gray-400"
  const thd  = isDark ? "text-gray-500 border-gray-800" : "text-gray-400 border-gray-100"
  const row  = isDark ? "border-gray-800 hover:bg-gray-800/50" : "border-gray-50 hover:bg-gray-50/70"
  const inp  = isDark
    ? "bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-600"
    : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"

  return (
    <MerchantLayout>
    <div className={`min-h-screen ${bg} p-4 sm:p-6 transition-colors duration-200`}>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${tx}`}>Payouts</h1>
          <p className={`text-sm ${sub} mt-0.5`}>Auto-payout at 6:00 PM daily · manual anytime</p>
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

      {successId !== null && (
        <div className="mb-4 px-5 py-4 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-green-800">Manual payout queued</p>
            <p className="text-xs text-green-600 mt-0.5">
              Ref: <span className="font-mono font-bold">PYT-{successId}</span> · Funds will arrive within 2–4 hours
            </p>
          </div>
          <button onClick={() => setSuccessId(null)} className="text-green-500 hover:text-green-700 text-lg font-bold leading-none">×</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div className={`rounded-2xl border p-5 ${card}`}>
          <p className={`text-[10px] tracking-widest uppercase font-semibold ${lbl} mb-3`}>This Cycle</p>
          <p className={`text-2xl font-bold tabular-nums ${tx}`}>{fetching ? "…" : formatAmount(locked)}</p>
          <p className={`text-xs ${lbl} mt-1`}>Auto at 6 PM</p>
        </div>

        <div className={`rounded-2xl border p-5 ${card}`}>
          <p className={`text-[10px] tracking-widest uppercase font-semibold ${lbl} mb-3`}>Last Payout</p>
          {lastPayout ? (
            <>
              <p className={`text-2xl font-bold tabular-nums ${tx}`}>{formatAmount(lastPayout.amount)}</p>
              <p className={`text-xs ${lbl} mt-1`}>
                {formatShortDate(lastPayout.startedAt)} · Success
              </p>
            </>
          ) : (
            <p className={`text-2xl font-bold ${lbl}`}>—</p>
          )}
        </div>

        <div className={`rounded-2xl border p-5 ${card}`}>
          <p className={`text-[10px] tracking-widest uppercase font-semibold ${lbl} mb-3`}>Bank</p>
          {account ? (
            <>
              <p className={`text-2xl font-bold ${tx}`}>
                {bankFromIfsc(account.ifscCode)}
                <span className={`text-xl ml-2 font-mono tracking-widest ${sub}`}>
                  ••{account.accountNumber.slice(-4)}
                </span>
              </p>
              <p className={`text-xs font-mono ${lbl} mt-1`}>IFSC {account.ifscCode}</p>
            </>
          ) : (
            <p className={`text-sm ${lbl} mt-1`}>No account linked yet</p>
          )}
        </div>
      </div>

      <div className={`relative rounded-2xl border p-6 ${card}`}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className={`text-base font-semibold ${tx}`}>Payout history</h2>
            <p className={`text-sm ${sub}`}>All merchant OffRampTransactions</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className={`px-5 py-3 rounded-xl text-white font-semibold text-sm transition-colors ${ac.btn}`}
          >
            Manual payout
          </button>
        </div>

        <div className="overflow-x-auto">
        <table className="w-full min-w-[520px]">
          <thead>
            <tr className={`border-b ${thd}`}>
              <th className={`text-[10px] font-semibold tracking-widest uppercase text-left py-3 pr-8 ${thd}`}>Date</th>
              <th className={`text-[10px] font-semibold tracking-widest uppercase text-left py-3 pr-8 ${thd}`}>Ref</th>
              <th className={`text-[10px] font-semibold tracking-widest uppercase text-right py-3 pr-8 ${thd}`}>Amount</th>
              <th className={`text-[10px] font-semibold tracking-widest uppercase text-left py-3 ${thd}`}>Status</th>
            </tr>
          </thead>
          <tbody>
            {fetching ? (
              <tr><td colSpan={4} className={`py-12 text-center text-sm ${lbl}`}>Loading…</td></tr>
            ) : payouts.length === 0 ? (
              <tr><td colSpan={4} className={`py-12 text-center text-sm ${lbl}`}>No payouts yet</td></tr>
            ) : payouts.map((p: any) => {
              const s = STATUS_STYLE[p.status] ?? STATUS_STYLE.QUEUED
              return (
                <tr key={p.id} className={`border-b last:border-0 transition-colors ${row}`}>
                  <td className={`py-4 pr-8 text-sm font-mono ${sub}`}>{formatDate(p.startedAt)}</td>
                  <td className="py-4 pr-8">
                    <span className={`text-sm font-mono font-semibold ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                      PYT-{p.id}
                    </span>
                  </td>
                  <td className={`py-4 pr-8 text-sm font-semibold tabular-nums text-right ${tx}`}>
                    {formatAmount(p.amount)}
                  </td>
                  <td className="py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${s.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      {s.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>

        {showTweaks && (
          <div className={`absolute top-0 right-0 w-72 rounded-2xl border shadow-2xl p-5 z-20 ${card}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-base font-semibold ${tx}`}>Tweaks</h3>
              <button onClick={() => setShowTweaks(false)} className={`${sub}`}><X className="w-4 h-4" /></button>
            </div>
            <div className="flex items-center justify-between mb-4">
              <p className={`text-sm ${sub}`}>Theme</p>
              <div className={`flex rounded-lg border overflow-hidden ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                {(["light", "dark"] as const).map(t => (
                  <button key={t} onClick={() => saveTheme(t)}
                    className={`px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                      theme === t
                        ? isDark ? "bg-gray-100 text-gray-900" : "bg-gray-900 text-white"
                        : isDark ? "bg-gray-800 text-gray-400 hover:text-gray-200" : "bg-white text-gray-500 hover:text-gray-800"
                    }`}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between mb-4">
              <p className={`text-sm ${sub}`}>Accent</p>
              <div className="flex gap-2">
                {(Object.keys(ACCENTS) as AccentKey[]).map(a => (
                  <button key={a} onClick={() => saveAccent(a)}
                    className={`w-7 h-7 rounded-full transition-transform ${
                      a === "green" ? "bg-green-500" : a === "blue" ? "bg-blue-500" :
                      a === "purple" ? "bg-purple-500" : "bg-orange-400"
                    } ${accent === a ? "scale-125 ring-2 ring-offset-2 ring-gray-400" : "hover:scale-110"}`}
                  />
                ))}
              </div>
            </div>
            <p className={`text-xs ${lbl}`}>Navigate via sidebar · state persists in localStorage</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl border shadow-2xl p-6 ${card}`}>
            <div className="flex items-center justify-between mb-5">
              <h2 className={`text-base font-semibold ${tx}`}>Manual payout</h2>
              <button onClick={() => { setShowModal(false); setFormError("") }} className={sub}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className={`block text-xs font-medium ${sub} mb-1`}>Amount (₹)</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="e.g. 1450"
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400 transition-colors ${inp}`}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium ${sub} mb-1`}>Account number</label>
                <input
                  type="text"
                  value={form.accountNumber}
                  onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))}
                  placeholder="Bank account number"
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:border-gray-400 transition-colors ${inp}`}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium ${sub} mb-1`}>IFSC code</label>
                <input
                  type="text"
                  value={form.ifscCode}
                  onChange={e => setForm(f => ({ ...f, ifscCode: e.target.value.toUpperCase() }))}
                  placeholder="e.g. HDFC0001234"
                  maxLength={11}
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm font-mono uppercase outline-none focus:border-gray-400 transition-colors ${inp}`}
                />
              </div>
            </div>

            {formError && (
              <p className="mt-3 text-xs text-red-500">{formError}</p>
            )}

            <button
              onClick={handleManualPayout}
              disabled={submitting}
              className={`mt-5 w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-semibold text-sm transition-colors disabled:opacity-50 ${ac.btn}`}
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : "Queue payout"}
            </button>
            <p className={`text-xs text-center mt-3 ${lbl}`}>Processed via BullMQ · NEFT/IMPS · no fees</p>
          </div>
        </div>
      )}
    </div>
    </MerchantLayout>
  )
}

export default MerchantPayout
