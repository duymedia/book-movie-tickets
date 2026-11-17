import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Mail, Lock } from "lucide-react";
import { cn } from "../lib/utils";
import axios from "axios";
import { useToast } from "../hooks/use-toast";
import { AlertCircle, CheckCircle } from "lucide-react";

export function ForgotPasswordForm({ open, onOpenChange }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState({ email: null, otp: null });
  const [isLoading, setIsLoading] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);

  const validateEmail = () => {
    if (!email.includes("@") || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError({ ...error, email: "Email không hợp lệ" });
      return false;
    }
    setError({ ...error, email: null });
    return true;
  };

  const validateOtp = () => {
    if (!otp.match(/^\d{6}$/)) {
      setError({ ...error, otp: "Mã OTP phải là 6 chữ số" });
      return false;
    }
    setError({ ...error, otp: null });
    return true;
  };

  const handleSubmitEmail = async (e) => {
    e.preventDefault();
    if (!validateEmail()) return;

    setIsLoading(true);
    try {
      const response = await axios.post("http://localhost:8080/api/auth/forgot-password", {
        email,
      });
      console.log("Forgot Password API Response:", response.data);

      setShowOtpInput(true);
      showToast(
        "Gửi OTP thành công!",
        "Vui lòng kiểm tra email để nhận mã OTP.",
        "default"
      );
    } catch (error) {
      console.error("Forgot Password Error:", error.response?.data || error.message);
      const errorMessage =
        error.response?.data?.message || "Không thể gửi OTP. Vui lòng thử lại.";
      setError({ ...error, email: errorMessage });
      showToast("Lỗi gửi OTP", errorMessage, "destructive");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitOtp = async (e) => {
    e.preventDefault();
    if (!validateOtp()) return;

    setIsLoading(true);
    try {
      const response = await axios.post("http://localhost:8080/api/auth/verify-otp", {
        email,
        otp,
      });
      console.log("Verify OTP API Response:", response.data);

      showToast(
        "Xác thực OTP thành công!",
        "Mật khẩu mới đã được gửi qua email.",
        "default"
      );
      onOpenChange(false);
      setEmail("");
      setOtp("");
      setShowOtpInput(false);
    } catch (error) {
      console.error("Verify OTP Error:", error.response?.data || error.message);
      const errorMessage =
        error.response?.data?.message || "Mã OTP không hợp lệ hoặc đã hết hạn.";
      setError({ ...error, otp: errorMessage });
      showToast("Lỗi xác thực OTP", errorMessage, "destructive");
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (title, description, variant = "default") => {
    toast({
      title,
      description,
      variant,
      className: cn(
        "text-white border-0 flex items-center",
        variant === "destructive"
          ? "bg-red-500"
          : "bg-gradient-to-r from-indigo-900 to-violet-600"
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gradient-to-br from-gray-900 via-black to-gray-900 border border-cyan-900/20 text-white w-[90vw] max-w-md p-6 rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-100">Quên mật khẩu</DialogTitle>
        </DialogHeader>
        <form onSubmit={showOtpInput ? handleSubmitOtp : handleSubmitEmail} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="forgot-email" className="text-gray-300">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                id="forgot-email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError({ ...error, email: null });
                }}
                className={cn(
                  "pl-10 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/50 transition-all duration-200",
                  error.email && "border-red-500"
                )}
                required
                disabled={isLoading || showOtpInput}
              />
              {error.email && (
                <p className="text-red-400 text-xs mt-1">{error.email}</p>
              )}
            </div>
            <p className="text-sm text-gray-400">
              Vui lòng kiểm tra email để lấy OTP xác nhận.
            </p>
          </div>

          {showOtpInput && (
            <div className="space-y-2">
              <Label htmlFor="otp" className="text-gray-300">
                Mã OTP
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="otp"
                  type="text"
                  placeholder="Nhập mã OTP 6 chữ số"
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value);
                    setError({ ...error, otp: null });
                  }}
                  className={cn(
                    "pl-10 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/50 transition-all duration-200",
                    error.otp && "border-red-500"
                  )}
                  required
                  disabled={isLoading}
                  maxLength={6}
                />
                {error.otp && (
                  <p className="text-red-400 text-xs mt-1">{error.otp}</p>
                )}
              </div>
            </div>
          )}

            <Button
            type="submit"
            className="w-full bg-gradient-to-r from-red-500 to-purple-600 hover:from-red-600 hover:to-purple-700 text-white border-0 h-11 rounded-lg font-semibold shadow-lg hover:shadow-purple-500/25 transition-all duration-300 hover:scale-105"
          disabled={isLoading}
          >
            {isLoading
              ? showOtpInput
                ? "Đang xác thực OTP..."
                : "Đang gửi OTP..."
              : showOtpInput
              ? "Xác thực OTP"
              : "Gửi OTP"}
          </Button>
          <Button
            type="button"
            className="w-full border-indigo-400 text-gray-100 hover:bg-indigo-500/20 hover:border-indigo-300 transition-all duration-300"
            onClick={() => {
              onOpenChange(false);
              setEmail("");
              setOtp("");
              setShowOtpInput(false);
              setError({ email: null, otp: null });
            }}
            disabled={isLoading}
          >
            Đóng
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}