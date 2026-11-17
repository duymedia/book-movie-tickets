import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Film, Save, X, Loader2, Plus } from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import axios from "axios";
import { format, parseISO, addMinutes, isPast } from "date-fns";
import { cn } from "../../lib/utils";

const API_BASE_URL = "http://localhost:8080/api/admin/movies";

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
  if (!formData.image) {
    errors.image = "Hình ảnh là bắt buộc khi thêm phim mới";
  }
  return errors;
};

const MovieCreateModal = ({ isOpen, onClose, onSuccess, cinemas, rooms, fetchRoomsByCinema, roomLoading, setRooms }) => {
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    durationMinutes: "",
    description: "",
    director: "",
    actors: "",
    image: null,
    cinema: null,
    room: null,
    showtimes: [{ timeStart: "" }],
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const token = localStorage.getItem("authToken");

  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: "",
        category: "",
        durationMinutes: "",
        description: "",
        director: "",
        actors: "",
        image: null,
        cinema: null,
        room: null,
        showtimes: [{ timeStart: "" }],
      });
      setImagePreview(null);
      setRooms([]);
      setErrors({});
    }
  }, [isOpen, setRooms]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Lỗi",
          description: "Vui lòng chọn file hình ảnh.",
          variant: "destructive",
          className: "bg-red-600 text-white",
          duration: 5000,
        });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Lỗi",
          description: "Hình ảnh không được vượt quá 5MB.",
          variant: "destructive",
          className: "bg-red-600 text-white",
          duration: 5000,
        });
        return;
      }
      setFormData((prev) => ({ ...prev, image: file }));
      setImagePreview(URL.createObjectURL(file));
      setErrors((prev) => ({ ...prev, image: null }));
    }
  };

  const addShowtime = () => {
    if (!formData.durationMinutes || parseInt(formData.durationMinutes) <= 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập thời lượng phim hợp lệ trước khi thêm suất chiếu.",
        variant: "destructive",
        className: "bg-red-600 text-white",
        duration: 5000,
      });
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
        toast({
          title: "Lỗi",
          description: "Thời gian suất chiếu cuối cùng không hợp lệ.",
          variant: "destructive",
          className: "bg-red-600 text-white",
          duration: 5000,
        });
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
    setErrors((prev) => ({ ...prev, [`showtime_${index}`]: null }));
  };

  const handleSave = async () => {
    const validationErrors = validateFormData(formData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSaving(true);
    try {
      const form = new FormData();
      const movieData = {
        title: formData.title,
        category: formData.category,
        durationMinutes: parseInt(formData.durationMinutes),
        description: formData.description,
        director: formData.director || null,
        actors: formData.actors || null,
        cinema: { id: parseInt(formData.cinema.id) },
        room: { id: parseInt(formData.room.id) },
        showtimes: formData.showtimes.map((s) => ({
          timeStart: s.timeStart + ":00.000",
          timeEnd: format(
            addMinutes(parseISO(s.timeStart), parseInt(formData.durationMinutes)),
            "yyyy-MM-dd'T'HH:mm:ss.SSS"
          ),
        })),
      };

      if (!movieData.showtimes.every((s) => s.timeStart && s.timeEnd)) {
        toast({
          title: "Lỗi",
          description: "Một hoặc nhiều suất chiếu không hợp lệ.",
          variant: "destructive",
          className: "bg-red-600 text-white",
          duration: 5000,
        });
        return;
      }

      form.append("movie", JSON.stringify(movieData));
      if (formData.image) {
        form.append("image", formData.image);
      }

      const response = await axios.post(API_BASE_URL, form, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      if (response.data.success) {
        toast({
          title: "Thành công",
          description: `Đã thêm phim ${formData.title} thành công!`,
          variant: "success",
          className: "bg-green-600 text-white",
          duration: 3000,
        });
        onSuccess();
        onClose();
      } else {
        throw new Error(response.data.message || "Thêm phim thất bại");
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Không thể thêm phim.";
      console.error("Error creating movie:", error.response || error);
      toast({
        title: "Lỗi",
        description: errorMessage,
        variant: "destructive",
        className: "bg-red-600 text-white",
        duration: 5000,
      });
      setErrors({ api: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100"
        aria-describedby="movie-create-description"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Film className="h-5 w-5" />
            Thêm phim mới
          </DialogTitle>
          <DialogDescription id="movie-create-description" className="text-sm">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Label htmlFor="title">Tên phim</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="Tên phim"
                className={cn("text-sm", errors.title ? "border-red-500" : "")}
              />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
            </div>
            <div>
              <Label htmlFor="category">Thể loại</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => handleInputChange("category", e.target.value)}
                placeholder="Action, Drama, Comedy..."
                className={cn("text-sm", errors.category ? "border-red-500" : "")}
              />
              {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
            </div>
            <div>
              <Label htmlFor="director">Đạo diễn</Label>
              <Input
                id="director"
                value={formData.director}
                onChange={(e) => handleInputChange("director", e.target.value)}
                placeholder="Tên đạo diễn (tùy chọn)"
                className={cn("text-sm", errors.director ? "border-red-500" : "")}
              />
              {errors.director && <p className="text-red-500 text-xs mt-1">{errors.director}</p>}
            </div>
            <div>
              <Label htmlFor="actors">Diễn viên</Label>
              <Input
                id="actors"
                value={formData.actors}
                onChange={(e) => handleInputChange("actors", e.target.value)}
                placeholder="Diễn viên (tùy chọn, cách nhau bởi dấu phẩy)"
                className={cn("text-sm", errors.actors ? "border-red-500" : "")}
              />
              {errors.actors && <p className="text-red-500 text-xs mt-1">{errors.actors}</p>}
            </div>
            <div>
              <Label htmlFor="durationMinutes">Thời lượng (phút)</Label>
              <Input
                id="durationMinutes"
                type="number"
                value={formData.durationMinutes}
                onChange={(e) => handleInputChange("durationMinutes", e.target.value)}
                placeholder="120"
                className={cn("text-sm", errors.durationMinutes ? "border-red-500" : "")}
              />
              {errors.durationMinutes && <p className="text-red-500 text-xs mt-1">{errors.durationMinutes}</p>}
            </div>
            <div>
              <Label htmlFor="image">Hình ảnh</Label>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className={cn("text-sm", errors.image ? "border-red-500" : "")}
              />
              {errors.image && <p className="text-red-500 text-xs mt-1">{errors.image}</p>}
            </div>
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
                <SelectTrigger className={cn("text-sm", errors.cinema ? "border-red-500" : "")}>
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
              {errors.cinema && <p className="text-red-500 text-xs mt-1">{errors.cinema}</p>}
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
                <SelectTrigger className={cn("text-sm", errors.room ? "border-red-500" : "")}>
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
              {errors.room && <p className="text-red-500 text-xs mt-1">{errors.room}</p>}
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
                  className={cn("text-sm", errors[`showtime_${index}`] ? "border-red-500" : "")}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeShowtime(index)}
                  className="text-red-500 hover:text-red-700"
                  aria-label="Xóa suất chiếu"
                >
                  <X className="h-4 w-4" />
                </Button>
                {errors[`showtime_${index}`] && (
                  <p className="text-red-500 text-xs mt-1">{errors[`showtime_${index}`]}</p>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={addShowtime}
              className="mt-2 text-sm"
              aria-label="Thêm suất chiếu"
            >
              <Plus className="h-4 w-4 mr-2" />
              Thêm suất chiếu
            </Button>
            {errors.showtimes && <p className="text-red-500 text-xs mt-1">{errors.showtimes}</p>}
          </div>
          <div>
            <Label htmlFor="description">Mô tả</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Mô tả về phim..."
              rows={4}
              className={cn("text-sm", errors.description ? "border-red-500" : "")}
            />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 text-sm"
              aria-label="Hủy"
            >
              <X className="h-4 w-4 mr-2" />
              Hủy
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 text-sm"
              aria-label="Lưu phim"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {saving ? "Đang lưu..." : "Lưu"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MovieCreateModal;