import { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent } from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import { Star, Clock, Calendar, Play, X, Heart, Share2, Bookmark } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { cn } from "../lib/utils";
import "../../globals.css";
import {
  format,
  parseISO,
  isValid,
  startOfDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isBefore,
  isSameDay,
  getDay,
  addDays,
} from "date-fns";

export function MovieDetailModal({ movie, onClose, onBookTicket }) {
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [selectedShowtime, setSelectedShowtime] = useState(null); // { id, time }
  const { toast } = useToast();

  useEffect(() => {
    console.log("MovieDetailModal movie prop:", JSON.stringify(movie, null, 2));
    const timer = setTimeout(() => setImageLoaded(true), 100);
    return () => clearTimeout(timer);
  }, [movie]);

  const today = startOfDay(new Date());
  const startOfMonthDate = startOfMonth(today);
  const endOfMonthDate = endOfMonth(today);
  const daysInMonth = eachDayOfInterval({
    start: startOfMonthDate,
    end: endOfMonthDate,
  });

  const firstDayOfWeek = (getDay(startOfMonthDate) + 6) % 7;
  const emptyDays = Array.from({ length: firstDayOfWeek }, (_, i) =>
    addDays(startOfMonthDate, -1 - i)
  ).reverse();

  const showtimes = movie?.showtimes
    ?.reduce((acc, showtime) => {
      if (typeof showtime === "string") {
        acc.push({ id: null, time: showtime, date: null });
      } else if (showtime?.timeStart) {
        try {
          const date = startOfDay(parseISO(showtime.timeStart));
          if (isValid(date)) {
            acc.push({
              id: showtime.id,
              time: showtime.time,
              date,
            });
          }
        } catch (error) {
          console.warn(`Invalid timeStart value: ${showtime.timeStart}`, error);
        }
      }
      return acc;
    }, [])
    .filter((showtime) => {
      if (!showtime.date) return isSameDay(selectedDate, today);
      return isSameDay(showtime.date, selectedDate);
    }) || [];

  const duration = movie?.duration || "Không xác định";
  const rating = movie?.rating || "Chưa có đánh giá";
  const releaseDate = movie?.createdAt
    ? new Date(movie.createdAt).getFullYear()
    : "Không xác định";
  const genre = movie?.genre || "Không xác định";
  const actorsArray = movie?.cast || [];

  const handleShareToFacebook = () => {
    const movieUrl = `https://yourwebsite.com/movies/${movie?.id || "unknown"}`;
    const actorsList = actorsArray.length > 0 ? actorsArray.join(", ") : "Không có diễn viên";
    const directorDisplay =
      movie?.director && movie.director.trim() && movie.director !== "Không xác định"
        ? movie.director
        : "Không có đạo diễn";
    const movieDetails = `
🎬 ${movie?.title || "Không có tiêu đề"}
📝 Nội dung phim: ${movie?.description || "Không có mô tả"}
💸 Thông tin vé:
   - Thời lượng: ${duration}
   - Đánh giá: ${rating}
🎭 Thể loại: ${genre}
🎥 Đạo diễn: ${directorDisplay}
👥 Diễn viên: ${actorsList}
⏰ Suất chiếu ngày ${format(selectedDate, "dd/MM/yyyy")}: ${
      showtimes.map((st) => st.time).join(", ") || "Không có suất chiếu"
    }
🔗 Xem thông tin phim: ${movieUrl}
Khám phá thêm tại CinemaMax!`;

    navigator.clipboard
      .writeText(movieDetails)
      .then(() => {
        toast({
          title: "Đã sao chép thông tin phim!",
          description: "Bạn có thể dán nội dung này để chia sẻ trên Facebook.",
          className: "bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-0",
        });

        const facebookShareUrl = `https://www.facebook.com/share_channel/?type=reshare&link=${encodeURIComponent(
          movieUrl
        )}&app_id=966242223397117&source_surface=external_reshare&display&hashtag=`;
        window.open(facebookShareUrl, "facebook-share-dialog", "width=800,height=600");
      })
      .catch((err) => {
        console.error("Lỗi khi sao chép thông tin: ", err);
        toast({
          title: "Lỗi",
          description: "Không thể sao chép thông tin phim. Vui lòng thử lại.",
          variant: "destructive",
          className: "bg-red-600 text-white border-0",
        });
      });
  };

  const handleBookTicket = () => {
    if (!selectedShowtime) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn một suất chiếu trước khi đặt vé.",
        variant: "destructive",
      });
      return;
    }
    onBookTicket({
      ...movie,
      selectedShowtime: selectedShowtime.time,
      selectedShowtimeId: selectedShowtime.id,
    });
  };

  if (!movie) return null;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-[90vw] max-h-[85vh] bg-gradient-to-br from-slate-900 via-gray-900 to-black border border-cyan-500/20 text-gray-300 p-0 overflow-hidden backdrop-blur-md">
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 z-20 bg-black/60 backdrop-blur-sm text-gray-300 border border-cyan-500/20 rounded-full transition-all duration-300 hover:scale-110 w-8 h-8"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>

          <div className="relative h-40 md:h-48 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent z-10" />
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-700/20 via-blue-700/20 to-purple-700/20 z-5" />
            <img
              src={movie.image || "/placeholder.jpg"}
              alt={movie.title}
              className={cn(
                "w-full h-full object-cover transition-all duration-1000",
                imageLoaded ? "scale-100 opacity-100" : "scale-110 opacity-0"
              )}
              onLoad={() => setImageLoaded(true)}
              onError={() => {
                console.error(`Failed to load image: ${movie.image}`);
                setImageLoaded(true);
              }}
            />

            <div className="absolute top-3 left-3 z-20 flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="bg-black/60 backdrop-blur-sm text-gray-300 border border-cyan-500/20 rounded-full transition-all duration-300 hover:scale-110 w-7 h-7"
                onClick={() => setIsLiked(!isLiked)}
              >
                <Heart
                  className={cn(
                    "w-3 h-3 transition-all duration-300",
                    isLiked ? "fill-red-500 text-red-500 scale-110" : ""
                  )}
                />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="bg-black/60 backdrop-blur-sm text-gray-300 border border-cyan-500/20 rounded-full transition-all duration-300 hover:scale-110 w-7 h-7"
                onClick={() => setIsBookmarked(!isBookmarked)}
              >
                <Bookmark
                  className={cn(
                    "w-3 h-3 transition-all duration-300",
                    isBookmarked ? "fill-blue-500 text-blue-500 scale-110" : ""
                  )}
                />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="bg-black/60 backdrop-blur-sm text-gray-300 border border-cyan-500/20 rounded-full transition-all duration-300 hover:scale-110 w-7 h-7"
                onClick={handleShareToFacebook}
              >
                <Share2 className="w-3 h-3" />
              </Button>
            </div>

            <div className="absolute bottom-3 left-3 z-20">
              <Badge className="mb-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-cyan-300 border-0 shadow-lg text-xs">
                Phim đang chiếu
              </Badge>
              <h2 className="text-xl md:text-2xl font-bold mb-1 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                {movie.title}
              </h2>
              <div className="flex items-center space-x-3 text-gray-400">
                <div className="flex items-center bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full">
                  <Star className="w-3 h-3 text-yellow-400 mr-1" />
                  <span className="font-semibold text-xs">{rating}</span>
                </div>
                <div className="flex items-center bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full">
                  <Clock className="w-3 h-3 mr-1" />
                  <span className="text-xs">{duration}</span>
                </div>
                <div className="flex items-center bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full">
                  <Calendar className="w-3 h-3 mr-1" />
                  <span className="text-xs">{releaseDate}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 max-h-[45vh] overflow-y-auto custom-scrollbar">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-3">
                <div className="bg-gradient-to-r from-cyan-900/30 via-blue-900/30 to-purple-900/30 backdrop-blur-sm rounded-lg p-3 border border-cyan-500/20">
                  <h3 className="text-base font-bold mb-2 text-cyan-400">Nội dung phim</h3>
                  <p className="text-gray-400 leading-relaxed text-sm">{movie.description}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div className="bg-gradient-to-r from-cyan-900/30 via-blue-900/30 to-purple-900/30 backdrop-blur-sm rounded-lg p-3 border border-cyan-500/20">
                    <h4 className="font-semibold mb-1 text-blue-400 text-sm">Đạo diễn</h4>
                    <p className="text-gray-400 text-xs">
                      {movie.director && movie.director.trim() && movie.director !== "Không xác định"
                        ? movie.director
                        : "Không có đạo diễn"}
                    </p>
                  </div>
                  <div className="bg-gradient-to-r from-cyan-900/30 via-blue-900/30 to-purple-900/30 backdrop-blur-sm rounded-lg p-3 border border-cyan-500/20">
                    <h4 className="font-semibold mb-1 text-cyan-400 text-sm">Thể loại</h4>
                    <p className="text-gray-400 text-xs">{genre}</p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-cyan-900/30 via-blue-900/30 to-purple-900/30 backdrop-blur-sm rounded-lg p-3 border border-cyan-500/20">
                  <h4 className="font-semibold mb-2 text-purple-400 text-sm">Diễn viên</h4>
                  {actorsArray.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {actorsArray.map((actor, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="border-purple-500/50 text-purple-300 hover:bg-purple-700/20 transition-all duration-300 hover:scale-105 text-xs"
                        >
                          {actor}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-xs">Không có diễn viên</p>
                  )}
                </div>

                <div className="bg-gradient-to-r from-cyan-900/30 via-blue-900/30 to-purple-900/30 backdrop-blur-sm rounded-lg p-3 border border-cyan-500/20 mt-4">
                  <h4 className="font-semibold mb-2 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent text-sm">
                    Chọn ngày chiếu
                  </h4>
                  <div className="bg-gray-800/50 p-2 rounded-lg">
                    <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400 mb-2">
                      <span>T2</span>
                      <span>T3</span>
                      <span>T4</span>
                      <span>T5</span>
                      <span>T6</span>
                      <span>T7</span>
                      <span>CN</span>
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {emptyDays.map((day) => (
                        <div
                          key={day.toISOString()}
                          className="w-8 h-8 flex items-center justify-center text-gray-500"
                        ></div>
                      ))}
                      {daysInMonth.map((day) => {
                        const isDisabled = isBefore(day, today);
                        const isSelected = isSameDay(day, selectedDate);
                        return (
                          <Button
                            key={day.toISOString()}
                            variant={isSelected ? "default" : "outline"}
                            className={cn(
                              "w-8 h-8 text-xs",
                              isSelected
                                ? "bg-cyan-700 text-white border-cyan-500"
                                : "border-cyan-500/50 text-cyan-300 hover:bg-cyan-700/20",
                              isDisabled && "opacity-50 cursor-not-allowed hover:bg-transparent"
                            )}
                            onClick={() => {
                              if (!isDisabled) {
                                setSelectedDate(startOfDay(day));
                                setSelectedShowtime(null);
                              }
                            }}
                            disabled={isDisabled}
                          >
                            {format(day, "d")}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-gradient-to-r from-cyan-900/30 via-blue-900/30 to-purple-900/30 backdrop-blur-sm rounded-lg p-3 border border-blue-500/20">
                  <h4 className="font-semibold mb-2 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent text-sm">
                    Thông tin vé
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-xs">Thời lượng:</span>
                      <span className="text-xs text-gray-400">{duration}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-xs">Đánh giá:</span>
                      <div className="flex items-center">
                        <Star className="w-3 h-3 text-yellow-400 mr-1" />
                        <span className="text-xs text-gray-400">{rating}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    className="w-full bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white border-0 h-9 font-semibold shadow-lg hover:shadow-red-500/25 transition-all duration-300 hover:scale-105 text-sm"
                    onClick={handleBookTicket}
                  >
                    Đặt vé ngay
                  </Button>
                  <Button className="bg-purple-700 w-full border-blue-500/50 text-white-50 hover:border-blue-500/70 hover:bg-blue-700/20 transition-all duration-300 hover:scale-105 h-8 text-xs">
                    <Play className="w-3 h-3 mr-1" />
                    Xem trailer
                  </Button>
                </div>

                <div className="bg-gradient-to-r from-cyan-900/30 via-blue-900/30 to-purple-900/30 backdrop-blur-sm rounded-lg p-3 border border-cyan-500/20">
                  <h4 className="font-semibold mb-2 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent text-sm">
                    Suất chiếu ngày {format(selectedDate, "dd/MM/yyyy")}
                  </h4>
                  <div className="grid grid-cols-2 gap-1">
                    {showtimes.length > 0 ? (
                      showtimes.map((showtime, index) => (
                        <Button
                          key={index}
                          size="sm"
                          className={cn(
                            "bg-purple-900 border-purple-500/50 text-purple-100 hover:bg-purple-700/20 hover:border-purple-500/70 transition-all duration-300 hover:scale-105 h-7 text-xs",
                            selectedShowtime?.time === showtime.time &&
                              "bg-gradient-to-r from-cyan-600 to-blue-600 text-white"
                          )}
                          onClick={() =>
                            setSelectedShowtime({
                              id: showtime.id,
                              time: showtime.time,
                            })
                          }
                        >
                          {showtime.time}
                        </Button>
                      ))
                    ) : (
                      <p className="text-gray-400 text-xs col-span-2">Không có suất chiếu</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}