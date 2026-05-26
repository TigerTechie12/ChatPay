import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import axios from "axios"
import { Loader2 } from "lucide-react"

const USER_API = process.env.NEXT_PUBLIC_USER_BACKEND_URL
const MERCHANT_API = process.env.NEXT_PUBLIC_MERCHANT_BACKEND_URL
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ""

export default function AuthPage() {
  const router = useRouter()
  const [role, setRole] = useState<"user" | "merchant">("user")
  const [tab, setTab] = useState<"signin" | "signup">("signin")
  const [form, setForm] = useState({ name: "", email: "", password: "", number: "" })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    if (localStorage.getItem("token")) {
      router.push("/User/dashboard/page")
      return
    }
    if (localStorage.getItem("merchant_token")) {
      router.push("/merchant/overview/page")
      return
    }
  }, [])

  useEffect(() => {
    if (!router.isReady) return
    const code = router.query.code as string | undefined
    if (code) {
      setRole("merchant")
      handleGoogleCallback(code)
    }
  }, [router.isReady])

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))
  }

  async function handleGoogleCallback(code: string) {
    setLoading(true)
    setError("")
    try {
      const res = await axios.post(`${MERCHANT_API}/api/v1/auth/google`, { code })
      localStorage.setItem("merchant_token", res.data.token)
      router.push("/merchant/overview/page")
    } catch {
      setError("Google sign-in failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  function handleGoogleSignIn() {
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: window.location.origin,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
    })
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  }

  async function handleUserSignIn() {
    setLoading(true)
    setError("")
    setSuccess("")
    try {
      const res = await axios.post(`${USER_API}/api/v1/signin`, {
        name: form.name,
        email: form.email,
        password: form.password,
      })
      if (!res.data.token) {
        setError(res.data.message ?? "Sign in failed")
        return
      }
      localStorage.setItem("token", res.data.token)
      router.push("/User/dashboard/page")
    } catch {
      setError("Sign in failed. Please check your credentials.")
    } finally {
      setLoading(false)
    }
  }

  async function handleUserSignUp() {
    setLoading(true)
    setError("")
    setSuccess("")
    try {
      const res = await axios.post(`${USER_API}/api/v1/signup`, {
        name: form.name,
        email: form.email,
        password: form.password,
        number: form.number,
      })
      if (res.data.message === "User already exists") {
        setError("An account with this email or phone already exists.")
        return
      }
      setSuccess("Account created! Sign in to continue.")
      setTab("signin")
      setForm(f => ({ ...f, password: "" }))
    } catch {
      setError("Sign up failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 transition-colors placeholder:text-gray-400 bg-white"

  return (
    <div className="min-h-screen bg-[#f5f5f0] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-green-600 mb-4">
            <span className="text-white font-bold text-xl">C</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">ChatPay</h1>
          <p className="text-sm text-gray-500 mt-1">Payments built for everyone</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6">

          <div className="flex rounded-xl border border-gray-200 overflow-hidden mb-6">
            {(["user", "merchant"] as const).map(r => (
              <button
                key={r}
                onClick={() => { setRole(r); setError(""); setSuccess("") }}
                className={`flex-1 py-2.5 text-sm font-semibold capitalize transition-colors ${
                  role === r
                    ? "bg-gray-900 text-white"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {r === "user" ? "User" : "Merchant"}
              </button>
            ))}
          </div>

          {role === "user" && (
            <>
              <div className="flex rounded-xl bg-gray-100 p-1 mb-6">
                {(["signin", "signup"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => { setTab(t); setError(""); setSuccess("") }}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors capitalize ${
                      tab === t
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {t === "signin" ? "Sign In" : "Sign Up"}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Full name"
                  value={form.name}
                  onChange={field("name")}
                  className={inputClass}
                />
                <input
                  type="email"
                  placeholder="Email address"
                  value={form.email}
                  onChange={field("email")}
                  className={inputClass}
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={field("password")}
                  className={inputClass}
                />
                {tab === "signup" && (
                  <input
                    type="tel"
                    placeholder="Phone number"
                    value={form.number}
                    onChange={field("number")}
                    className={inputClass}
                  />
                )}
              </div>

              {error && (
                <p className="mt-4 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  {error}
                </p>
              )}
              {success && (
                <p className="mt-4 text-xs text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  {success}
                </p>
              )}

              <button
                onClick={tab === "signin" ? handleUserSignIn : handleUserSignUp}
                disabled={loading}
                className="mt-5 w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl text-sm transition-colors"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> {tab === "signin" ? "Signing in…" : "Creating account…"}</>
                  : tab === "signin" ? "Sign In" : "Create Account"
                }
              </button>
            </>
          )}

          {role === "merchant" && (
            <>
              <div className="text-center py-2 mb-4">
                <p className="text-sm text-gray-600">
                  Merchant accounts use Google to sign in securely.
                </p>
              </div>

              {error && (
                <p className="mb-4 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  {error}
                </p>
              )}

              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-800 font-semibold py-3.5 rounded-xl text-sm transition-colors"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin text-gray-500" /> Signing in…</>
                  : <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Continue with Google
                    </>
                }
              </button>

              <p className="text-center text-xs text-gray-400 mt-4">
                New merchants are registered automatically on first sign-in.
              </p>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          ChatPay · A Payment Gateway With E2E Encrypted Chat 
        </p>
      </div>
    </div>
  )
}
