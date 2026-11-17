import React, { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { BiBuilding } from "react-icons/bi";
import { FiSave, FiX, FiLoader } from "react-icons/fi";
import { useToast } from "../../hooks/use-toast";
import axios from "axios";

const API_BASE_URL = "http://localhost:8080/api/admin";

const validateFormData = (formData) => {
  const errors = {};
  if (!formData.name || formData.name.length < 2) {
    errors.name = "Tên rạp phải có ít nhất 2 ký tự";
  }
  if (!formData.address || formData.address.length < 5) {
    errors.address = "Địa chỉ phải có ít nhất 5 ký tự";
  }
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  if (!formData.phone || !phoneRegex.test(formData.phone)) {
    errors.phone = "Số điện thoại không hợp lệ";
  }
  if (!formData.description || formData.description.length < 10) {
    errors.description = "Mô tả phải có ít nhất 10 ký tự";
  }
  if (!["active", "maintenance", "closed"].includes(formData.status)) {
    errors.status = "Vui lòng chọn trạng thái hợp lệ";
  }
  return errors;
};

const CinemaEditModal = ({ cinema, isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    description: "",
    image: null,
    status: "active",
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const { toast } = useToast();
  const token = localStorage.getItem("authToken");

  useEffect(() => {
    if (isOpen && cinema) {
      setFormData({
        name: cinema.name || "",
        address: cinema.address || "",
        phone: cinema.phone || "",
        description: cinema.description || "",
        image: null,
        status: cinema.status || "active",
      });
      setImagePreview(cinema.image || null);
      setErrors({});
      setIsDirty(false);
    }
  }, [isOpen, cinema]);

  const handleInputChange = useCallback(
    (field, value) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setIsDirty(true);
      setErrors((prev) => ({ ...prev, [field]: null }));
    },
    []
  );

  const handleImageChange = useCallback(
    (e) => {
      const file = e.target.files[0];
      if (file) {
        if (!file.type.startsWith("image/")) {
          toast({
            title: "Lỗi",
            description: "Vui lòng chọn file hình ảnh.",
            variant: "destructive",
            duration: 5000,
          });
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: "Lỗi",
            description: "Hình ảnh không được vượt quá 5MB.",
            variant: "destructive",
            duration: 5000,
          });
          return;
        }
        setFormData((prev) => ({ ...prev, image: file }));
        setImagePreview(URL.createObjectURL(file));
        setIsDirty(true);
      }
    },
    [toast]
  );

  const handleSave = async () => {
    const validationErrors = validateFormData(formData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSaving(true);
    try {
      const form = new FormData();
      form.append("name", formData.name);
      form.append("address", formData.address);
      form.append("phone", formData.phone);
      form.append("description", formData.description);
      form.append("status", formData.status);
      if (formData.image) {
        form.append("image", formData.image);
      }

      await axios.put(`${API_BASE_URL}/cinemas/${cinema.id}`, form, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      toast({
        title: "Thành công",
        description: `Đã cập nhật rạp ${formData.name} thành công!`,
        variant: "success",
        duration: 3000,
      });
      setIsDirty(false);
      onSuccess();
      onClose();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: error.response?.data || "Không thể cập nhật rạp.",
        variant: "destructive",
        duration: 5000,
      });
      setErrors({ api: error.response?.data || "Không thể cập nhật rạp." });
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
          address: "",
          phone: "",
          description: "",
          image: null,
          status: "active",
        });
        setImagePreview(null);
        setErrors({});
        setIsDirty(false);
        onClose();
      }
    },
    [isDirty, saving, onClose]
  );

  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BiBuilding className="h-5 w-5" />
            Chỉnh sửa rạp chiếu
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {imagePreview && (
            <div className="relative w-full h-48 rounded-lg overflow-hidden">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-full object-cover"
                onError={(e) => (e.target.src = "/placeholder.jpg")}
              />
            </div>
          )}
          <div>
            <Label htmlFor="name">Tên rạp</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Tên rạp chiếu"
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>
          <div>
            <Label htmlFor="address">Địa chỉ</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange("address", e.target.value)}
              placeholder="Địa chỉ đầy đủ"
              rows={3}
              className={errors.address ? "border-red-500" : ""}
            />
            {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Số điện thoại</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="+84xxxxxxxxx"
                className={errors.phone ? "border-red-500" : ""}
              />
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
            </div>
            <div>
              <Label htmlFor="image">Hình ảnh</Label>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="text-sm"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="description">Mô tả</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Mô tả rạp chiếu"
              rows={4}
              className={errors.description ? "border-red-500" : ""}
            />
            {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
          </div>
          <div>
            <Label htmlFor="status">Trạng thái</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleInputChange("status", value)}
            >
              <SelectTrigger className={errors.status ? "border-red-500" : ""}>
                <SelectValue placeholder="Chọn trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Hoạt động</SelectItem>
                <SelectItem value="maintenance">Bảo trì</SelectItem>
                <SelectItem value="closed">Đóng cửa</SelectItem>
              </SelectContent>
            </Select>
            {errors.status && <p className="text-red-500 text-sm mt-1">{errors.status}</p>}
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              onClick={() => handleDialogOpenChange(false)}
              variant="outline"
              className="flex-1"
            >
              <FiX className="h-4 w-4 mr-2" />
              Hủy
            </Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1">
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

export default CinemaEditModal;