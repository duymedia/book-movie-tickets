import { useState, useMemo } from "react"
import { useLocation } from "react-router-dom"

import {
  Menu,
  Bell,
  Search,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Moon,
  Sun,
  Home,
} from "lucide-react"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu"
import { Badge } from "../components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover"

export function Header({ sidebarOpen, setSidebarOpen, darkMode, setDarkMode, pathname, sidebarItems }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const location = useLocation()

  // Filter sidebar items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery) return []
    return sidebarItems.filter((item) =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [searchQuery, sidebarItems])

  // Generate breadcrumb segments
  const breadcrumbSegments = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean)
    let currentPath = ""
    return segments.map((segment, index) => {
      currentPath += `/${segment}`
      const item = sidebarItems.find((i) => i.href === currentPath)
      return {
        label: item?.label || segment.charAt(0).toUpperCase() + segment.slice(1),
        href: currentPath,
      }
    })
  }, [pathname, sidebarItems])

  return (
    <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl shadow-sm border-b border-slate-200/60 dark:border-slate-700/60 sticky top-0 z-30 flex-shrink-0">
      <div className="flex items-center justify-between h-16 xl:h-20 px-4 xl:px-6">
        <div className="flex items-center space-x-3 xl:space-x-4">
          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden hover:bg-slate-700 text-slate-500 dark:text-slate-300"
            onClick={() => setSidebarOpen(true)}
            aria-label="Mở menu điều hướng"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Breadcrumb */}
          <div className="hidden sm:flex items-center space-x-2 text-sm">
            <Home className="h-4 w-4 text-slate-400" aria-hidden="true" />
            {breadcrumbSegments.map((segment, index) => (
              <div key={segment.href} className="flex items-center">
                <span className="text-slate-400 mx-1">/</span>
                <span
                  className={`${
                    index === breadcrumbSegments.length - 1
                      ? "text-slate-600 dark:text-slate-300 font-medium"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  } transition-colors duration-200`}
                >
                  {segment.label}
                </span>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="relative hidden md:block">
            <Search
              className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400"
              aria-hidden="true"
            />
            <Input
              placeholder="Tìm kiếm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 w-64 xl:w-80 bg-slate-50/50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 focus:bg-white dark:focus:bg-slate-700 focus:border-blue-300 transition-all duration-200"
              aria-label="Tìm kiếm chức năng quản trị"
            />
            {searchQuery && (
              <div className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-10">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      className="flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <item.icon className="h-4 w-4 mr-2" />
                      {item.label}
                    </a>
                  ))
                ) : (
                  <div className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400">
                    Không tìm thấy kết quả
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 xl:space-x-4">
          {/* Dark mode toggle */}
          <Button
        variant="ghost"
        size="sm"
        onClick={() => setDarkMode(!darkMode)}
        className="hover:bg-slate-100 dark:hover:bg-slate-700"
        aria-label={darkMode ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
      >
        {darkMode ? (
          <Sun className="h-4 w-4 text-slate-500 dark:text-slate-300" />
        ) : (
          <Moon className="h-4 w-4 text-slate-500 dark:text-slate-300" />
        )}
      </Button>

      {/* Notifications */}
      <Popover open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="relative hover:bg-slate-100 dark:hover:bg-slate-700"
            aria-label="Xem thông báo"
          >
            <Bell className="h-4 w-4 xl:h-5 xl:w-5 text-slate-500 dark:text-slate-300" />
            <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 bg-red-500 text-white text-xs flex items-center justify-center">
              3
            </Badge>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">Thông báo</h3>
            <div className="text-sm text-slate-600 dark:text-slate-300 border-t border-slate-200 dark:border-slate-700 pt-2">
              <p>Đơn hàng #1234 đã được xác nhận.</p>
              <p className="text-xs text-slate-400 dark:text-slate-400">10 phút trước</p>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-300 border-t border-slate-200 dark:border-slate-700 pt-2">
              <p>Thanh toán vé #5678 thành công.</p>
              <p className="text-xs text-slate-400 dark:text-slate-400">1 giờ trước</p>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-300 border-t border-slate-200 dark:border-slate-700 pt-2">
              <p>Phim mới đã được thêm.</p>
              <p className="text-xs text-slate-400 dark:text-slate-400">2 giờ trước</p>
            </div>
          </div>
        </PopoverContent>
      </Popover>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center space-x-2 xl:space-x-3 hover:bg-slate-100 dark:hover:bg-slate-700 px-2 xl:px-3 py-2 rounded-xl"
                aria-label="Mở menu người dùng"
              >
                <Avatar className="w-7 h-7 xl:w-8 xl:h-8">
                  <AvatarImage src="/placeholder.svg?height=32&width=32" />
                  <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs xl:text-sm">
                    AD
                  </AvatarFallback>
                </Avatar>
                <div className="hidden lg:block text-left">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Admin User</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">admin@cinema.com</p>
                </div>
                <ChevronDown className="h-3 w-3 xl:h-4 xl:w-4 text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <a href="/admin/profile" className="flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Thông tin cá nhân
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="/admin/settings" className="flex items-center">
                  <Settings className="h-4 w-4 mr-2" />
                  Cài đặt
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600" asChild>
                <a href="/logout" className="flex items-center">
                  <LogOut className="h-4 w-4 mr-2" />
                  Đăng xuất
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}