import { useState, useEffect } from "react";
import { Link } from "react-router-dom"
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { User, Menu, X, Bell } from "lucide-react";
import { AuthModal } from "../components/auth-modal";
import "../../globals.css";
import { cn } from "../lib/utils";
import axios from "axios";
import { useToast } from "../hooks/use-toast";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("authToken"));
  const [userEmail, setUserEmail] = useState(localStorage.getItem("email") || "");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const email = localStorage.getItem("email");
    if (token && email) {
      setIsLoggedIn(true);
      setUserEmail(email);
    } else {
      setIsLoggedIn(false);
      setUserEmail("");
    }
  }, []);

  const handleOpenAuthModal = (mode) => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  const showToast = (title, description, variant = "default") => {
    toast({
      title,
      description,
      variant,
      className: cn(
        "text-white border-0",
        variant === "destructive"
          ? "bg-red-500"
          : "bg-gradient-to-r from-red-500 to-purple-600"
      ),
      duration: 5000,
    });
  };

  const isTokenExpired = (token) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch (e) {
      return true;
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("Không tìm thấy token");
      }
      if (isTokenExpired(token)) {
        throw new Error("Token đã hết hạn");
      }

      await axios.post(
        "http://localhost:8080/api/auth/logout",
        null,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );

      localStorage.removeItem("authToken");
      localStorage.removeItem("email");
      setIsLoggedIn(false);
      setUserEmail("");
      showToast("Đăng xuất", "Đăng xuất thành công!");
    } catch (error) {
      console.error("Lỗi khi đăng xuất:", error);
      let errorMessage = error.message || "Đã xảy ra lỗi khi đăng xuất";
      if (error.response) {
        errorMessage = error.response.data.message || errorMessage;
      } else if (error.request) {
        errorMessage = "Không thể kết nối đến server. Vui lòng kiểm tra CORS hoặc mạng.";
      }
      showToast("Lỗi", errorMessage, "destructive");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="border-b border-gray-800/50 bg-black/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
             <Link to="/">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-red-500 to-purple-600 bg-clip-text text-transparent">
                CinemaMax
              </h1>
            </div>
           </Link>
            <nav className="hidden md:flex space-x-6">
              <a href="#" className="text-gray-300 hover:text-red-400 transition-colors font-medium">
                Trang chủ
              </a>
              <a href="/Profile" className="text-gray-300 hover:text-red-400 transition-colors font-medium">
                Thông tin các nhân
              </a>
              <a href="/Orders" className="text-gray-300 hover:text-red-400 transition-colors font-medium">
                Đơn đã mua
              </a>
              <a href="#" className="text-gray-300 hover:text-red-400 transition-colors font-medium">
                Khuyến mãi
              </a>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative hidden md:flex">
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:bg-red-500/20 hover:text-gray-200 transition-all duration-300"
                onClick={() => showToast("Thông báo", "Bạn có 3 thông báo mới!")}
              >
                <Bell className="w-5 h-5" />
              </Button>
              <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center">
                3
              </Badge>
            </div>
            {isLoggedIn ? (
              <Button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="hidden md:flex bg-gradient-to-r from-red-500 to-purple-600 hover:from-purple-600 hover:to-red-500 text-white border-0 shadow-lg hover:shadow-purple-500/50 transition-all duration-300"
              >
                <User className="w-4 h-4 mr-2" />
                {isLoggingOut ? "Đang đăng xuất..." : `Đăng xuất (${userEmail})`}
              </Button>
            ) : (
              <Button
                onClick={() => handleOpenAuthModal("login")}
                className="hidden md:flex bg-gradient-to-r from-red-500 to-purple-600 hover:from-purple-600 hover:to-red-500 text-white border-0 shadow-lg hover:shadow-purple-500/50 transition-all duration-300"
              >
                <User className="w-4 h-4 mr-2" />
                Đăng nhập
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-white hover:bg-red-500/20 hover:text-gray-200 transition-all duration-300"
              onClick={() => {
                setIsMenuOpen(!isMenuOpen);
                showToast("Menu", `Đã ${isMenuOpen ? "đóng" : "mở"} menu.`);
              }}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-gray-800">
            <nav className="flex flex-col space-y-4 mt-4">
              <a href="#" className="text-gray-300 hover:text-red-400 transition-colors">
                Phim đang chiếu
              </a>
              <a href="#" className="text-gray-300 hover:text-red-400 transition-colors">
                Phim sắp chiếu
              </a>
              <a href="#" className="text-gray-300 hover:text-red-400 transition-colors">
                Rạp chiếu
              </a>
              <a href="#" className="text-gray-300 hover:text-red-400 transition-colors">
                Khuyến mãi
              </a>
              {isLoggedIn ? (
                <Button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="bg-gradient-to-r from-red-500 to-purple-600 hover:from-purple-600 hover:to-red-500 text-white border-0 w-fit shadow-lg hover:shadow-purple-500/50 transition-all duration-300"
                >
                  <User className="w-4 h-4 mr-2" />
                  {isLoggingOut ? "Đang đăng xuất..." : `Đăng xuất (${userEmail})`}
                </Button>
              ) : (
                <Button
                  onClick={() => handleOpenAuthModal("login")}
                  className="bg-gradient-to-r from-red-500 to-purple-600 hover:from-purple-600 hover:to-red-500 text-white border-0 w-fit shadow-lg hover:shadow-purple-500/50 transition-all duration-300"
                >
                  <User className="w-4 h-4 mr-2" />
                  Đăng nhập
                </Button>
              )}
            </nav>
          </div>
        )}
      </div>

      <AuthModal open={isAuthOpen} mode={authMode} onOpenChange={setIsAuthOpen} />
    </header>
  );
}