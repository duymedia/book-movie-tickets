import { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Skeleton } from "../components/ui/skeleton";
import { Toaster } from "../components/ui/toaster";
import { useToast } from "../hooks/use-toast";
import { User, Lock, Shield, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "../lib/utils";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { format } from "date-fns";
import vi from "date-fns/locale/vi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import { AuthModal } from "../components/auth-modal";
import QRCode from "react-qr-code";
import "../../globals.css";

export default function Profile() {
  const [activeTab, setActiveTab] = useState("info");
  const [isLoading, setIsLoading] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [userInfo, setUserInfo] = useState({
    id: null,
    name: "",
    email: "",
    phone: "",
    createdAt: "",
  });
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [twoFA, setTwoFA] = useState({
    google: false,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDisable2FAModalOpen, setIsDisable2FAModalOpen] = useState(false);
  const [totpUrl, setTotpUrl] = useState("");
  const [twoFASecret, setTwoFASecret] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [disable2FACode, setDisable2FACode] = useState("");
  const [twoFAType, setTwoFAType] = useState("");
  const { toast } = useToast();

  const API_BASE_URL = "http://localhost:8080/api";
  const token = localStorage.getItem("authToken");

  const showToast = (title, description, variant = "default") => {
    toast({
      title,
      description,
      variant,
      className: cn(
        "text-white border-0 flex items-center",
        variant === "destructive"
          ? "bg-red-500"
          : "bg-gradient-to-r from-red-500 to-purple-600"
      ),
      icon:
        variant === "destructive" ? (
          <AlertCircle className="w-5 h-5 mr-2" />
        ) : (
          <CheckCircle className="w-5 h-5 mr-2" />
        ),
      duration: 3000,
    });
  };

  useEffect(() => {
    const fetchUserData = async () => {
      if (!token) {
        showToast("Lỗi", "Vui lòng đăng nhập để xem thông tin.", "destructive");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        let decodedEmail;
        try {
          const decoded = jwtDecode(token);
          decodedEmail = decoded.email || decoded.sub;
          if (!decodedEmail) {
            throw new Error("Email không tìm thấy trong token");
          }
          console.log("Decoded email:", decodedEmail);
        } catch (error) {
          console.error("Token decode error:", error);
          throw new Error("Không thể giải mã token");
        }

        console.log("Fetching user info from /user/email");
        const userResponse = await axios.get(`${API_BASE_URL}/user/email`, {
          params: { email: decodedEmail },
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log("User response:", userResponse.data);

        const user = userResponse.data;
        if (!user || !user.createdAt) {
          throw new Error("Dữ liệu người dùng hoặc ngày tạo không khả dụng");
        }

        const formattedCreatedAt = format(
          new Date(user.createdAt),
          "dd/MM/yyyy HH:mm",
          { locale: vi }
        );

        setUserInfo({
          id: user.id || null,
          name: user.name || "",
          email: user.email || "",
          phone: user.phone || "",
          createdAt: formattedCreatedAt,
        });

        console.log("Fetching 2FA status from /2fa/status");
        const twoFAResponse = await axios.get(`${API_BASE_URL}/2fa/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log("2FA response:", twoFAResponse.data);

        if (twoFAResponse.data.success) {
          setTwoFA({ google: twoFAResponse.data.isTwoFactorEnabled || false });
        } else {
          throw new Error(
            twoFAResponse.data.message || "Không thể lấy trạng thái 2FA."
          );
        }
      } catch (error) {
        console.error("Fetch user data error:", error);
        showToast(
          "Lỗi",
          error.response?.data?.message ||
            error.message ||
            "Không thể tải thông tin người dùng.",
          "destructive"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [token]);

  const handleInfoUpdate = async (e) => {
    e.preventDefault();
    if (!userInfo.id) {
      showToast("Lỗi", "Không tìm thấy ID người dùng.", "destructive");
      return;
    }
    try {
      console.log("Updating user info:", userInfo);
      const response = await axios.put(
        `${API_BASE_URL}/user/${userInfo.id}`,
        { name: userInfo.name, email: userInfo.email, phone: userInfo.phone },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updatedUser = response.data;
      setUserInfo({
        ...userInfo,
        name: updatedUser.name || "",
        email: updatedUser.email || "",
        phone: updatedUser.phone || "",
      });
      showToast(
        "Cập nhật thông tin",
        "Thông tin cá nhân đã được cập nhật thành công."
      );
    } catch (error) {
      console.error("Update user info error:", error);
      showToast(
        "Lỗi",
        error.response?.data?.message || "Cập nhật thông tin thất bại.",
        "destructive"
      );
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      showToast("Lỗi", "Mật khẩu mới và xác nhận không khớp.", "destructive");
      return;
    }
    try {
      console.log("Changing password");
      await axios.post(
        `${API_BASE_URL}/change-password`,
        { oldPassword: passwords.current, newPassword: passwords.new },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast(
        "Đổi mật khẩu",
        "Mật khẩu đã được thay đổi thành công. Đang đăng xuất sau 3 giây..."
      );
      setPasswords({ current: "", new: "", confirm: "" });
      setTimeout(() => {
        localStorage.removeItem("authToken");
        window.location.reload();
      }, 3000);
    } catch (error) {
      console.error("Change password error:", error);
      showToast(
        "Lỗi",
        error.response?.data?.message || "Đổi mật khẩu thất bại.",
        "destructive"
      );
    }
  };

  const handleTwoFAToggle = async () => {
    if (twoFA.google) {
      setIsDisable2FAModalOpen(true);
    } else {
      try {
        console.log("Gửi yêu cầu bật 2FA Google Authenticator");
        const response = await axios.post(
          `${API_BASE_URL}/2fa/enable`,
          { type: "google" },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Origin: window.location.origin,
            },
          }
        );
        console.log("Phản hồi từ /2fa/enable:", response.data);
        if (!response.data.success) {
          throw new Error(response.data.message || "Không thể kích hoạt 2FA.");
        }
        const { totpUrl, secret } = response.data.data;
        if (!totpUrl || !totpUrl.startsWith("otpauth://totp/")) {
          throw new Error("URL otpauth không hợp lệ hoặc không được trả về");
        }
        setTotpUrl(totpUrl);
        setTwoFASecret(secret || "");
        setTwoFAType("google");
        setIsModalOpen(true);
        console.log("Modal 2FA đã được mở");
      } catch (error) {
        console.error("Lỗi khi bật 2FA:", error);
        const errorMessage =
          error.response?.data?.message ||
          "Không thể kích hoạt 2FA. Vui lòng thử lại.";
        showToast("Lỗi", errorMessage, "destructive");
      }
    }
  };

  const handleVerify2FA = async () => {
    if (!/^\d{6}$/.test(verificationCode)) {
      showToast("Lỗi", "Mã xác thực phải là 6 chữ số.", "destructive");
      return;
    }
    try {
      console.log("Gửi yêu cầu xác minh 2FA Google Authenticator");
      await axios.post(
        `${API_BASE_URL}/2fa/verify`,
        { type: "google", code: verificationCode },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Origin: window.location.origin,
          },
        }
      );
      setTwoFA({ google: true });
      setIsModalOpen(false);
      setVerificationCode("");
      setTotpUrl("");
      setTwoFASecret("");
      setTwoFAType("");
      showToast(
        "Cập nhật bảo mật",
        "Xác thực hai yếu tố Google Authenticator đã được bật."
      );
    } catch (error) {
      console.error("Lỗi khi xác minh 2FA:", error);
      const message =
        error.response?.data?.message ||
        "Mã xác thực không đúng. Vui lòng quét lại mã QR hoặc nhập thủ công mã bí mật.";
      showToast("Lỗi", message, "destructive");
    }
  };

  const handleDisable2FA = async () => {
    if (!/^\d{6}$/.test(disable2FACode)) {
      showToast("Lỗi", "Mã xác thực phải là 6 chữ số.", "destructive");
      return;
    }
    try {
      console.log("Gửi yêu cầu tắt 2FA Google Authenticator với mã xác minh");
      const response = await axios.post(
        `${API_BASE_URL}/2fa/disable`,
        { type: "google", code: disable2FACode },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Origin: window.location.origin,
          },
        }
      );
      console.log("Phản hồi từ /2fa/disable:", response.data);
      if (response.data.success) {
        setTwoFA({ google: false });
        setIsDisable2FAModalOpen(false);
        setDisable2FACode("");
        showToast(
          "Cập nhật bảo mật",
          "Xác thực hai yếu tố Google Authenticator đã được tắt."
        );
      } else {
        throw new Error(response.data.message || "Không thể tắt 2FA.");
      }
    } catch (error) {
      console.error("Lỗi khi tắt 2FA:", error);
      showToast(
        "Lỗi",
        error.response?.data?.message || error.message || "Không thể tắt 2FA.",
        "destructive"
      );
    }
  };

  const handleOpenAuthModal = (mode) => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  const ProfileSkeleton = () => (
    <div className="space-y-4">
      <Skeleton className="h-10 w-32 bg-gray-700/50" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-24 bg-gray-700/50" />
        <Skeleton className="h-10 w-full bg-gray-700/50" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-6 w-24 bg-gray-600/50" />
        <Skeleton className="h-10 w-full bg-gray-700/50" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-6 w-24 bg-gray-700/50" />
        <Skeleton className="h-10 w-full bg-gray-700/50" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-6 w-24 bg-gray-700/50" />
        <Skeleton className="h-10 w-full bg-gray-700/50" />
      </div>
      <Skeleton className="h-12 w-32 bg-gray-700/50" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 py-12">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-white mb-8 bg-gradient-to-r from-red-600 to-purple-600 bg-clip-text text-transparent">
          Hồ sơ cá nhân
        </h2>
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-1/4 bg-gradient-to-b from-gray-800/70 to-gray-900/70 rounded-xl p-4 shadow-lg">
            <div className="space-y-2">
              <Button
                variant={activeTab === "info" ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start text-white transition-all duration-300 ease-in-out group",
                  activeTab === "info"
                    ? "bg-gradient-to-r from-red-600 to-purple-700 hover:from-red-700 hover:to-purple-800 border border-red-600/50 shadow-md hover:shadow-lg hover:shadow-red-500/30 hover:scale-105"
                    : "hover:bg-gradient-to-r hover:from-red-600/30 hover:to-purple-700/30 hover:border hover:border-red-600/40 hover:shadow-md hover:shadow-red-500/20 hover:scale-105"
                )}
                onClick={() => setActiveTab("info")}
              >
                <User className="w-5 h-5 mr-2 text-white group-hover:brightness-125 transition-all duration-300" />
                <span className="group-hover:brightness-125 transition-all duration-300">
                  Thông tin cá nhân
                </span>
              </Button>
              <Button
                variant={activeTab === "password" ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start text-white transition-all duration-300 ease-in-out group",
                  activeTab === "password"
                    ? "bg-gradient-to-r from-orange-600 to-pink-700 hover:from-orange-700 hover:to-pink-800 border border-orange-600/50 shadow-md hover:shadow-lg hover:shadow-orange-500/30 hover:scale-105"
                    : "hover:bg-gradient-to-r hover:from-orange-600/30 hover:to-pink-700/30 hover:border hover:border-orange-600/40 hover:shadow-md hover:shadow-orange-500/20 hover:scale-105"
                )}
                onClick={() => setActiveTab("password")}
              >
                <Lock className="w-5 h-5 mr-2 text-white group-hover:brightness-125 transition-all duration-300" />
                <span className="group-hover:brightness-125 transition-all duration-300">
                  Đổi mật khẩu
                </span>
              </Button>
              <Button
                variant={activeTab === "security" ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start text-white transition-all duration-300 ease-in-out group",
                  activeTab === "security"
                    ? "bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 border border-blue-600/50 shadow-md hover:shadow-lg hover:shadow-blue-500/30 hover:scale-105"
                    : "hover:bg-gradient-to-r hover:from-blue-600/30 hover:to-indigo-700/30 hover:border hover:border-blue-600/40 hover:shadow-md hover:shadow-blue-500/20 hover:scale-105"
                )}
                onClick={() => setActiveTab("security")}
              >
                <Shield className="w-5 h-5 mr-2 text-white group-hover:brightness-125 transition-all duration-300" />
                <span className="group-hover:brightness-125 transition-all duration-300">
                  Xác thực bảo mật
                </span>
              </Button>
            </div>
          </div>

          <div className="lg:w-3/4 bg-gradient-to-b from-gray-800/70 to-gray-900/70 rounded-xl p-6 shadow-lg">
            {!token ? (
              <div className="flex flex-col items-center justify-center h-full space-y-4">
                <h3 className="text-xl font-semibold text-white bg-gradient-to-r from-red-600 to-purple-600 bg-clip-text text-transparent">
                  Đăng nhập để xem thông tin
                </h3>
                <p className="text-gray-300 text-center">
                  Vui lòng đăng nhập để truy cập thông tin hồ sơ cá nhân của
                  bạn.
                </p>
                <Button
                  onClick={() => handleOpenAuthModal("login")}
                  className="hidden md:flex bg-gradient-to-r from-red-500 to-purple-600 hover:from-purple-600 hover:to-red-500 text-white border-0 shadow-lg hover:shadow-purple-500/50 transition-all duration-300"
                >
                  <User className="w-4 h-4 mr-2" />
                  Đăng nhập
                </Button>
              </div>
            ) : isLoading ? (
              <ProfileSkeleton />
            ) : (
              <>
                {activeTab === "info" && (
                  <form onSubmit={handleInfoUpdate} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-white">
                        Họ và tên
                      </Label>
                      <Input
                        id="name"
                        value={userInfo.name}
                        onChange={(e) =>
                          setUserInfo({ ...userInfo, name: e.target.value })
                        }
                        className="bg-gray-900/50 border-purple-600 text-white placeholder-gray-400 focus:ring-purple-500"
                        placeholder="Nhập họ và tên"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-white">
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={userInfo.email}
                        onChange={(e) =>
                          setUserInfo({ ...userInfo, email: e.target.value })
                        }
                        className="bg-gray-900/50 border-purple-600 text-white placeholder-gray-400 focus:ring-purple-500"
                        placeholder="Nhập email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-white">
                        Số điện thoại
                      </Label>
                      <Input
                        id="phone"
                        value={userInfo.phone}
                        onChange={(e) =>
                          setUserInfo({ ...userInfo, phone: e.target.value })
                        }
                        className="bg-gray-900/50 border-purple-600 text-white placeholder-gray-400 focus:ring-purple-500"
                        placeholder="Nhập số điện thoại"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="createdAt" className="text-white">
                        Ngày tạo tài khoản
                      </Label>
                      <Input
                        id="createdAt"
                        type="text"
                        value={userInfo.createdAt}
                        readOnly
                        className="bg-gray-900/50 border-purple-600 text-white placeholder-gray-400 focus:ring-purple-500"
                        placeholder="Chưa có dữ liệu"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-700 hover:to-purple-700 text-white border-0 h-11 rounded-lg font-semibold shadow-lg hover:shadow-red-500/25 transition-all duration-300 hover:scale-105"
                    >
                      Cập nhật thông tin
                    </Button>
                  </form>
                )}

                {activeTab === "password" && (
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="current" className="text-white">
                        Mật khẩu hiện tại
                      </Label>
                      <Input
                        id="current"
                        type="password"
                        value={passwords.current}
                        onChange={(e) =>
                          setPasswords({
                            ...passwords,
                            current: e.target.value,
                          })
                        }
                        className="bg-gray-900/50 border-purple-600 text-white placeholder-gray-400 focus:ring-purple-500"
                        placeholder="Nhập mật khẩu hiện tại"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new" className="text-white">
                        Mật khẩu mới
                      </Label>
                      <Input
                        id="new"
                        type="password"
                        value={passwords.new}
                        onChange={(e) =>
                          setPasswords({ ...passwords, new: e.target.value })
                        }
                        className="bg-gray-900/50 border-purple-600 text-white placeholder-gray-400 focus:ring-purple-500"
                        placeholder="Nhập mật khẩu mới"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm" className="text-white">
                        Xác nhận mật khẩu mới
                      </Label>
                      <Input
                        id="confirm"
                        type="password"
                        value={passwords.confirm}
                        onChange={(e) =>
                          setPasswords({
                            ...passwords,
                            confirm: e.target.value,
                          })
                        }
                        className="bg-gray-900/50 border-purple-600 text-white placeholder-gray-400 focus:ring-purple-500"
                        placeholder="Xác nhận mật khẩu mới"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-700 hover:to-purple-700 text-white border-0 h-11 rounded-lg font-semibold shadow-lg hover:shadow-red-500/25 transition-all duration-300 hover:scale-105"
                    >
                      Đổi mật khẩu
                    </Button>
                  </form>
                )}

                {activeTab === "security" && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold text-white bg-gradient-to-r from-red-600 to-purple-600 bg-clip-text text-transparent">
                        Xác thực hai yếu tố Google Authenticator
                      </h3>
                      <p className="text-gray-300">
                        Tăng cường bảo mật tài khoản bằng Google Authenticator.
                      </p>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between bg-gray-900/50 rounded-xl p-4 border border-purple-600/50">
                        <div>
                          <h4 className="text-white">Google Authenticator</h4>
                          <p className="text-gray-300 text-sm">
                            Nhận mã xác thực qua ứng dụng Google Authenticator.
                          </p>
                        </div>
                        <Button
                          variant={twoFA.google ? "default" : "outline"}
                          className={
                            twoFA.google
                              ? "bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-700 hover:to-purple-700 text-white"
                              : "bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-600 text-white border border-cyan-500/50 hover:border-cyan-400 shadow-md hover:shadow-cyan-500/30 transform hover:scale-105 transition-all duration-300"
                          }
                          onClick={handleTwoFAToggle}
                        >
                          {twoFA.google ? "Tắt" : "Bật"}
                        </Button>
                      </div>
                    </div>
                    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                      <DialogContent className="bg-gray-900 text-white border border-purple-600/50 max-w-sm w-full p-4 rounded-lg sm:max-w-md">
                        <DialogHeader className="mb-2">
                          <DialogTitle className="text-lg font-semibold bg-gradient-to-r from-red-600 to-purple-600 bg-clip-text text-transparent">
                            Kích hoạt Google Authenticator
                          </DialogTitle>
                          <DialogDescription className="text-gray-300 text-sm">
                            Thiết lập Google Authenticator trong 3 bước.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col space-y-4">
                          <div>
                            <h4 className="text-gray-300 font-semibold text-sm mb-1">
                              Bước 1: Tải Google Authenticator
                            </h4>
                            <p className="text-gray-400 text-xs mb-2">
                              Cài đặt ứng dụng từ:
                            </p>
                            <div className="flex space-x-2 justify-center">
                              <a
                                href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <img
                                  src="https://i.imgur.com/yCrwvG2.png"
                                  alt="Google Play"
                                  className="w-20 sm:w-24"
                                />
                              </a>
                              <a
                                href="https://apps.apple.com/us/app/google-authenticator/id388497605"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <img
                                  src="https://i.imgur.com/uulfmot.png"
                                  alt="App Store"
                                  className="w-20 sm:w-24"
                                />
                              </a>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-gray-300 font-semibold text-sm mb-1">
                              Bước 2: Quét mã QR
                            </h4>
                            <p className="text-gray-400 text-xs mb-2">
                              Quét mã QR bằng Google Authenticator.
                            </p>
                            <div className="flex justify-center">
                              {totpUrl ? (
                                <QRCode
                                  value={totpUrl}
                                  size={150}
                                  bgColor="#1F2937"
                                  fgColor="#FFFFFF"
                                />
                              ) : (
                                <div className="text-center text-red-400 text-xs">
                                  <p>Không thể tạo mã QR. Vui lòng thử lại.</p>
                                  <Skeleton className="h-36 w-36 bg-gray-700/50 mt-1" />
                                </div>
                              )}
                            </div>
                          </div>
                          <div>
                            {twoFASecret ? (
                              <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-md p-2">
                                <div className="flex items-start">
                                  <AlertCircle className="w-4 h-4 text-yellow-400 mr-2 mt-0.5" />
                                  <div>
                                    <p className="text-gray-300 font-semibold text-xs">
                                      Không quét được mã QR?
                                    </p>
                                    <p className="text-gray-400 text-xs">
                                      Nhập thủ công vào Google Authenticator:
                                    </p>
                                    <div className="mt-1">
                                      <p className="text-gray-300 text-xs">
                                        <strong>Tên tài khoản:</strong>{" "}
                                        {totpUrl
                                          .split("totp/")[1]
                                          ?.split("?")[0] || userInfo.email}
                                      </p>
                                      <p className="text-gray-300 text-xs">
                                        <strong>Mã bí mật:</strong>{" "}
                                        <span className="font-bold text-white text-xs">
                                          {twoFASecret}
                                        </span>
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-md p-2">
                                <div className="flex items-start">
                                  <AlertCircle className="w-4 h-4 text-yellow-400 mr-2 mt-0.5" />
                                  <div>
                                    <p className="text-gray-300 font-semibold text-xs">
                                      Lỗi tạo mã bí mật
                                    </p>
                                    <p className="text-gray-400 text-xs">
                                      Không thể tạo mã bí mật. Vui lòng thử lại.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          <div>
                            <h4 className="text-gray-300 font-semibold text-sm mb-1">
                              Bước 3: Nhập mã xác minh
                            </h4>
                            <p className="text-gray-400 text-xs mb-2">
                              Nhập mã 6 chữ số từ Google Authenticator.
                            </p>
                            <div className="w-full space-y-1">
                              <Label
                                htmlFor="verificationCode"
                                className="text-white text-sm"
                              >
                                Mã xác thực
                              </Label>
                              <Input
                                id="verificationCode"
                                value={verificationCode}
                                onChange={(e) =>
                                  setVerificationCode(e.target.value)
                                }
                                placeholder="Nhập mã 6 chữ số"
                                className="bg-gray-900/50 border-purple-600 text-white placeholder-gray-400 focus:ring-purple-500 text-sm h-9"
                                maxLength={6}
                                pattern="\d{6}"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end space-x-2 mt-4">
                          <Button
                            variant="outline"
                            className="border-purple-500 text-purple-400 hover:bg-purple-500/20 text-sm py-1 px-3"
                            onClick={() => {
                              setIsModalOpen(false);
                              setVerificationCode("");
                              setTotpUrl("");
                              setTwoFASecret("");
                              setTwoFAType("");
                            }}
                          >
                            Hủy
                          </Button>
                          <Button
                            className="bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-700 hover:to-purple-700 text-sm py-1 px-3"
                            onClick={handleVerify2FA}
                            disabled={
                              !verificationCode || verificationCode.length !== 6
                            }
                          >
                            Bật 2FA
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Dialog
                      open={isDisable2FAModalOpen}
                      onOpenChange={setIsDisable2FAModalOpen}
                    >
                      <DialogContent className="bg-gray-900 text-white border border-purple-600/50 max-w-sm w-full p-4 rounded-lg sm:max-w-md">
                        <DialogHeader className="mb-2">
                          <DialogTitle className="text-lg font-semibold bg-gradient-to-r from-red-600 to-purple-600 bg-clip-text text-transparent">
                            Tắt Google Authenticator
                          </DialogTitle>
                          <DialogDescription className="text-gray-300 text-sm">
                            Vui lòng nhập mã xác thực để xác nhận tắt 2FA.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col space-y-4">
                          <div>
                            <h4 className="text-gray-300 font-semibold text-sm mb-1">
                              Nhập mã xác minh
                            </h4>
                            <p className="text-gray-400 text-xs mb-2">
                              Nhập mã 6 chữ số từ Google Authenticator.
                            </p>
                            <div className="w-full space-y-1">
                              <Label
                                htmlFor="disable2FACode"
                                className="text-white text-sm"
                              >
                                Mã xác thực
                              </Label>
                              <Input
                                id="disable2FACode"
                                value={disable2FACode}
                                onChange={(e) =>
                                  setDisable2FACode(e.target.value)
                                }
                                placeholder="Nhập mã 6 chữ số"
                                className="bg-gray-900/50 border-purple-600 text-white placeholder-gray-400 focus:ring-purple-500 text-sm h-9"
                                maxLength={6}
                                pattern="\d{6}"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end space-x-2 mt-4">
                          <Button
                            variant="outline"
                            className="border-purple-500 text-purple-400 hover:bg-purple-500/20 text-sm py-1 px-3"
                            onClick={() => {
                              setIsDisable2FAModalOpen(false);
                              setDisable2FACode("");
                            }}
                          >
                            Hủy
                          </Button>
                          <Button
                            className="bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-700 hover:to-purple-700 text-sm py-1 px-3"
                            onClick={handleDisable2FA}
                            disabled={
                              !disable2FACode || disable2FACode.length !== 6
                            }
                          >
                            Tắt 2FA
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <AuthModal
        open={isAuthOpen}
        mode={authMode}
        onOpenChange={setIsAuthOpen}
      />
      <Toaster />
    </div>
  );
}
