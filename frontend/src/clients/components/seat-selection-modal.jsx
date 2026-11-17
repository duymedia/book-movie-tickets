import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Monitor, User, Heart, Sparkles } from "lucide-react";
import { cn } from "../lib/utils";
import { useToast } from "../hooks/use-toast";
import "../../globals.css";

/**
 * @typedef {Object} Movie
 * @property {number} id
 * @property {string} title
 * @property {number} price
 * @property {{ id: number }} room
 * @property {{ id: number }} cinema
 * @property {string} selectedShowtime
 */

/**
 * @typedef {Object} Seat
 * @property {number} id
 * @property {string} name
 * @property {"single"|"couple"|"vip"} type
 * @property {"available"|"selected"|"occupied"} status
 * @property {number} price
 * @property {boolean=} isCouplePart
 * @property {string=} coupleGroup
 */

/**
 * @param {{
 *   movie: Movie,
 *   onClose: () => void,
 *   onConfirm: (selectedSeats: string[], seatMap: Record<string, string>) => void
 * }} props
 */
export function SeatSelectionModal({ movie, onClose, onConfirm }) {
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [animatingSeats, setAnimatingSeats] = useState([]);
  const [seats, setSeats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [ticketPrices, setTicketPrices] = useState({
    single: 0,
    couple: 0,
    vip: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem("authToken");
        if (!token) {
          throw new Error("Bạn cần đăng nhập để xem ghế");
        }

        // Fetch ticket prices
        const ticketResponse = await fetch("http://localhost:8080/api/tickets", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!ticketResponse.ok) {
          throw new Error(`Không thể tải giá vé: ${ticketResponse.status}`);
        }

        const ticketData = await ticketResponse.json();
        const newTicketPrices = {
          single: 0,
          couple: 0,
          vip: 0,
        };

        ticketData.forEach((ticket) => {
          if (ticket.type === "normal") {
            newTicketPrices.single = ticket.price;
          } else if (ticket.type === "couple") {
            newTicketPrices.couple = ticket.price;
          } else if (ticket.type === "vip") {
            newTicketPrices.vip = ticket.price;
          }
        });

        setTicketPrices(newTicketPrices);

        // Fetch seats
        const seatResponse = await fetch(
          `http://localhost:8080/api/seats/room/${movie.room.id}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!seatResponse.ok) {
          if (seatResponse.status === 401 || seatResponse.status === 403) {
            localStorage.removeItem("authToken");
            throw new Error("Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.");
          }
          throw new Error(`Không thể tải danh sách ghế: ${seatResponse.status}`);
        }

        const apiSeats = await seatResponse.json();
        const transformedSeats = apiSeats
          .filter((seat) => seat.cinema?.id === movie.cinema.id)
          .map((seat) => {
            const seatType = mapSeatType(seat.seatType);
            let coupleGroup = undefined;
            if (seatType === "couple" && seat.coupleSeatId) {
              const partnerSeat = apiSeats.find(
                (s) => s.coupleSeatId === seat.id || s.id === seat.coupleSeatId
              );
              if (partnerSeat) {
                const ids = [seat.id, partnerSeat.id].sort();
                coupleGroup = `${ids[0]}-${ids[1]}`;
              }
            }
            return {
              id: seat.id, // Numeric ID (e.g., 335)
              name: seat.name, // String (e.g., "D1")
              type: seatType,
              status: seat.status === "available" ? "available" : "occupied",
              price: newTicketPrices[seatType],
              isCouplePart: seatType === "couple",
              coupleGroup,
            };
          });

        if (transformedSeats.length === 0) {
          throw new Error("Không tìm thấy ghế phù hợp cho phòng này");
        }

        setSeats(transformedSeats);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Lỗi",
          description: error.message || "Không thể tải dữ liệu",
          variant: "destructive",
        });
        onClose();
      } finally {
        setIsLoading(false);
      }
    };

    if (movie.room?.id && movie.cinema?.id) {
      fetchData();
    } else {
      toast({
        title: "Lỗi",
        description: "Không tìm thấy thông tin phòng chiếu hoặc rạp",
        variant: "destructive",
      });
      onClose();
    }
  }, [movie.room, movie.cinema, toast, onClose]);

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

  const toggleSeat = (seatId) => {
    const seat = seats.find((s) => s.id === seatId);
    if (!seat || seat.status === "occupied") return;

    setAnimatingSeats((prev) => [...prev, seatId]);
    setTimeout(() => {
      setAnimatingSeats((prev) => prev.filter((id) => id !== seatId));
    }, 200);

    if (seat.type === "couple" && seat.coupleGroup) {
      const coupleSeats = seats.filter((s) => s.coupleGroup === seat.coupleGroup);
      const coupleIds = coupleSeats.map((s) => s.id.toString());
      const isPairSelected = coupleIds.every((id) => selectedSeats.includes(id));

      setSelectedSeats((prev) => {
        if (isPairSelected) {
          return prev.filter((id) => !coupleIds.includes(id));
        } else {
          return [...prev.filter((id) => !coupleIds.includes(id)), ...coupleIds];
        }
      });
    } else {
      setSelectedSeats((prev) =>
        prev.includes(seatId.toString())
          ? prev.filter((id) => id !== seatId.toString())
          : [...prev, seatId.toString()]
      );
    }
  };

  const getSeatStatus = (seatId) => {
    const seat = seats.find((s) => s.id === seatId);
    if (!seat) return "available";
    if (seat.status === "occupied") return "occupied";
    if (selectedSeats.includes(seatId.toString())) return "selected";
    return "available";
  };

  const getSeatColor = (seat, isSelected) => {
    const status = getSeatStatus(seat.id);
    const isAnimating = animatingSeats.includes(seat.id);

    if (status === "occupied")
      return "bg-gradient-to-br from-red-600 to-red-700 cursor-not-allowed shadow-red-600/30 border-red-600";
    if (status === "selected")
      return "bg-gradient-to-br from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 cursor-pointer shadow-emerald-600/40 hover:ring-1 hover:ring-emerald-500/30 hover:ring-offset-2 border-emerald-600";

    const baseClasses =
      "cursor-pointer transition-all duration-300 hover:ring-1 hover:ring-offset-2";
    const animationClasses = isAnimating ? "animate-pulse scale-110" : "";
    const hoverClasses = isSelected ? "hover:scale-110" : "";

    switch (seat?.type) {
      case "vip":
        return `bg-gradient-to-br from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 shadow-amber-600/30 hover:ring-amber-500/30 border-amber-600 ${baseClasses} ${animationClasses} ${hoverClasses}`;
      case "couple":
        return `bg-gradient-to-br from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 shadow-pink-600/30 hover:ring-pink-500/30 border-pink-600 ${baseClasses} ${animationClasses} ${hoverClasses}`;
      default:
        return `bg-gradient-to-br from-slate-600 to-gray-700 hover:from-slate-500 hover:to-gray-600 shadow-slate-600/30 hover:ring-slate-500/30 border-slate-600 ${baseClasses} ${animationClasses} ${hoverClasses}`;
    }
  };

  const getSeatIcon = (seat) => {
    switch (seat.type) {
      case "couple":
        return <Heart className="w-3 h-3 text-white" />;
      case "vip":
        return <Sparkles className="w-3 h-3 text-white" />;
      default:
        return <User className="w-3 h-3 text-white" />;
    }
  };

  const totalPrice = selectedSeats.reduce((total, seatId) => {
    const seat = seats.find((s) => s.id.toString() === seatId);
    if (!seat) return total;
    if (seat.type === "couple" && seat.coupleGroup) {
      const coupleSeats = seats.filter((s) => s.coupleGroup === seat.coupleGroup);
      const primarySeat = coupleSeats[0];
      if (seat.id.toString() === primarySeat.id.toString()) {
        return total + (seat.price || 0);
      }
      return total;
    }
    return total + (seat?.price || 0);
  }, 0);

  const groupSeatsByRow = () => {
    const grouped = {};
    seats.forEach((seat) => {
      const row = seat.name[0]; // Group by row based on seat.name (e.g., "D")
      if (!grouped[row]) grouped[row] = [];
      grouped[row].push(seat);
    });
    return grouped;
  };

  const seatsByRow = groupSeatsByRow();
  const rows = Object.keys(seatsByRow).sort();

  const handleConfirm = () => {
    // Create seatMap for PaymentModal
    const seatMap = seats.reduce((map, seat) => {
      map[seat.id.toString()] = seat.name;
      return map;
    }, {});
    console.log("Selected seats:", selectedSeats, "Seat map:", seatMap); // Debug
    onConfirm(selectedSeats, seatMap);
  };

  if (isLoading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent
          className="max-w-[90vw] w-[95vw] max-h-[98vh] bg-gradient-to-br from-gray-950 via-gray-900 to-black border border-cyan-500/20 text-white p-2 sm:p-3 md:p-4 overflow-hidden"
          aria-describedby="seat-dialog-description"
        >
          <DialogTitle className="sr-only">Chọn ghế cho phim {movie.title}</DialogTitle>
          <DialogDescription id="seat-dialog-description" className="sr-only">
            Chọn ghế cho phim {movie.title} tại rạp.
          </DialogDescription>
          <div className="text-center text-gray-400">Đang tải ghế...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent
        className="max-w-[90vw] w-[95vw] max-h-[98vh] bg-gradient-to-br from-gray-950 via-gray-900 to-black border border-cyan-500/20 text-white p-2 sm:p-3 md:p-4 overflow-hidden"
        aria-describedby="seat-dialog-description"
      >
        <DialogHeader className="p-2 sm:p-3 md:p-4 pb-0 border-b border-cyan-500/20 bg-gradient-to-r from-slate-900/50 to-gray-900/50 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl sm:text-2xl font-semibold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                Chọn ghế ngồi
              </DialogTitle>
              <DialogDescription id="seat-dialog-description" className="sr-only">
                Chọn ghế cho phim {movie.title} tại rạp.
              </DialogDescription>
              <div className="text-gray-400 text-xs sm:text-sm mt-1">
                {movie.title} - Rạp {movie.cinema?.name || "Unknown"} - Suất {movie.selectedShowtime}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-2 sm:p-3 md:p-4 overflow-y-auto max-h-[80vh]">
          <div className="mb-3 sm:mb-4">
            <div className="bg-gradient-to-r from-cyan-700 via-blue-700 to-purple-700 rounded-xl p-2 sm:p-3 text-center mb-3 sm:mb-4 shadow-lg shadow-cyan-600/20 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 animate-pulse"></div>
              <Monitor className="w-6 h-6 sm:w-7 sm:h-7 mx-auto mb-1 sm:mb-2 text-white relative z-10" />
              <div className="text-white font-semibold text-sm sm:text-base relative z-10">
                MÀN HÌNH
              </div>
            </div>
          </div>

          <div className="space-y-1.5 sm:space-y-2 mb-4 sm:mb-6 max-w-full overflow-x-hidden">
            {rows.map((row, rowIndex) => (
              <div
                key={row}
                className="flex items-center justify-center mb-1"
                style={{ animationDelay: `${rowIndex * 80}ms` }}
              >
                <div className="w-6 sm:w-7 text-center font-semibold text-cyan-400 text-sm sm:text-base mr-4">
                  {row}
                </div>
                <div className="flex gap-0.25 sm:gap-0.5 justify-center min-w-fit">
                  {seatsByRow[row]
                    ?.sort((a, b) => parseInt(a.name.slice(1)) - parseInt(b.name.slice(1)))
                    .map((seat, index) => {
                      if (
                        seat.type === "couple" &&
                        seat.coupleGroup &&
                        seat.id.toString() !== seat.coupleGroup.split("-")[0]
                      ) {
                        return null;
                      }

                      const isCouple = seat.type === "couple" && seat.coupleGroup;
                      const isSelected = selectedSeats.some(
                        (s) => s === seat.id.toString() || (isCouple && seat.coupleGroup.includes(s))
                      );
                      const coupleSeats = isCouple
                        ? seats.filter((s) => s.coupleGroup === seat.coupleGroup)
                        : [seat];
                      const coupleLabel = isCouple
                        ? coupleSeats.map((s) => s.name).sort().join("-")
                        : seat.name;

                      return (
                        <button
                          key={seat.id}
                          className={cn(
                            `${
                              isCouple
                                ? "w-12 h-6 sm:w-14 sm:h-7 md:w-16 md:h-8"
                                : "w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8"
                            } rounded-lg transition-all duration-300 flex items-center justify-center text-white shadow-md`,
                            getSeatColor(seat, isSelected)
                          )}
                          onClick={() => toggleSeat(seat.id)}
                          disabled={seat.status === "occupied"}
                          title={`${coupleLabel} - ${
                            seat.type === "vip"
                              ? "VIP"
                              : seat.type === "couple"
                              ? "Ghế đôi"
                              : "Thường"
                          } - ${seat.price.toLocaleString()}đ`}
                          style={{ animationDelay: `${index * 40}ms` }}
                        >
                          {getSeatIcon(seat)}
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 sm:gap-2 mb-4 sm:mb-6 p-2 sm:p-3 bg-gradient-to-r from-slate-900/30 to-gray-900/30 backdrop-blur-sm rounded-xl border border-slate-500/20">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 sm:w-5 sm:h-5 bg-gradient-to-br from-slate-600 to-gray-700 rounded-lg flex items-center justify-center shadow-md">
                <User className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
              </div>
              <span className="text-[9px] sm:text-xs text-gray-300">Thường ({ticketPrices.single.toLocaleString()}đ)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 sm:w-5 sm:h-5 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-lg flex items-center justify-center shadow-md">
                <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
              </div>
              <span className="text-[9px] sm:text-xs text-gray-300">VIP ({ticketPrices.vip.toLocaleString()}đ)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 sm:w-5 sm:h-5 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg flex items-center justify-center shadow-md">
                <Heart className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
              </div>
              <span className="text-[9px] sm:text-xs text-gray-300">Ghế đôi ({ticketPrices.couple.toLocaleString()}đ/cặp)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 sm:w-5 sm:h-5 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg shadow-md"></div>
              <span className="text-[9px] sm:text-xs text-gray-300">Đã chọn</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 sm:w-5 sm:h-5 bg-gradient-to-br from-red-600 to-red-700 rounded-lg shadow-md"></div>
              <span className="text-[9px] sm:text-xs text-gray-300">Đã bán</span>
            </div>
          </div>

          <div className="bg-gradient-to-r from-slate-900/50 to-gray-900/50 backdrop-blur-sm rounded-xl p-2 sm:p-3 border border-cyan-500/20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 sm:gap-3">
              <div className="flex-1">
                <h4 className="font-semibold mb-1.5 sm:mb-2 text-cyan-400 text-sm sm:text-base">
                  Ghế đã chọn:
                </h4>
                <div className="flex flex-wrap gap-1 sm:gap-1.5">
                  {selectedSeats.length > 0 ? (
                    selectedSeats.map((seatId) => {
                      const seat = seats.find((s) => s.id.toString() === seatId);
                      return (
                        <Badge
                          key={seatId}
                          className={cn(
                            "text-white border-0 text-[9px] sm:text-[10px] md:text-xs shadow-md transition-all duration-300 hover:scale-105",
                            seat?.type === "vip"
                              ? "bg-gradient-to-r from-amber-500 to-yellow-600"
                              : seat?.type === "couple"
                              ? "bg-gradient-to-r from-pink-500 to-rose-600"
                              : "bg-gradient-to-r from-emerald-500 to-green-600"
                          )}
                        >
                          {seat?.name || seatId}
                        </Badge>
                      );
                    })
                  ) : (
                    <span className="text-gray-400 text-xs sm:text-sm">
                      Chưa chọn ghế nào
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs sm:text-sm text-gray-400">Tổng tiền</div>
                <div className="text-3xl sm:text-4xl font-semibold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {totalPrice.toLocaleString()}đ
                </div>
                <div className="text-xs text-gray-500">
                  {selectedSeats.length} ghế
                </div>
              </div>
            </div>

            <div className="flex gap-1.5 sm:gap-2 mt-3 sm:mt-4">
              <Button
                className="flex-1 border-purple-600/60 text-gray-300 bg-transparent shadow-sm font-medium hover:bg-gradient-to-r hover:from-purple-900 hover:to-gray-950 hover:text-purple-300 hover:shadow-purple-500/20 hover:ring-1 hover:ring-purple-500/30 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 hover:scale-105"
                onClick={onClose}
              >
                Hủy
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-500 text-white border-0 shadow-md hover:shadow-cyan-600/25 transition-all duration-300 hover:scale-105"
                onClick={handleConfirm}
                disabled={selectedSeats.length === 0}
              >
                Tiếp tục chọn đồ ăn
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}