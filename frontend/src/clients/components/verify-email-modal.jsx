import { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import { cn } from "../lib/utils";
import axios from "axios";
import { useToast } from "../hooks/use-toast";
import { Clock, AlertCircle, CheckCircle } from "lucide-react";

export function VerifyEmailModal({ email, registrationTime, onClose }) {
  const { toast } = useToast();
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [isExpired, setIsExpired] = useState(false);

  // Auto-fill token from URL query param
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get("token");
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      setErrors({});
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!registrationTime) return;

    const calculateTimeLeft = () => {
      const elapsed = Math.floor((Date.now() - registrationTime) / 1000);
      const remaining = 300 - elapsed;
      return remaining > 0 ? remaining : 0;
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        setIsExpired(true);
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [registrationTime]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleInputChange = (e) => {
    const { value } = e.target;
    setToken(value);
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (!token.trim()) {
      setErrors({ token: "Mã xác thực không được để trống" });
      setIsLoading(false);
      return;
    }

    // Validate token format (UUID-like)
    if (!token.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)) {
      setErrors({ token: "Mã xác thực không đúng định dạng UUID" });
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.get("http://localhost:8080/api/auth/verify", {
        params: { token },
      });
      console.log("Verify API Response:", response.data);

      showToast(
        "Xác thực thành công!",
        "Tài khoản của bạn đã được kích hoạt.",
        "default"
      );
      onClose();
    } catch (error) {
      console.error("Verify Error:", error.response?.data || error.message);
      const errorMessage =
        error.response?.data?.message ||
        "Mã xác thực không hợp lệ hoặc đã hết hạn.";
      setErrors({ token: errorMessage });
      showToast("Lỗi xác thực", errorMessage, "destructive");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsLoading(true);
    try {
      await axios.post("http://localhost:8080/api/auth/resend-verification", {
        email,
      });
      setRegistrationTime(Date.now());
      setTimeLeft(300);
      setIsExpired(false);
      setToken("");
      showToast(
        "Gửi lại mã thành công!",
        "Vui lòng kiểm tra email để nhận mã mới.",
        "default"
      );
    } catch (error) {
      console.error("Resend Error:", error.response?.data || error.message);
      const errorMessage =
        error.response?.data?.message || "Không thể gửi lại mã xác thực. Vui lòng thử lại.";
      showToast("Lỗi gửi lại mã", errorMessage, "destructive");
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (title, description, variant = "default") => {
    console.log(`Showing toast: ${title} - ${description} [Variant: ${variant}]`);
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
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-br from-gray-900 via-black to-gray-900 border border-indigo-900/20 text-white w-[90vw] max-w-md sm:max-w-lg max-h-[80vh] overflow-y-auto p-6 rounded-xl [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <DialogTitle className="text-xl font-semibold text-gray-100">
          Xác thực Email
        </DialogTitle>
        <DialogDescription className="text-gray-400">
          Nhập mã xác thực (định dạng UUID) đã được gửi đến <span className="text-indigo-300">{email}</span>. Mã này sẽ hết hạn sau 5 phút.
        </DialogDescription>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="token" className="text-gray-300">
              Mã xác thực
            </Label>
            <Input
              id="token"
              name="token"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={token}
              onChange={handleInputChange}
              className={cn(
                "bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/50 transition-all duration-200",
                errors.token && "border-red-500"
              )}
              disabled={isLoading || isExpired}
              required
            />
            {errors.token && (
              <p className="text-red-400 text-xs mt-1">{errors.token}</p>
            )}
          </div>

          <div className="flex items-center space-x-2 text-gray-400">
            <Clock className="w-4 h-4" />
            <p className={cn("text-sm", timeLeft < 30 && "text-red-400 animate-pulse")}>
              Thời gian còn lại: {isExpired ? "Hết hạn" : formatTime(timeLeft)}
            </p>
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-indigo-900 to-violet-600 hover:from-indigo-800 hover:to-violet-500 text-gray-100 border-indigo-400 hover:border-indigo-300 h-11 rounded-lg font-semibold shadow-lg hover:shadow-indigo-500/25 transition-all duration-300 hover:scale-105"
            disabled={isLoading || isExpired}
          >
            {isLoading ? "Đang xác thực..." : "Xác thực"}
          </Button>

          {isExpired && (
            <Button
              type="button"
              className="w-full bg-gradient-to-br from-indigo-900 via-purple-800 to-violet-600 text-gray-100 border-indigo-400 hover:bg-indigo-500/20 hover:border-indigo-300 transition-all duration-300"
              onClick={handleResend}
              disabled={isLoading}
            >
              Gửi lại mã xác thực
            </Button>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}