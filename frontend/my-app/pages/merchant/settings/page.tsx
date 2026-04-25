"use client"
import { useState, useEffect } from "react"
import axios from "axios"
import { Bell, Pencil, Check, Loader2, X } from "lucide-react"

const API = "http://localhost:3006"

const ACCENTS = {
  green:  { btn: "bg-green-600 hover:bg-green-700"   },
  blue:   { btn: "bg-blue-600 hover:bg-blue-700"     },
  purple: { btn: "bg-purple-600 hover:bg-purple-700" },
  orange: { btn: "bg-orange-500 hover:bg-orange-600" },
}
type AccentKey = keyof typeof ACCENTS

interface BankDetails { bankAccountNumber: string; bankIfscCode: string; bankAccountName: string }

export function MerchantSettings() {
  const [merchantName, setMerchantName] = useState("")
  const [merchantEmail, setMerchantEmail] = useState("")
  const [bank, setBank] = useState<BankDetails | null>(null)
  const [editingBank, setEditingBank] = useState(false)
  const [form, setForm] = useState({ bankAccountNumber: "", bankIfscCode: "", bankAccountName: "" })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [saveOk, setSaveOk] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [accent, setAccent] = useState<AccentKey>("green")
  const [showTweaks, setShowTweaks] = useState(false)

  useEffect(() => {
    const savedTheme = localStorage.getItem("merchant_theme") as "light" | "dark" | null
    if (savedTheme) setTheme(savedTheme)
    const savedAccent = localStorage.getItem("merchant_accent") as AccentKey | null
    if (savedAccent && savedAccent in ACCENTS) setAccent(savedAccent)

    const token = localStorage.getItem("merchant_token")
    axios.get(`${API}/api/merchant/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(res => {
      const m = res.data.merchant
      setMerchantName(m.name ?? "")
      setMerchantEmail(m.email ?? "")
      if (m.bankAccountNumber) {
        const b = { bankAccountNumber: m.bankAccountNumber, bankIfscCode: m.bankIfscCode ?? "", bankAccountName: m.bankAccountName ?? "" }
        setBank(b)
        setForm(b)
      } else {
        setEditingBank(true)
      }
    }).catch(console.error).finally(() => setFetching(false))
  }, [])

  async function handleSaveBank() {
    setSaveError("")
    if (!form.bankAccountNumber || !form.bankIfscCode) { setSaveError("Account number and IFSC are required"); return }
    setSaving(true)
    try {
      const token = localStorage.getItem("merchant_token")
      const res = await axios.put(
        `${API}/api/merchant/updateBankDetails`,
        { ...form, bankIfscCode: form.bankIfscCode.toUpperCase() },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const updated = res.data.merchant
      setBank(updated)
      setForm(updated)
      setEditingBank(false)
      setSaveOk(true)
      setTimeout(() => setSaveOk(false), 3000)
    } catch (e: any) {
      setSaveError(e.response?.data?.message || "Failed to save")
    } finally {
      setSaving(false)
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
  const div  = isDark ? "border-gray-800"             : "border-gray-100"
  const inp  = isDark
    ? "bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-600"
    : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"

  return (
    <div className={`min-h-screen ${bg} p-6 transition-colors duration-200`}>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${tx}`}>Settings</h1>
          <p className={`text-sm ${sub} mt-0.5`}>Merchant preferences</p>
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

      {saveOk && (
        <div className="mb-4 px-5 py-3.5 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2">
          <Check className="w-4 h-4 text-green-600" />
          <p className="text-sm font-medium text-green-800">Bank details saved successfully</p>
        </div>
      )}

      <div className="space-y-4 max-w-2xl">

        <div className={`rounded-2xl border p-6 ${card}`}>
          <h2 className={`text-base font-semibold ${tx}`}>Auto-payout</h2>
          <p className={`text-sm ${sub} mt-1`}>
            Enabled at 18:00 IST · switches in withdrawal-service cron.
          </p>
        </div>

        {merchantName && (
          <div className={`rounded-2xl border p-6 ${card}`}>
            <h2 className={`text-base font-semibold ${tx} mb-4`}>Account</h2>
            <div className={`space-y-3 text-sm`}>
              <div className={`flex items-center justify-between py-2 border-b ${div}`}>
                <span className={sub}>Store name</span>
                <span className={`font-medium ${tx}`}>{fetching ? "…" : merchantName}</span>
              </div>
              <div className={`flex items-center justify-between py-2`}>
                <span className={sub}>Email</span>
                <span className={`font-medium font-mono ${tx}`}>{fetching ? "…" : merchantEmail}</span>
              </div>
            </div>
          </div>
        )}

        <div className={`rounded-2xl border p-6 ${card}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className={`text-base font-semibold ${tx}`}>Bank details</h2>
              <p className={`text-sm ${sub} mt-0.5`}>Used for auto and manual payouts</p>
            </div>
            {bank && !editingBank && (
              <button
                onClick={() => setEditingBank(true)}
                className={`flex items-center gap-1.5 text-xs ${sub} hover:${tx} border ${isDark ? "border-gray-700" : "border-gray-200"} rounded-lg px-2.5 py-1.5 transition-colors`}
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
            )}
          </div>

          {editingBank ? (
            <div className="space-y-3">
              <div>
                <label className={`block text-xs font-medium ${lbl} mb-1`}>Account holder name</label>
                <input
                  value={form.bankAccountName}
                  onChange={e => setForm(f => ({ ...f, bankAccountName: e.target.value }))}
                  placeholder="Full name as on bank account"
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400 transition-colors ${inp}`}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium ${lbl} mb-1`}>Account number</label>
                <input
                  value={form.bankAccountNumber}
                  onChange={e => setForm(f => ({ ...f, bankAccountNumber: e.target.value }))}
                  placeholder="Bank account number"
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:border-gray-400 transition-colors ${inp}`}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium ${lbl} mb-1`}>IFSC code</label>
                <input
                  value={form.bankIfscCode}
                  onChange={e => setForm(f => ({ ...f, bankIfscCode: e.target.value.toUpperCase() }))}
                  placeholder="e.g. HDFC0001234"
                  maxLength={11}
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm font-mono uppercase outline-none focus:border-gray-400 transition-colors ${inp}`}
                />
              </div>

              {saveError && <p className="text-xs text-red-500">{saveError}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSaveBank}
                  disabled={saving}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-50 ${ac.btn}`}
                >
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : "Save"}
                </button>
                {bank && (
                  <button
                    onClick={() => { setEditingBank(false); setForm(bank); setSaveError("") }}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${isDark ? "border-gray-700 text-gray-400 hover:text-gray-200" : "border-gray-200 text-gray-500 hover:text-gray-800"}`}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ) : bank ? (
            <div className={`rounded-xl p-5 relative overflow-hidden`}
              style={{ background: "linear-gradient(135deg, #0d1a2d 0%, #0a2a1a 100%)" }}>
              <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/5" />
              <div className="absolute -right-2 top-8 w-20 h-20 rounded-full bg-white/5" />
              <p className="text-xs tracking-widest text-gray-400 uppercase mb-3">
                {bank.bankIfscCode.slice(0, 4)} BANK · SAVINGS
              </p>
              <p className="text-xl font-mono text-white tracking-widest mb-4">
                • • • •  • • • •  • • • •  {bank.bankAccountNumber.slice(-4)}
              </p>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Account Holder</p>
                  <p className="text-sm font-semibold text-white">{bank.bankAccountName || "—"}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">IFSC</p>
                  <p className="text-sm font-mono text-white">{bank.bankIfscCode}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className={`text-sm ${lbl}`}>{fetching ? "Loading…" : "No bank account linked yet"}</p>
          )}
        </div>
      </div>

      {showTweaks && (
        <div className={`fixed bottom-6 right-6 w-72 rounded-2xl border shadow-2xl p-5 z-20 ${card}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-base font-semibold ${tx}`}>Tweaks</h3>
            <button onClick={() => setShowTweaks(false)} className={sub}><X className="w-4 h-4" /></button>
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
  )
}

export default MerchantSettings
