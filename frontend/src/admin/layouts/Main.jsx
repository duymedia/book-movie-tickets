import { useState } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { Navbar } from "./Navbar"
import { Header } from "./Header"

import {
  LayoutDashboard,
  Users,
  Building,
  Monitor,
  Film,
  Armchair,
  Ticket,
  CreditCard,
  ShoppingCart,
  Coffee
} from "lucide-react"

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/admin" },  // Changed from /admin/dashboard to /admin
  { icon: Users, label: "Thành viên", href: "/admin/members" },
  { icon: Building, label: "Rạp chiếu", href: "/admin/cinemas" },
  { icon: Monitor, label: "Phòng chiếu", href: "/admin/rooms" },
  { icon: Film, label: "Phim", href: "/admin/movies" },
  { icon: Armchair, label: "Ghế", href: "/admin/seats" },
  { icon: Ticket, label: "Vé", href: "/admin/tickets" },
  { icon: CreditCard, label: "Thanh toán", href: "/admin/payments" },
  { icon: ShoppingCart, label: "Đơn hàng", href: "/admin/orders" },
  { icon: Coffee, label: "Combo", href: "/admin/combos" }
]

export default function Main() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const location = useLocation()
  const pathname = location.pathname

  return (
    <div className={`min-h-screen ${darkMode ? "dark" : ""}`}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <Navbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} darkMode={darkMode} />

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          <Header
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            pathname={pathname}
            sidebarItems={sidebarItems}
          />

          {/* Page content */}
          <main className="flex-1 p-4 xl:p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}