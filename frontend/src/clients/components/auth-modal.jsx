import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "../components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { cn } from "../lib/utils";

import "../../globals.css";
import { LoginForm } from "./login-form";
import { RegisterForm } from "./register-form";
import { ForgotPasswordForm } from "./forgot-passowrd-form";

/**
 * @param {{
 *   open: boolean,
 *   mode: 'login' | 'register',
 *   onOpenChange: (open: boolean) => void
 * }} props
 */
export function AuthModal({ open, mode: initialMode, onOpenChange }) {
  const [mode, setMode] = useState(initialMode);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [errors, setErrors] = useState({});

  // Sync mode with initialMode when modal opens
  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setErrors({});
    }
  }, [open, initialMode]);

  const validateLoginForm = (formData) => {
    const newErrors = {};
    if (!formData.email.includes("@")) {
      newErrors.email = "Email không hợp lệ";
    }
    if (formData.password.length < 6) {
      newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateRegisterForm = (formData) => {
    const newErrors = {};
    if (!formData.email.includes("@")) {
      newErrors.email = "Email không hợp lệ";
    }
    if (formData.password.length < 6) {
      newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự";
    }
    if (!formData.fullname.trim()) {
      newErrors.fullname = "Vui lòng nhập họ và tên";
    }
    if (!formData.phone.match(/^\d{10}$/)) {
      newErrors.phone = "Số điện thoại phải có 10 chữ số";
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Mật khẩu không khớp";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLoginSubmit = (formData) => {
    if (validateLoginForm(formData)) {
      console.log("Login submitted:", formData);
      onOpenChange(false);
    }
  };

  const handleRegisterSubmit = (formData) => {
    if (validateRegisterForm(formData)) {
      console.log("Register submitted:", formData);
      onOpenChange(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className="bg-gradient-to-br from-gray-900 via-black to-gray-900 border border-cyan-900/20 text-white w-[90vw] max-w-lg max-h-[80vh] overflow-y-auto p-6 rounded-xl [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          <Tabs value={mode} onValueChange={setMode} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-900/80 rounded-xl p-1 backdrop-blur-sm">
              <TabsTrigger
                value="login"
                className={cn(
                  "text-base py-2 px-4 transition-all duration-300 rounded-lg font-medium",
                  "data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-purple-600 data-[state=active]:text-white",
                  "data-[state=active]:border-b-2 data-[state=active]:border-cyan-500",
                  "hover:bg-gray-800/50 hover:text-white"
                )}
              >
                Đăng nhập
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className={cn(
                  "text-base py-2 px-4 transition-all duration-300 rounded-lg font-medium",
                  "data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-purple-600 data-[state=active]:text-white",
                  "data-[state=active]:border-b-2 data-[state=active]:border-cyan-500",
                  "hover:bg-gray-800/50 hover:text-white"
                )}
              >
                Đăng ký
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <LoginForm
                onSubmit={handleLoginSubmit}
                errors={errors}
                setErrors={setErrors}
                onOpenForgotPassword={() => {
                  onOpenChange(false); // Đóng AuthModal
                  setIsForgotPasswordOpen(true); // Mở ForgotPasswordForm
                }}
              />
            </TabsContent>

            <TabsContent value="register">
              <RegisterForm
                onSubmit={handleRegisterSubmit}
                errors={errors}
                setErrors={setErrors}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <ForgotPasswordForm
        open={isForgotPasswordOpen}
        onOpenChange={setIsForgotPasswordOpen}
      />
    </>
  );
}