import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { MapPin, Phone, Clock, Car, Star, ChevronRight } from "lucide-react";
import { Skeleton } from "../components/ui/skeleton";
import { cn } from "../lib/utils";
import { useState, useEffect } from "react";
import axios from "axios";
import "../../globals.css";

export function CinemaLocations({ isLoading = false }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [selectedCinema, setSelectedCinema] = useState(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [cinemas, setCinemas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Replace with your actual token retrieval logic (e.g., from localStorage or context)
  const token = localStorage.getItem("authToken");
  useEffect(() => {
    const fetchCinemas = async () => {
      try {
        setLoading(true);
        const response = await axios.get("http://localhost:8080/api/cinemas", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // Map API data to component's expected structure
        const mappedCinemas = response.data.map((cinema) => ({
          id: cinema.id,
          name: cinema.name,
          address: cinema.address,
          phone: cinema.phone,
          screens: cinema.screens || 6, // Mocked: Replace with actual data if added to backend
          rating: cinema.rating || 4.7, // Mocked
          features: cinema.features || ["IMAX", "VIP"], // Mocked
          parking: cinema.parking !== undefined ? cinema.parking : true, // Mocked
          openTime: cinema.openTime || "09:00 - 23:00", // Mocked
          image: cinema.image || "/placeholder.svg?height=200&width=300",
        }));

        setCinemas(mappedCinemas);
        setLoading(false);
      } catch (err) {
        setError(
          "Không thể tải danh sách rạp chiếu phim. Vui lòng thử lại sau."
        );
        setLoading(false);
        console.error("Error fetching cinemas:", err);
      }
    };

    fetchCinemas();
  }, []);

  // Cinema card skeleton
  const CinemaSkeleton = () => (
    <div className="animate-pulse">
      <Card className="bg-gray-800 border-gray-700 overflow-hidden">
        <div className="h-48 bg-gray-700" />
        <CardContent className="p-6">
          <Skeleton className="h-6 w-3/4 mb-3" />
          <div className="space-y-3 mb-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-4 w-full mb-4" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-24" />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Handle opening the map modal
  const handleOpenMap = (cinema) => {
    setSelectedCinema(cinema);
    setIsMapModalOpen(true);
  };

  // Handle closing the map modal
  const handleCloseMap = () => {
    setIsMapModalOpen(false);
    setSelectedCinema(null);
  };

  // Handle opening Google Maps in a new tab
  const handleOpenGoogleMaps = (address) => {
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        address
      )}`,
      "_blank"
    );
  };

  return (
    <section className="py-16 bg-gradient-to-br from-gray-900 to-black">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-2xl md:text-4xl font-bold text-white mb-2">
              Hệ thống rạp CinemaMax
            </h3>
            <p className="text-gray-400 text-sm md:text-base max-w-2xl">
              Trải nghiệm điện ảnh đẳng cấp với công nghệ hiện đại và dịch vụ
              tận tâm
            </p>
          </div>
          <Button
            variant="link"
            className="text-red-400 hidden md:flex items-center gap-1 group"
          >
            Xem tất cả
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>

        {loading || isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <CinemaSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="text-center text-red-400">{error}</div>
        ) : (
          <div className="flex gap-6 overflow-x-auto pb-6 snap-x snap-mandatory scrollbar-hide md:grid md:grid-cols-2 lg:grid-cols-3">
            {cinemas.map((cinema, index) => (
              <div
                key={cinema.id}
                className="min-w-[300px] w-full snap-start md:min-w-0"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <Card
                  className={cn(
                    "bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 overflow-hidden rounded-xl transition-all duration-500",
                    hoveredIndex === index
                      ? "scale-[1.03] shadow-xl shadow-purple-900/20"
                      : "scale-100"
                  )}
                >
                  <div className="relative">
                    <img
                      src={cinema.image}
                      alt={cinema.name}
                      className={cn(
                        "w-full h-48 object-cover transition-transform duration-700",
                        hoveredIndex === index ? "scale-110" : "scale-100"
                      )}
                      onError={(e) =>
                        (e.target.src = "/placeholder.svg?height=200&width=300")
                      }
                    />
                    <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center">
                      <Star className="w-4 h-4 text-yellow-400 mr-1" />
                      <span className="text-sm font-semibold text-white">
                        {cinema.rating}
                      </span>
                    </div>
                    <Badge className="absolute top-3 left-3 bg-gradient-to-r from-red-500 to-purple-600 text-white border-0">
                      {cinema.screens} phòng chiếu
                    </Badge>
                  </div>

                  <CardContent className="p-6">
                    <h4 className="font-bold text-xl mb-3 text-white">
                      {cinema.name}
                    </h4>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-start text-gray-400 text-sm">
                        <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-red-400" />
                        <span>{cinema.address}</span>
                      </div>

                      <div className="flex items-center text-gray-400 text-sm">
                        <Phone className="w-4 h-4 mr-2 flex-shrink-0 text-green-400" />
                        <span>{cinema.phone}</span>
                      </div>

                      <div className="flex items-center text-gray-400 text-sm">
                        <Clock className="w-4 h-4 mr-2 flex-shrink-0 text-blue-400" />
                        <span>{cinema.openTime}</span>
                      </div>

                      {cinema.parking && (
                        <div className="flex items-center text-gray-400 text-sm">
                          <Car className="w-4 h-4 mr-2 flex-shrink-0 text-purple-400" />
                          <span>Có bãi đỗ xe</span>
                        </div>
                      )}
                    </div>

                    <div className="mb-4">
                      <p className="text-sm text-gray-400 mb-2">Tiện ích:</p>
                      <div className="flex flex-wrap gap-1">
                        {cinema.features.map((feature, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="border-red-500/50 text-red-400 text-xs hover:bg-red-500/20"
                          >
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button className="flex-1 bg-gradient-to-r from-red-500 to-purple-600 hover:from-red-600 hover:to-purple-700 text-white border-0">
                        Xem lịch chiếu
                      </Button>
                      <Button
                        variant="outline"
                        className="border-gray-600 text-gray-300 hover:bg-purple-400/20"
                        onClick={() => handleOpenMap(cinema)}
                      >
                        <MapPin className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}

        <div className="text-center mt-6 md:hidden">
          <Button
            variant="link"
            className="text-red-400 flex items-center gap-1 mx-auto"
          >
            Xem tất cả
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Map Modal */}
      {isMapModalOpen && selectedCinema && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={handleCloseMap}
        >
          <div
            className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl w-full max-w-xl mx-4 shadow-lg transition-all duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4">
              <h3 className="text-lg font-bold text-white mb-2 bg-gradient-to-r from-red-500 to-purple-600 bg-clip-text text-transparent">
                {selectedCinema.name}
              </h3>
              <div className="flex items-start text-gray-400 text-sm mb-4">
                <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-red-400" />
                <span>{selectedCinema.address}</span>
              </div>
            </div>
            <div className="relative w-full h-80">
              <iframe
                className="absolute inset-0 w-full h-full rounded-b-lg border-t border-gray-700"
                src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyCOdgXIRWkfZDjREjGfM7YRR7IMF6mWAgQ&q=${encodeURIComponent(
                  selectedCinema.address
                )}`}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
            <div className="p-4 flex gap-2">
              <Button
                className="flex-1 bg-gradient-to-r from-red-500 to-purple-600 hover:from-red-600 hover:to-purple-700 text-white border-0"
                onClick={handleCloseMap}
              >
                Đóng
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0"
                onClick={() => handleOpenGoogleMaps(selectedCinema.address)}
              >
                Mở Google Maps
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
