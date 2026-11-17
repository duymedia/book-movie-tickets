import { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import {
  X,
  Plus,
  Minus,
  ShoppingCart,
  Coffee,
  Popcorn,
  Candy,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useToast } from "../hooks/use-toast";
import "../../globals.css";

export function FoodSelectionModal({ movie, selectedSeats, onClose, onConfirm }) {
  const [selectedFood, setSelectedFood] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [foodItems, setFoodItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ticketPrices, setTicketPrices] = useState({ single: 0, couple: 0, vip: 0 });
  const { toast } = useToast();

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

  const fetchWithRetry = async (url, options, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);
        if (response.status === 429 && i < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
          continue;
        }
        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }
        return response;
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
      }
    }
  };

  // Fetch combos and ticket prices
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const token = localStorage.getItem("authToken");
        if (!token) {
          throw new Error("Bạn cần đăng nhập để xem combo");
        }

        // Fetch ticket prices
        const ticketResponse = await fetchWithRetry(`${API_BASE_URL}/api/tickets`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        const ticketData = await ticketResponse.json();
        const newTicketPrices = { single: 0, couple: 0, vip: 0 };
        ticketData.forEach((ticket) => {
          if (ticket.type === "normal") newTicketPrices.single = ticket.price;
          else if (ticket.type === "couple") newTicketPrices.couple = ticket.price;
          else if (ticket.type === "vip") newTicketPrices.vip = ticket.price;
        });
        setTicketPrices(newTicketPrices);

        // Fetch combos
        const comboResponse = await fetchWithRetry(`${API_BASE_URL}/api/combos`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        const apiCombos = await comboResponse.json();
        if (!Array.isArray(apiCombos) || apiCombos.length === 0) {
          throw new Error("Chưa có dữ liệu đồ ăn hoặc nước uống");
        }

        const transformedItems = apiCombos.map((combo) => {
          const category = categorizeCombo(combo.name);
          return {
            id: combo.id,
            name: combo.name,
            price: combo.price,
            image: combo.image || "/placeholder.svg?height=120&width=120",
            category,
            description: combo.description || "Không có mô tả",
            icon: getCategoryIcon(category),
            quantity: combo.quantity || 10,
          };
        });
        setFoodItems(transformedItems);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError(error.message || "Không thể tải danh sách combo");
        toast({
          title: "Lỗi",
          description: error.message || "Không thể tải danh sách combo",
          variant: "destructive",
          action: error.message.includes("đăng nhập") ? (
            <Button
              onClick={() => (window.location.href = "/login")}
              className="ml-2 bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              Đăng nhập
            </Button>
          ) : null,
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  const categorizeCombo = (name) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes("combo")) return "combo";
    if (lowerName.includes("bắp") || lowerName.includes("kẹo")) return "snack";
    if (lowerName.includes("nước") || lowerName.includes("coca") || lowerName.includes("pepsi"))
      return "drink";
    return "snack";
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case "combo":
        return <Sparkles className="w-4 h-4" />;
      case "snack":
        return <Popcorn className="w-4 h-4" />;
      case "drink":
        return <Coffee className="w-4 h-4" />;
      default:
        return <Candy className="w-4 h-4" />;
    }
  };

  const getCategoryGradient = (category) => {
    switch (category) {
      case "combo":
        return "from-indigo-900/80 via-purple-900/80 to-fuchsia-900/80";
      case "snack":
        return "from-amber-900/80 via-orange-900/80 to-rose-900/80";
      case "drink":
        return "from-teal-900/80 via-emerald-900/80 to-sky-900/80";
      default:
        return "from-slate-900/80 to-gray-900/80";
    }
  };

  const getCategoryBorder = (category) => {
    switch (category) {
      case "combo":
        return "border-fuchsia-700/40";
      case "snack":
        return "border-rose-700/40";
      case "drink":
        return "border-emerald-700/40";
      default:
        return "border-gray-800/40";
    }
  };

  const getCategoryGlow = (category) => {
    switch (category) {
      case "combo":
        return "shadow-fuchsia-700/20 hover:shadow-fuchsia-700/50";
      case "snack":
        return "shadow-rose-700/20 hover:shadow-rose-700/50";
      case "drink":
        return "shadow-emerald-700/20 hover:shadow-emerald-700/50";
      default:
        return "shadow-gray-700/20 hover:shadow-gray-700/50";
    }
  };

  const getCategoryBadgeGradient = (category) => {
    switch (category) {
      case "combo":
        return "from-indigo-700 to-fuchsia-700";
      case "snack":
        return "from-amber-700 to-rose-700";
      case "drink":
        return "from-teal-700 to-emerald-700";
      default:
        return "from-slate-700 to-gray-700";
    }
  };

  const categories = [
    { id: "all", name: "Tất cả", icon: <ShoppingCart className="w-4 h-4" />, color: "from-slate-700 to-gray-800" },
    { id: "combo", name: "Combo", icon: <Sparkles className="w-4 h-4" />, color: "from-indigo-700 to-fuchsia-800" },
    { id: "snack", name: "Đồ ăn", icon: <Popcorn className="w-4 h-4" />, color: "from-amber-700 to-rose-800" },
    { id: "drink", name: "Nước uống", icon: <Coffee className="w-4 h-4" />, color: "from-teal-700 to-emerald-800" },
  ];

  const filteredItems =
    activeCategory === "all" ? foodItems : foodItems.filter((item) => item.category === activeCategory);

  const addItem = (item) => {
    setSelectedFood((prev) => {
      const existing = prev.find((f) => f.id === item.id);
      if (existing) {
        return prev.map((f) => (f.id === item.id ? { ...f, quantity: f.quantity + 1 } : f));
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeItem = (itemId) => {
    setSelectedFood((prev) => {
      const existing = prev.find((f) => f.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map((f) => (f.id === itemId ? { ...f, quantity: f.quantity - 1 } : f));
      }
      return prev.filter((f) => f.id !== itemId);
    });
  };

  const getItemQuantity = (itemId) => selectedFood.find((f) => f.id === itemId)?.quantity || 0;

  // Calculate seat price based on seat types
  const calculateSeatPrice = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Vui lòng đăng nhập để tính giá vé");

      const seatResponse = await fetchWithRetry(
        `${API_BASE_URL}/api/seats/room/${movie.room?.id || 6}${
          movie.selectedShowtimeId ? `?showtimeId=${movie.selectedShowtimeId}` : ""
        }`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const apiSeats = await seatResponse.json();

      let totalSeatPrice = 0;
      const processedSeats = new Set();
      for (const seatId of selectedSeats?.seatIds || []) {
        if (processedSeats.has(seatId)) continue;
        const seat = apiSeats.find((s) => s.id.toString() === seatId);
        if (!seat) continue;

        const seatType = mapSeatType(seat.seatType);
        if (seatType === "couple" && seat.coupleSeatId) {
          const partnerSeat = apiSeats.find(
            (s) => s.coupleSeatId === seat.id || s.id === seat.coupleSeatId
          );
          if (partnerSeat && selectedSeats.seatIds.includes(partnerSeat.id.toString())) {
            totalSeatPrice += ticketPrices.couple;
            processedSeats.add(seatId);
            processedSeats.add(partnerSeat.id.toString());
          }
        } else {
          totalSeatPrice += ticketPrices[seatType] || ticketPrices.single;
          processedSeats.add(seatId);
        }
      }
      return totalSeatPrice;
    } catch (err) {
      console.error("Error calculating seat price:", err);
      toast({
        title: "Lỗi",
        description: err.message || "Không thể tính giá vé",
        variant: "destructive",
        action: err.message.includes("đăng nhập") ? (
          <Button
            onClick={() => (window.location.href = "/login")}
            className="ml-2 bg-cyan-600 hover:bg-cyan-500 text-white"
          >
            Đăng nhập
          </Button>
        ) : null,
      });
      return (selectedSeats?.seatIds?.length || 0) * (movie.price || 100000); // Fallback
    }
  };

  const mapSeatType = (seatType) => {
    switch (seatType) {
      case 2:
        return "vip";
      case 3:
        return "couple";
      case 1:
      default:
        return "single";
    }
  };

  // Fetch seat price on mount
  const [seatPrice, setSeatPrice] = useState(0);
  useEffect(() => {
    calculateSeatPrice().then((price) => setSeatPrice(price));
  }, [selectedSeats, ticketPrices, movie]);

  const totalFoodPrice = selectedFood.reduce((total, item) => total + item.price * item.quantity, 0);
  const grandTotal = seatPrice + totalFoodPrice;

  const seatNames =
    selectedSeats?.seatIds
      ?.map((seatId) => selectedSeats.seatMap[seatId])
      .sort()
      .join(", ") || "Chưa chọn";

  if (isLoading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent
          className="max-w-[90vw] w-full max-h-[85vh] bg-gradient-to-br from-slate-900 via-gray-900 to-black border border-cyan-500/20 text-white p-0 overflow-hidden sm:max-w-md md:max-w-lg lg:max-w-6xl"
          aria-describedby="food-selection-description"
        >
          <DialogHeader className="p-3 sm:p-4 pb-0 border-b border-cyan-500/20 bg-gradient-to-r from-slate-800/50 to-gray-800/50 backdrop-blur-sm">
            <DialogTitle className="text-lg sm:text-xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Chọn đồ ăn & nước uống
            </DialogTitle>
            <DialogDescription id="food-selection-description" className="sr-only">
              Đang tải danh sách combo đồ ăn và nước uống cho phim {movie.title}.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 sm:p-4 text-center text-gray-400">Đang tải combo...</div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || foodItems.length === 0) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent
          className="max-w-[90vw] w-full max-h-[85vh] bg-gradient-to-br from-slate-900 via-gray-900 to-black border border-cyan-500/20 text-white p-0 overflow-hidden sm:max-w-md md:max-w-lg lg:max-w-6xl"
          aria-describedby="food-selection-description"
        >
          <DialogHeader className="p-3 sm:p-4 pb-0 border-b border-cyan-500/20 bg-gradient-to-r from-slate-800/50 to-gray-800/50 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg sm:text-xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Chọn đồ ăn & nước uống
                </DialogTitle>
                <DialogDescription id="food-selection-description" className="text-gray-400 text-xs sm:text-sm mt-1">
                  {movie.title} - Ghế: {seatNames} - Suất chiếu: {movie.selectedShowtime || "Chưa chọn"}
                </DialogDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-full transition-all duration-300 hover:scale-110"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center h-[50vh] p-3 sm:p-4">
            <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 text-gray-500 mb-4 animate-pulse" />
            <p className="text-gray-200 text-base sm:text-lg font-medium mb-2">
              Chưa có dữ liệu đồ ăn hoặc nước uống
            </p>
            <p className="text-gray-400 text-xs sm:text-sm text-center max-w-xs sm:max-w-md">
              Hiện tại không có combo, đồ ăn hoặc nước uống nào được cung cấp. Vui lòng quay lại sau!
            </p>
            <Button
              className="mt-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white border-0 shadow-lg hover:shadow-cyan-500/25 transition-all duration-300 hover:scale-105 text-xs sm:text-sm px-4 py-2 rounded-full"
              onClick={() => onConfirm([])}
            >
              Bỏ qua đồ ăn
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent
        className="max-w-[90vw] w-full max-h-[85vh] bg-gradient-to-br from-slate-900 via-gray-900 to-black border border-cyan-500/20 text-white p-0 overflow-hidden sm:max-w-md md:max-w-lg lg:max-w-6xl"
        aria-describedby="food-selection-description"
      >
        <DialogHeader className="p-3 sm:p-4 pb-0 border-b border-cyan-500/20 bg-gradient-to-r from-slate-800/50 to-gray-800/50 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                Chọn đồ ăn & nước uống
              </DialogTitle>
              <DialogDescription id="food-selection-description" className="text-gray-400 text-xs sm:text-sm mt-1">
                {movie.title} - Ghế: {seatNames} - Suất chiếu: {movie.selectedShowtime || "Chưa chọn"}
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-full transition-all duration-300 hover:scale-110"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-col h-full max-h-[75vh] lg:flex-row gap-2 sm:gap-4 p-2 sm:p-4">
          <div className="flex-1 overflow-y-auto scrollbar-hidden">
            <div className="flex gap-1 sm:gap-2 mb-2 sm:mb-4 overflow-x-auto pb-1 sm:pb-2 scrollbar-hidden">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={activeCategory === category.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveCategory(category.id)}
                  className={cn(
                    "flex items-center gap-1 sm:gap-2 whitespace-nowrap transition-all duration-300 hover:scale-105 shadow-sm text-xs sm:text-sm px-2 sm:px-3 py-1 rounded-full",
                    activeCategory === category.id
                      ? `bg-gradient-to-r ${category.color} text-white border-0 shadow-lg hover:shadow-xl`
                      : "border-gray-800 text-gray-300 hover:bg-gray-900/50 hover:text-white hover:border-gray-700"
                  )}
                >
                  {category.icon}
                  {category.name}
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
              {filteredItems.map((item, index) => {
                const quantity = getItemQuantity(item.id);
                return (
                  <Card
                    key={item.id}
                    className={cn(
                      "bg-gradient-to-br",
                      getCategoryGradient(item.category),
                      "backdrop-blur-md",
                      getCategoryBorder(item.category),
                      "overflow-hidden transition-all duration-500 hover:scale-105",
                      getCategoryGlow(item.category),
                      "hover:shadow-2xl rounded-xl",
                      "lg:min-h-[260px] min-h-[220px]"
                    )}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="relative overflow-hidden">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-20 sm:h-24 lg:h-32 object-cover transition-transform duration-700 hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
                      <div className="absolute top-2 sm:top-3 left-2 sm:left-3">
                        <Badge
                          className={cn(
                            "text-white border-0 text-xs font-semibold shadow-md transition-transform duration-300 hover:scale-110",
                            `bg-gradient-to-r ${getCategoryBadgeGradient(item.category)}`
                          )}
                        >
                          {item.icon}
                        </Badge>
                      </div>
                      {quantity > 0 && (
                        <div className="absolute top-2 sm:top-3 right-2 sm:right-3">
                          <Badge className="bg-gradient-to-r from-emerald-800 to-green-800 text-white border-0 text-xs font-bold shadow-md animate-pulse transition-transform duration-300 hover:scale-110">
                            {quantity}
                          </Badge>
                        </div>
                      )}
                    </div>

                    <CardContent className="p-2 sm:p-3 space-y-1 sm:space-y-2">
                      <h4 className="font-extrabold text-white text-sm leading-tight line-clamp-1">
                        {item.name}
                      </h4>
                      <p className="text-gray-100 text-xs leading-relaxed line-clamp-2">
                        {item.description}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="text-sm font-bold bg-gradient-to-r from-teal-300 to-cyan-300 bg-clip-text text-transparent">
                          {item.price.toLocaleString()}đ
                        </div>

                        {quantity > 0 ? (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removeItem(item.id)}
                              className="w-6 h-6 p-0 bg-gradient-to-r from-teal-700 to-cyan-700 hover:from-teal-600 hover:to-cyan-600 text-white border-0 rounded-full transition-all duration-300 hover:scale-110 shadow-sm"
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-6 text-center font-semibold text-xs text-white">
                              {quantity}
                            </span>
                            <Button
                              size="sm"
                              onClick={() => addItem(item)}
                              className="w-6 h-6 p-0 bg-gradient-to-r from-teal-700 to-cyan-700 hover:from-teal-600 hover:to-cyan-600 text-white border-0 rounded-full transition-all duration-300 hover:scale-110 shadow-sm"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => addItem(item)}
                            className="bg-gradient-to-r from-teal-700 to-cyan-700 hover:from-teal-600 hover:to-cyan-600 text-white border-0 text-xs px-2 py-1 h-6 rounded-full transition-all duration-300 hover:scale-110 shadow-sm"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Thêm
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <div className="w-full lg:w-72 bg-gradient-to-br from-slate-900/30 to-gray-900/30 backdrop-blur-md border-l border-cyan-500/20 p-1 sm:p-2 flex flex-col flex-shrink-0 max-h-[calc(75vh-200px)] overflow-y-auto scrollbar-hidden">
            <h3 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Tóm tắt đơn hàng
            </h3>

            <div className="bg-gradient-to-r from-slate-900/50 to-gray-900/50 backdrop-blur-sm rounded-xl p-1 sm:p-2 mb-1 sm:mb-2 border border-slate-600/20 shadow-sm">
              <h4 className="font-semibold text-cyan-400 mb-1 text-xs sm:text-sm">{movie.title}</h4>
              <div className="text-xs sm:text-sm text-gray-100 space-y-1">
                <div>Ghế: {seatNames}</div>
                <div>Số lượng: {selectedSeats?.seatIds?.length || 0} vé</div>
                <div>Suất chiếu: {movie.selectedShowtime || "Chưa chọn"}</div>
                <div className="flex justify-between pt-1 border-t border-gray-800">
                  <span>Tiền vé:</span>
                  <span className="font-semibold">{seatPrice.toLocaleString()}đ</span>
                </div>
              </div>
            </div>

            {selectedFood.length > 0 && (
              <div className="bg-gradient-to-r from-purple-900/30 to-fuchsia-900/30 backdrop-blur-sm rounded-xl p-1 sm:p-2 mb-1 sm:mb-2 border border-fuchsia-600/20 shadow-sm">
                <h4 className="font-semibold text-fuchsia-400 mb-1 text-xs sm:text-sm">Đồ ăn & nước uống</h4>
                <div className="space-y-1 max-h-20 sm:max-h-24 overflow-y-auto scrollbar-hidden">
                  {selectedFood.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-xs sm:text-sm">
                      <div className="flex-1">
                        <div className="text-white font-medium">{item.name}</div>
                        <div className="text-gray-100">x{item.quantity}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{(item.price * item.quantity).toLocaleString()}đ</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between pt-1 border-t border-gray-800 mt-1 text-xs sm:text-sm">
                  <span className="text-gray-100">Tổng đồ ăn:</span>
                  <span className="font-semibold">{totalFoodPrice.toLocaleString()}đ</span>
                </div>
              </div>
            )}

            <div className="bg-gradient-to-r from-cyan-900/30 via-blue-900/30 to-purple-900/30 backdrop-blur-sm rounded-xl p-1 sm:p-2 mb-1 sm:mb-2 border border-cyan-600/20 shadow-sm">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-white text-xs sm:text-sm">Tổng cộng:</span>
                <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {grandTotal.toLocaleString()}đ
                </span>
              </div>
            </div>

            <div className="space-y-1 sm:space-y-2">
              <Button
                className="w-full bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 text-white border-0 h-8 sm:h-9 shadow-lg hover:shadow-cyan-600/30 transition-all duration-300 hover:scale-105 text-sm rounded-full"
                onClick={() => onConfirm(selectedFood)}
              >
                Tiếp tục thanh toán
              </Button>
              <Button
                className="w-full bg-cyan-900/50 border-gray-800 text-gray-100 hover:bg-gray-900 hover:text-white h-7 sm:h-8 text-sm transition-all duration-300 hover:scale-105 shadow-sm rounded-full"
                onClick={() => onConfirm([])}
              >
                Bỏ qua đồ ăn
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}