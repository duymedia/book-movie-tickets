import { useState, useEffect } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Separator } from "../components/ui/separator";
import { CreditCard, Smartphone, Building, HandCoins, Shield, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "../lib/utils";
import QRCode from "react-qr-code";
import { useToast } from "../hooks/use-toast";
import "../../globals.css";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

export function PaymentModal({ movie, selectedSeats, selectedFood, onClose, onSuccess }) {
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [apiPaymentMethods, setApiPaymentMethods] = useState([]);
  const [error, setError] = useState(null);
  const [timeLeft, setTimeLeft] = useState(600);
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [bookingId, setBookingId] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [ticketPrices, setTicketPrices] = useState({ single: 0, couple: 0, vip: 0 });
  const { toast } = useToast();

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
  const PAYPAL_CLIENT_ID =
    import.meta.env.VITE_PAYPAL_CLIENT_ID ||
    "AeWnfV9coBr4t6-zoq9SsoY9w7xRB7SDur-DhKqRXXqm6oh7YsM4Tov8vefHITuU0H79UpgzpTECPvfq";

  // Helper function for API calls (using fetch for non-userId calls)
  const makeApiCall = async (url, method = "GET", body = null, authToken = null) => {
    if (!authToken) {
      throw new Error("Vui lòng đăng nhập để thực hiện hành động này");
    }
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    };
    const response = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("authToken");
        throw new Error("Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.");
      }
      const errorData = await response.text();
      throw new Error(errorData || `Lỗi ${response.status}`);
    }
    return response.json();
  };

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const authToken = localStorage.getItem("authToken");
        if (!authToken) {
          throw new Error("Vui lòng đăng nhập để tiếp tục thanh toán");
        }

        // Decode token to get email
        let decodedEmail;
        try {
          const decoded = jwtDecode(authToken);
          decodedEmail = decoded.email || decoded.sub;
          if (!decodedEmail) {
            throw new Error("Email không tìm thấy trong token");
          }
        } catch (error) {
          throw new Error("Không thể giải mã token");
        }

        // Fetch user ID by email using axios
        const userResponse = await axios.get(`${API_BASE_URL}/api/user/email`, {
          params: { email: decodedEmail },
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const userData = userResponse.data;
        if (!userData.id) {
          throw new Error("Không thể lấy ID người dùng từ API");
        }
        setUserId(userData.id);

        // Fetch ticket prices
        const ticketData = await makeApiCall(`${API_BASE_URL}/api/tickets`, "GET", null, authToken);
        const newTicketPrices = { single: 0, couple: 0, vip: 0 };
        ticketData.forEach((ticket) => {
          if (ticket.type === "normal") newTicketPrices.single = ticket.price;
          else if (ticket.type === "couple") newTicketPrices.couple = ticket.price;
          else if (ticket.type === "vip") newTicketPrices.vip = ticket.price;
        });
        setTicketPrices(newTicketPrices);

        // Fetch payment methods
        const paymentData = await makeApiCall(`${API_BASE_URL}/api/payments`, "GET", null, authToken);
        setApiPaymentMethods(paymentData.filter((method) => method.status === "Active"));
      } catch (err) {
        const errorMessage = err.response?.data?.message || err.message || "Đã xảy ra lỗi khi tải dữ liệu";
        setError(errorMessage);
        toast({
          title: "Lỗi",
          description: errorMessage,
          variant: "destructive",
          action: errorMessage.includes("đăng nhập") ? (
            <Button
              onClick={() => (window.location.href = "/login")}
              className="ml-2 bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              Đăng nhập
            </Button>
          ) : null,
        });
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem("authToken");
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [API_BASE_URL, toast]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onClose]);

  // Calculate seat price
  const calculateSeatPrice = async () => {
    try {
      const authToken = localStorage.getItem("authToken");
      if (!authToken) throw new Error("Vui lòng đăng nhập để tính giá vé");

      const seatResponse = await makeApiCall(
        `${API_BASE_URL}/api/seats/room/${movie.room?.id || 6}${
          movie.selectedShowtimeId ? `?showtimeId=${movie.selectedShowtimeId}` : ""
        }`,
        "GET",
        null,
        authToken
      );

      let totalSeatPrice = 0;
      const processedSeats = new Set();
      for (const seatId of selectedSeats?.seatIds || []) {
        if (processedSeats.has(seatId)) continue;
        const seat = seatResponse.find((s) => s.id.toString() === seatId);
        if (!seat) continue;

        const seatType = mapSeatType(seat.seatType);
        if (seatType === "couple" && seat.coupleSeatId) {
          const partnerSeat = seatResponse.find(
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
      toast({
        title: "Lỗi",
        description: err.message || "Không thể tính giá vé",
        variant: "destructive",
      });
      return (selectedSeats?.seatIds?.length || 0) * (movie.price || 100000);
    }
  };

  const [seatPrice, setSeatPrice] = useState(0);
  useEffect(() => {
    calculateSeatPrice().then((price) => setSeatPrice(price));
  }, [selectedSeats, ticketPrices, movie]);

  const foodPrice = selectedFood.reduce((total, item) => total + item.price * item.quantity, 0);
  const finalTotal = seatPrice + foodPrice;

  // Create booking
  const createBooking = async () => {
    try {
      const authToken = localStorage.getItem("authToken");
      if (!authToken) throw new Error("Vui lòng đăng nhập để đặt vé");
      if (!userId) throw new Error("Không tìm thấy ID người dùng. Vui lòng đăng nhập lại.");

      const invalidSeats = (selectedSeats?.seatIds || []).filter((seat) => !/^\d+$/.test(seat));
      if (invalidSeats.length > 0) {
        throw new Error(
          `Ghế không hợp lệ: ${invalidSeats
            .map((id) => selectedSeats.seatMap[id] || id)
            .join(", ")}. Vui lòng chọn ghế có ID số.`
        );
      }

      // Fetch ticket types
      const ticketData = await makeApiCall(`${API_BASE_URL}/api/tickets`, "GET", null, authToken);
      const ticketMap = {
        normal: ticketData.find((t) => t.type === "normal")?.id,
        couple: ticketData.find((t) => t.type === "couple")?.id,
        vip: ticketData.find((t) => t.type === "vip")?.id,
      };

      // Fetch seat data
      const seatResponse = await makeApiCall(
        `${API_BASE_URL}/api/seats/room/${movie.room?.id || 6}${
          movie.selectedShowtimeId ? `?showtimeId=${movie.selectedShowtimeId}` : ""
        }`,
        "GET",
        null,
        authToken
      );

      // Count tickets
      const ticketCounts = {};
      const processedSeats = new Set();
      for (const seatId of selectedSeats?.seatIds || []) {
        if (processedSeats.has(seatId)) continue;
        const seat = seatResponse.find((s) => s.id.toString() === seatId);
        if (!seat) throw new Error(`Ghế ID ${seatId} không tồn tại`);

        const seatType = mapSeatType(seat.seatType);
        if (seatType === "couple" && seat.coupleSeatId) {
          const partnerSeat = seatResponse.find(
            (s) => s.coupleSeatId === seat.id || s.id === seat.coupleSeatId
          );
          if (!partnerSeat || !selectedSeats.seatIds.includes(partnerSeat.id.toString())) {
            throw new Error(
              `Ghế đôi ${selectedSeats.seatMap[seatId]} phải được chọn cùng với ghế đôi liên kết`
            );
          }
          ticketCounts[ticketMap.couple] = (ticketCounts[ticketMap.couple] || 0) + 2;
          processedSeats.add(seatId);
          processedSeats.add(partnerSeat.id.toString());
        } else {
          const ticketId = seatType === "vip" ? ticketMap.vip : ticketMap.normal;
          ticketCounts[ticketId] = (ticketCounts[ticketId] || 0) + 1;
          processedSeats.add(seatId);
        }
      }

      if (Object.keys(ticketCounts).length === 0) {
        throw new Error("Không tìm thấy vé phù hợp cho các ghế đã chọn");
      }

      // Prepare booking data
      const bookingData = {
        user: { id: userId },
        cinema: { id: movie.cinema?.id || 9 },
        room: { id: movie.room?.id || 6 },
        movie: { id: movie.id },
        seat: (selectedSeats?.seatIds || []).reduce((acc, seat) => ({ ...acc, [parseInt(seat)]: true }), {}),
        ticket: ticketCounts,
        combos:
          selectedFood.length > 0
            ? selectedFood.reduce((acc, food) => ({ ...acc, [food.id]: food.quantity }), {})
            : {},
        showtimes: { [movie.selectedShowtimeId || 41]: true },
        status: "PENDING",
      };

      // Create booking
      const bookingResponse = await makeApiCall(
        `${API_BASE_URL}/api/bookings`,
        "POST",
        bookingData,
        authToken
      );
      setBookingId(bookingResponse.id);
      return bookingResponse.id;
    } catch (err) {
      toast({
        title: "Lỗi",
        description: err.message || "Đã xảy ra lỗi khi tạo booking",
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
      throw err;
    }
  };

  // Verify booking and fetch pending orders
  const verifyBooking = async () => {
    setIsVerifying(true);
    try {
      const authToken = localStorage.getItem("authToken");
      if (!authToken) throw new Error("Vui lòng đăng nhập để xác thực");

      let currentBookingId = bookingId;
      if (!currentBookingId) {
        currentBookingId = await createBooking();
      }

      // Verify booking
      const bookingResponse = await makeApiCall(
        `${API_BASE_URL}/api/bookings/${currentBookingId}`,
        "GET",
        null,
        authToken
      );
      if (bookingResponse.status !== "PENDING") {
        throw new Error("Booking không ở trạng thái PENDING");
      }

      // Fetch pending orders
      const ordersResponse = await makeApiCall(
        `${API_BASE_URL}/api/orders?userId=${userId}`,
        "GET",
        null,
        authToken
      );
      const matchingOrders = ordersResponse.filter(
        (order) => order.booking.id === currentBookingId && order.status === "PENDING"
      );
      if (matchingOrders.length === 0) {
        throw new Error("Không tìm thấy đơn hàng PENDING cho booking này");
      }

      setPendingOrders(matchingOrders);
      setOrderId(matchingOrders[0].id);
      toast({
        title: "Thành công",
        description: "Xác thực thông tin thanh toán thành công",
        variant: "success",
      });
      return matchingOrders[0].id;
    } catch (err) {
      setError(err.message || "Lỗi khi xác thực thông tin thanh toán");
      toast({
        title: "Lỗi",
        description: err.message || "Lỗi khi xác thực thông tin thanh toán",
        variant: "destructive",
      });
      throw err;
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle pay later
  const handlePayLater = async () => {
    try {
      toast({
        title: "Thành công",
        description: "Đã lưu đơn hàng để thanh toán sau",
        variant: "success",
      });
      onClose();
    } catch (err) {
      setError(err.message || "Lỗi khi lưu đơn hàng để thanh toán sau");
      toast({
        title: "Lỗi",
        description: err.message || "Lỗi khi lưu đơn hàng để thanh toán sau",
        variant: "destructive",
      });
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

  const validateCardForm = () => {
    const errors = {};
    if (!/^\d{16}$/.test(cardNumber.replace(/\s/g, ""))) {
      errors.cardNumber = "Số thẻ phải có 16 chữ số";
    }
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) {
      errors.expiry = "Ngày hết hạn phải có định dạng MM/YY";
    }
    if (!/^\d{3}$/.test(cvv)) {
      errors.cvv = "CVV phải có 3 chữ số";
    }
    if (!/^[A-Z\s]+$/.test(cardName)) {
      errors.cardName = "Tên chủ thẻ phải là chữ in hoa";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePayment = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const authToken = localStorage.getItem("authToken");
      if (!authToken) throw new Error("Vui lòng đăng nhập để tiếp tục thanh toán");

      let paymentId;
      let paymentType;
      if (paymentMethod === "card") {
        if (!validateCardForm()) throw new Error("Vui lòng kiểm tra thông tin thẻ");
        paymentId = 14;
        paymentType = "CARD";
      } else if (paymentMethod === "cod") {
        paymentId = 0;
        paymentType = "COD";
      } else if (paymentMethod.startsWith("momo-")) {
        paymentId = parseInt(paymentMethod.split("-")[1]);
        paymentType = "MOMO";
      } else if (paymentMethod.startsWith("banking-")) {
        paymentId = parseInt(paymentMethod.split("-")[1]);
        paymentType = "BANKING_VN";
      } else if (paymentMethod.startsWith("paypal-")) {
        paymentId = parseInt(paymentMethod.split("-")[1]);
        paymentType = "PAYPAL";
      } else {
        throw new Error("Phương thức thanh toán không được hỗ trợ");
      }

      // Use orderId = 0 if no order is verified
      const effectiveOrderId = orderId || 0;

      if (!paymentMethod.startsWith("paypal-")) {
        const paymentBody = {
          id: paymentId,
          orders: effectiveOrderId,
          paymentType: paymentType,
          amount: finalTotal,
        };

        // Skip payment method validation for COD or orderId == 0
        if (paymentType !== "COD" && effectiveOrderId !== 0) {
          const selectedMethod = apiPaymentMethods.find(
            (m) => m.id === paymentId && m.paymentType === paymentType
          );
          if (!selectedMethod) {
            throw new Error(`Không tìm thấy phương thức thanh toán ${paymentType} với ID: ${paymentId}`);
          }
        }

        const paymentResponse = await makeApiCall(
          `${API_BASE_URL}/api/payments?orders=${effectiveOrderId}`,
          "POST",
          paymentBody,
          authToken
        );
        if (!paymentResponse.success) {
          throw new Error(paymentResponse.message || "Thanh toán thất bại");
        }
        toast({
          title: "Thành công",
          description: paymentResponse.message || "Thanh toán thành công",
          variant: "success",
        });
        onSuccess();
      }
    } catch (err) {
      const errorMessage = err.message || "Đã xảy ra lỗi trong quá trình thanh toán";
      setError(errorMessage);
      toast({
        title: "Lỗi",
        description: errorMessage,
        variant: "destructive",
        action: errorMessage.includes("đăng nhập") ? (
          <Button
            onClick={() => (window.location.href = "/login")}
            className="ml-2 bg-cyan-600 hover:bg-cyan-500 text-white"
          >
            Đăng nhập
          </Button>
        ) : null,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const paymentMethods = [
    {
      id: "card",
      name: "Thẻ tín dụng/ghi nợ",
      icon: <CreditCard className="w-5 h-5 text-blue-400" />,
      description: "Visa, Mastercard, JCB",
      color: "from-blue-600 to-indigo-700",
      paymentType: "CARD",
    },
    {
      id: "momo",
      name: "Ví MoMo",
      icon: <Smartphone className="w-5 h-5 text-pink-400" />,
      description: "Thanh toán qua ví điện tử",
      color: "from-pink-600 to-rose-700",
      paymentType: "MOMO",
    },
    {
      id: "cod",
      name: "Thanh toán khi nhận hàng",
      icon: <HandCoins className="w-5 h-5 text-amber-400" />,
      description: "Trả tiền mặt tại rạp",
      color: "from-amber-600 to-yellow-700",
      paymentType: "COD",
    },
    ...apiPaymentMethods
      .filter((method) => ["BANKING_VN", "PAYPAL"].includes(method.paymentType))
      .map((method) => ({
        id: `${method.paymentType.toLowerCase()}-${method.id}`,
        name: method.paymentMethod,
        icon: method.paymentType === "PAYPAL" ? (
          <Smartphone className="w-5 h-5 text-blue-400" />
        ) : (
          <Building className="w-5 h-5 text-green-400" />
        ),
        description:
          method.paymentType === "PAYPAL"
            ? `PayPal: ${method.paypalEmail || "N/A"}`
            : `${method.bankName || "Ngân hàng"} - ${method.accountNumber || "N/A"}`,
        color: method.paymentType === "PAYPAL" ? "from-blue-600 to-cyan-700" : "from-green-600 to-emerald-700",
        paymentType: method.paymentType,
      })),
  ];

  const seatNames =
    selectedSeats?.seatIds
      ?.map((seatId) => selectedSeats.seatMap[seatId])
      .sort()
      .join(", ") || "Chưa chọn";

  return (
    <PayPalScriptProvider options={{ "client-id": PAYPAL_CLIENT_ID, currency: "USD" }}>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent
          className="max-w-5xl w-[95vw] max-h-[90vh] bg-gradient-to-br from-slate-950 via-gray-900 to-black border border-cyan-600/30 text-white p-0 overflow-hidden rounded-2xl shadow-2xl"
          aria-describedby="payment-description"
        >
          <DialogHeader className="p-6 pb-0 border-b border-cyan-600/20 bg-gradient-to-r from-slate-900/80 to-gray-900/80 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Thanh Toán Đặt Vé
                </DialogTitle>
                <DialogDescription
                  id="payment-description"
                  className="text-gray-300 text-sm mt-1 font-medium"
                >
                  Hoàn tất đơn hàng cho phim {movie.title} với suất chiếu {movie.selectedShowtime || "Chưa chọn"}.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex flex-col lg:flex-row overflow-y-auto max-h-[80vh]">
            <div className="flex-1 p-6 space-y-6">
              {error && (
                <div className="bg-red-900/50 border border-red-500/50 text-red-300 p-4 rounded-xl text-sm flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  {error}
                </div>
              )}

              {isLoading ? (
                <div className="flex justify-center items-center p-6">
                  <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  <div>
                    <h3 className="text-xl font-semibold mb-4 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                      Chọn Phương Thức Thanh Toán
                    </h3>

                    <RadioGroup
                      value={paymentMethod}
                      onValueChange={setPaymentMethod}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                      disabled={isProcessing || isVerifying}
                    >
                      {paymentMethods.map((method) => (
                        <div
                          key={method.id}
                          className={cn(
                            "flex items-center space-x-4 p-4 border rounded-xl transition-all duration-300 cursor-pointer backdrop-blur-md",
                            paymentMethod === method.id
                              ? `border-cyan-500 bg-gradient-to-r ${method.color}/25 shadow-lg shadow-cyan-500/10`
                              : "border-gray-700 hover:border-gray-500 hover:bg-gray-800/60",
                            (isProcessing || isVerifying) && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <RadioGroupItem value={method.id} id={method.id} disabled={isProcessing || isVerifying} />
                          <div
                            className={cn(
                              "p-3 rounded-lg",
                              paymentMethod === method.id
                                ? `bg-gradient-to-r ${method.color}`
                                : "bg-gray-800/50"
                            )}
                          >
                            {method.icon}
                          </div>
                          <div className="flex-1">
                            <Label
                              htmlFor={method.id}
                              className={cn(
                                "cursor-pointer font-semibold text-sm",
                                (isProcessing || isVerifying) && "cursor-not-allowed"
                              )}
                            >
                              {method.name}
                            </Label>
                            <div className="text-xs text-gray-300">{method.description}</div>
                          </div>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  {pendingOrders.length > 0 && (
                    <div className="bg-gradient-to-r from-slate-900/60 to-gray-900/60 backdrop-blur-md rounded-xl p-4 border border-slate-600/30">
                      <h4 className="font-semibold text-cyan-400 mb-2 text-sm">Đơn Hàng Đang Chờ Thanh Toán</h4>
                      {pendingOrders.map((order) => (
                        <div key={order.id} className="text-xs text-gray-300 space-y-1 mb-4">
                          <div>Mã đơn hàng: {order.id}</div>
                          <div>Phim: {order.booking.movie.title}</div>
                          <div>Rạp: {order.booking.cinema.name}</div>
                          <div>Phòng: {order.booking.room.numberRoom}</div>
                          <div>Ghế: {Object.keys(order.booking.seatId).join(", ")}</div>
                          <div>Tổng tiền: {order.totalPrice.toLocaleString()}đ</div>
                          <div>Trạng thái: {order.status}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {paymentMethod === "card" && !isLoading && (
                <div className="space-y-6 bg-gradient-to-r from-blue-900/20 to-indigo-900/20 backdrop-blur-md rounded-xl p-6 border border-blue-600/30">
                  <h4 className="text-lg font-semibold text-blue-400">Thông Tin Thẻ</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="cardNumber" className="text-gray-200 text-sm font-medium">
                        Số Thẻ
                      </Label>
                      <Input
                        id="cardNumber"
                        placeholder="1234 5678 9012 3456"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className={cn(
                          "bg-gray-900/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 h-12 rounded-lg",
                          formErrors.cardNumber && "border-red-500"
                        )}
                        disabled={isProcessing || isVerifying}
                      />
                      {formErrors.cardNumber && (
                        <p className="text-red-300 text-xs">{formErrors.cardNumber}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="expiry" className="text-gray-200 text-sm font-medium">
                          Ngày Hết Hạn
                        </Label>
                        <Input
                          id="expiry"
                          placeholder="MM/YY"
                          value={expiry}
                          onChange={(e) => setExpiry(e.target.value)}
                          className={cn(
                            "bg-gray-900/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 h-12 rounded-lg",
                            formErrors.expiry && "border-red-500"
                          )}
                          disabled={isProcessing || isVerifying}
                        />
                        {formErrors.expiry && (
                          <p className="text-red-300 text-xs">{formErrors.expiry}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cvv" className="text-gray-200 text-sm font-medium">
                          CVV
                        </Label>
                        <Input
                          id="cvv"
                          placeholder="123"
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value)}
                          className={cn(
                            "bg-gray-900/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 h-12 rounded-lg",
                            formErrors.cvv && "border-red-500"
                          )}
                          disabled={isProcessing || isVerifying}
                        />
                        {formErrors.cvv && (
                          <p className="text-red-300 text-xs">{formErrors.cvv}</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cardName" className="text-gray-200 text-sm font-medium">
                        Tên Chủ Thẻ
                      </Label>
                      <Input
                        id="cardName"
                        placeholder="NGUYEN VAN A"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        className={cn(
                          "bg-gray-900/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 h-12 rounded-lg",
                          formErrors.cardName && "border-red-500"
                        )}
                        disabled={isProcessing || isVerifying}
                      />
                      {formErrors.cardName && (
                        <p className="text-red-300 text-xs">{formErrors.cardName}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {(paymentMethod === "momo" || paymentMethod.startsWith("momo-")) && !isLoading && (
                <div className="text-center p-6 border border-pink-600/30 rounded-xl bg-gradient-to-r from-pink-900/20 to-rose-900/20 backdrop-blur-md">
                  <div className="bg-gradient-to-r from-pink-600 to-rose-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Smartphone className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-gray-200 mb-4 text-sm font-medium">
                    Quét mã QR bằng ứng dụng MoMo để thanh toán
                  </p>
                  {paymentMethod.startsWith("momo-") ? (
                    apiPaymentMethods
                      .filter((m) => m.id.toString() === paymentMethod.split("-")[1] && m.paymentType === "MOMO")
                      .map((method) => (
                        <div key={method.id}>
                          <div className="w-48 h-48 bg-white rounded-xl mx-auto flex items-center justify-center shadow-xl p-2">
                            <QRCode
                              value={`momo://pay?account=${method.accountNumber || "1234567890"}&amount=${finalTotal}`}
                              size={160}
                              bgColor="#ffffff"
                              fgColor="#000000"
                            />
                          </div>
                          <div className="mt-4 text-sm text-gray-300">
                            <p>Số tài khoản: <span className="font-semibold">{method.accountNumber || "1234567890"}</span></p>
                            <p>Số tiền: <span className="font-semibold">{finalTotal.toLocaleString()}đ</span></p>
                          </div>
                        </div>
                      ))
                  ) : (
                    <div>
                      <div className="w-48 h-48 bg-white rounded-xl mx-auto flex items-center justify-center shadow-xl p-2">
                        <QRCode
                          value={`momo://pay?account=1234567890&amount=${finalTotal}`}
                          size={160}
                          bgColor="#ffffff"
                          fgColor="#000000"
                        />
                      </div>
                      <div className="mt-4 text-sm text-gray-300">
                        <p>Số tài khoản: <span className="font-semibold">1234567890</span></p>
                        <p>Số tiền: <span className="font-semibold">{finalTotal.toLocaleString()}đ</span></p>
                      </div>
                    </div>
                  )}
                  {paymentMethod.startsWith("momo-") && apiPaymentMethods.every((m) => m.paymentType !== "MOMO") && (
                    <div className="text-red-300 text-sm mt-4">
                      Hiện tại không có phương thức MoMo nào khả dụng
                    </div>
                  )}
                </div>
              )}

              {paymentMethod.startsWith("banking-") && !isLoading && (
                <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 backdrop-blur-md p-6 rounded-xl border border-green-600/30">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-gradient-to-r from-green-600 to-emerald-700 p-3 rounded-lg">
                      <Building className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="font-semibold text-green-400 text-lg">Thông Tin Chuyển Khoản</h4>
                  </div>
                  <div className="space-y-4 text-sm">
                    {apiPaymentMethods
                      .filter((m) => m.id.toString() === paymentMethod.split("-")[1] && m.paymentType === "BANKING_VN")
                      .map((method) => (
                        <div key={method.id}>
                          <div className="flex justify-between">
                            <span className="text-gray-300">Ngân hàng:</span>
                            <span className="font-semibold">{method.bankName || "N/A"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">Số tài khoản:</span>
                            <span className="font-semibold">{method.accountNumber || "N/A"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">Chủ tài khoản:</span>
                            <span className="font-semibold">{method.name || "N/A"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">Nội dung:</span>
                            <span className="font-semibold">TICKET{movie.id}{Date.now()}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {paymentMethod.startsWith("paypal-") && !isLoading && (
                <div className="text-center p-6 border border-blue-600/30 rounded-xl bg-gradient-to-r from-blue-900/20 to-cyan-900/20 backdrop-blur-md">
                  <div className="bg-gradient-to-r from-blue-600 to-cyan-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Smartphone className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="text-lg font-semibold text-blue-400 mb-4">Thanh Toán PayPal</h4>
                  {apiPaymentMethods
                    .filter((m) => m.id.toString() === paymentMethod.split("-")[1] && m.paymentType === "PAYPAL")
                    .map((method) => (
                      <div key={method.id} className="text-sm text-gray-300 mb-4">
                        <p>Email PayPal: <span className="font-semibold">{method.paypalEmail || "N/A"}</span></p>
                        <p>Số tiền: <span className="font-semibold">{finalTotal.toLocaleString()}đ (~{(finalTotal / 25000).toFixed(2)} USD)</span></p>
                      </div>
                    ))}
                  <PayPalButtons
                    style={{ layout: "vertical" }}
                    disabled={isProcessing || isVerifying || !orderId}
                    createOrder={async (data, actions) => {
                      try {
                        if (!orderId) {
                          throw new Error("Order ID is missing");
                        }
                        const paymentId = parseInt(paymentMethod.split("-")[1]);
                        const paymentBody = {
                          id: paymentId,
                          orders: orderId,
                          paymentType: "PAYPAL"
                        };
                        const response = await makeApiCall(
                          `${API_BASE_URL}/api/payments?orders=${orderId}`,
                          "POST",
                          paymentBody,
                          localStorage.getItem("authToken")
                        );
                        if (!response.success || !response.data.approvalUrl) {
                          throw new Error(response.message || "Không thể khởi tạo thanh toán PayPal");
                        }
                        return response.data.orderID;
                      } catch (err) {
                        setError("Lỗi khi tạo đơn hàng PayPal: " + (err.message || "Lỗi không xác định"));
                        toast({
                          title: "Lỗi",
                          description: err.message || "Lỗi khi tạo đơn hàng PayPal",
                          variant: "destructive",
                        });
                        throw err;
                      }
                    }}
                    onApprove={async (data, actions) => {
                      try {
                        const response = await makeApiCall(
                          `${API_BASE_URL}/api/payments/paypal/success`,
                          "POST",
                          { paymentId: data.paymentID, PayerID: data.payerID, orderId },
                          localStorage.getItem("authToken")
                        );
                        if (response.success) {
                          onSuccess();
                        } else {
                          throw new Error(response.message || "Xác nhận thanh toán PayPal thất bại");
                        }
                      } catch (err) {
                        setError("Lỗi khi xác nhận thanh toán PayPal: " + (err.message || "Lỗi không xác định"));
                        toast({
                          title: "Lỗi",
                          description: err.message || "Lỗi khi xác nhận thanh toán PayPal",
                          variant: "destructive",
                        });
                      }
                    }}
                    onCancel={async () => {
                      try {
                        if (orderId) {
                          await makeApiCall(
                            `${API_BASE_URL}/api/payments/paypal/cancel`,
                            "POST",
                            { orderId },
                            localStorage.getItem("authToken")
                          );
                        }
                        setError("Thanh toán PayPal đã bị hủy");
                        toast({
                          title: "Hủy Thanh Toán",
                          description: "Thanh toán PayPal đã bị hủy",
                          variant: "destructive",
                        });
                      } catch (err) {
                        console.error("PayPal cancel error:", err);
                      }
                    }}
                    onError={(err) => {
                      setError("Lỗi thanh toán PayPal: " + (err.message || "Lỗi không xác định"));
                      toast({
                        title: "Lỗi",
                        description: err.message || "Lỗi thanh toán PayPal",
                        variant: "destructive",
                      });
                      console.error("PayPal error:", err);
                    }}
                  />
                </div>
              )}

              {paymentMethod === "cod" && !isLoading && (
                <div className="text-center p-6 border border-amber-600/30 rounded-xl bg-gradient-to-r from-amber-900/20 to-yellow-900/20 backdrop-blur-md">
                  <div className="bg-gradient-to-r from-amber-600 to-yellow-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <HandCoins className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-gray-200 mb-4 text-sm font-medium">
                    Thanh toán bằng tiền mặt tại quầy vé của rạp
                  </p>
                  <div className="text-sm text-gray-300">
                    <p>Số tiền: <span className="font-semibold">{finalTotal.toLocaleString()}đ</span></p>
                    <p className="mt-2">Vui lòng chuẩn bị đủ tiền mặt và đến sớm để hoàn tất thanh toán</p>
                  </div>
                </div>
              )}

              {!isLoading && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-600/40 rounded-xl p-4 backdrop-blur-md">
                    <div className="flex items-center gap-3 text-green-400 text-sm">
                      <Shield className="w-5 h-5" />
                      <span>Thanh toán an toàn với mã hóa SSL 256-bit</span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-orange-900/30 to-amber-900/30 border border-orange-600/40 rounded-xl p-4 backdrop-blur-md">
                    <div className="flex items-center gap-3 text-orange-400 text-sm">
                      <Clock className="w-5 h-5" />
                      <span>
                        Hoàn tất thanh toán trong {Math.floor(timeLeft / 60)}:
                        {(timeLeft % 60).toString().padStart(2, "0")}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="w-full lg:w-96 bg-gradient-to-br from-slate-900/50 to-gray-900/50 backdrop-blur-md border-l border-cyan-600/20 p-6">
              <h3 className="text-xl font-semibold mb-4 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Chi Tiết Đơn Hàng
              </h3>

              <div className="bg-gradient-to-r from-slate-900/60 to-gray-900/60 backdrop-blur-md rounded-xl p-4 mb-4 border border-slate-600/30">
                <h4 className="font-semibold text-cyan-400 mb-2 text-sm">{movie.title}</h4>
                <div className="text-xs text-gray-300 space-y-1">
                  <div>Rạp {movie.cinema?.name || "Unknown"} - Suất {movie.selectedShowtime || "Chưa chọn"}</div>
                  <div>Ngày: {new Date().toLocaleDateString("vi-VN")}</div>
                  <div>Ghế: {seatNames}</div>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 backdrop-blur-md rounded-xl p-4 border border-purple-600/30">
                  <h5 className="font-medium mb-3 text-purple-400 text-sm">Chi Tiết Giá</h5>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Vé xem phim ({selectedSeats?.seatIds?.length || 0} ghế):</span>
                      <span className="font-medium">{seatPrice.toLocaleString()}đ</span>
                    </div>
                    {selectedFood.length > 0 && (
                      <>
                        <Separator className="bg-gray-600/50 my-2" />
                        <div className="text-purple-400 font-medium">Đồ Ăn & Nước Uống:</div>
                        {selectedFood.map((item) => (
                          <div key={item.id} className="flex justify-between pl-2">
                            <span className="text-gray-300">
                              {item.name} x{item.quantity}
                            </span>
                            <span className="font-medium">{(item.price * item.quantity).toLocaleString()}đ</span>
                          </div>
                        ))}
                        <div className="flex justify-between font-medium">
                          <span className="text-gray-300">Tổng đồ ăn:</span>
                          <span>{foodPrice.toLocaleString()}đ</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="bg-gradient-to-r from-cyan-900/40 via-blue-900/40 to-purple-900/40 backdrop-blur-md rounded-xl p-4 border border-cyan-600/30">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-lg">Tổng Cộng:</span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                      {finalTotal.toLocaleString()}đ
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  className={cn(
                    "w-full bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-500 hover:to-emerald-600 text-white border-0 h-12 shadow-lg hover:shadow-green-500/30 transition-all duration-300 hover:scale-[1.02] rounded-lg font-semibold",
                    (isProcessing || isVerifying) && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={verifyBooking}
                  disabled={isProcessing || isVerifying}
                >
                  {isVerifying ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Đang xác thực...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Xác Thực Thông Tin
                    </div>
                  )}
                </Button>
                {orderId && (
                  <Button
                    className={cn(
                      "w-full bg-gradient-to-r from-amber-600 to-yellow-700 hover:from-amber-500 hover:to-yellow-600 text-white border-0 h-12 shadow-lg hover:shadow-amber-500/30 transition-all duration-300 hover:scale-[1.02] rounded-lg font-semibold",
                      (isProcessing || isVerifying) && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={handlePayLater}
                    disabled={isProcessing || isVerifying}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Thanh Toán Sau
                    </div>
                  </Button>
                )}
                {!paymentMethod.startsWith("paypal-") && (
                  <Button
                    className={cn(
                      "w-full bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-700 hover:from-cyan-500 hover:via-blue-500 hover:to-purple-600 text-white border-0 h-12 shadow-lg hover:shadow-cyan-500/30 transition-all duration-300 hover:scale-[1.02] rounded-lg font-semibold",
                      (isProcessing || isVerifying || !orderId) && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={handlePayment}
                    disabled={isProcessing || isVerifying || !orderId}
                  >
                    {isProcessing ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Đang xử lý...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        Thanh Toán {finalTotal.toLocaleString()}đ
                      </div>
                    )}
                  </Button>
                )}
                <Button
                  className={cn(
                    "w-full border-gray-600 text-gray-300 hover:bg-gray-700/80 hover:text-white h-12 text-sm transition-all duration-300 hover:scale-[1.02] rounded-lg font-medium",
                    (isProcessing || isVerifying) && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={onClose}
                  disabled={isProcessing || isVerifying}
                >
                  Hủy Bỏ
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PayPalScriptProvider>
  );
}