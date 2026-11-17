import { useState, useEffect, useCallback, useRef } from "react";
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
  FiMail,
  FiPhone,
  FiCalendar,
  FiUser,
  FiShield,
  FiSave,
  FiX,
  FiLoader,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";
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
import { format } from "date-fns";
import vi from "date-fns/locale/vi";
import { debounce } from "lodash";
import { cn } from "../../lib/utils";

// Utility functions
const getStatusDisplay = (active) => {
  if (active === null || active === undefined) {
    return {
      text: "Không xác định",
      className: "bg-yellow-200 text-yellow-800",
    };
  }
  return active
    ? { text: "Hoạt động", className: "bg-green-500 text-white" }
    : { text: "Bảo trì", className: "bg-gray-200 text-gray-800" };
};

const validateFormData = (formData, isEdit = false) => {
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

  if (!isEdit && (!formData.password || formData.password.length < 8)) {
    errors.password = "Mật khẩu phải có ít nhất 8 ký tự";
  }

  if (!["USER", "STAFF", "ADMIN"].includes(formData.role)) {
    errors.role = "Vui lòng chọn vai trò hợp lệ";
  }

  return errors;
};

// MemberDetailModal Component
const MemberDetailModal = ({ member, isOpen, onClose }) => {
  const status = member
    ? getStatusDisplay(member.active)
    : { text: "Không xác định", className: "bg-yellow-200 text-yellow-800" };

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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FiUser className="h-5 w-5" />
            Chi tiết thành viên: {member?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600">ID</label>
                <p className="text-lg font-semibold">{member?.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Họ tên</label>
                <p className="text-lg font-semibold">{member?.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Email</label>
                <p className="text-lg">{member?.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Số điện thoại</label>
                <p className="text-lg">{member?.phone}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Trạng thái</label>
                <p className="text-lg">
                  <Badge className={status.className}>{status.text}</Badge>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Vai trò</label>
                <p className="text-lg">
                  <Badge className="bg-blue-200 text-blue-800">{member?.role}</Badge>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Ngày tham gia</label>
                <p className="text-lg">{member?.joinDate}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Cập nhật lần cuối</label>
                <p className="text-lg">{member?.updatedAt}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// MemberModal Component
const MemberModal = ({ member, isOpen, onClose, onSave, isEdit = false }) => {
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

  useEffect(() => {
    if (isOpen) {
      if (member && isEdit) {
        setFormData({
          name: member.name || "",
          email: member.email || "",
          phone: member.phone || "",
          password: "",
          status: member.active ? "active" : "inactive",
          role: member.role || "USER",
        });
      } else {
        setFormData({
          name: "",
          email: "",
          phone: "",
          password: "",
          status: "active",
          role: "USER",
        });
      }
      setErrors({});
      setIsDirty(false);
    }
  }, [isOpen, member, isEdit]);

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

  const handleSave = async () => {
    const validationErrors = validateFormData(formData, isEdit);
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
        description: error.response?.data?.message || "Đã xảy ra lỗi khi lưu thành viên.",
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
          <DialogTitle className="flex items-center gap-2">
            <FiUser className="h-5 w-5" />
            {isEdit ? "Chỉnh sửa thành viên" : "Thêm thành viên mới"}
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
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="email@example.com"
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>
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
          {!isEdit && (
            <div>
              <Label htmlFor="password">Mật khẩu</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  placeholder="Nhập mật khẩu"
                  className={errors.password ? "border-red-500" : ""}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <FiEye className="h-4 w-4" />
                </Button>
              </div>
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </div>
          )}
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
                <SelectItem value="inactive">Bảo trì</SelectItem>
              </SelectContent>
            </Select>
            {errors.status && <p className="text-red-500 text-sm mt-1">{errors.status}</p>}
          </div>
          <div>
            <Label htmlFor="role">Vai trò</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => handleInputChange("role", value)}
            >
              <SelectTrigger className={errors.role ? "border-red-500" : ""}>
                <SelectValue placeholder="Chọn vai trò" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USER">Người dùng</SelectItem>
                <SelectItem value="STAFF">Nhân viên</SelectItem>
                <SelectItem value="ADMIN">Quản trị viên</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && <p className="text-red-500 text-sm mt-1">{errors.role}</p>}
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

// Members Component
function Members() {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState({}); // Track dropdown open state per member
  const { toast } = useToast();
  const debouncedSearchRef = useRef(null);

  const API_BASE_URL = "http://localhost:8080/api";
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

  const fetchAllUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const users = response.data.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        joinDate: format(new Date(user.createdAt), "dd/MM/yyyy HH:mm", { locale: vi }),
        updatedAt: format(new Date(user.updatedAt), "dd/MM/yyyy HH:mm", { locale: vi }),
        active: user.active,
        role: user.role || "USER",
      }));
      setMembers(users);
    } catch (error) {
      showToast("Lỗi", "Không thể tải danh sách thành viên.", "destructive");
    } finally {
      setLoading(false);
    }
  }, [token, showToast]);

  const handleSearch = useCallback(async () => {
    if (!searchTerm) {
      fetchAllUsers();
      return;
    }
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/user/email`, {
        params: { email: searchTerm },
        headers: { Authorization: `Bearer ${token}` },
      });
      const user = response.data;
      const filteredMember = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        joinDate: format(new Date(user.createdAt), "dd/MM/yyyy HH:mm", { locale: vi }),
        updatedAt: format(new Date(user.updatedAt), "dd/MM/yyyy HH:mm", { locale: vi }),
        active: user.active,
        role: user.role || "USER",
      };
      setMembers([filteredMember]);
    } catch (error) {
      showToast("Lỗi", "Không tìm thấy thành viên với email này.", "destructive");
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, token, showToast, fetchAllUsers]);

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

  const handleCreateMember = useCallback(
    async (formData) => {
      const validationErrors = validateFormData(formData);
      if (Object.keys(validationErrors).length > 0) {
        return validationErrors;
      }

      const emailExists = await checkEmailExists(formData.email);
      if (emailExists) {
        showToast("Lỗi", "Email đã tồn tại trong hệ thống.", "destructive");
        return { email: "Email đã tồn tại" };
      }

      try {
        setLoading(true);
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
        showToast("Thành công", `Đã thêm thành viên ${formData.name} thành công!`, "success");
        setSearchTerm("");
        fetchAllUsers();
        return {};
      } catch (error) {
        const errorMessage = error.response?.data?.message || "Không thể thêm thành viên.";
        showToast("Lỗi", errorMessage, "destructive");
        return { api: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [token, showToast, fetchAllUsers, checkEmailExists]
  );

  const handleUpdateMember = useCallback(
    async (formData) => {
      const validationErrors = validateFormData(formData, true);
      if (Object.keys(validationErrors).length > 0) {
        return validationErrors;
      }

      try {
        setLoading(true);
        await axios.put(
          `${API_BASE_URL}/admin/user/${editingMember.id}`,
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
        showToast("Thành công", `Đã cập nhật thành viên ${formData.name} thành công!`, "success");
        fetchAllUsers();
        return {};
      } catch (error) {
        const errorMessage = error.response?.data?.message || "Không thể cập nhật thành viên.";
        showToast("Lỗi", errorMessage, "destructive");
        return { api: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [token, showToast, fetchAllUsers, editingMember]
  );

  const handleDeleteMember = useCallback(
    (id, dropdownId) => {
      try {
        setLoading(true);
        axios.delete(`${API_BASE_URL}/user/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(() => {
          showToast("Thành công", "Xóa thành viên thành công!", "success");
          fetchAllUsers();
          setDropdownOpen((prev) => ({ ...prev, [dropdownId]: false }));
        });
      } catch (error) {
        const errorMessage = error.response?.data?.message || "Không thể xóa thành viên.";
        showToast("Lỗi", errorMessage, "destructive");
      } finally {
        setLoading(false);
      }
    },
    [token, showToast, fetchAllUsers]
  );

  const handleViewDetail = useCallback((member) => {
    setSelectedMember(member);
    setShowDetailModal(true);
  }, []);

  const handleEditMember = useCallback((member, dropdownId) => {
    setEditingMember(member);
    setShowEditModal(true);
    setDropdownOpen((prev) => ({ ...prev, [dropdownId]: false }));
  }, []);

  useEffect(() => {
    if (!token) {
      showToast("Lỗi", "Vui lòng đăng nhập để xem danh sách thành viên.", "destructive");
      setLoading(false);
      return;
    }
    fetchAllUsers();
  }, [token, showToast, fetchAllUsers]);

  const filteredMembers = members.filter(
    (member) =>
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl p-8 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Quản lý thành viên</h1>
            <p className="text-blue-100 text-lg">Quản lý thông tin khách hàng và thành viên của hệ thống</p>
          </div>
          <Button
            onClick={() => setShowAddModal(true)}
            className="mt-4 md:mt-0 bg-white text-blue-600 hover:bg-blue-50 shadow-lg"
          >
            <FiPlus className="h-4 w-4 mr-2" />
            Thêm thành viên
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Tổng thành viên</p>
                <p className="text-2xl font-bold text-blue-900">{members.length}</p>
              </div>
              <div className="p-3 bg-blue-500 rounded-xl">
                <FiCalendar className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Hoạt động</p>
                <p className="text-2xl font-bold text-green-900">{members.filter((m) => m.active).length}</p>
              </div>
              <div className="p-3 bg-green-500 rounded-xl">
                <FiEye className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Quản trị viên</p>
                <p className="text-2xl font-bold text-purple-900">{members.filter((m) => m.role === "ADMIN").length}</p>
              </div>
              <div className="p-3 bg-purple-500 rounded-xl">
                <FiShield className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Nhân viên</p>
                <p className="text-lg font-bold text-orange-900">{members.filter((m) => m.role === "STAFF").length}</p>
              </div>
              <div className="p-3 bg-orange-500 rounded-xl">
                <FiUser className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Tìm kiếm theo tên hoặc email..."
                value={searchTerm}
                onChange={handleSearchChange}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={handleSearch}>
              <FiFilter className="h-4 w-4 mr-2" />
              Tìm kiếm
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center">Đang tải...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredMembers.map((member) => {
            const status = getStatusDisplay(member.active);
            const dropdownId = `dropdown-${member.id}`;
            return (
              <Card key={member.id} className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-2">{member.name}</h3>
                        <p className="text-sm text-slate-500">{member.email}</p>
                      </div>
                    </div>
                    <Badge className={status.className}>{status.text}</Badge>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-slate-600">
                      <FiMail className="h-4 w-4 mr-2 text-slate-400" />
                      {member.email}
                    </div>
                    <div className="flex items-center text-sm text-slate-600">
                      <FiPhone className="h-4 w-4 mr-2 text-slate-400" />
                      {member.phone}
                    </div>
                    <div className="flex items-center text-sm text-slate-600">
                      <FiShield className="h-4 w-4 mr-2 text-slate-400" />
                      Vai trò: {member.role}
                    </div>
                    <div className="flex items-center text-sm text-slate-600">
                      <FiCalendar className="h-4 w-4 mr-2 text-slate-400" />
                      Tham gia: {member.joinDate}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 mr-2"
                        onClick={() => handleViewDetail(member)}
                      >
                        <FiEye className="h-3 w-3 mr-1" />
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
                          <DropdownMenuItem onClick={() => handleEditMember(member, dropdownId)}>
                            <FiEdit className="h-4 w-4 mr-2" />
                            Chỉnh sửa
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDeleteMember(member.id, dropdownId)}
                          >
                            <FiTrash2 className="h-4 w-4 mr-2" />
                            Xóa
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <MemberDetailModal
        member={selectedMember}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedMember(null);
        }}
      />
      <MemberModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleCreateMember}
        isEdit={false}
      />
      <MemberModal
        member={editingMember}
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingMember(null);
        }}
        onSave={handleUpdateMember}
        isEdit={true}
      />
      <Toaster />
    </div>
  );
}

export default Members;