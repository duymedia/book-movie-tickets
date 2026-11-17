import { memo } from "react"
import { Link, useLocation } from "react-router-dom"
import {
  LayoutDashboard,
  Users,
  Building,
  Film,
  Armchair,
  Ticket,
  CreditCard,
  ShoppingCart,
  Coffee,
  X,
  Settings,
  Monitor,
} from "lucide-react"
import { Button } from "../components/ui/button"

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/admin" },
  { icon: Users, label: "Thành viên", href: "/admin/members" },
  { icon: Building, label: "Rạp chiếu", href: "/admin/cinemas" },
  { icon: Monitor, label: "Phòng chiếu", href: "/admin/rooms" },
  { icon: Film, label: "Phim", href: "/admin/movies" },
  { icon: Armchair, label: "Ghế", href: "/admin/seats" },
  { icon: Ticket, label: "Vé", href: "/admin/tickets" },
  { icon: CreditCard, label: "Thanh toán", href: "/admin/payments" },
  { icon: ShoppingCart, label: "Đơn hàng", href: "/admin/orders" },
  { icon: Coffee, label: "Combo", href: "/admin/combos" },
]

const Navbar = memo(function Navbar({ sidebarOpen, setSidebarOpen, darkMode }) {
  const { pathname } = useLocation()

  return (
    <div
      className={`w-64 xl:w-72 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl shadow-2xl border-r border-slate-200/60 dark:border-slate-700/60 transform transition-all duration-300 ease-in-out ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      } lg:translate-x-0 fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto`}
      aria-hidden={!sidebarOpen && !sidebarOpen}
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between h-16 xl:h-20 px-4 xl:px-6 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600">
        <div className="flex items-center">
          <div className="w-8 h-8 xl:w-10 xl:h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Film className="h-4 w-4 xl:h-6 xl:w-6 text-white" aria-hidden="true" />
          </div>
          <div className="ml-3">
            <h1 className="text-lg xl:text-xl font-bold text-white">Cinema Admin</h1>
            <p className="text-xs text-blue-100 hidden xl:block">Management System</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden text-white hover:bg-white/20"
          onClick={() => setSidebarOpen(false)}
          aria-label="Đóng menu điều hướng"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="mt-6 xl:mt-8 px-3 xl:px-4 space-y-1 xl:space-y-2" role="navigation">
        {sidebarItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              to={item.href}
              className={`group flex items-center px-3 xl:px-4 py-2.5 xl:py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                isActive
                  ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white"
              }`}
              onClick={() => setSidebarOpen(false)}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                className={`h-4 w-4 xl:h-5 xl:w-5 mr-3 transition-transform duration-200 ${
                  isActive ? "scale-110" : ""
                }`}
                aria-hidden="true"
              />
              <span className="truncate">{item.label}</span>
              {isActive && (
                <div
                  className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse"
                  aria-hidden="true"
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="absolute bottom-4 xl:bottom-6 left-3 xl:left-4 right-3 xl:right-4">
        <Link
          to="/admin/settings"
          className="block bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-600 rounded-xl p-3 xl:p-4 border border-blue-100 dark:border-slate-600 hover:bg-blue-100 dark:hover:bg-slate-600 transition-colors duration-200"
        >
          <div className="flex items-center">
            <div className="w-8 h-8 xl:w-10 xl:h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Settings className="h-4 w-4 xl:h-5 xl:w-5 text-white" aria-hidden="true" />
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-sm font-medium text-slate-900 dark:text-white truncate">
                Cài đặt hệ thống
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden xl:block">
                Quản lý cấu hình
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
})

export { Navbar }

