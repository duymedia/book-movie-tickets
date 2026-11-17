import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { FiSearch, FiPlus, FiFilter, FiMoreHorizontal, FiEye, FiMapPin, FiTv, FiUsers, FiImage, FiLoader, FiEdit, FiTrash2, FiAlertCircle, FiCheckCircle } from "react-icons/fi";
import { BiBuilding } from "react-icons/bi";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../components/ui/dropdown-menu";
import { Toaster } from "../../components/ui/toaster";
import { debounce } from "lodash";
import { cn } from "../../lib/utils";
import axios from "axios";
import { useToast } from "../../hooks/use-toast";
import CinemaDetailModal from "./CinemaDetailModal";
import CinemaCreateModal from "./CinemaCreateModal";
import CinemaEditModal from "./CinemaEditModal";

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
      return <div className="text-center text-red-500 py-6">Đã xảy ra lỗi. Vui lòng thử lại.</div>;
    }
    return this.props.children;
  }
}

// Utility function
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

const API_BASE_URL = "http://localhost:8080/api/admin";

export default function Cinemas() {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [cinemas, setCinemas] = useState([]);
  const [selectedCinema, setSelectedCinema] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCinema, setEditingCinema] = useState(null);
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
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Quản lý rạp chiếu</h1>
              <p className="text-blue-100 text-sm sm:text-base mt-1">Quản lý thông tin các rạp chiếu phim</p>
            </div>
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-white text-blue-600 hover:bg-blue-50 shadow-md w-full sm:w-auto"
              aria-label="Thêm rạp mới"
            >
              <FiPlus className="h-4 w-4 mr-2" />
              Thêm rạp mới
            </Button>
          </div>
        </div>

        <Card className="border-none shadow-md">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Tìm kiếm theo tên rạp hoặc địa chỉ..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10 text-sm"
                  aria-label="Tìm kiếm rạp chiếu"
                />
              </div>
              <Button variant="outline" onClick={handleSearch} className="flex items-center text-sm">
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
        ) : cinemas.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 text-sm">Không tìm thấy rạp chiếu nào.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {cinemas.map((cinema) => {
              const status = getStatusDisplay(cinema.status);
              const dropdownId = `dropdown-${cinema.id}`;
              return (
                <Card
                  key={cinema.id}
                  className="border-none shadow-md hover:shadow-lg transition-shadow"
                  aria-labelledby={`cinema-title-${cinema.id}`}
                >
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        {cinema.image ? (
                          <img
                            src={cinema.image}
                            alt={cinema.name}
                            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                            onError={(e) => (e.target.src = "/placeholder.jpg")}
                          />
                        ) : (
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <FiImage className="h-5 w-5 text-blue-600" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3
                            id={`cinema-title-${cinema.id}`}
                            className="font-semibold text-gray-800 text-sm sm:text-base truncate"
                            title={cinema.name}
                          >
                            {cinema.name}
                          </h3>
                          <div className="flex items-center text-xs sm:text-sm text-gray-600">
                            <FiMapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 text-gray-400 flex-shrink-0" />
                            <span className="truncate" title={cinema.address}>
                              {cinema.address}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Badge className={cn(status.className, "text-xs sm:text-sm")}>{status.text}</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-gray-50 rounded-md p-2 sm:p-3 text-center">
                        <FiTv className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 mx-auto mb-1" />
                        <p className="text-base sm:text-lg font-bold text-gray-900">{cinema.totalRooms || 0}</p>
                        <p className="text-xs text-gray-600">Phòng chiếu</p>
                      </div>
                      <div className="bg-gray-50 rounded-md p-2 sm:p-3 text-center">
                        <FiUsers className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 mx-auto mb-1" />
                        <p className="text-base sm:text-lg font-bold text-gray-900">{cinema.totalSeats || 0}</p>
                        <p className="text-xs text-gray-600">Tổng ghế</p>
                      </div>
                    </div>

                    <div className="border-t pt-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0 space-y-1">
                          <p
                            className="text-xs sm:text-sm text-gray-900 line-clamp-2"
                            title={cinema.description}
                          >
                            <span className="font-medium">Mô tả:</span> {cinema.description}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-600 truncate" title={cinema.phone}>
                            <span className="font-medium">SĐT:</span> {cinema.phone}
                          </p>
                        </div>
                        <div className="flex gap-1 sm:gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetail(cinema, dropdownId)}
                            className="text-xs sm:text-sm"
                            aria-label={`Xem chi tiết ${cinema.name}`}
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
                                onClick={() => handleEditCinema(cinema, dropdownId)}
                                className="text-xs sm:text-sm"
                              >
                                <FiEdit className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                                Chỉnh sửa
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600 text-xs sm:text-sm"
                                onClick={() => handleDeleteCinema(cinema.id, dropdownId)}
                              >
                                <FiTrash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
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
        <CinemaCreateModal
          isOpen={showAddModal}
          onClose={handleCloseAddModal}
          onSuccess={fetchCinemas}
        />
        <CinemaEditModal
          cinema={editingCinema}
          isOpen={showEditModal}
          onClose={handleCloseEditModal}
          onSuccess={fetchCinemas}
        />
        <Toaster />
      </div>
    </ErrorBoundary>
  );
}