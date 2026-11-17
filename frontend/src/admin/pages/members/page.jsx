import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { FiSearch, FiPlus, FiFilter, FiMoreHorizontal, FiEdit, FiTrash2, FiMail, FiPhone, FiCalendar, FiShield, FiAlertCircle, FiCheckCircle, FiEye, FiUser, FiLoader } from "react-icons/fi";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../components/ui/dropdown-menu";
import { Toaster } from "../../components/ui/toaster";
import { format } from "date-fns";
import vi from "date-fns/locale/vi";
import { debounce } from "lodash";
import { cn } from "../../lib/utils";
import axios from "axios";
import { useToast } from "../../hooks/use-toast";
import MemberDetailModal from "./MemberDetailModal";
import MemberCreateModal from "./MemberCreateModal";
import MemberEditModal from "./MemberEditModal";

const API_BASE_URL = "http://localhost:8080/api";


function Members() {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState({});
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
          variant === "destructive" ? "bg-red-600" : "bg-green-600"
        ),
        icon: variant === "destructive" ? (
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

  const handleDeleteMember = useCallback(
    async (id, dropdownId) => {
      if (!window.confirm("Bạn có chắc muốn xóa thành viên này?")) return;
      try {
        setLoading(true);
        await axios.delete(`${API_BASE_URL}/user/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        showToast("Thành công", "Xóa thành viên thành công!", "success");
        fetchAllUsers();
        setDropdownOpen((prev) => ({ ...prev, [dropdownId]: false }));
      } catch (error) {
        showToast("Lỗi", error.response?.data?.message || "Không thể xóa thành viên.", "destructive");
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

  const handleCloseDetailModal = useCallback(() => {
    setShowDetailModal(false);
    setSelectedMember(null);
  }, []);

  const handleCloseAddModal = useCallback(() => {
    setShowAddModal(false);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setShowEditModal(false);
    setEditingMember(null);
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
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Quản lý thành viên</h1>
            <p className="text-blue-100 text-sm sm:text-base mt-1">Quản lý thông tin khách hàng và thành viên của hệ thống</p>
          </div>
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-white text-blue-600 hover:bg-blue-50 shadow-md w-full sm:w-auto"
            aria-label="Thêm thành viên mới"
          >
            <FiPlus className="h-4 w-4 mr-2" />
            Thêm thành viên
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Tổng thành viên</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-900">{members.length}</p>
              </div>
              <div className="p-2 sm:p-3 bg-blue-500 rounded-xl">
                <FiCalendar className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Hoạt động</p>
                <p className="text-xl sm:text-2xl font-bold text-green-900">{members.filter((m) => m.active).length}</p>
              </div>
              <div className="p-2 sm:p-3 bg-green-500 rounded-xl">
                <FiEye className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Quản trị viên</p>
                <p className="text-xl sm:text-2xl font-bold text-purple-900">{members.filter((m) => m.role === "ADMIN").length}</p>
              </div>
              <div className="p-2 sm:p-3 bg-purple-500 rounded-xl">
                <FiShield className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Nhân viên</p>
                <p className="text-xl sm:text-2xl font-bold text-orange-900">{members.filter((m) => m.role === "STAFF").length}</p>
              </div>
              <div className="p-2 sm:p-3 bg-orange-500 rounded-xl">
                <FiUser className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-md">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Tìm kiếm theo tên hoặc email..."
                value={searchTerm}
                onChange={handleSearchChange}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10 text-sm"
                aria-label="Tìm kiếm thành viên"
              />
            </div>
            <Button variant="outline" onClick={handleSearch} className="text-sm">
              <FiFilter className="h-4 w-4 mr-2" />
              Tìm kiếm
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-8">
          <FiLoader className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600 mt-2 text-sm">Đang tải...</p>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600 text-sm">Không tìm thấy thành viên nào.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {filteredMembers.map((member) => {
            const dropdownId = `dropdown-${member.id}`;
            return (
              <Card
                key={member.id}
                className="border-none shadow-md hover:shadow-lg transition-shadow"
                aria-labelledby={`member-title-${member.id}`}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {member.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3
                          id={`member-title-${member.id}`}
                          className="font-semibold text-slate-900 text-sm sm:text-base line-clamp-2"
                          title={member.name}
                        >
                          {member.name}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-500 truncate" title={member.email}>
                          {member.email}
                        </p>
                      </div>
                    </div>
                    <Badge className={cn(status.className, "text-xs sm:text-sm")}>{status.text}</Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center text-xs sm:text-sm text-slate-600 truncate">
                      <FiMail className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 text-slate-400 flex-shrink-0" />
                      <span title={member.email}>{member.email}</span>
                    </div>
                    <div className="flex items-center text-xs sm:text-sm text-slate-600 truncate">
                      <FiPhone className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 text-slate-400 flex-shrink-0" />
                      <span title={member.phone}>{member.phone}</span>
                    </div>
                    <div className="flex items-center text-xs sm:text-sm text-slate-600">
                      <FiShield className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 text-slate-400 flex-shrink-0" />
                      Vai trò: {member.role}
                    </div>
                    <div className="flex items-center text-xs sm:text-sm text-slate-600">
                      <FiCalendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 text-slate-400 flex-shrink-0" />
                      Tham gia: {member.joinDate}
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs sm:text-sm"
                        onClick={() => handleViewDetail(member)}
                        aria-label={`Xem chi tiết ${member.name}`}
                      >
                        <FiEye className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Chi tiết</span>
                      </Button>
                      <DropdownMenu
                        open={dropdownOpen[dropdownId] || false}
                        onOpenChange={(open) => setDropdownOpen((prev) => ({ ...prev, [dropdownId]: open }))}
                      >
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs sm:text-sm"
                            aria-label="Thêm tùy chọn"
                          >
                            <FiMoreHorizontal className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEditMember(member, dropdownId)}
                            className="text-xs sm:text-sm"
                          >
                            <FiEdit className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                            Chỉnh sửa
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600 text-xs sm:text-sm"
                            onClick={() => handleDeleteMember(member.id, dropdownId)}
                          >
                            <FiTrash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
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
        onClose={handleCloseDetailModal}
      />
      <MemberCreateModal
        isOpen={showAddModal}
        onClose={handleCloseAddModal}
        onSuccess={fetchAllUsers}
      />
      <MemberEditModal
        member={editingMember}
        isOpen={showEditModal}
        onClose={handleCloseEditModal}
        onSuccess={fetchAllUsers}
      />
      <Toaster />
    </div>
  );
}

export default Members;