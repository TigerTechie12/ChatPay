"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import axios from "axios"
import Link from "next/link"
import { Home, Send, PlusCircle, Building2, MessageSquare, QrCode, Bell } from "lucide-react"

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

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    if (!token) {
      router.push("/")
      return
    }
    axios.get(`${API}/api/v1/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setMe({ name: res.data.name, number: res.data.number }))
      .catch((err) => {
        if (err.response?.status === 401) {
          localStorage.removeItem("token")
          router.push("/")
        }
      })
  }, [])

  const isActive = (href: string) => router.pathname === href || router.asPath === href

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
            <div className="w-9 h-9 rounded-full bg-pink-500 flex items-center justify-center text-white text-xs font-bold ">
              {getInitials(me.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-white truncate">{me.name}</div>
              <div className="text-xs text-gray-400 truncate">{formatPhone(me.number)}</div>
            </div>
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
            <button className="relative w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors">
              <Bell className="w-4 h-4 text-gray-500" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500" />
            </button>
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
