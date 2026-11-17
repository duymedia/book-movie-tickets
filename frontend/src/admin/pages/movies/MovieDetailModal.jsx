import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import { useToast } from "../../hooks/use-toast";
import { format, parseISO, addMinutes, isPast } from "date-fns";
import { Film } from "lucide-react";
import { cn } from "../../lib/utils";

const MovieDetailModal = ({ movie, isOpen, onClose }) => {
  const [imageSrc, setImageSrc] = useState(movie?.image || "/placeholder.svg?height=400&width=300");
  const token = localStorage.getItem("authToken");
  const { toast } = useToast();

  useEffect(() => {
    if (movie?.image && token && isOpen) {
      const fetchImage = async () => {
        try {
          const response = await fetch(movie.image, {
            headers: { Authorization: `Bearer ${token}` },
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
            className: "bg-red-600 text-white",
            duration: 5000,
          });
        }
      };
      fetchImage();
    } else {
      setImageSrc(movie?.image || "/placeholder.svg?height=400&width=300");
    }
  }, [movie?.image, token, isOpen, toast]);

  if (!movie) return null;

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

  const getShowtimeStatus = (start, end, currentTime) => {
    if (!start || !end) return "Không hợp lệ";
    if (isPast(end)) return "Đã hết";
    return "Sắp chiếu";
  };

  const currentTime = new Date();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100"
        aria-describedby="movie-detail-description"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Film className="h-5 w-5" />
            Chi tiết phim: {movie.title || "Không có tiêu đề"}
          </DialogTitle>
          <DialogDescription id="movie-detail-description" className="text-sm">
            Thông tin chi tiết về phim, bao gồm rạp chiếu, phòng chiếu, thời lượng, và lịch chiếu.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="md:col-span-1">
            <img
              src={imageSrc}
              alt={movie.title || "Phim"}
              className="w-full rounded-lg shadow-lg object-cover"
              onError={(e) => (e.target.src = "/placeholder.jpg")}
            />
          </div>
          <div className="md:col-span-2 space-y-3 sm:space-y-4">
            <div>
              <h3 className="text-lg sm:text-2xl font-bold text-slate-900 truncate" title={movie.title || "Không có tiêu đề"}>
                {movie.title || "Không có tiêu đề"}
              </h3>
              <p className="text-sm sm:text-base text-slate-600 truncate" title={movie.category || "Không có thể loại"}>
                {movie.category || "Không có thể loại"}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-sm font-medium text-slate-600">Rạp chiếu</label>
                <p className="text-base sm:text-lg truncate" title={movie.cinema?.name || "Không có rạp chiếu"}>
                  {movie.cinema?.name || "Không có rạp chiếu"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Phòng chiếu</label>
                <p className="text-base sm:text-lg truncate" title={movie.room?.numberRoom || "Không có phòng chiếu"}>
                  {movie.room?.numberRoom || "Không có phòng chiếu"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Thời lượng</label>
                <p className="text-base sm:text-lg">
                  {movie.durationMinutes ? `${movie.durationMinutes} phút` : "Không có thời lượng"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Đạo diễn</label>
                <p className="text-base sm:text-lg truncate" title={movie.director || "Không có thông tin"}>
                  {movie.director || "Không có thông tin"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Diễn viên</label>
                <p className="text-base sm:text-lg line-clamp-2" title={movie.actors || "Không có thông tin"}>
                  {movie.actors || "Không có thông tin"}
                </p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Mô tả</label>
              <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                {movie.description || "Không có mô tả"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Lịch chiếu</label>
              {Array.isArray(movie.showtimes) && movie.showtimes.length > 0 ? (
                <div className="mt-2 overflow-x-auto">
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
                              <td colSpan="3" className="p-2 text-red-600 text-sm">
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
                            <td className="p-2 text-sm">{startFormatted}</td>
                            <td className="p-2 text-sm">{endFormatted}</td>
                            <td className="p-2">
                              <span
                                className={cn(
                                  "text-sm",
                                  status === "Sắp chiếu" ? "text-blue-600" : status === "Đã hết" ? "text-gray-600" : "text-red-600"
                                )}
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
                <p className="text-sm text-slate-600">Không có lịch chiếu</p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MovieDetailModal;