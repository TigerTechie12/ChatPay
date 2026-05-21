"use client"
import { useState, useEffect } from "react"
import axios from "axios"
import { Loader2, Pencil } from "lucide-react"
import { UserLayout } from "@/components/UserLayout"

const API = process.env.NEXT_PUBLIC_USER_BACKEND_URL

const IFSC_BANK_MAP: Record<string, string> = {
  HDFC: "HDFC", SBIN: "SBI", UTIB: "Axis", ICIC: "ICICI",
  KKBK: "Kotak", PUNB: "PNB", BARB: "Bank of Baroda", UBIN: "Union",
}

function bankFromIfsc(ifsc: string) {
  const prefix = ifsc.slice(0, 4).toUpperCase()
  return IFSC_BANK_MAP[prefix] ?? ifsc.slice(0, 4)
}

function formatAmount(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
    " · " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })
}

const STATUS_STYLES: Record<string, string> = {
  SUCCESS:      "bg-green-100 text-green-700",
  COMPLETED:    "bg-green-100 text-green-700",
  QUEUED:       "bg-gray-100 text-gray-600",
  PROCESSING:   "bg-amber-100 text-amber-700",
  FAILED:       "bg-red-100 text-red-700",
  RETRYPENDING: "bg-orange-100 text-orange-700",
}

const HOW_IT_WORKS = [
  { step: 1, title: "Queued",        desc: "Your request enters the withdrawal-service BullMQ queue." },
  { step: 2, title: "Processing",    desc: "Worker locks balance, debits wallet, sends NEFT/IMPS command." },
  { step: 3, title: "Success",       desc: "Bank acks. Funds hit your account." },
  { step: 4, title: "Retry pending", desc: "If the bank errors, we retry with exponential backoff." },
]

interface LinkedAccount { accountNumber: string; ifscCode: string; holderName: string }

export function Withdraw() {
  const [account, setAccount] = useState<LinkedAccount | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [formAcc, setFormAcc] = useState({ accountNumber: "", ifscCode: "", holderName: "" })

  const [amount, setAmount] = useState("")
  const [availableBalance, setAvailableBalance] = useState(0)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState("")
  const [successId, setSuccessId] = useState<number | null>(null)

  const numericAmount = parseFloat(amount) || 0
  const availableINR = availableBalance / 100

  useEffect(() => {
    const saved = localStorage.getItem("chatpay_linked_account")
    if (saved) setAccount(JSON.parse(saved))
    else setEditMode(true)

    const token = localStorage.getItem("token")
    const headers = { Authorization: `Bearer ${token}` }
    Promise.all([
      axios.get(`${API}/api/v1/api/balance`, { headers }),
      axios.get(`${API}/api/v1/transactions`, { headers }),
    ])
      .then(([balRes, txRes]) => {
        const bal = balRes.data.balance ?? 0
        const locked = balRes.data.locked ?? 0
        setAvailableBalance(bal - locked)
        const offRampTxns = (txRes.data.transactions ?? []).filter((t: any) => t.type === "OffRamp")
        setHistory(offRampTxns)
      })
      .catch(console.error)
      .finally(() => setFetching(false))
  }, [])

  function saveAccount() {
    if (!formAcc.accountNumber || !formAcc.ifscCode) return
    const acc = { ...formAcc, ifscCode: formAcc.ifscCode.toUpperCase() }
    setAccount(acc)
    localStorage.setItem("chatpay_linked_account", JSON.stringify(acc))
    setEditMode(false)
  }

  async function handleWithdraw() {
    setError("")
    if (!account) return
    if (numericAmount < 100) { setError("Minimum withdrawal is ₹100"); return }
    if (numericAmount > availableINR) { setError("Insufficient available balance"); return }

    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const res = await axios.post(
        `${API}/api/v1/offramp`,
        { amount: numericAmount, accountNumber: account.accountNumber, ifscCode: account.ifscCode },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setSuccessId(res.data.id)
      setAmount("")
      setAvailableBalance(prev => prev - numericAmount * 100)
    } catch (e: any) {
      setError(e.response?.data?.message || "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const maskedAccount = account
    ? "• • • •  • • • •  • • • •  " + account.accountNumber.slice(-4)
    : ""

  return (
    <UserLayout title="Withdraw to bank" subtitle="Funds settle in your linked account within 2–4 hours.">
    <div className="p-6">
      {successId !== null && (
        <div className="mb-4 px-5 py-4 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-green-800">Withdrawal queued successfully</p>
            <p className="text-xs text-green-600 mt-0.5">
              Transaction ID: <span className="font-mono font-bold">WD-{successId}</span> · Funds will arrive within 2–4 hours.
            </p>
          </div>
          <button onClick={() => setSuccessId(null)} className="text-green-500 hover:text-green-700 text-lg font-bold leading-none">×</button>
        </div>
      )}

      <div className="grid grid-cols-5 gap-5 mb-5">

        <div className="col-span-3 bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Linked account</h2>
            {account && !editMode && (
              <button
                onClick={() => { setFormAcc({ ...account }); setEditMode(true) }}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-2.5 py-1.5 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
            )}
          </div>

          {editMode ? (
            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Account holder name</label>
                <input
                  value={formAcc.holderName}
                  onChange={e => setFormAcc(p => ({ ...p, holderName: e.target.value }))}
                  placeholder="Your full name"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Account number</label>
                <input
                  value={formAcc.accountNumber}
                  onChange={e => setFormAcc(p => ({ ...p, accountNumber: e.target.value }))}
                  placeholder="Bank account number"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:border-gray-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">IFSC code</label>
                <input
                  value={formAcc.ifscCode}
                  onChange={e => setFormAcc(p => ({ ...p, ifscCode: e.target.value.toUpperCase() }))}
                  placeholder="e.g. HDFC0001234"
                  maxLength={11}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono uppercase outline-none focus:border-gray-400 transition-colors"
                />
              </div>
              <button
                onClick={saveAccount}
                disabled={!formAcc.accountNumber || !formAcc.ifscCode}
                className="w-full bg-gray-900 disabled:bg-gray-300 text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
              >
                Save account
              </button>
            </div>
          ) : account ? (
            <div
              className="rounded-xl p-5 mb-5 relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, #0d1a2d 0%, #0a2a1a 100%)" }}
            >
              <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/5" />
              <div className="absolute -right-2 top-8 w-20 h-20 rounded-full bg-white/5" />

              <p className="text-xs tracking-widest text-gray-400 uppercase mb-4">
                {bankFromIfsc(account.ifscCode)} BANK · SAVINGS
              </p>
              <p className="text-xl font-mono text-white tracking-widest mb-5">{maskedAccount}</p>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Account Holder</p>
                  <p className="text-sm font-semibold text-white">{account.holderName || "—"}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">IFSC</p>
                  <p className="text-sm font-mono text-white">{account.ifscCode}</p>
                </div>
              </div>
            </div>
          ) : null}

          {!editMode && account && (
            <>
              <label className="block text-sm font-medium text-gray-700 mb-2">Withdrawal amount</label>
              <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-gray-400 transition-colors mb-2">
                <span className="text-2xl text-gray-400">₹</span>
                <input
                  type="number"
                  value={amount}
                  onChange={e => { setAmount(e.target.value); setError("") }}
                  placeholder="0"
                  min={0}
                  className="flex-1 text-3xl font-bold text-gray-900 outline-none bg-transparent tabular-nums placeholder:text-gray-300"
                />
                <button
                  onClick={() => setAmount(String(availableINR))}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors"
                >
                  MAX
                </button>
              </div>
              <p className="text-xs text-gray-400 mb-4">
                Available {fetching ? "…" : formatAmount(availableBalance)}
              </p>

              {error && (
                <div className="mb-4 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                  {error}
                </div>
              )}

              <button
                onClick={handleWithdraw}
                disabled={loading || numericAmount <= 0}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-200 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl text-base transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Submitting…</>
                ) : "Withdraw"}
              </button>
              <p className="text-xs text-gray-400 text-center mt-3">
                Queued through BullMQ · no fees · NEFT/IMPS automatic
              </p>
            </>
          )}
        </div>

        <div className="col-span-2 bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">How it works</h2>
          <p className="text-sm text-gray-400 mb-6">Reliable withdrawal pipeline with automatic retries.</p>

          <div className="space-y-5">
            {HOW_IT_WORKS.map(({ step, title, desc }) => (
              <div key={step} className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 text-sm font-semibold flex items-center justify-center flex-shrink-0">
                  {step}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{title}</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-0.5">Withdrawal history</h2>
        <p className="text-sm text-green-600 mb-5">All OffRampTransactions on this account</p>

        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {["DATE", "REF", "BANK", "AMOUNT", "STATUS"].map(h => (
                <th key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-left pb-3 pr-6">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {fetching ? (
              <tr><td colSpan={5} className="py-8 text-center text-sm text-gray-400">Loading…</td></tr>
            ) : history.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-sm text-gray-400">No withdrawals yet</td></tr>
            ) : history.map((t: any) => {
              const refId = t.id.replace("offramp-", "")
              const bankName = t.name.replace("Withdrawal · ", "")
              return (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3.5 pr-6 text-sm font-mono text-gray-600">{formatDate(t.date)}</td>
                  <td className="py-3.5 pr-6">
                    <span className="text-sm font-mono font-semibold text-blue-600">WD-{refId}</span>
                  </td>
                  <td className="py-3.5 pr-6 text-sm font-medium text-gray-700">{bankName}</td>
                  <td className="py-3.5 pr-6 text-sm font-semibold tabular-nums text-gray-900">
                    {formatAmount(t.amount)}
                  </td>
                  <td className="py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[t.status] ?? "bg-gray-100 text-gray-600"}`}>
                      ● {t.status.charAt(0) + t.status.slice(1).toLowerCase()}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
    </UserLayout>
  )
}

export default Withdraw
