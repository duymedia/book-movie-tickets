import { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { Eye, EyeOff, Mail, Lock, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "../lib/utils";
import axios from "axios";
import { useToast } from "../hooks/use-toast";
import { jwtDecode } from "jwt-decode";

// SVG Icons for Google and Facebook
const GoogleIcon = () => (
  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.344-7.574 7.439-7.574c2.233 0 3.912.932 4.783 1.735l3.453-3.453C18.164 1.136 15.398 0 12.24 0 5.733 0 0 5.733 0 12.24s5.733 12.24 12.24 12.24c6.254 0 12.24-5.054 12.24-12.24 0-.776-.084-1.532-.24-2.266h-11.996z"
    />
  </svg>
);

const FacebookIcon = () => (
  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
    />
  </svg>
);

/**
 * @param {{
 *   onSubmit: (formData: { email: string, password?: string }) => void,
 *   errors: { email?: string, password?: string },
 *   setErrors: (errors: { email?: string, password?: string }) => void,
 *   onOpenForgotPassword: () => void,
 *   onLoginSuccess?: (email: string, token: string) => void
 * }} props
 */
export function LoginForm({ onSubmit, errors, setErrors, onOpenForgotPassword, onLoginSuccess }) {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [googleSDKLoaded, setGoogleSDKLoaded] = useState(false);

  // Google Client ID from Google Cloud Console
  const GOOGLE_CLIENT_ID = "1083016507594-5ouvmeorufmvv31fulddfg51qherloqb.apps.googleusercontent.com";

  useEffect(() => {
    // Create Google Sign-In container in document body for GIS fallback
    const googleContainer = document.createElement("div");
    googleContainer.id = "google-signin-container";
    googleContainer.style.position = "fixed";
    googleContainer.style.top = "20%"; // Top-center positioning
    googleContainer.style.left = "50%";
    googleContainer.style.transform = "translateX(-50%)";
    googleContainer.style.zIndex = "9999";
    googleContainer.style.width = "400px";
    googleContainer.style.height = "auto";
    document.body.appendChild(googleContainer);

    // Load Google Identity Services SDK for fallback
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      console.log("Google Identity Services SDK loaded successfully");
      setGoogleSDKLoaded(true);
    };
    script.onerror = () => {
      console.error("Failed to load Google Identity Services SDK");
      showToast("Lỗi", "Không thể tải Google Sign-In. Vui lòng thử lại.", "destructive");
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(googleContainer)) {
        document.body.removeChild(googleContainer);
      }
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const initializeGoogleSignIn = () => {
    if (window.google && window.google.accounts) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleLogin,
        auto_select: false,
        context: "signin",
        use_fedcm_for_prompt: true, // Enable FedCM for Chrome
        prompt_parent_id: "google-signin-container",
      });
      console.log("Google Sign-In initialized with client ID:", GOOGLE_CLIENT_ID);
    } else {
      console.error("Google Identity Services SDK not available");
      setGoogleSDKLoaded(false);
      showToast("Lỗi", "Google Sign-In không khả dụng. Vui lòng thử lại.", "destructive");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const showToast = (title, description, variant = "default") => {
    console.log(`Showing toast: ${title} - ${description} [Variant: ${variant}]`);
    toast({
      title,
      description,
      variant,
      className: cn(
        "text-white border-0 flex items-center",
        variant === "destructive" ? "bg-red-500" : "bg-gradient-to-r from-red-500 to-purple-600"
      ),
      icon: variant === "destructive" ? (
        <AlertCircle className="w-5 h-5 mr-2" />
      ) : (
        <CheckCircle className="w-5 h-5 mr-2" />
      ),
      duration: 3000,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setErrors({ email: "Email không hợp lệ" });
      showToast("Lỗi", "Email không hợp lệ", "destructive");
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post("http://localhost:8080/api/auth/login", {
        email: formData.email.toLowerCase(),
        password: formData.password,
      });
      console.log("Email Login API Response:", response.data);

      if (response.data.success) {
        localStorage.setItem("email", formData.email);
        localStorage.setItem("authToken", response.data.token);
        if (onLoginSuccess) {
          onLoginSuccess(formData.email, response.data.token);
        }
        onSubmit({ email: formData.email, password: formData.password });
        setFormData({ email: "", password: "" });
        showToast("Đăng nhập thành công!", "Chào mừng bạn đã đăng nhập.");
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        throw new Error(response.data.message || "Đăng nhập thất bại");
      }
    } catch (error) {
      console.error("Email Login Error:", error.response?.data || error.message);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại.";
      setErrors({
        email: errorMessage.includes("Email") ? errorMessage : null,
        password: errorMessage.includes("mật khẩu") || errorMessage.includes("password") ? errorMessage : null,
      });
      showToast("Lỗi đăng nhập", errorMessage, "destructive");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async (credential) => {
    setIsLoading(true);
    try {
      const decodedToken = jwtDecode(credential);
      const googleEmail = decodedToken.email;
      console.log("Google ID Token Decoded:", decodedToken);

      const googleResponse = await axios.post("http://localhost:8080/api/auth/google", {
        idToken: credential,
      });
      console.log("Google Login API Response:", googleResponse.data);

      if (googleResponse.data.success) {
        localStorage.setItem("email", googleEmail);
        localStorage.setItem("authToken", googleResponse.data.token);
        if (onLoginSuccess) {
          onLoginSuccess(googleEmail, googleResponse.data.token);
        }
        onSubmit({ email: googleEmail, password: "" });
        showToast("Đăng nhập thành công!", `Chào mừng ${googleEmail} đã đăng nhập qua Google.`);
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        throw new Error(googleResponse.data.message || "Đăng nhập Google thất bại");
      }
    } catch (error) {
      console.error("Google Login Error:", error.response?.data || error.message);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Đã xảy ra lỗi khi đăng nhập qua Google. Vui lòng thử lại.";
      showToast("Lỗi đăng nhập", errorMessage, "destructive");
    } finally {
      setIsLoading(false);
    }
  };

  const triggerGoogleSignIn = async () => {
    if (isLoading) return;

    // Try FedCM first (Chrome's native identity cổng)
    if ("credentials" in navigator && navigator.credentials.get) {
      try {
        console.log("Attempting FedCM Sign-In");
        const credential = await navigator.credentials.get({
          identity: {
            providers: [
              {
                configURL: "https://accounts.google.com/gsi/fedcm.json",
                clientId: GOOGLE_CLIENT_ID,
                nonce: Math.random().toString(36).substring(2, 15),
              },
            ],
          },
        });

        if (credential && credential.token) {
          console.log("FedCM credential received:", credential);
          await handleGoogleLogin(credential.token);
          return;
        } else {
          console.warn("No FedCM credential received");
          showToast("Thông báo", "Không thể lấy thông tin đăng nhập từ FedCM. Thử lại với GIS.", "default");
        }
      } catch (error) {
        console.error("FedCM Sign-In Error:", error);
        showToast("Lỗi", "Không thể sử dụng FedCM. Chuyển sang GIS.", "destructive");
      }
    } else {
      console.warn("FedCM not supported; falling back to GIS");
    }

    // Fallback to GIS SDK
    if (googleSDKLoaded && window.google && window.google.accounts) {
      initializeGoogleSignIn();
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed()) {
          const reason = notification.getNotDisplayedReason();
          console.warn("Google Sign-In prompt not displayed:", reason);
          let errorMessage = "Không thể hiển thị cửa sổ đăng nhập Google.";
          if (reason === "unregistered_origin") {
            errorMessage = "Địa chỉ origin (http://localhost:5173) không được đăng ký trong Google Cloud Console.";
          } else if (reason === "opt_out_or_no_session") {
            errorMessage += " Vui lòng đăng xuất khỏi Google và thử lại.";
          } else if (reason === "secure_http_required") {
            errorMessage += " Yêu cầu HTTPS.";
          } else if (reason === "suppressed_by_user") {
            errorMessage += " Bạn đã chặn cửa sổ đăng nhập Google.";
          } else {
            errorMessage += " Vui lòng kiểm tra cài đặt trình duyệt.";
          }
          showToast("Lỗi đăng nhập", errorMessage, "destructive");
          setTimeout(triggerGoogleSignIn, 2000);
        } else if (notification.isSkippedMoment()) {
          const reason = notification.getSkippedReason();
          console.warn("Google Sign-In prompt skipped:", reason);
          if (reason === "user_cancel" || reason === "tap_outside") {
            showToast("Thông báo", "Bạn đã hủy đăng nhập Google.", "default");
          } else {
            showToast("Lỗi đăng nhập", "Đăng nhập Google bị gián đoạn.", "destructive");
            setTimeout(triggerGoogleSignIn, 2000);
          }
        } else if (notification.isDismissedMoment()) {
          const reason = notification.getDismissedReason();
          console.warn("Google Sign-In prompt dismissed:", reason);
          if (reason !== "credential_returned") {
            showToast("Thông báo", "Bạn đã hủy đăng nhập Google.", "default");
            setTimeout(triggerGoogleSignIn, 2000);
          }
        }
      });
    } else {
      console.error("Google Sign-In SDK not loaded or initialized");
      showToast("Lỗi", "Google Sign-In không khả dụng. Vui lòng thử lại.", "destructive");
    }
  };

  return (
    <div className="space-y-4 mt-6 pb-4">
      <form onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-gray-300">
            Email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={handleInputChange}
              className={cn(
                "pl-10 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-500",
                errors.email && "border-red-500"
              )}
              required
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-red-400 text-xs mt-1">{errors.email}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-gray-300">
            Mật khẩu
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Nhập mật khẩu"
              value={formData.password}
              onChange={handleInputChange}
              className={cn(
                "pl-10 pr-10 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-500",
                errors.password && "border-red-500"
              )}
              required
              disabled={isLoading}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-white hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            {errors.password && (
              <p className="text-red-400 text-xs mt-1">{errors.password}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="remember" disabled={isLoading} />
            <Label htmlFor="remember" className="text-sm text-gray-400">
              Ghi nhớ đăng nhập
            </Label>
          </div>
          <button
            type="button"
            onClick={onOpenForgotPassword}
            className="text-sm text-cyan-400 hover:underline"
            disabled={isLoading}
          >
            Quên mật khẩu?
          </button>
        </div>

        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-red-500 to-purple-600 hover:from-red-600 hover:to-purple-700 text-white border-0 h-11 mt-6 rounded-lg font-semibold shadow-lg hover:shadow-red-500/25 transition-all duration-300 hover:scale-105"
          disabled={isLoading}
        >
          {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
        </Button>
      </form>

      <div className="text-center text-sm text-gray-400 mt-4">Hoặc đăng nhập với</div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <Button
          className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0 h-10 rounded-lg font-semibold shadow-lg hover:shadow-blue-500/25 transition-all duration-300 hover:scale-105"
          onClick={triggerGoogleSignIn}
          disabled={isLoading || !googleSDKLoaded}
        >
          <GoogleIcon />
          Google
        </Button>
        <Button
          className="bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white border-0 h-10 rounded-lg font-semibold shadow-lg hover:shadow-blue-600/25 transition-all duration-300 hover:scale-105"
          onClick={() => console.log("Facebook login")}
          disabled={isLoading}
        >
          <FacebookIcon />
          Facebook
        </Button>
      </div>
    </div>
  );
}