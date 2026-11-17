import React, { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { FiUser, FiSave, FiX, FiLoader } from "react-icons/fi";
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
  if (!["USER", "STAFF", "ADMIN"].includes(formData.role)) {
    errors.role = "Vui lòng chọn vai trò hợp lệ";
  }
  return errors;
};

const MemberEditModal = ({ member, isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    status: "active",
    role: "USER",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const { toast } = useToast();
  const token = localStorage.getItem("authToken");

  useEffect(() => {
    if (isOpen && member) {
      setFormData({
        name: member.name || "",
        email: member.email || "",
        phone: member.phone || "",
        status: member.active ? "active" : "inactive",
        role: member.role || "USER",
      });
      setErrors({});
      setIsDirty(false);
    }
  }, [isOpen, member]);

  const handleInputChange = useCallback(
    (field, value) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setIsDirty(true);
      setErrors((prev) => ({ ...prev, [field]: null }));
    },
    []
  );

  const handleSave = async () => {
    const validationErrors = validateFormData(formData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSaving(true);
    try {
      await axios.put(
        `${API_BASE_URL}/admin/user/${member.id}`,
        {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
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
        description: `Đã cập nhật thành viên ${formData.name} thành công!`,
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
        description: error.response?.data?.message || "Không thể cập nhật thành viên.",
        variant: "destructive",
        className: "bg-red-600 text-white",
        duration: 5000,
      });
      setErrors({ api: error.response?.data?.message || "Không thể cập nhật thành viên." });
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
          status: "active",
          role: "USER",
        });
        setErrors({});
        setIsDirty(false);
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
            Chỉnh sửa thành viên
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

export default MemberEditModal;