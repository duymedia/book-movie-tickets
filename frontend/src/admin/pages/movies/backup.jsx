
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import {
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Star,
  Clock,
  Calendar,
  Film,
  Save,
  X,
  Loader2,
} from "lucide-react";
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
  DialogDescription,
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
import { format, parseISO, addMinutes, isPast } from "date-fns";

const API_BASE_URL = "http://localhost:8080/api/admin/movies";
const CINEMAS_API_URL = "http://localhost:8080/api/admin/cinemas";
const ROOMS_BY_CINEMA_API_URL = "http://localhost:8080/api/admin/rooms/cinema";

const validateFormData = (formData) => {
  const errors = {};
  if (!formData.title || formData.title.length < 2) {
    errors.title = "Tên phim phải có ít nhất 2 ký tự";
  }
  if (!formData.category || formData.category.length < 2) {
    errors.category = "Thể loại phải có ít nhất 2 ký tự";
  }
  if (!formData.durationMinutes || parseInt(formData.durationMinutes) <= 0) {
    errors.durationMinutes = "Thời lượng phải là số dương";
  }
  if (!formData.description || formData.description.length < 10) {
    errors.description = "Mô tả phải có ít nhất 10 ký tự";
  }
  if (!formData.cinema?.id) {
    errors.cinema = "Vui lòng chọn rạp chiếu";
  }
  if (!formData.room?.id) {
    errors.room = "Vui lòng chọn phòng chiếu";
  }
  if (formData.showtimes.length === 0) {
    errors.showtimes = "Phải cung cấp ít nhất một suất chiếu";
  } else {
    formData.showtimes.forEach((showtime, index) => {
      if (!showtime.timeStart) {
        errors[`showtime_${index}`] = "Thời gian suất chiếu không được để trống";
      } else {
        try {
          const start = parseISO(showtime.timeStart);
          if (isPast(start)) {
            errors[`showtime_${index}`] = "Thời gian suất chiếu không được là quá khứ";
          }
        } catch {
          errors[`showtime_${index}`] = "Thời gian suất chiếu không hợp lệ";
        }
      }
    });
  }
  return errors;
};

const MovieDetailModal = ({ movie, isOpen, onClose }) => {
  const [imageSrc, setImageSrc] = useState(movie?.image || "/placeholder.svg?height=400&width=300");
  const token = localStorage.getItem("authToken");
  const { toast } = useToast();

  useEffect(() => {
    if (movie?.image && token && isOpen) {
      const fetchImage = async () => {
        try {
          const response = await fetch(movie.image, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (!response.ok) throw new Error("Failed to load image");
          const blob = await response.blob();
          setImageSrc(URL.createObjectURL(blob));
        } catch (error) {
          console.error("Failed to load image:", error);
          setImageSrc("/placeholder.jpg");
          toast({
            title: "Lỗi",
            description: "Không thể tải hình ảnh phim.",
            variant: "destructive",
          });
        }
      };
      fetchImage();
    } else {
      setImageSrc(movie?.image || "/placeholder.svg?height=400&width=300");
    }
  }, [movie?.image, token, isOpen, toast]);

  if (!movie) {
    return null;
  }

  // Hàm tính thời gian kết thúc dựa trên timeStart và durationMinutes
  const calculateEndTime = (timeStart, durationMinutes) => {
    try {
      const start = parseISO(timeStart);
      const duration = parseInt(durationMinutes) || 0;
      const end = addMinutes(start, duration);
      return end;
    } catch {
      return null;
    }
  };

  // Hàm xác định trạng thái suất chiếu
  const getShowtimeStatus = (start, end, currentTime) => {
    if (!start || !end) return "Không hợp lệ";
    if (isPast(end)) return "Đã hết";
    return "Sắp chiếu";
  };

  // Thời gian hiện tại
  const currentTime = new Date();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100"
        aria-describedby="movie-detail-description"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="h-5 w-5" />
            Chi tiết phim: {movie.title || "Không có tiêu đề"}
          </DialogTitle>
          <DialogDescription id="movie-detail-description">
            Thông tin chi tiết về phim, bao gồm rạp chiếu, phòng chiếu, thời lượng, và lịch chiếu.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <img
              src={imageSrc}
              alt={movie.title || "Phim"}
              className="w-full rounded-lg shadow-lg"
              onError={(e) => (e.target.src = "/placeholder.jpg")}
            />
          </div>
          <div className="md:col-span-2 space-y-4">
            <div>
              <h3 className="text-2xl font-bold text-slate-900">{movie.title || "Không có tiêu đề"}</h3>
              <p className="text-slate-600">{movie.category || "Không có thể loại"}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-600">Rạp chiếu</label>
                <p className="text-lg">{movie.cinema?.name || "Không có rạp chiếu"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Phòng chiếu</label>
                <p className="text-lg">{movie.room?.numberRoom || "Không có phòng chiếu"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Thời lượng</label>
                <p className="text-lg">
                  {movie.durationMinutes ? `${movie.durationMinutes} phút` : "Không có thời lượng"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Đạo diễn</label>
                <p className="text-lg">{movie.director || "Không có thông tin"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Diễn viên</label>
                <p className="text-lg">{movie.actors || "Không có thông tin"}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Mô tả</label>
              <p className="text-slate-700 leading-relaxed">{movie.description || "Không có mô tả"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Lịch chiếu</label>
              {Array.isArray(movie.showtimes) && movie.showtimes.length > 0 ? (
                <div className="mt-2">
                  <table className="w-full text-sm text-left text-slate-700">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="p-2 font-medium">Thời gian bắt đầu</th>
                        <th className="p-2 font-medium">Thời gian kết thúc</th>
                        <th className="p-2 font-medium">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movie.showtimes.map((showtime, index) => {
                        const isValidStart =
                          showtime.timeStart && !isNaN(Date.parse(showtime.timeStart));
                        const durationMinutes = movie.durationMinutes || 0;
                        const endTime = isValidStart
                          ? calculateEndTime(showtime.timeStart, durationMinutes)
                          : null;

                        if (!isValidStart || !endTime) {
                          return (
                            <tr key={showtime.id || index} className="border-b">
                              <td colSpan="3" className="p-2 text-red-600">
                                Suất chiếu không hợp lệ (thời gian bắt đầu hoặc thời lượng không đúng)
                              </td>
                            </tr>
                          );
                        }

                        const startFormatted = format(parseISO(showtime.timeStart), "dd/MM/yyyy HH:mm");
                        const endFormatted = format(endTime, "dd/MM/yyyy HH:mm");
                        const status = getShowtimeStatus(
                          parseISO(showtime.timeStart),
                          endTime,
                          currentTime
                        );

                        return (
                          <tr key={showtime.id || index} className="border-b">
                            <td className="p-2">{startFormatted}</td>
                            <td className="p-2">{endFormatted}</td>
                            <td className="p-2">
                              <span
                                className={
                                  status === "Sắp chiếu"
                                    ? "text-blue-600"
                                    : status === "Đã hết"
                                    ? "text-gray-600"
                                    : "text-red-600"
                                }
                              >
                                {status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-slate-600">Không có lịch chiếu</p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const MovieModal = ({ movie, isOpen, onClose, onSave, isEdit = false, cinemas, rooms, fetchRoomsByCinema, roomLoading, setRooms }) => {
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    durationMinutes: "",
    description: "",
    director: "", // New field
    actors: "", // New field
    image: null,
    cinema: null,
    room: null,
    showtimes: [{ timeStart: "" }],
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      if (movie && isEdit) {
        setFormData({
          title: movie.title || "",
          category: movie.category || "",
          durationMinutes: movie.durationMinutes?.toString() || "",
          description: movie.description || "",
          director: movie.director || "", // Initialize director
          actors: movie.actors || "", // Initialize actors
          image: null,
          cinema: movie.cinema || null,
          room: movie.room || null,
          showtimes: movie.showtimes?.map((s) => ({
            timeStart: s.timeStart?.slice(0, 16) || "",
          })) || [{ timeStart: "" }],
        });
        setImagePreview(movie.image || null);
      } else {
        setFormData({
          title: "",
          category: "",
          durationMinutes: "",
          description: "",
          image: null,
          cinema: null,
          room: null,
          showtimes: [{ timeStart: "" }],
        });
        setImagePreview(null);
        setRooms([]);
      }
      setErrors({});
    }
  }, [isOpen, movie, isEdit, setRooms]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({ title: "Lỗi", description: "Vui lòng chọn file hình ảnh.", variant: "destructive" });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Lỗi", description: "Hình ảnh không được vượt quá 5MB.", variant: "destructive" });
        return;
      }
      setFormData((prev) => ({ ...prev, image: file }));
      setImagePreview(URL.createObjectURL(file));
      setErrors((prev) => ({ ...prev, image: null }));
    }
  };

  const addShowtime = () => {
    if (!formData.durationMinutes || parseInt(formData.durationMinutes) <= 0) {
      toast({ title: "Lỗi", description: "Vui lòng nhập thời lượng phim hợp lệ trước khi thêm suất chiếu.", variant: "destructive" });
      return;
    }

    const lastShowtime = formData.showtimes[formData.showtimes.length - 1];
    let newTimeStart = "";

    if (lastShowtime?.timeStart) {
      try {
        const lastStart = parseISO(lastShowtime.timeStart);
        const newStart = addMinutes(lastStart, parseInt(formData.durationMinutes));
        newTimeStart = format(newStart, "yyyy-MM-dd'T'HH:mm");
      } catch {
        toast({ title: "Lỗi", description: "Thời gian suất chiếu cuối cùng không hợp lệ.", variant: "destructive" });
        return;
      }
    } else {
      newTimeStart = format(new Date(), "yyyy-MM-dd'T'HH:mm");
    }

    setFormData({
      ...formData,
      showtimes: [...formData.showtimes, { timeStart: newTimeStart }],
    });
  };

  const removeShowtime = (index) => {
    setFormData({
      ...formData,
      showtimes: formData.showtimes.filter((_, i) => i !== index),
    });
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[`showtime_${index}`];
      return newErrors;
    });
  };

  const handleShowtimeChange = (index, value) => {
    const newShowtimes = [...formData.showtimes];
    newShowtimes[index] = { timeStart: value };
    setFormData({ ...formData, showtimes: newShowtimes });
    if (errors[`showtime_${index}`]) {
      setErrors((prev) => ({ ...prev, [`showtime_${index}`]: null }));
    }
  };

  const handleSave = async () => {
    const validationErrors = validateFormData(formData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSaving(true);
    try {
      const result = await onSave(formData, isEdit);
      if (result.errors && Object.keys(result.errors).length > 0) {
        setErrors(result.errors);
        return;
      }
      toast({ title: "Thành công", description: `Đã lưu phim ${formData.title} thành công!`, variant: "success" });
      onClose();
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Không thể lưu phim. Vui lòng kiểm tra dữ liệu và thử lại.";
      console.error("Error saving movie:", error.response || error);
      toast({
        title: "Lỗi",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100"
        aria-describedby="movie-modal-description"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="h-5 w-5" />
            {isEdit ? "Chỉnh sửa phim" : "Thêm phim mới"}
          </DialogTitle>
          <DialogDescription id="movie-modal-description">
            Nhập thông tin phim, bao gồm tiêu đề, thể loại, thời lượng, rạp chiếu, phòng chiếu, và lịch chiếu.
          </DialogDescription>
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Tên phim</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="Tên phim"
                className={errors.title ? "border-red-500" : ""}
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
            </div>
            <div>
              <Label htmlFor="category">Thể loại</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => handleInputChange("category", e.target.value)}
                placeholder="Action, Drama, Comedy..."
                className={errors.category ? "border-red-500" : ""}
              />
              {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="director">Đạo diễn</Label>
              <Input
                id="director"
                value={formData.director}
                onChange={(e) => handleInputChange("director", e.target.value)}
                placeholder="Tên đạo diễn (tùy chọn)"
                className={errors.director ? "border-red-500" : ""}
              />
              {errors.director && <p className="text-red-500 text-sm mt-1">{errors.director}</p>}
            </div>
            <div>
              <Label htmlFor="actors">Diễn viên</Label>
              <Input
                id="actors"
                value={formData.actors}
                onChange={(e) => handleInputChange("actors", e.target.value)}
                placeholder="Diễn viên (tùy chọn, cách nhau bởi dấu phẩy)"
                className={errors.actors ? "border-red-500" : ""}
              />
              {errors.actors && <p className="text-red-500 text-sm mt-1">{errors.actors}</p>}
            </div>
            <div>
              <Label htmlFor="durationMinutes">Thời lượng (phút)</Label>
              <Input
                id="durationMinutes"
                type="number"
                value={formData.durationMinutes}
                onChange={(e) => handleInputChange("durationMinutes", e.target.value)}
                placeholder="120"
                className={errors.durationMinutes ? "border-red-500" : ""}
              />
              {errors.durationMinutes && <p className="text-red-500 text-sm mt-1">{errors.durationMinutes}</p>}
            </div>
            <div>
              <Label htmlFor="image">Hình ảnh</Label>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className={errors.image ? "border-red-500" : ""}
              />
              {errors.image && <p className="text-red-500 text-sm mt-1">{errors.image}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cinema">Rạp chiếu</Label>
              <Select
                id="cinema"
                value={formData.cinema?.id?.toString()}
                onValueChange={(value) => {
                  const selectedCinema = cinemas.find((c) => c.id === parseInt(value));
                  handleInputChange("cinema", selectedCinema);
                  handleInputChange("room", null);
                  handleInputChange("showtimes", [{ timeStart: "" }]);
                  if (selectedCinema) {
                    fetchRoomsByCinema(selectedCinema.id);
                  } else {
                    setRooms([]);
                  }
                }}
              >
                <SelectTrigger className={errors.cinema ? "border-red-500" : ""}>
                  <SelectValue placeholder="Chọn rạp chiếu" />
                </SelectTrigger>
                <SelectContent>
                  {cinemas.map((cinema) => (
                    <SelectItem key={cinema.id} value={cinema.id.toString()}>
                      {cinema.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.cinema && <p className="text-red-500 text-sm mt-1">{errors.cinema}</p>}
            </div>
            <div className="relative">
              <Label htmlFor="room">Phòng chiếu</Label>
              <Select
                id="room"
                value={formData.room?.id?.toString()}
                onValueChange={(value) => {
                  const selectedRoom = rooms.find((r) => r.id === parseInt(value));
                  handleInputChange("room", selectedRoom);
                }}
                disabled={!formData.cinema?.id || rooms.length === 0 || roomLoading}
              >
                <SelectTrigger className={errors.room ? "border-red-500" : ""}>
                  <SelectValue placeholder={formData.cinema?.id ? (roomLoading ? "Đang tải..." : "Chọn phòng chiếu") : "Chọn rạp trước"} />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((room) => (
                    <SelectItem key={room.id} value={room.id.toString()}>
                      {room.numberRoom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {roomLoading && (
                <Loader2 className="absolute right-2 top-9 h-4 w-4 animate-spin text-gray-500" />
              )}
              {errors.room && <p className="text-red-500 text-sm mt-1">{errors.room}</p>}
            </div>
          </div>
          <div>
            <Label>Suất chiếu</Label>
            {formData.showtimes.map((showtime, index) => (
              <div key={index} className="flex items-center gap-2 mb-2">
                <Input
                  type="datetime-local"
                  value={showtime.timeStart}
                  onChange={(e) => handleShowtimeChange(index, e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className={errors[`showtime_${index}`] ? "border-red-500" : ""}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeShowtime(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
                {errors[`showtime_${index}`] && (
                  <p className="text-red-500 text-sm mt-1">{errors[`showtime_${index}`]}</p>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addShowtime} className="mt-2">
              <Plus className="h-4 w-4 mr-2" />
              Thêm suất chiếu
            </Button>
            {errors.showtimes && <p className="text-red-500 text-sm mt-1">{errors.showtimes}</p>}
          </div>
          <div>
            <Label htmlFor="description">Mô tả</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Mô tả về phim..."
              rows={4}
              className={errors.description ? "border-red-500" : ""}
            />
            {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
          </div>
          <div className="flex gap-3 pt-4">
            <Button onClick={onClose} variant="outline" className="flex-1">
              <X className="h-4 w-4 mr-2" />
              Hủy
            </Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {saving ? "Đang lưu..." : "Lưu"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

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
          <p className="text-red-600">Đã xảy ra lỗi: {this.state.error?.message || "Unknown error"}</p>
          <p>Vui lòng thử lại hoặc liên hệ hỗ trợ.</p>
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
          variant === "destructive" ? "toast-error" : "toast-success"
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
      showToast(
        "Lỗi",
        error.response?.data?.message || "Không thể tải danh sách phòng chiếu.",
        "destructive"
      );
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

  const calculateEndTime = (timeStart, durationMinutes) => {
    try {
      const start = parseISO(timeStart);
      const duration = parseInt(durationMinutes) || 0;
      const end = addMinutes(start, duration);
      return format(end, "yyyy-MM-dd'T'HH:mm:ss.SSS");
    } catch {
      return null;
    }
  };

  const handleCreateMovie = useCallback(
    async (formData, isEdit) => {
      const validationErrors = validateFormData(formData);
      if (Object.keys(validationErrors).length > 0) {
        return { errors: validationErrors };
      }
      if (!isEdit && !formData.image) {
        return { errors: { image: "Hình ảnh là bắt buộc khi thêm phim mới" } };
      }

      const form = new FormData();
      const movieData = {
        title: formData.title,
        category: formData.category,
        durationMinutes: parseInt(formData.durationMinutes),
        description: formData.description,
        director: formData.director || null, // Include director
        actors: formData.actors || null, // Include actors
        cinema: { id: parseInt(formData.cinema.id) },
        room: { id: parseInt(formData.room.id) },
        showtimes: formData.showtimes.map((s) => ({
          timeStart: s.timeStart + ":00.000",
          timeEnd: calculateEndTime(s.timeStart, formData.durationMinutes),
        })),
      };

      if (!movieData.showtimes.every((s) => s.timeStart && s.timeEnd)) {
        return { errors: { showtimes: "Một hoặc nhiều suất chiếu không hợp lệ" } };
      }

      form.append("movie", JSON.stringify(movieData));
      if (formData.image) {
        form.append("image", formData.image);
      }

      try {
        setLoading(true);
        const response = await axios.post(API_BASE_URL, form, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
        if (response.data.success) {
          fetchMovies();
          return {};
        } else {
          throw new Error(response.data.message || "Thêm phim thất bại");
        }
      } catch (error) {
        const errorMessage = error.response?.data?.message || "Không thể thêm phim.";
        console.error("Error creating movie:", error.response || error);
        return { errors: { api: errorMessage } };
      } finally {
        setLoading(false);
      }
    },
    [token, fetchMovies, setLoading]
  );

  const handleUpdateMovie = useCallback(
    async (formData, isEdit) => {
      const validationErrors = validateFormData(formData);
      if (Object.keys(validationErrors).length > 0) {
        return { errors: validationErrors };
      }

      const form = new FormData();
      const movieData = {
        title: formData.title,
        category: formData.category,
        durationMinutes: parseInt(formData.durationMinutes),
        description: formData.description,
        director: formData.director || null, // Include director
        actors: formData.actors || null, // Include actors
        cinema: { id: parseInt(formData.cinema.id) },
        room: { id: parseInt(formData.room.id) },
        showtimes: formData.showtimes.map((s) => ({
          timeStart: s.timeStart + ":00.000",
          timeEnd: calculateEndTime(s.timeStart, formData.durationMinutes),
        })),
      };

      if (!movieData.showtimes.every((s) => s.timeStart && s.timeEnd)) {
        return { errors: { showtimes: "Một hoặc nhiều suất chiếu không hợp lệ" } };
      }

      form.append("movie", JSON.stringify(movieData));
      if (formData.image) {
        form.append("image", formData.image);
      }

      try {
        setLoading(true);
        const response = await axios.put(`${API_BASE_URL}/${editingMovie.id}`, form, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
        if (response.data.success) {
          fetchMovies();
          return {};
        } else {
          throw new Error(response.data.message || "Cập nhật phim thất bại");
        }
      } catch (error) {
        const errorMessage = error.response?.data?.message || "Không thể cập nhật phim.";
        console.error("Error updating movie:", error.response || error);
        return { errors: { api: errorMessage } };
      } finally {
        setLoading(false);
      }
    },
    [token, fetchMovies, editingMovie, setLoading]
  );

  const handleDeleteMovie = useCallback(
    async (id, dropdownId) => {
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
    Promise.all([fetchMovies(), fetchCinemas()]).catch((error) => {
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
        return <Badge className="bg-green-100 text-green-800 border-green-200">Đang chiếu</Badge>;
      case "coming":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Sắp chiếu</Badge>;
      case "ended":
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Đã kết thúc</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <ErrorBoundary>
      <div className="space-y-8 max-w-7xl mx-auto p-4">
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl p-8 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                <Film className="h-8 w-8" />
                Quản lý phim
              </h1>
              <p className="text-blue-100 text-lg">Quản lý thông tin phim và lịch chiếu</p>
            </div>
            <Button
              onClick={() => setShowAddModal(true)}
              className="mt-4 md:mt-0 bg-white text-blue-600 hover:bg-blue-50"
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
          <div className="text-center py-6">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
            <p className="text-gray-600 mt-2">Đang tải...</p>
          </div>
        ) : movies.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-600">Không tìm thấy phim nào.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {movies.map((movie) => {
              const dropdownId = `dropdown-${movie.id}`;
              return (
                <Card
                  key={movie.id}
                  className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
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
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-2">{movie.title || "Không có tiêu đề"}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{movie.category || "Không có thể loại"}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Rạp: {movie.cinema?.name || "Không có rạp chiếu"}</p>

                      <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1 text-slate-600 dark:text-slate-400" />
                          {movie.durationMinutes ? `${movie.durationMinutes} phút` : "N/A"}
                        </div>
                        <div className="flex items-center">
                          <Star className="h-3 w-3 mr-1 text-yellow-400 fill-current" />
                          {movie.rating || "N/A"}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1 text-slate-600 dark:text-slate-400" />
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
                        >
                          <Eye className="h-3 w-3 mr-1 text-slate-600 dark:text-slate-400" />
                          Chi tiết
                        </Button>

                        <DropdownMenu
                          open={dropdownOpen[dropdownId] || false}
                          onOpenChange={(open) => setDropdownOpen((prev) => ({ ...prev, [dropdownId]: open }))}
                        >
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditMovie(movie, dropdownId)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Chỉnh sửa
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteMovie(movie.id, dropdownId)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
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
        <MovieModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSave={handleCreateMovie}
          isEdit={false}
          cinemas={cinemas}
          rooms={rooms}
          fetchRoomsByCinema={fetchRoomsByCinema}
          roomLoading={roomLoading}
          setRooms={setRooms}
        />
        <MovieModal
          movie={editingMovie}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingMovie(null);
          }}
          onSave={handleUpdateMovie}
          isEdit={true}
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