"use client"
import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/router"
import axios from "axios"
import Link from "next/link"
import { Home, Send, PlusCircle, Building2, MessageSquare, QrCode, Bell, LogOut, ArrowDownLeft } from "lucide-react"

const API = process.env.NEXT_PUBLIC_USER_BACKEND_URL

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  dot?: boolean
}

const MONEY: NavItem[] = [
  { href: "/User/dashboard/page", label: "Dashboard", icon: Home },
  { href: "/User/SendMoney/page", label: "Send Money", icon: Send },
  { href: "/User/AddMoney/page", label: "Add Money", icon: PlusCircle },
  { href: "/User/Withdraw/page", label: "Withdraw", icon: Building2 },
]
const SOCIAL: NavItem[] = [
  { href: "/User/chat/page", label: "Chat", icon: MessageSquare, dot: true },
  { href: "/User/scan/page", label: "Scan & Pay", icon: QrCode },
]

function getInitials(name: string) {
  if (!name) return "U"
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
}

function formatPhone(number: string | null) {
  if (!number) return ""
  if (number.length === 10) return `+91 ${number.slice(0, 5)} ${number.slice(5)}`
  if (number.length === 12) return `+${number.slice(0, 2)} ${number.slice(2, 7)} ${number.slice(7)}`
  return number
}

export function UserLayout({
  title,
  subtitle,
  action,
  children,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  const router = useRouter()
  const [me, setMe] = useState<{ name: string; number: string | null } | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    if (!token) {
      router.replace("/")
      return
    }
    axios.get(`${API}/api/v1/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        setMe({ name: res.data.name, number: res.data.number })
        setAuthChecked(true)
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          localStorage.removeItem("token")
          router.replace("/")
        } else {
          setAuthChecked(true)
        }
      })
  }, [])

  const [notifications, setNotifications] = useState<any[]>([])
  const [unread, setUnread] = useState(0)
  const [showNotifs, setShowNotifs] = useState(false)
  const lastSeenRef = useRef<number>(0)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!authChecked) return
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    if (!token) return
    lastSeenRef.current = Number(localStorage.getItem("notif_last_seen") ?? 0)

    async function poll() {
      try {
        const res = await axios.get(`${API}/api/v1/transactions`, { headers: { Authorization: `Bearer ${token}` } })
        const credits = (res.data.transactions ?? [])
          .filter((t: any) => t.direction === "credit")
          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        setNotifications(credits.slice(0, 10))
        if (!initializedRef.current) {
          lastSeenRef.current = credits.length ? new Date(credits[0].date).getTime() : Date.now()
          localStorage.setItem("notif_last_seen", String(lastSeenRef.current))
          initializedRef.current = true
          return
        }
        const newCount = credits.filter((t: any) => new Date(t.date).getTime() > lastSeenRef.current).length
        if (newCount > 0) setUnread(newCount)
      } catch { }
    }

    poll()
    const interval = setInterval(poll, 15000)
    return () => clearInterval(interval)
  }, [authChecked])

  function openNotifications() {
    setShowNotifs(v => !v)
    if (!showNotifs && notifications.length) {
      const newest = new Date(notifications[0].date).getTime()
      lastSeenRef.current = newest
      localStorage.setItem("notif_last_seen", String(newest))
      setUnread(0)
    }
  }

  async function handleSignout() {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    try {
      await axios.post(`${API}/api/v1/signout`, {}, { headers: { Authorization: `Bearer ${token}` } })
    } catch {  }
    localStorage.removeItem("token")
    router.push("/")
  }

  const isActive = (href: string) => router.pathname === href || router.asPath === href

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f7f3]">
        <div className="flex items-center gap-3 text-gray-400">
          <span className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-gray-500 animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-[#f7f7f3]">
      <aside className="w-64 bg-[#0d1421] text-gray-300 flex flex-col shrink-0">
        <div className="p-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-bold text-sm">C</div>
          <span className="text-white font-semibold text-lg">ChatPay</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
          <SidebarGroup label="MONEY" items={MONEY} isActive={isActive} />
          <SidebarGroup label="SOCIAL" items={SOCIAL} isActive={isActive} />
        </nav>

        {me && (
          <div className="p-4 border-t border-white/10 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-pink-500 flex items-center justify-center text-white text-xs font-bold">
              {getInitials(me.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-white truncate">{me.name}</div>
              <div className="text-xs text-gray-400 truncate">{formatPhone(me.number)}</div>
            </div>
            <button
              onClick={handleSignout}
              title="Sign out"
              className="w-8 h-8 rounded-md flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-8 py-5 border-b border-gray-200/60 bg-[#f7f7f3]">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{title}</h1>
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3">
            {action}
            <div className="relative">
              <button
                onClick={openNotifications}
                className="relative w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <Bell className="w-4 h-4 text-gray-500" />
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>
              {showNotifs && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm text-gray-900">Notifications</div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-sm text-gray-400">No payments yet</div>
                    ) : notifications.map((n: any) => (
                      <div key={n.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                          <ArrowDownLeft className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-900 truncate">Received from {n.name}</div>
                          <div className="text-xs text-gray-400">{new Date(n.date).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                        </div>
                        <div className="text-sm font-semibold text-green-600 tabular-nums">+₹{(n.amount / 100).toLocaleString("en-IN")}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  )
}

function SidebarGroup({
  label,
  items,
  isActive,
  children,
}: {
  label: string
  items: NavItem[]
  isActive: (href: string) => boolean
  children?: React.ReactNode
}) {
  return (
    <div>
      <div className="px-3 mb-2 text-[10px] font-semibold tracking-widest text-gray-500">{label}</div>
      <div className="space-y-0.5">
        {items.map(item => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                active ? "bg-white text-gray-900 font-semibold" : "text-gray-300 hover:bg-white/5"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="flex-1">{item.label}</span>
              {item.dot && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
            </Link>
          )
        })}
        {children}
      </div>
    </div>
  )
}
