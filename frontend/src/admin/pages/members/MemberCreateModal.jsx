import React, { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { FiUser, FiSave, FiX, FiLoader, FiEye } from "react-icons/fi";
import { useToast } from "../../hooks/use-toast";
import axios from "axios";
import { cn } from "../../lib/utils";

const API_BASE_URL = "http://localhost:8080/api";

const validateFormData = (formData) => {
  const errors = {};
  if (!formData.name || formData.name.length < 2) {
    errors.name = "Họ tên phải có ít nhất 2 ký tự";
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!formData.email || !emailRegex.test(formData.email)) {
    errors.email = "Email không hợp lệ";
  }
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  if (!formData.phone || !phoneRegex.test(formData.phone)) {
    errors.phone = "Số điện thoại không hợp lệ";
  }
  if (!formData.password || formData.password.length < 8) {
    errors.password = "Mật khẩu phải có ít nhất 8 ký tự";
  }
  if (!["USER", "STAFF", "ADMIN"].includes(formData.role)) {
    errors.role = "Vui lòng chọn vai trò hợp lệ";
  }
  return errors;
};

const MemberCreateModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    status: "active",
    role: "USER",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const { toast } = useToast();
  const token = localStorage.getItem("authToken");

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: "",
        email: "",
        phone: "",
        password: "",
        status: "active",
        role: "USER",
      });
      setErrors({});
      setIsDirty(false);
      setShowPassword(false);
    }
  }, [isOpen]);

  const handleInputChange = useCallback(
    (field, value) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setIsDirty(true);
      setErrors((prev) => ({ ...prev, [field]: null }));
    },
    []
  );

  const checkEmailExists = useCallback(
    async (email) => {
      try {
        const response = await axios.get(`${API_BASE_URL}/user/email`, {
          params: { email },
          headers: { Authorization: `Bearer ${token}` },
        });
        return !!response.data;
      } catch (error) {
        return false;
      }
    },
    [token]
  );

  const handleSave = async () => {
    const validationErrors = validateFormData(formData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const emailExists = await checkEmailExists(formData.email);
    if (emailExists) {
      toast({
        title: "Lỗi",
        description: "Email đã tồn tại trong hệ thống.",
        variant: "destructive",
        className: "bg-red-600 text-white",
        duration: 5000,
      });
      setErrors({ email: "Email đã tồn tại" });
      return;
    }

    setSaving(true);
    try {
      await axios.post(
        `${API_BASE_URL}/admin/user`,
        {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          active: formData.status === "active",
          role: formData.role,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      toast({
        title: "Thành công",
        description: `Đã thêm thành viên ${formData.name} thành công!`,
        variant: "success",
        className: "bg-green-600 text-white",
        duration: 3000,
      });
      setIsDirty(false);
      onSuccess();
      onClose();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: error.response?.data?.message || "Không thể thêm thành viên.",
        variant: "destructive",
        className: "bg-red-600 text-white",
        duration: 5000,
      });
      setErrors({ api: error.response?.data?.message || "Không thể thêm thành viên." });
    } finally {
      setSaving(false);
    }
  };

  const handleDialogOpenChange = useCallback(
    (open) => {
      if (!open && isDirty && !saving) {
        if (!window.confirm("Bạn có muốn đóng mà không lưu thay đổi?")) {
          return;
        }
      }
      if (!open) {
        setFormData({
          name: "",
          email: "",
          phone: "",
          password: "",
          status: "active",
          role: "USER",
        });
        setErrors({});
        setIsDirty(false);
        setShowPassword(false);
        onClose();
      }
    },
    [isDirty, saving, onClose]
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <FiUser className="h-5 w-5" />
            Thêm thành viên mới
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Họ tên</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Nhập họ tên"
              className={cn("text-sm", errors.name ? "border-red-500" : "")}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="email@example.com"
              className={cn("text-sm", errors.email ? "border-red-500" : "")}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>
          <div>
            <Label htmlFor="phone">Số điện thoại</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              placeholder="+84xxxxxxxxx"
              className={cn("text-sm", errors.phone ? "border-red-500" : "")}
            />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
          </div>
          <div>
            <Label htmlFor="password">Mật khẩu</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                placeholder="Nhập mật khẩu"
                className={cn("text-sm", errors.password ? "border-red-500" : "")}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                <FiEye className="h-4 w-4" />
              </Button>
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>
          <div>
            <Label htmlFor="status">Trạng thái</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleInputChange("status", value)}
            >
              <SelectTrigger className={cn("text-sm", errors.status ? "border-red-500" : "")}>
                <SelectValue placeholder="Chọn trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Hoạt động</SelectItem>
                <SelectItem value="inactive">Bảo trì</SelectItem>
              </SelectContent>
            </Select>
            {errors.status && <p className="text-red-500 text-xs mt-1">{errors.status}</p>}
          </div>
          <div>
            <Label htmlFor="role">Vai trò</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => handleInputChange("role", value)}
            >
              <SelectTrigger className={cn("text-sm", errors.role ? "border-red-500" : "")}>
                <SelectValue placeholder="Chọn vai trò" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USER">Người dùng</SelectItem>
                <SelectItem value="STAFF">Nhân viên</SelectItem>
                <SelectItem value="ADMIN">Quản trị viên</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role}</p>}
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              onClick={() => handleDialogOpenChange(false)}
              variant="outline"
              className="flex-1 text-sm"
            >
              <FiX className="h-4 w-4 mr-2" />
              Hủy
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 text-sm"
            >
              {saving ? (
                <FiLoader className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FiSave className="h-4 w-4 mr-2" />
              )}
              {saving ? "Đang lưu..." : "Lưu"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MemberCreateModal;