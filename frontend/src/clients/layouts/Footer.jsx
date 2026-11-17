import { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Facebook, Instagram, Youtube, Twitter, Mail, Phone } from "lucide-react";
import "../../globals.css";
import { cn } from "../lib/utils";

export function Footer() {
  // State to store API data
  const [config, setConfig] = useState({
    websiteName: "CinemaMax",
    description: "Hệ thống rạp chiếu phim hiện đại với công nghệ âm thanh và hình ảnh tốt nhất.",
    hotline: "1900 6017",
    fbAdmin: "#",
    logo: "/images/default-logo.png",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch API data on component mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const authToken = localStorage.getItem("authToken");
        const headers = authToken
          ? { Authorization: `Bearer ${authToken}` }
          : {};

        const response = await fetch("http://localhost:8080/api/config", {
          headers,
        });

        if (!response.ok) {
          throw new Error(
            response.status === 401
              ? "Unauthorized: Invalid or missing token"
              : "Failed to fetch config data"
          );
        }

        const data = await response.json();
        setConfig({
          websiteName: data.websiteName,
          description: data.description,
          hotline: data.hotline,
          fbAdmin: data.fbAdmin,
          logo: data.logo,
        });
      } catch (err) {
        setError(err.message);
        console.error("Error fetching config:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  return (
    <footer className="bg-gradient-to-br from-gray-900 to-black border-t border-gray-800/50">
      <div className="container mx-auto px-4 py-12">
        {loading && <p className="text-gray-400 text-center">Đang tải...</p>}
        {error && <p className="text-red-400 text-center">Lỗi: {error}</p>}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <img
                  src={config.logo}
                  alt={`${config.websiteName} logo`}
                  className="w-8 h-8 rounded-lg object-cover"
                  onError={(e) => (e.target.src = "/images/default-logo.png")} // Fallback image
                />
                <h5 className="text-2xl font-bold bg-gradient-to-r from-red-500 to-purple-600 bg-clip-text text-transparent">
                  {config.websiteName}
                </h5>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">{config.description}</p>
              <div className="flex space-x-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-red-400"
                  asChild
                >
                  <a href={config.fbAdmin} target="_blank" rel="noopener noreferrer">
                    <Facebook className="w-5 h-5" />
                  </a>
                </Button>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-400">
                  <Instagram className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-400">
                  <Youtube className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-400">
                  <Twitter className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h6 className="font-semibold text-white mb-4">Phim</h6>
              <ul className="space-y-3 text-sm">
                <li>
                  <a href="#" className="text-gray-400 hover:text-red-400 transition-colors">
                    Phim đang chiếu
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-red-400 transition-colors">
                    Phim sắp chiếu
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-red-400 transition-colors">
                    Phim IMAX
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-red-400 transition-colors">
                    Phim 4DX
                  </a>
                </li>
              </ul>
            </div>

            {/* Services */}
            <div>
              <h6 className="font-semibold text-white mb-4">Dịch vụ</h6>
              <ul className="space-y-3 text-sm">
                <li>
                  <a href="#" className="text-gray-400 hover:text-red-400 transition-colors">
                    Đặt vé online
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-red-400 transition-colors">
                    Thành viên VIP
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-red-400 transition-colors">
                    Voucher & Khuyến mãi
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-400 hover:text-red-400 transition-colors">
                    Cho thuê phòng chiếu
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact & Newsletter */}
            <div className="space-y-4">
              <h6 className="font-semibold text-white mb-4">Liên hệ</h6>
              <div className="space-y-3 text-sm">
                <div className="flex items-center text-gray-400">
                  <Phone className="w-4 h-4 mr-2 text-green-400" />
                  <span>{config.hotline}</span>
                </div>
                <div className="flex items-center text-gray-400">
                  <Mail className="w-4 h-4 mr-2 text-blue-400" />
                  <span>support@{config.websiteName.toLowerCase().replace(" ", "")}.vn</span>
                </div>
              </div>

              <div className="space-y-2">
                <h6 className="font-semibold text-white text-sm">Đăng ký nhận tin</h6>
                <div className="flex gap-2">
                  <Input
                    placeholder="Email của bạn"
                    className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 text-sm"
                  />
                  <Button className="bg-gradient-to-r from-red-500 to-purple-600 hover:from-red-600 hover:to-purple-700 text-white border-0">
                    Đăng ký
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-gray-400 text-sm">
              © {new Date().getFullYear()} {config.websiteName}. Tất cả quyền được bảo lưu.
            </div>
            <div className="flex gap-6 text-sm">
              <a href="#" className="text-gray-400 hover:text-red-400 transition-colors">
                Chính sách bảo mật
              </a>
              <a href="#" className="text-gray-400 hover:text-red-400 transition-colors">
                Điều khoản sử dụng
              </a>
              <a href="#" className="text-gray-400 hover:text-red-400 transition-colors">
                Hỗ trợ
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}