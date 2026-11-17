import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Search,
  Plus,
  Filter,
  Monitor,
  Users,
  Building,
  Armchair,
} from "lucide-react";
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
import RoomDetailModal from "./RoomDetailModal";
import RoomModal from "./RoomModal";

export default function Rooms() {
  const [searchTerm, setSearchTerm] = useState("");
  const [cinemaFilter, setCinemaFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState([]);
  const [cinemas, setCinemas] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState({}); // Track dropdown open state per room
  const { toast } = useToast();
  const debouncedSearchRef = useRef(null);

  const API_BASE_URL = "http://localhost:8080/api/admin";
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
        duration: 3000,
      });
    },
    [toast]
  );

  const fetchAllCinemas = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/cinemas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCinemas(response.data);
    } catch (error) {
      showToast("Lỗi", "Không thể tải danh sách rạp chiếu.", "destructive");
    }
  }, [token, showToast]);

  const fetchAllRooms = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const roomsData = await Promise.all(
        response.data.map(async (room) => {
          let totalSeats = 0;
          try {
            const seatsResponse = await axios.get(
              `${API_BASE_URL}/seats/room/${room.id}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            totalSeats = seatsResponse.data.length;
          } catch (error) {
            totalSeats = 0;
          }
          return {
            id: room.id,
            name: room.numberRoom,
            cinema: room.cinema?.name || "Unknown",
            cinemaId: room.cinema?.id || "",
            totalSeats,
            occupancyRate: room.occupancyRate || 0,
            lastMaintenance: room.updatedAt
              ? format(new Date(room.updatedAt), "dd/MM/yyyy", { locale: vi })
              : "N/A",
          };
        })
      );
      setRooms(roomsData);
    } catch (error) {
      showToast("Lỗi", "Không thể tải danh sách phòng chiếu.", "destructive");
    } finally {
      setLoading(false);
    }
  }, [token, showToast]);

  const handleSearch = useCallback(async () => {
    if (!searchTerm) {
      fetchAllRooms();
      return;
    }
    try {
      setLoading(true);
      const filteredRooms = rooms.filter(
        (room) =>
          room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          room.cinema.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setRooms(filteredRooms);
    } catch (error) {
      showToast("Lỗi", "Không thể tìm kiếm phòng chiếu.", "destructive");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, rooms, showToast, fetchAllRooms]);

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

  const handleCreateRoom = useCallback(
    async (formData) => {
      try {
        setLoading(true);
        await axios.post(
          `${API_BASE_URL}/rooms`,
          {
            numberRoom: formData.name,
            cinema: { id: parseInt(formData.cinema) },
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        showToast(
          "Thành công",
          `Đã thêm phòng ${formData.name} thành công!`,
          "success"
        );
        setSearchTerm("");
        fetchAllRooms();
        return {};
      } catch (error) {
        const errorMessage =
          error.response?.data?.message || "Không thể thêm phòng.";
        showToast("Lỗi", errorMessage, "destructive");
        return { api: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [token, showToast, fetchAllRooms]
  );

  const handleUpdateRoom = useCallback(
    async (formData) => {
      try {
        const errors = validateFormData(formData, true);
        if (Object.keys(errors).length > 0) {
          return errors;
        }
        setLoading(true);
        await axios.put(
          `${API_BASE_URL}/rooms/${editingRoom.id}`,
          {
            numberRoom: formData.name,
            cinema: { id: parseInt(formData.cinema) },
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        showToast(
          "Thành công",
          `Đã cập nhật phòng ${formData.name} thành công!`,
          "success"
        );
        fetchAllRooms();
        return {};
      } catch (error) {
        const errorMessage =
          error.response?.data?.message || "Không thể cập nhật phòng.";
        showToast("Lỗi", errorMessage, "destructive");
        return { api: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [token, showToast, fetchAllRooms, editingRoom]
  );

  const handleDeleteRoom = useCallback(
    async (id, dropdownId) => {
      try {
        setLoading(true);
        await axios.delete(`${API_BASE_URL}/rooms/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        showToast("Thành công", "Xóa phòng thành công!", "success");
        fetchAllRooms();
        setDropdownOpen((prev) => ({ ...prev, [dropdownId]: false }));
      } catch (error) {
        const errorMessage =
          error.response?.data?.message || "Không thể xóa phòng.";
        showToast("Lỗi", errorMessage, "destructive");
      } finally {
        setLoading(false);
      }
    },
    [token, showToast, fetchAllRooms]
  );

  const handleViewDetail = useCallback((room) => {
    setSelectedRoom(room);
    setShowDetailModal(true);
  }, []);

  const handleEditRoom = useCallback((room, dropdownId) => {
    setEditingRoom(room);
    setShowEditModal(true);
    setDropdownOpen((prev) => ({ ...prev, [dropdownId]: false }));
  }, []);

  const handleCloseDetailModal = useCallback(() => {
    setShowDetailModal(false);
    setSelectedRoom(null);
  }, []);

  const handleCloseAddModal = useCallback(() => {
    setShowAddModal(false);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setShowEditModal(false);
    setEditingRoom(null);
  }, []);

  useEffect(() => {
    if (!token) {
      showToast(
        "Lỗi",
        "Vui lòng đăng nhập để xem danh sách phòng.",
        "destructive"
      );
      setLoading(false);
      return;
    }
    fetchAllCinemas();
    fetchAllRooms();
  }, [token, showToast, fetchAllRooms, fetchAllCinemas]);

  const filteredRooms = rooms.filter((room) => {
    const matchesSearch =
      room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.cinema.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCinema =
      !cinemaFilter ||
      room.cinema.toLowerCase().includes(cinemaFilter.toLowerCase());

    return matchesSearch && matchesCinema;
  });

  const roomStats = {
    total: rooms.length,
    totalSeats: rooms.reduce((sum, r) => sum + r.totalSeats, 0),
    avgOccupancy: rooms.length
      ? Math.round(
          rooms.reduce((sum, r) => sum + r.occupancyRate, 0) / rooms.length
        )
      : 0,
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl p-8 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <Monitor className="h-8 w-8" />
              Quản lý phòng chiếu
            </h1>
            <p className="text-blue-100 text-lg">
              Quản lý thông tin và cấu hình các phòng chiếu
            </p>
          </div>
          <Button
            onClick={() => setShowAddModal(true)}
            className="mt-4 md:mt-0 bg-white text-blue-600 hover:bg-blue-50 shadow-lg"
          >
            <Plus className="h-4 w-4 mr-2" />
            Thêm phòng mới
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Tổng phòng
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {roomStats.total}
                </p>
              </div>
              <Building className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  Tổng ghế
                </p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {roomStats.totalSeats}
                </p>
              </div>
              <Armchair className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                  Tỷ lệ lấp đầy
                </p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {roomStats.avgOccupancy}%
                </p>
              </div>
              <Users className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-lg dark:bg-slate-800">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Tìm kiếm phòng..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-10 bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 focus:bg-white dark:focus:bg-slate-600 focus:border-blue-300"
              />
            </div>
            <Select value={cinemaFilter} onValueChange={setCinemaFilter}>
              <SelectTrigger className="bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 focus:bg-white dark:focus:bg-slate-600 focus:border-blue-300">
                <SelectValue placeholder="Chọn rạp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả rạp</SelectItem>
                {cinemas.map((cinema) => (
                  <SelectItem key={cinema.id} value={cinema.name.toLowerCase()}>
                    {cinema.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="border-slate-200 dark:border-slate-600"
            >
              <Filter className="h-4 w-4 mr-2" />
              Bộ lọc nâng cao
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center">Đang tải...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.map((room) => (
            <Card
              key={room.id}
              className="border-0 shadow-lg dark:bg-slate-800"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold">
                      <Monitor className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        {room.name}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {room.cinema}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <Armchair className="h-5 w-5 text-slate-400 mx-auto mb-1" />
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {room.totalSeats}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Tổng ghế
                    </p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <Users className="h-5 w-5 text-slate-400 mx-auto mb-1" />
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {room.occupancyRate}%
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Lấp đầy
                    </p>
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">
                      Bảo trì cuối:
                    </span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {room.lastMaintenance}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetail(room)}
                    className="border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/20"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Chi tiết
                  </Button>
                  <DropdownMenu
                    open={dropdownOpen[`dropdown-${room.id}`] || false}
                    onOpenChange={(open) =>
                      setDropdownOpen((prev) => ({
                        ...prev,
                        [`dropdown-${room.id}`]: open,
                      }))
                    }
                  >
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-200 dark:border-slate-600"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          handleEditRoom(room, `dropdown-${room.id}`)
                        }
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Chỉnh sửa
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600 dark:text-red-400"
                        onClick={() =>
                          handleDeleteRoom(room.id, `dropdown-${room.id}`)
                        }
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Xóa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <RoomDetailModal
        room={selectedRoom}
        isOpen={showDetailModal}
        onClose={handleCloseDetailModal}
      />
      <RoomModal
        isOpen={showAddModal}
        onClose={handleCloseAddModal}
        onSave={handleCreateRoom}
        isEdit={false}
        cinemas={cinemas}
      />
      <RoomModal
        room={editingRoom}
        isOpen={showEditModal}
        onClose={handleCloseEditModal}
        onSave={handleUpdateRoom}
        isEdit={true}
        cinemas={cinemas}
      />
      <Toaster />
    </div>
  );
}

// Utility functions
const validateFormData = (formData, isEdit = false) => {
  const errors = {};

  if (!formData.name || formData.name.length < 2) {
    errors.name = "Tên phòng phải có ít nhất 2 ký tự";
  }

  if (!formData.cinema) {
    errors.cinema = "Vui lòng chọn rạp chiếu";
  }

  return errors;
};