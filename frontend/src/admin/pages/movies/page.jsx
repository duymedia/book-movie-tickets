import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Search, Plus, Filter, MoreHorizontal, Edit, Trash2, Eye, Star, Clock, Calendar, Loader2, Film } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../components/ui/dropdown-menu";
import { Toaster } from "../../components/ui/toaster";
import { format, parseISO } from "date-fns";
import { debounce } from "lodash";
import { cn } from "../../lib/utils";
import axios from "axios";
import { useToast } from "../../hooks/use-toast";
import MovieDetailModal from "./MovieDetailModal";
import MovieCreateModal from "./MovieCreateModal";
import MovieEditModal from "./MovieEditModal";

const API_BASE_URL = "http://localhost:8080/api/admin/movies";
const CINEMAS_API_URL = "http://localhost:8080/api/admin/cinemas";
const ROOMS_BY_CINEMA_API_URL = "http://localhost:8080/api/admin/rooms/cinema";

// Error Boundary Component
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center py-6">
          <p className="text-red-600 text-sm">Đã xảy ra lỗi: {this.state.error?.message || "Unknown error"}</p>
          <p className="text-sm">Vui lòng thử lại hoặc liên hệ hỗ trợ.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function MoviesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [roomLoading, setRoomLoading] = useState(false);
  const [movies, setMovies] = useState([]);
  const [cinemas, setCinemas] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [roomCache, setRoomCache] = useState({});
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMovie, setEditingMovie] = useState(null);
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
          <X className="w-5 h-5 mr-2" />
        ) : (
          <Save className="w-5 h-5 mr-2" />
        ),
        duration: 3000,
      });
    },
    [toast]
  );

  const fetchMovies = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_BASE_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setMovies(response.data.data || []);
      } else {
        throw new Error(response.data.message || "Không thể tải danh sách phim.");
      }
    } catch (error) {
      showToast("Lỗi", error.response?.data?.message || "Không thể tải danh sách phim.", "destructive");
    } finally {
      setLoading(false);
    }
  }, [token, showToast]);

  const fetchCinemas = useCallback(async () => {
    try {
      const response = await axios.get(CINEMAS_API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (Array.isArray(response.data)) {
        setCinemas(response.data);
      } else {
        throw new Error("Dữ liệu rạp phim không hợp lệ.");
      }
    } catch (error) {
      showToast("Lỗi", error.response?.data?.message || "Không thể tải danh sách rạp.", "destructive");
    }
  }, [token, showToast]);

  const fetchRoomsByCinema = useCallback(async (cinemaId) => {
    if (!cinemaId || isNaN(cinemaId) || cinemaId <= 0) {
      setRooms([]);
      showToast("Lỗi", "ID rạp phim không hợp lệ.", "destructive");
      return;
    }

    if (roomCache[cinemaId]) {
      setRooms(roomCache[cinemaId]);
      return;
    }

    try {
      setRoomLoading(true);
      const response = await axios.get(`${ROOMS_BY_CINEMA_API_URL}/${cinemaId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const roomsData = Array.isArray(response.data) ? response.data : [];
      if (!roomsData.every((room) => room.id && room.numberRoom)) {
        throw new Error("Dữ liệu phòng chiếu không hợp lệ.");
      }
      setRooms(roomsData);
      setRoomCache((prev) => ({ ...prev, [cinemaId]: roomsData }));
      if (roomsData.length === 0) {
        showToast("Thông báo", "Rạp phim này chưa có phòng chiếu.", "default");
      }
    } catch (error) {
      setRooms([]);
      showToast("Lỗi", error.response?.data?.message || "Không thể tải danh sách phòng chiếu.", "destructive");
    } finally {
      setRoomLoading(false);
    }
  }, [token, showToast, roomCache]);

  const handleSearch = useCallback(() => {
    if (!searchTerm) {
      fetchMovies();
      return;
    }
    const filtered = movies.filter(
      (movie) =>
        movie.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        movie.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setMovies(filtered);
  }, [searchTerm, movies, fetchMovies]);

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

  const handleDeleteMovie = useCallback(
    async (id, dropdownId) => {
      if (!window.confirm("Bạn có chắc muốn xóa phim này?")) return;
      try {
        setLoading(true);
        const response = await axios.delete(`${API_BASE_URL}/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data.success) {
          showToast("Thành công", "Xóa phim thành công!", "success");
          fetchMovies();
          setDropdownOpen((prev) => ({ ...prev, [dropdownId]: false }));
        } else {
          throw new Error(response.data.message || "Xóa phim thất bại");
        }
      } catch (error) {
        showToast("Lỗi", error.response?.data?.message || "Không thể xóa phim.", "destructive");
      } finally {
        setLoading(false);
      }
    },
    [token, showToast, fetchMovies]
  );

  const handleViewDetail = useCallback((movie, dropdownId) => {
    if (!movie) {
      showToast("Lỗi", "Không thể xem chi tiết phim vì dữ liệu không hợp lệ.", "destructive");
      return;
    }
    setSelectedMovie(movie);
    setShowDetailModal(true);
    setDropdownOpen((prev) => ({ ...prev, [dropdownId]: false }));
  }, [showToast]);

  const handleEditMovie = useCallback((movie, dropdownId) => {
    setEditingMovie(movie);
    setShowEditModal(true);
    if (movie.cinema?.id) {
      fetchRoomsByCinema(movie.cinema.id);
    }
    setDropdownOpen((prev) => ({ ...prev, [dropdownId]: false }));
  }, [fetchRoomsByCinema]);

  useEffect(() => {
    if (!token) {
      showToast("Lỗi", "Vui lòng đăng nhập để xem danh sách phim.", "destructive");
      setLoading(false);
      return;
    }
    Promise.all([fetchMovies(), fetchCinemas()]).catch(() => {
      showToast("Lỗi", "Không thể tải dữ liệu.", "destructive");
    });
  }, [token, showToast, fetchMovies, fetchCinemas]);

  useEffect(() => {
    if (showEditModal && editingMovie?.cinema?.id) {
      fetchRoomsByCinema(editingMovie.cinema.id);
    } else if (showAddModal) {
      setRooms([]);
    }
  }, [showAddModal, showEditModal, editingMovie, fetchRoomsByCinema]);

  const getStatusBadge = (status) => {
    switch (status) {
      case "showing":
        return <Badge className="bg-green-100 text-green-800 border-green-200 text-xs sm:text-sm">Đang chiếu</Badge>;
      case "coming":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs sm:text-sm">Sắp chiếu</Badge>;
      case "ended":
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200 text-xs sm:text-sm">Đã kết thúc</Badge>;
      default:
        return <Badge className="text-xs sm:text-sm" variant="secondary">{status || "Không xác định"}</Badge>;
    }
  };

  return (
    <ErrorBoundary>
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                <Film className="h-6 w-6 sm:h-8 sm:w-8" />
                Quản lý phim
              </h1>
              <p className="text-blue-100 text-sm sm:text-base mt-1">Quản lý thông tin phim và lịch chiếu</p>
            </div>
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-white text-blue-600 hover:bg-blue-50 shadow-md w-full sm:w-auto text-sm sm:text-base"
              aria-label="Thêm phim mới"
            >
              <Plus className="h-4 w-4 mr-2" />
              Thêm phim mới
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Tìm kiếm theo tên phim hoặc thể loại..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" onClick={handleSearch}>
                <Filter className="h-4 w-4 mr-2" />
                Tìm kiếm
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
            <p className="text-gray-600 mt-2 text-sm">Đang tải...</p>
          </div>
        ) : movies.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 text-sm">Không tìm thấy phim nào.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {movies.map((movie) => {
              const dropdownId = `dropdown-${movie.id}`;
              return (
                <Card
                  key={movie.id}
                  className="overflow-hidden border-none shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                  aria-labelledby={`movie-title-${movie.id}`}
                >
                  <div className="aspect-[3/4] relative">
                    <img
                      src={movie.image || "/placeholder.svg"}
                      alt={movie.title || "Phim"}
                      className="w-full h-full object-cover"
                      onError={(e) => (e.target.src = "/placeholder.jpg")}
                    />
                    <div className="absolute top-2 right-2">{getStatusBadge(movie.status)}</div>
                  </div>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <h3
                        id={`movie-title-${movie.id}`}
                        className="font-semibold text-slate-900 text-sm sm:text-base line-clamp-2"
                        title={movie.title || "Không có tiêu đề"}
                      >
                        {movie.title || "Không có tiêu đề"}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 truncate" title={movie.category || "Không có thể loại"}>
                        {movie.category || "Không có thể loại"}
                      </p>
                      <p className="text-xs sm:text-sm text-slate-600 truncate" title={movie.cinema?.name || "Không có rạp chiếu"}>
                        Rạp: {movie.cinema?.name || "Không có rạp chiếu"}
                      </p>
                      <div className="flex items-center justify-between text-xs sm:text-sm text-slate-600">
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {movie.durationMinutes ? `${movie.durationMinutes} phút` : "N/A"}
                        </div>
                        <div className="flex items-center">
                          <Star className="h-3 w-3 mr-1 text-yellow-400 fill-current" />
                          {movie.rating || "N/A"}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs sm:text-sm text-slate-600">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {movie.showtimes?.length > 0 && movie.showtimes[0]?.timeStart
                            ? format(parseISO(movie.showtimes[0].timeStart), "dd/MM/yyyy")
                            : "N/A"}
                        </div>
                        <span>{movie.showtimes?.length || 0} suất chiếu</span>
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetail(movie, dropdownId)}
                          className="flex-1 text-xs sm:text-sm"
                          aria-label={`Xem chi tiết ${movie.title || "phim"}`}
                        >
                          <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
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
                              <MoreHorizontal className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleEditMovie(movie, dropdownId)}
                              className="text-xs sm:text-sm"
                            >
                              <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                              Chỉnh sửa
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600 text-xs sm:text-sm"
                              onClick={() => handleDeleteMovie(movie.id, dropdownId)}
                            >
                              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
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

        <MovieDetailModal
          movie={selectedMovie}
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedMovie(null);
          }}
        />
        <MovieCreateModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchMovies}
          cinemas={cinemas}
          rooms={rooms}
          fetchRoomsByCinema={fetchRoomsByCinema}
          roomLoading={roomLoading}
          setRooms={setRooms}
        />
        <MovieEditModal
          movie={editingMovie}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingMovie(null);
          }}
          onSuccess={fetchMovies}
          cinemas={cinemas}
          rooms={rooms}
          fetchRoomsByCinema={fetchRoomsByCinema}
          roomLoading={roomLoading}
          setRooms={setRooms}
        />
        <Toaster />
      </div>
    </ErrorBoundary>
  );
}