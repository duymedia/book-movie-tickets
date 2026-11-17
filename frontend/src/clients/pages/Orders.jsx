import { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Skeleton } from "../components/ui/skeleton";
import { Toaster } from "../components/ui/toaster";
import { useToast } from "../hooks/use-toast";
import { Ticket, Clock, CreditCard, Search, Filter, MapPin, Building, Armchair } from "lucide-react";
import QRCode from "react-qr-code";
import axios from "axios";

export default function Orders() {
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const { toast } = useToast();

  // API base URL and JWT token
  const API_BASE_URL = "http://localhost:8080/api";
  const token = localStorage.getItem("authToken");

  // Fetch orders from API
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        if (!token) {
          throw new Error("No authentication token found");
        }

        const response = await axios.get(`${API_BASE_URL}/orders`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        console.log("API Response:", response.data);

        const mappedOrders = response.data
          .map((order) => {
            if (!order?.booking || !order.booking?.movie) {
              console.warn(`Invalid order data for order ID ${order?.id}`, order);
              return null;
            }

            // Determine showtime
            let date = "N/A";
            let time = "N/A";
            if (order.booking.dataJson?.timeStart) {
              const timeStart = new Date(order.booking.dataJson.timeStart);
              date = timeStart.toLocaleDateString("vi-VN");
              time = timeStart.toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              });
            } else if (order.booking.movie.showtimes?.length > 0) {
              const firstShowtime = new Date(order.booking.movie.showtimes[0].timeStart);
              date = firstShowtime.toLocaleDateString("vi-VN");
              time = firstShowtime.toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              });
              console.warn(`Using first showtime for order ID ${order.id} as fallback`);
            }

            // Extract seat IDs
            const seats = order.booking.seatId
              ? Object.keys(order.booking.seatId).filter((key) => order.booking.seatId[key])
              : [];

            // Extract ticket details
            const tickets = order.booking.ticketId
              ? Object.keys(order.booking.ticketId)
                  .filter((key) => order.booking.ticketId[key])
                  .map((ticketId) => ({
                    id: ticketId,
                    quantity: order.booking.amount?.[ticketId] || 1,
                  }))
              : [];

            return {
              id: order.id,
              movie: order.booking.movie.title || "Unknown Movie",
              cinema: order.booking.cinema?.name || "N/A",
              room: order.booking.room?.numberRoom || "N/A",
              date,
              time,
              seats,
              tickets,
              total: order.totalPrice || 0,
              status: order.status === "COMPLETED" ? "Đã thanh toán" : order.status === "CANCELLED" ? "Đã hủy" : "Chờ thanh toán",
              paymentMethod: order.payment?.paymentMethod || "N/A",
              bookingTime: order.booking.bookingTime
                ? new Date(order.booking.bookingTime).toLocaleString("vi-VN")
                : "N/A",
            };
          })
          .filter((order) => order !== null);

        setOrders(mappedOrders);
      } catch (error) {
        toast({
          title: "Lỗi",
          description:
            error.message === "No authentication token found"
              ? "Vui lòng đăng nhập để xem đơn hàng."
              : "Không thể tải danh sách đơn hàng.",
          variant: "destructive",
        });
        console.error("Error fetching orders:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [token, toast]);

  // Cancel order via API
  const handleCancelOrder = async (orderId) => {
    try {
      await axios.post(
        `${API_BASE_URL}/orders/cancel/${orderId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      toast({
        title: "Hủy đơn hàng",
        description: `Đơn hàng #${orderId} đã được hủy.`,
        variant: "destructive",
      });
      setOrders(orders.filter((order) => order.id !== orderId));
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể hủy đơn hàng.",
        variant: "destructive",
      });
      console.error("Error canceling order:", error);
    }
  };

  const handleOpenPaymentModal = (order) => {
    setSelectedOrder(order);
    setSelectedPaymentMethod("");
    setIsPaymentModalOpen(true);
  };

  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setSelectedOrder(null);
    setSelectedPaymentMethod("");
  };

  const handleConfirmPayment = () => {
    if (!selectedPaymentMethod) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn phương thức thanh toán.",
        variant: "destructive",
        className: "bg-red-600 text-white border-0",
      });
      return;
    }

    if (selectedOrder) {
      setOrders(
        orders.map((order) =>
          order.id === selectedOrder.id ? { ...order, status: "Đã thanh toán" } : order
        )
      );
      toast({
        title: "Thanh toán thành công",
        description: `Đơn hàng #${selectedOrder.id} đã được thanh toán qua ${selectedPaymentMethod}.`,
        className: "bg-green-600 text-white border-0",
      });
      handleClosePaymentModal();
    }
  };

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    const matchesSearch = order.movie.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === "all" || order.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const OrderCardSkeleton = () => (
    <div className="bg-gray-800/50 rounded-xl p-4 space-y-4 animate-pulse">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-9 w-24 rounded-md" />
    </div>
  );

  return (
    <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 py-12">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-white mb-8">Đơn hàng của bạn</h2>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
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
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-gray-800/50 border border-gray-600 rounded-md px-3 py-2 text-white w-full md:w-auto"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="Đã thanh toán">Đã thanh toán</option>
              <option value="Chờ thanh toán">Chờ thanh toán</option>
              <option value="Đã hủy">Đã hủy</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <OrderCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-gray-800/30 rounded-xl">
            <div className="text-gray-400 text-lg">
              {searchQuery || selectedStatus !== "all"
                ? "Không tìm thấy đơn hàng phù hợp."
                : "Bạn chưa có đơn hàng nào."}
            </div>
            <Button
              as="a"
              href="/"
              variant="link"
              className="text-red-400 mt-2"
              onClick={() => {
                setSearchQuery("");
                setSelectedStatus("all");
              }}
            >
              {searchQuery || selectedStatus !== "all" ? "Xóa bộ lọc" : "Xem phim ngay"}
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredOrders.map((order) => (
              <div key={order.id} className="bg-gray-800/50 rounded-xl p-4 space-y-4">
                <h3 className="text-xl font-semibold text-white">{order.movie} - #{order.id}</h3>
                <div className="space-y-2 text-gray-300 text-sm">
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2 text-red-400" />
                    Rạp: {order.cinema}
                  </div>
                  <div className="flex items-center">
                    <Building className="w-4 h-4 mr-2 text-red-400" />
                    Phòng: {order.room}
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-red-400" />
                    Suất chiếu: {order.date} - {order.time}
                  </div>
                  <div className="flex items-center">
                    <Armchair className="w-4 h-4 mr-2 text-red-400" />
                    Ghế: {order.seats.join(", ") || "N/A"}
                  </div>
                  <div className="flex items-center">
                    <Ticket className="w-4 h-4 mr-2 text-red-400" />
                    Vé: {order.tickets.map((t) => `ID ${t.id} (x${t.quantity})`).join(", ") || "N/A"}
                  </div>
                  <div className="flex items-center">
                    <CreditCard className="w-4 h-4 mr-2 text-red-400" />
                    Tổng: {order.total.toLocaleString()} VNĐ
                  </div>
                  <div className="flex items-center">
                    <CreditCard className="w-4 h-4 mr-2 text-red-400" />
                    Thanh toán: {order.paymentMethod}
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-red-400" />
                    Thời gian đặt: {order.bookingTime}
                  </div>
                  <div
                    className={
                      order.status === "Đã thanh toán"
                        ? "text-green-400"
                        : order.status === "Đã hủy"
                        ? "text-red-400"
                        : "text-yellow-400"
                    }
                  >
                    Trạng thái: {order.status}
                  </div>
                </div>
                <div className="flex justify-center">
                  <QRCode
                    value={order.id}
                    size={128}
                    bgColor="#1F2937"
                    fgColor="#FFFFFF"
                  />
                </div>
                {order.status === "Chờ thanh toán" ? (
                  <div className="space-y-2">
                    <Button
                      className="w-full bg-gradient-to-r from-green-500 to-green-700 hover:from-green-400 hover:to-green-600 text-white"
                      onClick={() => handleOpenPaymentModal(order)}
                    >
                      Thanh toán
                    </Button>
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => handleCancelOrder(order.id)}
                    >
                      Hủy đơn
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => handleCancelOrder(order.id)}
                    disabled
                  >
                    Hủy đơn
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {isPaymentModalOpen && selectedOrder && (
        <Dialog open={isPaymentModalOpen} onOpenChange={handleClosePaymentModal}>
          <DialogContent className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 w-full max-w-md mx-4 shadow-lg text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                Thanh toán đơn hàng #{selectedOrder.id}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2 text-gray-300 text-sm">
                <h3 className="text-lg font-semibold text-white">{selectedOrder.movie}</h3>
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2 text-red-400" />
                  Rạp: {selectedOrder.cinema}
                </div>
                <div className="flex items-center">
                  <Building className="w-4 h-4 mr-2 text-red-400" />
                  Phòng: {selectedOrder.room}
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-red-400" />
                  Suất chiếu: {selectedOrder.date} - {selectedOrder.time}
                </div>
                <div className="flex items-center">
                  <Armchair className="w-4 h-4 mr-2 text-red-400" />
                  Ghế: {selectedOrder.seats.join(", ") || "N/A"}
                </div>
                <div className="flex items-center">
                  <Ticket className="w-4 h-4 mr-2 text-red-400" />
                  Vé: {selectedOrder.tickets.map((t) => `ID ${t.id} (x${t.quantity})`).join(", ") || "N/A"}
                </div>
                <div className="flex items-center">
                  <CreditCard className="w-4 h-4 mr-2 text-red-400" />
                  Tổng: {selectedOrder.total.toLocaleString()} VNĐ
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-white">
                  Phương thức thanh toán:
                </label>
                <select
                  value={selectedPaymentMethod}
                  onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                  className="bg-gray-800/50 border border-gray-600 rounded-md px-3 py-2 text-white w-full"
                >
                  <option value="">Chọn phương thức</option>
                  <option value="VCB">VCB</option>
                  <option value="Momo">Momo</option>
                  <option value="ZaloPay">ZaloPay</option>
                  <option value="Tiền mặt">Tiền mặt</option>
                </select>
              </div>

              <Button
                className="w-full bg-gradient-to-r from-green-500 to-green-700 hover:from-green-400 hover:to-green-600 text-white"
                onClick={handleConfirmPayment}
              >
                Xác nhận thanh toán
              </Button>
              <Button
                variant="outline"
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
                onClick={handleClosePaymentModal}
              >
                Đóng
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Toaster />
    </div>
  );
}