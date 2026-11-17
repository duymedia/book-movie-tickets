import React, { useState, useEffect, useMemo } from "react";
import { Input } from "../components/ui/input";
import { Search, Filter, Ticket, ChevronRight } from "lucide-react";
import { AuthModal } from "../components/auth-modal";
import { MovieCard } from "../components/movie-card";
import { HeroCarousel } from "../components/hero-carousel";
import { CinemaLocations } from "../components/cinema-locations";
import { MovieDetailModal } from "../components/movie-detail-modal";
import { SeatSelectionModal } from "../components/seat-selection-modal";
import { FoodSelectionModal } from "../components/food-selection-modal";
import { PaymentModal } from "../components/payment-modal";
import { useToast } from "../hooks/use-toast";
import { Toaster } from "../components/ui/toaster";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import "../../globals.css";

// Error Boundary Component
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-[80vh] flex items-center justify-center bg-gray-900">
          <div className="text-gray-400 text-lg">
            Something went wrong. Please try again later.
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const ComboCard = ({ combo }) => {
  return (
    <div className="relative min-w-[280px] w-full sm:w-[280px] rounded-xl overflow-hidden bg-gray-800 shadow-lg transition-transform transform hover:scale-105 hover:shadow-2xl">
      <div className="relative">
        <img
          src={combo.image || "/placeholder.jpg"}
          alt={combo.name}
          className="w-full h-[200px] object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
      </div>
      <div className="p-4 space-y-2">
        <h4 className="text-lg font-bold text-white truncate">{combo.name}</h4>
        <p className="text-sm text-gray-400 line-clamp-2">{combo.description}</p>
        <p className="text-sm text-gray-400">
          Giá: {combo.price.toLocaleString("vi-VN")} VNĐ
        </p>
        <p className="text-sm text-gray-400">Số lượng: {combo.quantity}</p>
        <Button className="w-full bg-gradient-to-r from-red-500 to-purple-500 text-white hover:from-red-600 hover:to-purple-600">
          Thêm vào giỏ
        </Button>
      </div>
    </div>
  );
};

const ComboCardSkeleton = () => (
  <div className="min-w-[280px] w-full sm:w-[280px] animate-pulse">
    <div className="rounded-xl overflow-hidden bg-gray-800">
      <Skeleton className="w-full h-[200px]" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-9 w-full rounded-md" />
      </div>
    </div>
  </div>
);

export default function Home() {
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [selectedFood, setSelectedFood] = useState([]);
  const [showSeatSelection, setShowSeatSelection] = useState(false);
  const [showFoodSelection, setShowFoodSelection] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [movies, setMovies] = useState([]);
  const [featuredMovies, setFeaturedMovies] = useState([]);
  const [combos, setCombos] = useState([]);
  const { toast } = useToast();

  const fetchWithRetry = async (url, options, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);
        if (response.status === 429 && i < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
          continue;
        }
        return response;
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
      }
    }
  };

  useEffect(() => {
    const fetchCombos = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const response = await fetchWithRetry("http://localhost:8080/api/combos", { headers });

        if (!response.ok) {
          if (response.status === 401) throw new Error("Phiên đăng nhập không hợp lệ.");
          throw new Error(`Không thể tải dữ liệu combo: ${response.status}`);
        }

        const combos = await response.json();
        setCombos(combos);
      } catch (error) {
        console.error("Fetch combos error:", error);
        toast({
          title: "Lỗi",
          description: error.message || "Không thể tải dữ liệu combo. Vui lòng thử lại sau.",
          variant: "destructive",
        });
      }
    };

    fetchCombos();
  }, [toast]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem("authToken");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const response = await fetchWithRetry("http://localhost:8080/api/movies", { headers });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            localStorage.removeItem("authToken");
            throw new Error("Phiên đăng nhập không hợp lệ hoặc đã hết hạn.");
          }
          throw new Error(`Không thể tải dữ liệu phim: ${response.status}`);
        }

        const apiResponse = await response.json();
        if (!apiResponse.success) {
          throw new Error(apiResponse.message || "Không thể lấy danh sách phim");
        }

        const validMovies = apiResponse.data
          .filter((movie) => movie?.id && movie?.title && movie?.createdAt)
          .map((movie) => ({
            ...movie,
            genre: movie.category || "Không có thể loại",
            releaseDate: movie.createdAt,
            price: 100000,
            duration: `${movie.durationMinutes} phút`,
            showtimes: movie.showtimes.map((st) => ({
              id: st.id,
              time: new Date(st.timeStart).toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }),
              timeStart: st.timeStart,
            })),
            rating:
              movie.review?.length > 0 &&
              movie.review.some((r) => typeof r.rating === "number" && r.rating > 0)
                ? Number(
                    (movie.review.reduce((sum, r) => sum + r.rating, 0) / movie.review.length).toFixed(1)
                  )
                : 0,
            description: movie.description || "No description available",
            director: movie.director || "Không xác định",
            cast: movie.actors
              ? movie.actors
                  .split(",")
                  .map((actor) => actor.trim())
                  .filter((actor) => actor)
              : [],
          }));

        if (validMovies.length === 0) throw new Error("Không tìm thấy phim hợp lệ");

        setMovies(validMovies);
        const latestMovies = validMovies
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 3)
          .filter((movie) => movie.image);
        setFeaturedMovies(latestMovies);
      } catch (error) {
        console.error("Fetch error:", error);
        toast({
          title: "Lỗi",
          description: error.message || "Không thể tải dữ liệu phim. Vui lòng thử lại sau.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const nowShowingMovies = useMemo(
    () => movies.filter((movie) => new Date(movie.releaseDate) <= new Date()),
    [movies]
  );

  const upcomingMovies = useMemo(
    () => movies.filter((movie) => new Date(movie.releaseDate) > new Date()),
    [movies]
  );

  const genres = useMemo(
    () => ["all", ...new Set(movies.flatMap((movie) => movie.genre?.split(", ") || []))],
    [movies]
  );

  const filteredMovies = useMemo(
    () =>
      nowShowingMovies.filter((movie) => {
        const matchesSearch = movie.title?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
        const matchesGenre = selectedGenre === "all" || movie.genre?.includes(selectedGenre);
        return matchesSearch && matchesGenre;
      }),
    [nowShowingMovies, searchQuery, selectedGenre]
  );

  const handleBookTicket = (movie) => {
    try {
      if (!movie.room?.id || !movie.cinema?.id) {
        throw new Error("Không tìm thấy thông tin phòng chiếu hoặc rạp");
      }
      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("Bạn cần đăng nhập để đặt vé");
      }
      if (!movie.selectedShowtime) {
        throw new Error("Vui lòng chọn một suất chiếu trước khi đặt vé");
      }
      setSelectedMovie({
        ...movie,
        selectedShowtime: movie.selectedShowtime,
        selectedShowtimeId: movie.selectedShowtimeId,
      });
      setSelectedSeats([]);
      setSelectedFood([]);
      setShowSeatSelection(true);
    } catch (error) {
      console.error("Error in handleBookTicket:", error);
      toast({
        title: "Lỗi",
        description: error.message || "Không thể mở chọn ghế. Vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };

  const handleSeatConfirm = (seats, seatMap) => {
    setSelectedSeats({ seatIds: seats, seatMap });
    setShowSeatSelection(false);
    setShowFoodSelection(true);
  };

  const handleFoodConfirm = (food) => {
    setSelectedFood(food);
    setShowFoodSelection(false);
    setShowPayment(true);
  };

  const handlePaymentSuccess = () => {
    setShowPayment(false);
    setSelectedMovie(null);
    setSelectedSeats([]);
    setSelectedFood([]);
    toast({
      title: "Đặt vé thành công!",
      description: "Vé của bạn đã được gửi qua email. Chúc bạn xem phim vui vẻ!",
    });
  };

  const handleWatchTrailer = (movie) => {
    console.log("Watch trailer for:", movie.title);
    // Implement trailer logic here
  };

  const MovieCardSkeleton = () => (
    <div className="min-w-[280px] w-full sm:w-[280px] animate-pulse">
      <div className="rounded-xl overflow-hidden bg-gray-800">
        <Skeleton className="w-full h-[380px]" />
        <div className="p-4 space-y-3">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
          <div className="flex gap-1 pt-2">
            <Skeleton className="h-8 w-16 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>
          <div className="flex justify-between pt-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {isLoading || featuredMovies.length === 0 ? (
        <div className="h-[80vh] bg-gray-900 animate-pulse">
          <Skeleton className="h-full w-full" />
        </div>
      ) : (
        <ErrorBoundary>
          <HeroCarousel movies={featuredMovies} onBookTicket={handleBookTicket} />
        </ErrorBoundary>
      )}

      <section className="py-6 bg-black/50 backdrop-blur-sm sticky top-16 z-30">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Tìm kiếm phim..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 w-full"
              />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter className="text-gray-400 w-5 h-5" />
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="bg-gray-800/50 border border-gray-600 rounded-md px-3 py-2 text-white w-full md:w-auto"
              >
                {genres.map((genre) => (
                  <option key={genre} value={genre}>
                    {genre === "all" ? "Tất cả thể loại" : genre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-900">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Phim đang chiếu
            </h3>
            <div className="flex items-center gap-3">
              <Ticket className="w-6 h-6 text-red-500" />
              <span className="text-gray-300 font-medium">{filteredMovies.length} phim</span>
            </div>
          </div>

          {isLoading ? (
            <div className="flex gap-4 overflow-x-auto pb-6 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800 lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <MovieCardSkeleton key={i} className="min-w-[280px] snap-start" />
              ))}
            </div>
          ) : filteredMovies.length === 0 ? (
            <div className="text-center py-16 bg-gray-800/50 rounded-2xl border border-gray-700/50">
              <div className="text-gray-300 text-xl font-medium">Không tìm thấy phim nào phù hợp</div>
              <Button
                variant="link"
                className="text-red-500 mt-4 hover:text-red-400 transition-colors duration-200"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedGenre("all");
                }}
              >
                Xóa bộ lọc
              </Button>
            </div>
          ) : (
            // In Home.jsx, update the MovieCard rendering section
<div className="flex gap-4 overflow-x-auto pb-6 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800 lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible">
  {filteredMovies.map((movie) => (
    <div key={movie.id} className="min-w-[280px] w-full snap-start lg:min-w-0 group relative">
      <MovieCard
        movie={{
          ...movie,
          showtimes: movie.showtimes.map((st) => st.time),
          duration: movie.duration,
          rating: movie.rating,
        }}
        className="w-full transition-transform duration-300 group-hover:scale-105"
        onBookTicket={() => setSelectedMovie(movie)} // Open MovieDetailModal
        onViewDetails={() => setSelectedMovie(movie)}
      />
      <div className="absolute inset-0 bg-gray-900/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 flex-col rounded-lg">
        <Button
          className="w-3/4 bg-red-500 hover:bg-red-600 text-white font-medium py-2 rounded-md transition-colors duration-200"
          onClick={() => setSelectedMovie(movie)} // Open MovieDetailModal
        >
          Đặt vé
        </Button>
        <Button
          className="w-3/4 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 rounded-md transition-colors duration-200"
          onClick={() => setSelectedMovie(movie)}
        >
          Chi tiết
        </Button>
        <Button
          className="w-3/4 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 rounded-md transition-colors duration-200"
          onClick={() => handleWatchTrailer(movie)}
        >
          Xem Trailer
        </Button>
      </div>
    </div>
  ))}
</div>
          )}
        </div>
      </section>

      <section className="py-12 bg-gradient-to-r from-purple-900/20 to-red-900/20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl md:text-3xl font-bold text-white">Gói combo</h3>
            <Button variant="link" className="text-red-400 flex items-center gap-1 group">
              Xem tất cả
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          {isLoading ? (
            <div className="flex gap-4 overflow-x-auto pb-6 snap-x snap-mandatory scrollbar-hide lg:grid lg:grid-cols-4 lg:gap-6">
              {[1, 2, 3, 4].map((i) => (
                <ComboCardSkeleton key={i} />
              ))}
            </div>
          ) : combos.length === 0 ? (
            <div className="text-center py-12 bg-gray-800/30 rounded-xl">
              <div className="text-gray-400 text-lg">Không tìm thấy gói combo</div>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-6 snap-x snap-mandatory scrollbar-hide lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible">
              {combos.map((combo) => (
                <div key={combo.id} className="min-w-[280px] w-full sm:w-[280px] snap-start lg:min-w-0">
                  <ComboCard combo={combo} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-16 bg-gradient-to-r from-red-900/20 to-purple-900/20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-red-400 to-purple-400 bg-clip-text text-transparent">
                50+
              </div>
              <div className="text-gray-400">Phim đang chiếu</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-red-400 to-purple-400 bg-clip-text text-transparent">
                15
              </div>
              <div className="text-gray-400">Rạp chiếu</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-red-400 to-purple-400 bg-clip-text text-transparent">
                120
              </div>
              <div className="text-gray-400">Phòng chiếu</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-red-400 to-purple-400 bg-clip-text text-transparent">
                1M+
              </div>
              <div className="text-gray-400">Khách hàng</div>
            </div>
          </div>
        </div>
      </section>

      <CinemaLocations isLoading={isLoading} />

      <AuthModal />

      {selectedMovie && !showSeatSelection && !showFoodSelection && !showPayment && (
        <MovieDetailModal
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
          onBookTicket={handleBookTicket}
        />
      )}

      {showSeatSelection && selectedMovie && (
        <SeatSelectionModal
          movie={selectedMovie}
          onClose={() => setShowSeatSelection(false)}
          onConfirm={handleSeatConfirm}
        />
      )}

      {showFoodSelection && selectedMovie && (
        <FoodSelectionModal
          movie={selectedMovie}
          selectedSeats={selectedSeats}
          onClose={() => setShowFoodSelection(false)}
          onConfirm={handleFoodConfirm}
        />
      )}

      {showPayment && selectedMovie && (
        <PaymentModal
          movie={selectedMovie}
          selectedSeats={selectedSeats}
          selectedFood={selectedFood}
          onClose={() => setShowPayment(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      <Toaster />
    </div>
  );
}