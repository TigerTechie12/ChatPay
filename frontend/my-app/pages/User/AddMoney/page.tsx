"use client"
import { useState } from "react"
import axios from "axios"
import { Bell, Loader2 } from "lucide-react"

const API = process.env.USER_BACKEND_URL

const BANKS = [
  { id: "hdfc",  name: "HDFC Bank",    last4: "4521", initials: "HB", color: "bg-blue-700" },
  { id: "sbi",   name: "State Bank",   last4: "7812", initials: "SB", color: "bg-blue-500" },
  { id: "axis",  name: "Axis Bank",    last4: "0193", initials: "AB", color: "bg-rose-800" },
  { id: "icici", name: "ICICI Bank",   last4: "6654", initials: "IB", color: "bg-orange-600" },
  { id: "kotak", name: "Kotak Bank",   last4: "2201", initials: "KB", color: "bg-red-600" },
]

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000, 25000]

export function AddMoney() {
  const [selectedBank, setSelectedBank] = useState(BANKS[0])
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const numericAmount = parseFloat(amount) || 0

  function handleQuickAdd(val: number) {
    setAmount(prev => {
      const current = parseFloat(prev) || 0
      return String(current + val)
    })
  }

  async function handleContinue() {
    setError("")
    if (numericAmount < 100) { setError("Minimum amount is ₹100"); return }
    if (numericAmount > 100000) { setError("Maximum amount is ₹1,00,000"); return }

    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const res = await axios.post(
        `${API}/onramp`,
        { amount: numericAmount },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (res.data.url) {
        window.location.href = res.data.url
      } else {
        setError("Failed to create payment session. Please try again.")
      }
    } catch (e: any) {
      setError(e.response?.data?.message || "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f0] p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add money</h1>
          <p className="text-sm text-gray-500 mt-0.5">Top up your ChatPay wallet from any bank.</p>
        </div>
        <button className="relative p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
          <Bell className="w-5 h-5 text-gray-600" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-4xl">

        <div className="mb-8">
          <h2 className="text-base font-semibold text-gray-900">Choose source bank</h2>
          <p className="text-sm text-gray-400 mt-0.5 mb-5">Funds appear in your wallet after bank confirmation.</p>

          <div className="grid grid-cols-3 gap-3">
            {BANKS.map(bank => (
              <button
                key={bank.id}
                onClick={() => setSelectedBank(bank)}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                  selectedBank.id === bank.id
                    ? "border-gray-900 bg-white shadow-sm"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl ${bank.color} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                  {bank.initials}
                </div>
                <div>
                  <div className="font-medium text-gray-900 text-sm">{bank.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">••{bank.last4}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100 mb-8" />

        <div className="mb-6">
          <h2 className="text-base font-semibold text-gray-900">Amount</h2>
          <p className="text-sm text-gray-400 mt-0.5 mb-4">
            Minimum ₹100 · Maximum ₹1,00,000 per transaction
          </p>

          <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-5 py-4 bg-white focus-within:border-gray-400 transition-colors">
            <span className="text-3xl font-light text-gray-400">₹</span>
            <input
              type="number"
              value={amount}
              onChange={e => { setAmount(e.target.value); setError("") }}
              placeholder="0"
              min={0}
              className="flex-1 text-4xl font-bold text-gray-900 outline-none bg-transparent tabular-nums placeholder:text-gray-300"
            />
            <span className="text-sm text-gray-400 font-medium">INR</span>
          </div>

          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}

          <div className="flex flex-wrap gap-2 mt-4">
            {QUICK_AMOUNTS.map(val => (
              <button
                key={val}
                onClick={() => handleQuickAdd(val)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-colors font-medium"
              >
                + ₹{val.toLocaleString("en-IN")}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleContinue}
          disabled={loading || numericAmount <= 0}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl text-base transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Redirecting to Stripe…
            </>
          ) : (
            <>
              Continue to {selectedBank.name}
              {numericAmount > 0 && ` · ₹${numericAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
            </>
          )}
        </button>

        <p className="text-xs text-gray-400 text-center mt-3">
          You'll be redirected to Stripe's secure checkout to complete the payment.
        </p>
      </div>
    </div>
  )
}

export default AddMoney
