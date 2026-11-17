import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import {
  FiSearch,
  FiPlus,
  FiFilter,
  FiMoreHorizontal,
  FiEdit,
  FiTrash2,
  FiEye,
  FiMapPin,
  FiSave,
  FiX,
  FiLoader,
  FiCheckCircle,
  FiAlertCircle,
  FiImage,
  FiTv,
  FiUsers,
} from "react-icons/fi";
import { BiBuilding } from "react-icons/bi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import axios from "axios";
import { useToast } from "../../hooks/use-toast";
import { Toaster } from "../../components/ui/toaster";
import { debounce } from "lodash";
import { cn } from "../../lib/utils";

// Error Boundary Component
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div className="text-center text-red-500">Đã xảy ra lỗi. Vui lòng thử lại.</div>;
    }
    return this.props.children;
  }
}

const API_BASE_URL = "http://localhost:8080/api/admin";
const IMAGE_BASE_URL = "http://localhost:8080/uploads/cinemas/";

// Utility functions
const getStatusDisplay = (status) => {
  switch (status) {
    case "active":
      return { text: "Hoạt động", className: "bg-green-500 text-white" };
    case "maintenance":
      return { text: "Bảo trì", className: "bg-yellow-500 text-white" };
    case "closed":
      return { text: "Đóng cửa", className: "bg-gray-500 text-white" };
    default:
      return { text: status || "Không xác định", className: "bg-gray-200 text-gray-800" };
  }
};

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

// CinemaDetailModal Component
const CinemaDetailModal = ({ cinema, isOpen, onClose }) => {
  const status = cinema ? getStatusDisplay(cinema.status) : { text: "Không xác định", className: "bg-gray-200 text-gray-800" };

  const handleDialogOpenChange = useCallback(
    (open) => {
      if (!open) {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BiBuilding className="h-5 w-5" />
            Chi tiết rạp: {cinema?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {cinema?.image && (
            <div className="relative w-full h-48 rounded-lg overflow-hidden">
              <img
                src={cinema.image}
                alt={cinema.name}
                className="w-full h-full object-cover"
                onError={(e) => (e.target.src = "/placeholder.jpg")}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Tên rạp</label>
                <p className="text-lg font-semibold">{cinema?.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Địa chỉ</label>
                <p className="text-lg">{cinema?.address}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Số điện thoại</label>
                <p className="text-lg">{cinema?.phone}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Mô tả</label>
                <p className="text-lg">{cinema?.description}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Trạng thái</label>
                <p className="text-lg">
                  <Badge className={status.className}>{status.text}</Badge>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Tổng phòng chiếu</label>
                <p className="text-lg font-semibold text-blue-600">{cinema?.totalRooms || 0}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Tổng ghế</label>
                <p className="text-lg font-semibold text-green-600">{cinema?.totalSeats || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// CinemaModal Component
const CinemaModal = ({ cinema, isOpen, onClose, onSave, isEdit = false }) => {
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

  useEffect(() => {
    if (isOpen) {
      if (cinema && isEdit) {
        setFormData({
          name: cinema.name || "",
          address: cinema.address || "",
          phone: cinema.phone || "",
          description: cinema.description || "",
          image: null,
          status: cinema.status || "active",
        });
        setImagePreview(cinema.image || null);
      } else {
        setFormData({
          name: "",
          address: "",
          phone: "",
          description: "",
          image: null,
          status: "active",
        });
        setImagePreview(null);
      }
      setErrors({});
      setIsDirty(false);
    }
  }, [isOpen, cinema, isEdit]);

  const handleInputChange = useCallback(
    (field, value) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setIsDirty(true);
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: null }));
      }
    },
    [errors]
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
      const errors = await onSave(formData);
      if (Object.keys(errors).length > 0) {
        setErrors(errors);
        return;
      }
      setIsDirty(false);
      onClose();
    } catch (error) {
      toast({
        title: "Lỗi",
        description: error.response?.data || "Đã xảy ra lỗi khi lưu rạp.",
        variant: "destructive",
        duration: 5000,
      });
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

  // Cleanup image preview URL
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
            {isEdit ? "Chỉnh sửa rạp chiếu" : "Thêm rạp chiếu mới"}
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

// Cinemas Component
export default function Cinemas() {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [cinemas, setCinemas] = useState([]);
  const [selectedCinema, setSelectedCinema] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCinema, setEditingCinema] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState({}); // State to track dropdown open status
  const { toast } = useToast();
  const debouncedSearchRef = useRef(null);

  const token = localStorage.getItem("authToken");

  const showToast = useCallback(
    (title, description, variant = "default") => {
      toast({
        title,
        description,
        variant,
        className: cn(
          "toast text-white border-0 flex items-center",
          variant === "destructive" ? "toast-error" : "toast-success"
        ),
        icon:
          variant === "destructive" ? (
            <FiAlertCircle className="w-5 h-5 mr-2" />
          ) : (
            <FiCheckCircle className="w-5 h-5 mr-2" />
          ),
        duration: 3000,
      });
    },
    [toast]
  );

  const fetchCinemas = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/cinemas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const cinemasWithCounts = await Promise.all(
        response.data.map(async (cinema) => {
          try {
            const roomsResponse = await axios.get(`${API_BASE_URL}/rooms`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const rooms = roomsResponse.data.filter((room) => room.cinemaId === cinema.id);
            let totalSeats = 0;
            for (const room of rooms) {
              try {
                const seatsResponse = await axios.get(`${API_BASE_URL}/seats?roomId=${room.id}`, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                totalSeats += seatsResponse.data.length;
              } catch (error) {
                console.warn(`No seats found for room ${room.id}`);
              }
            }
            return {
              ...cinema,
              totalRooms: rooms.length,
              totalSeats,
              status: cinema.status || "active",
            };
          } catch (error) {
            console.warn(`Error fetching rooms for cinema ${cinema.id}:`, error);
            return {
              ...cinema,
              totalRooms: 0,
              totalSeats: 0,
              status: cinema.status || "active",
            };
          }
        })
      );
      setCinemas(cinemasWithCounts);
    } catch (error) {
      showToast("Lỗi", error.response?.data?.message || "Không thể tải danh sách rạp.", "destructive");
    } finally {
      setLoading(false);
    }
  }, [token, showToast]);

  const handleSearch = useCallback(() => {
    if (!searchTerm) {
      fetchCinemas();
      return;
    }
    const filtered = cinemas.filter(
      (cinema) =>
        cinema.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cinema.address.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setCinemas(filtered);
  }, [searchTerm, cinemas, fetchCinemas]);

  const debouncedSearch = useCallback(() => {
    handleSearch();
  }, [handleSearch]);

  useEffect(() => {
    debouncedSearchRef.current = debounce(debouncedSearch, 300);
    return () => {
      if (debouncedSearchRef.current) {
        debouncedSearchRef.current.cancel();
      }
    };
  }, [debouncedSearch]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    if (debouncedSearchRef.current) {
      debouncedSearchRef.current();
    }
  };

  const handleCreateCinema = useCallback(
    async (formData) => {
      const validationErrors = validateFormData(formData);
      if (Object.keys(validationErrors).length > 0) {
        return validationErrors;
      }

      const form = new FormData();
      form.append("name", formData.name);
      form.append("address", formData.address);
      form.append("phone", formData.phone);
      form.append("description", formData.description);
      form.append("status", formData.status);
      if (formData.image) {
        form.append("image", formData.image);
      }

      try {
        setLoading(true);
        await axios.post(`${API_BASE_URL}/cinemas`, form, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
        showToast("Thành công", `Đã thêm rạp ${formData.name} thành công!`, "success");
        setSearchTerm("");
        fetchCinemas();
        return {};
      } catch (error) {
        const errorMessage = error.response?.data || "Không thể thêm rạp.";
        showToast("Lỗi", errorMessage, "destructive");
        return { api: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [token, showToast, fetchCinemas]
  );

  const handleUpdateCinema = useCallback(
    async (formData) => {
      const validationErrors = validateFormData(formData);
      if (Object.keys(validationErrors).length > 0) {
        return validationErrors;
      }

      const form = new FormData();
      form.append("name", formData.name);
      form.append("address", formData.address);
      form.append("phone", formData.phone);
      form.append("description", formData.description);
      form.append("status", formData.status);
      if (formData.image) {
        form.append("image", formData.image);
      }

      try {
        setLoading(true);
        await axios.put(`${API_BASE_URL}/cinemas/${editingCinema.id}`, form, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
        showToast("Thành công", `Đã cập nhật rạp ${formData.name} thành công!`, "success");
        fetchCinemas();
        return {};
      } catch (error) {
        const errorMessage = error.response?.data || "Không thể cập nhật rạp.";
        showToast("Lỗi", errorMessage, "destructive");
        return { api: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [token, showToast, fetchCinemas, editingCinema]
  );

  const handleDeleteCinema = useCallback(
    async (id, dropdownId) => {
      try {
        setLoading(true);
        await axios.delete(`${API_BASE_URL}/cinemas/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        showToast("Thành công", "Xóa rạp chiếu thành công!", "success");
        fetchCinemas();
        setDropdownOpen((prev) => ({ ...prev, [dropdownId]: false }));
      } catch (error) {
        showToast("Lỗi", error.response?.data?.message || "Không thể xóa rạp.", "destructive");
      } finally {
        setLoading(false);
      }
    },
    [token, showToast, fetchCinemas]
  );

  const handleViewDetail = useCallback((cinema, dropdownId) => {
    setSelectedCinema(cinema);
    setShowDetailModal(true);
    setDropdownOpen((prev) => ({ ...prev, [dropdownId]: false }));
  }, []);

  const handleEditCinema = useCallback((cinema, dropdownId) => {
    setEditingCinema(cinema);
    setShowEditModal(true);
    setDropdownOpen((prev) => ({ ...prev, [dropdownId]: false }));
  }, []);

  const handleCloseDetailModal = useCallback(() => {
    setShowDetailModal(false);
    setSelectedCinema(null);
  }, []);

  const handleCloseAddModal = useCallback(() => {
    setShowAddModal(false);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setShowEditModal(false);
    setEditingCinema(null);
  }, []);

  useEffect(() => {
    if (!token) {
      showToast("Lỗi", "Vui lòng đăng nhập để xem danh sách rạp.", "destructive");
      setLoading(false);
      return;
    }
    fetchCinemas();
  }, [token, showToast, fetchCinemas]);

  return (
    <ErrorBoundary>
      <div className="space-y-8 max-w-7xl mx-auto p-4">
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl p-8 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Quản lý rạp chiếu</h1>
              <p className="text-blue-100 text-lg">Quản lý thông tin các rạp chiếu phim</p>
            </div>
            <Button
              onClick={() => setShowAddModal(true)}
              className="mt-4 md:mt-0 bg-white text-blue-600 hover:bg-blue-50 shadow-lg"
            >
              <FiPlus className="h-4 w-4 mr-2" />
              Thêm rạp mới
            </Button>
          </div>
        </div>

        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Tìm kiếm theo tên rạp hoặc địa chỉ..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" onClick={handleSearch} className="flex items-center">
                <FiFilter className="h-4 w-4 mr-2" />
                Tìm kiếm
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-6">
            <FiLoader className="h-8 w-8 animate-spin mx-auto text-blue-600" />
            <p className="text-gray-600 mt-2">Đang tải...</p>
          </div>
        ) : cinemas.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-600">Không tìm thấy rạp chiếu nào.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {cinemas.map((cinema) => {
              const status = getStatusDisplay(cinema.status);
              const dropdownId = `dropdown-${cinema.id}`;
              return (
                <Card key={cinema.id} className="border-none shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3 flex-1">
                        {cinema.image ? (
                          <img
                            src={cinema.image}
                            alt={cinema.name}
                            className="w-12 h-12 rounded-full object-cover"
                            onError={(e) => (e.target.src = "/placeholder.jpg")}
                          />
                        ) : (
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <FiImage className="h-6 w-6 text-blue-600" />
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800 truncate">{cinema.name}</h3>
                          <div className="flex items-center text-sm text-gray-600 truncate">
                            <FiMapPin className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{cinema.address}</span>
                          </div>
                        </div>
                      </div>
                      <Badge className={status.className}>{status.text}</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <FiTv className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                        <p className="text-lg font-bold text-gray-900">{cinema.totalRooms || 0}</p>
                        <p className="text-xs text-gray-600">Phòng chiếu</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <FiUsers className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                        <p className="text-lg font-bold text-gray-900">{cinema.totalSeats || 0}</p>
                        <p className="text-xs text-gray-600">Tổng ghế</p>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            Mô tả: {cinema.description}
                          </p>
                          <p className="text-sm text-gray-600">SĐT: {cinema.phone}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetail(cinema, dropdownId)}
                          >
                            <FiEye className="h-4 w-4 mr-2" />
                            Chi tiết
                          </Button>
                          <DropdownMenu
                            open={dropdownOpen[dropdownId] || false}
                            onOpenChange={(open) => setDropdownOpen((prev) => ({ ...prev, [dropdownId]: open }))}
                          >
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <FiMoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditCinema(cinema, dropdownId)}>
                                <FiEdit className="h-4 w-4 mr-2" />
                                Chỉnh sửa
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDeleteCinema(cinema.id, dropdownId)}
                              >
                                <FiTrash2 className="h-4 w-4 mr-2" />
                                Xóa
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <CinemaDetailModal
          cinema={selectedCinema}
          isOpen={showDetailModal}
          onClose={handleCloseDetailModal}
        />
        <CinemaModal
          isOpen={showAddModal}
          onClose={handleCloseAddModal}
          onSave={handleCreateCinema}
          isEdit={false}
        />
        <CinemaModal
          cinema={editingCinema}
          isOpen={showEditModal}
          onClose={handleCloseEditModal}
          onSave={handleUpdateCinema}
          isEdit={true}
        />
        <Toaster />
      </div>
    </ErrorBoundary>
  );
}