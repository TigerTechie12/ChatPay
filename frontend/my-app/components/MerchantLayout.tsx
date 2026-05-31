"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import Link from "next/link"
import { Home, QrCode, Receipt, Building2, Settings, LogOut, Menu, X } from "lucide-react"

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const NAV: NavItem[] = [
  { href: "/merchant/overview/page",     label: "Overview",    icon: Home     },
  { href: "/merchant/generateQR/page",   label: "Generate QR", icon: QrCode   },
  { href: "/merchant/transactions/page", label: "Transactions",icon: Receipt  },
  { href: "/merchant/payout/page",       label: "Payout",      icon: Building2},
  { href: "/merchant/settings/page",     label: "Settings",    icon: Settings },
]

export function MerchantLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [merchantName, setMerchantName] = useState("")
  const [merchantEmail, setMerchantEmail] = useState("")

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("merchant_token") : null
    if (!token) {
      router.replace("/")
      return
    }
    try {
      const payload = JSON.parse(atob(token.split(".")[1]))
      if (payload.name) setMerchantName(payload.name)
      if (payload.email) setMerchantEmail(payload.email)
    } catch {}
    setAuthChecked(true)
  }, [])

  function signOut() {
    localStorage.removeItem("merchant_token")
    router.replace("/")
  }

  const isActive = (href: string) => router.pathname === href || router.asPath === href

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f0]">
        <div className="flex items-center gap-3 text-gray-400">
          <span className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-gray-500 animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    )
  }

  const initials = merchantName
    ? merchantName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : "M"

  return (
    <div className="min-h-screen flex bg-[#f5f5f0]">
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#0d1421] text-gray-300 flex flex-col shrink-0 transform transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-bold text-sm">C</div>
          <span className="text-white font-semibold text-lg">ChatPay</span>
          <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white/10 text-gray-300 tracking-wide">MERCHANT</span>
          <button
            onClick={() => setSidebarOpen(false)}
            title="Close menu"
            className="ml-auto w-8 h-8 rounded-md flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors lg:hidden"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(item => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  active ? "bg-white text-gray-900 font-semibold" : "text-gray-300 hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="flex-1">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-white/10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-white truncate">{merchantName || "Merchant"}</div>
            <div className="text-xs text-gray-400 truncate">{merchantEmail}</div>
          </div>
          <button
            onClick={signOut}
            title="Sign out"
            className="w-8 h-8 rounded-md flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <div className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-[#f5f5f0]/90 backdrop-blur border-b border-gray-200/60">
          <button
            onClick={() => setSidebarOpen(true)}
            title="Open menu"
            className="w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <Menu className="w-4 h-4 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-bold text-xs">C</div>
            <span className="font-semibold text-gray-900">ChatPay</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-200 text-gray-600 tracking-wide">MERCHANT</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">{children}</div>
      </main>
    </div>
  )
}

export default MerchantLayout
