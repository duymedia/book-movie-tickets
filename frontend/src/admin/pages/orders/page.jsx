
import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import {
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Download,
  Calendar,
  User,
  Film,
  MapPin,
  Clock,
  Plus,
  ShoppingCart,
  RefreshCw,
  X,
  FileText,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@radix-ui/react-select";
import { Save, Loader2 } from "lucide-react";
import axios from "axios";
import QRCode from "react-qr-code";
import { useToast } from "../../hooks/use-toast";
import { Toaster } from "../../components/ui/toaster";
import PropTypes from "prop-types";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver"; // Ensure file-saver is installed: npm install file-saver

// Error Boundary Component
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1 className="text-center text-sm text-red-500">Đã xảy ra lỗi. Vui lòng thử lại.</h1>;
    }
    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
};

// Shared Excel Export Utility
const exportToExcel = (data, fileName, setLoadingState, toast) => {
  setLoadingState(true);
  try {
    const exportData = data.map((order) => ({
      "Mã đơn hàng": order.id,
      "Mã Booking": order.booking?.id || "N/A",
      "Khách hàng": order.booking?.user?.name || "N/A",
      "Số điện thoại": order.booking?.user?.phone || "N/A",
      "Email": order.booking?.user?.email || "N/A",
      "Mã phim": order.booking?.movie?.id || "N/A",
      "Tên phim": order.booking?.movie?.title || "N/A",
      "Thể loại phim": order.booking?.movie?.category || "N/A",
      "Mã rạp": order.booking?.cinema?.id || "N/A",
      "Tên rạp": order.booking?.cinema?.name || "N/A",
      "Địa chỉ rạp": order.booking?.cinema?.address || "N/A",
      "Mã phòng": order.booking?.room?.id || "N/A",
      "Phòng chiếu": order.booking?.room?.numberRoom || "N/A",
      "Suất chiếu": order.booking?.showtimes?.[0]?.timeStart || order.booking?.bookingTime || "N/A",
      "Mã suất chiếu": order.booking?.showtimeId || "N/A",
      "Ghế": Object.keys(order.booking?.seatId || {}).filter((key) => order.booking.seatId[key]).join(", ") || "N/A",
      "Vé": Object.keys(order.booking?.ticketId || {}).filter((key) => order.booking.ticketId[key]).join(", ") || "N/A",
      "Số lượng vé": Object.values(order.booking?.amount || {}).reduce((a, b) => a + b, 0) || 0,
      "Combo": order.booking?.comboId !== 0 ? `Combo ${order.booking.comboId}` : "Không có",
      "Phương thức thanh toán": order.payment?.paymentMethod || "N/A",
      "Ngân hàng": order.payment?.bankName || "N/A",
      "Tổng tiền": new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(order.totalPrice || 0),
      "Trạng thái": order.status || "N/A",
      "Ngày đặt": order.createdAt ? new Date(order.createdAt).toLocaleString("vi-VN") : "N/A",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");

    // Apply basic styling
    worksheet["!cols"] = exportData[0] ? Object.keys(exportData[0]).map(() => ({ wch: 15 })) : [];
    if (worksheet["!rows"]) worksheet["!rows"][0] = { hpt: 20 };

    // Write file and save using FileSaver
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, fileName);

    toast({ description: `Xuất file Excel thành công: ${fileName}` });
  } catch (error) {
    console.error("Error exporting Excel:", error.message);
    toast({
      variant: "destructive",
      description: "Lỗi khi xuất file Excel. Vui lòng kiểm tra trình duyệt hoặc cài đặt.",
    });
  } finally {
    setLoadingState(false);
  }
};

// Order Detail Modal
const OrderDetailModal = ({ order, isOpen, onClose }) => {
  const { toast } = useToast();
  const [exportLoading, setExportLoading] = useState(false);

  if (!order || !order.booking) return null;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount || 0);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "COMPLETED":
        return <Badge className="bg-green-100 text-green-800">Hoàn thành</Badge>;
      case "PENDING":
        return <Badge className="bg-yellow-100 text-yellow-800">Đang xử lý</Badge>;
      case "CANCELLED":
        return <Badge className="bg-red-100 text-red-800">Đã hủy</Badge>;
      default:
        return <Badge variant="secondary">{status || "N/A"}</Badge>;
    }
  };

  const handleExportSingleOrder = () => {
    exportToExcel([order], `order_${order.id}.xlsx`, setExportLoading, toast);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="flex justify-between items-center">
          <DialogTitle className="flex items-center gap-2 text-base">
            <ShoppingCart className="h-4 w-4" />
            Chi tiết đơn hàng: #{order.id}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          <div className="bg-white border border-gray-200 rounded-md p-3">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1 mb-2">
              <FileText className="h-4 w-4" />
              Thông tin đơn hàng
            </h3>
            <div className="space-y-1">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-gray-500">Mã đơn hàng</Label>
                <p className="text-sm">#{order.id}</p>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-gray-500">Mã Booking</Label>
                <p className="text-sm">{order.booking.id}</p>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-gray-500">Ngày đặt</Label>
                <p className="text-sm">{order.createdAt || "N/A"}</p>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-gray-500">Trạng thái</Label>
                <p className="text-sm">{getStatusBadge(order.status)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-md p-3">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1 mb-2">
              <User className="h-4 w-4" />
              Thông tin khách hàng
            </h3>
            <div className="space-y-1">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-gray-500">Tên</Label>
                <p className="text-sm">{order.booking.user?.name || "N/A"}</p>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-gray-500">Số điện thoại</Label>
                <p className="text-sm">{order.booking.user?.phone || "N/A"}</p>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-gray-500">Email</Label>
                <p className="text-sm">{order.booking.user?.email || "N/A"}</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-md p-3">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1 mb-2">
              <Film className="h-4 w-4" />
              Thông tin phim và rạp
            </h3>
            <div className="space-y-1">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-gray-500">Phim</Label>
                <p className="text-sm">{order.booking.movie?.title || "N/A"} (ID: {order.booking.movie?.id || "N/A"})</p>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-gray-500">Thể loại</Label>
                <p className="text-sm">{order.booking.movie?.category || "N/A"}</p>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-gray-500">Rạp chiếu</Label>
                <p className="text-sm">{order.booking.cinema?.name || "N/A"} (ID: {order.booking.cinema?.id || "N/A"})</p>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-gray-500">Địa chỉ rạp</Label>
                <p className="text-sm">{order.booking.cinema?.address || "N/A"}</p>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-gray-500">Phòng chiếu</Label>
                <p className="text-sm">{order.booking.room?.numberRoom || "N/A"} (ID: {order.booking.room?.id || "N/A"})</p>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-gray-500">Suất chiếu</Label>
                <p className="text-sm">{order.booking.showtimes?.[0]?.timeStart || order.booking.bookingTime || "N/A"} (ID: {order.booking.showtimeId || "N/A"})</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-md p-3">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1 mb-2">
              <ShoppingCart className="h-4 w-4" />
              Thông tin vé và thanh toán
            </h3>
            <div className="space-y-1">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-gray-500">Ghế</Label>
                <p className="text-sm">{Object.keys(order.booking.seatId || {}).filter((key) => order.booking.seatId[key]).join(", ") || "N/A"}</p>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-gray-500">Vé</Label>
                <p className="text-sm">
                  {Object.keys(order.booking.ticketId || {}).filter((key) => order.booking.ticketId[key]).join(", ") || "N/A"} (Số lượng: {Object.values(order.booking.amount || {}).reduce((a, b) => a + b, 0) || 0})
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-gray-500">Combo</Label>
                <p className="text-sm">{order.booking.comboId !== 0 ? `Combo ${order.booking.comboId}` : "Không có"}</p>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-gray-500">Phương thức thanh toán</Label>
                <p className="text-sm">{order.payment?.paymentMethod || "N/A"} ({order.payment?.bankName || "N/A"})</p>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-gray-500">Tổng tiền</Label>
                <p className="text-sm font-semibold text-green-600">{formatCurrency(order.totalPrice)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-300 rounded-md p-3 flex justify-center shadow-sm">
            <div>
              <h4 className="text-sm font-bold text-blue-600 text-center mb-2">Mã QR (Booking ID: {order.booking.id})</h4>
              <div className="p-3 bg-white rounded-md border border-gray-300 relative shadow-sm">
                <QRCode
                  value={order.booking.id.toString()}
                  size={120}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="Q"
                  renderAs="svg"
                />
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 opacity-70" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleExportSingleOrder}
              className="text-sm"
              disabled={exportLoading}
            >
              {exportLoading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-1" />
              )}
              Export Excel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

OrderDetailModal.propTypes = {
  order: PropTypes.shape({
    id: PropTypes.number.isRequired,
    booking: PropTypes.shape({
      id: PropTypes.number.isRequired,
      user: PropTypes.shape({
        name: PropTypes.string,
        phone: PropTypes.string,
        email: PropTypes.string,
      }),
      movie: PropTypes.shape({
        id: PropTypes.number,
        title: PropTypes.string,
        category: PropTypes.string,
      }),
      cinema: PropTypes.shape({
        id: PropTypes.number,
        name: PropTypes.string,
        address: PropTypes.string,
      }),
      room: PropTypes.shape({
        id: PropTypes.number,
        numberRoom: PropTypes.string,
      }),
      showtimes: PropTypes.array,
      showtimeId: PropTypes.number,
      bookingTime: PropTypes.string,
      seatId: PropTypes.object,
      ticketId: PropTypes.object,
      amount: PropTypes.object,
      comboId: PropTypes.number,
    }).isRequired,
    payment: PropTypes.shape({
      paymentMethod: PropTypes.string,
      bankName: PropTypes.string,
    }),
    totalPrice: PropTypes.number,
    status: PropTypes.string,
    createdAt: PropTypes.string,
  }),
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

// Add/Edit Order Modal
const OrderModal = ({ order, isOpen, onClose, onSave, isEdit = false }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    bookingId: "",
    totalAmount: "",
    status: "PENDING",
    paymentMethod: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (order && isEdit) {
      setFormData({
        bookingId: order.booking.id.toString() || "",
        totalAmount: order.totalPrice?.toString() || "",
        status: order.status || "PENDING",
        paymentMethod: order.payment?.paymentMethod || "",
      });
    } else {
      setFormData({
        bookingId: "",
        totalAmount: "",
        status: "PENDING",
        paymentMethod: "",
      });
    }
  }, [order, isEdit, isOpen]);

  const handleSave = async () => {
    if (!formData.bookingId || !formData.totalAmount || !formData.paymentMethod) {
      toast({
        variant: "destructive",
        description: "Vui lòng điền đầy đủ các trường bắt buộc.",
      });
      return;
    }
    setSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      onSave(formData);
      toast({ description: isEdit ? "Cập nhật đơn hàng thành công!" : "Tạo đơn hàng mới thành công!" });
    } catch (error) {
      console.error("Error saving order:", error.message);
      toast({
        variant: "destructive",
        description: "Lỗi khi lưu đơn hàng. Vui lòng thử lại.",
      });
    } finally {
      setSaving(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ShoppingCart className="h-4 w-4" />
            {isEdit ? "Chỉnh sửa đơn hàng" : "Thêm đơn hàng mới"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bookingId" className="text-xs">Mã Booking <span className="text-red-600">*</span></Label>
              <Input
                id="bookingId"
                value={formData.bookingId}
                onChange={(e) => setFormData({ ...formData, bookingId: e.target.value })}
                placeholder="Mã booking"
                required
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="totalAmount" className="text-xs">Tổng tiền <span className="text-red-600">*</span></Label>
              <Input
                id="totalAmount"
                type="number"
                value={formData.totalAmount}
                onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                placeholder="200000"
                required
                className="text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status" className="text-xs">Trạng thái</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING" className="text-sm">Đang xử lý</SelectItem>
                  <SelectItem value="COMPLETED" className="text-sm">Hoàn thành</SelectItem>
                  <SelectItem value="CANCELLED" className="text-sm">Đã hủy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="paymentMethod" className="text-xs">Phương thức thanh toán <span className="text-red-600">*</span></Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Chọn phương thức" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VCB" className="text-sm">VCB</SelectItem>
                  <SelectItem value="Chuyển khoản" className="text-sm">Chuyển khoản</SelectItem>
                  <SelectItem value="Ví điện tử" className="text-sm">Ví điện tử</SelectItem>
                  <SelectItem value="Tiền mặt" className="text-sm">Tiền mặt</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button onClick={onClose} variant="outline" className="flex-1 text-sm">
              <X className="h-4 w-4 mr-1" />
              Hủy
            </Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1 text-sm">
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              {saving ? "Đang lưu..." : "Lưu"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

OrderModal.propTypes = {
  order: PropTypes.shape({
    id: PropTypes.number,
    booking: PropTypes.shape({
      id: PropTypes.number,
    }),
    payment: PropTypes.shape({
      paymentMethod: PropTypes.string,
    }),
    totalPrice: PropTypes.number,
    status: PropTypes.string,
  }),
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  isEdit: PropTypes.bool,
};

// Main Orders Component
export default function Orders() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [orders, setOrders] = useState([]);
  const [clickTimeout, setClickTimeout] = useState(null);

  // Fetch orders from API
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const authToken = localStorage.getItem("authToken");
      if (!authToken) {
        throw new Error("No auth token found");
      }

      const response = await axios.get("http://localhost:8080/api/admin/orders", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      console.log("API Response:", response.data);

      const apiOrders = Array.isArray(response.data) ? response.data : [response.data].filter(Boolean);
      const validOrders = apiOrders.filter((order) => order && order.id);
      console.log("Valid Orders:", validOrders);

      setOrders(validOrders);
      if (validOrders.length === 0) {
        toast({
          variant: "destructive",
          description: "Không có đơn hàng nào được tải. Kiểm tra API hoặc token.",
        });
      }
    } catch (error) {
      console.error("Error fetching orders:", error.message);
      toast({
        variant: "destructive",
        description: "Không thể tải danh sách đơn hàng. Kiểm tra kết nối hoặc token.",
      });
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchOrders();
    return () => setOrders([]);
  }, [fetchOrders]);

  const filteredOrders = orders.filter(
    (order) =>
      order.id.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.booking?.user?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.booking?.movie?.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.booking?.cinema?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  console.log("Filtered Orders:", filteredOrders);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount || 0);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "COMPLETED":
        return <Badge className="bg-green-100 text-green-800">Hoàn thành</Badge>;
      case "PENDING":
        return <Badge className="bg-yellow-100 text-yellow-800">Đang xử lý</Badge>;
      case "CANCELLED":
        return <Badge className="bg-red-100 text-red-800">Đã hủy</Badge>;
      default:
        return <Badge variant="secondary">{status || "N/A"}</Badge>;
    }
  };

  const handleViewDetail = useCallback(
    (order) => {
      if (clickTimeout) {
        clearTimeout(clickTimeout);
      }

      if (!order) {
        console.error("Order is null or undefined");
        toast({
          variant: "destructive",
          description: "Đơn hàng không hợp lệ: Thiếu thông tin đơn hàng.",
        });
        return;
      }

      if (!order.booking || !order.booking.id) {
        console.error("Missing booking or booking ID:", order);
        toast({
          variant: "destructive",
          description: "Đơn hàng không hợp lệ: Thiếu thông tin đặt vé.",
        });
        return;
      }

      const timeout = setTimeout(() => {
        setSelectedOrder(order);
        setShowDetailModal(true);
      }, 100);

      setClickTimeout(timeout);
    },
    [clickTimeout, toast]
  );

  const handleEditOrder = (order) => {
    if (order && order.booking) {
      setEditingOrder(order);
      setShowEditModal(true);
    } else {
      console.error("Invalid order for editing:", order);
      toast({
        variant: "destructive",
        description: "Đơn hàng không hợp lệ để chỉnh sửa.",
      });
    }
  };

  const handleSaveOrder = async (formData) => {
    try {
      const authToken = localStorage.getItem("authToken");
      if (!authToken) {
        throw new Error("No auth token found");
      }

      const orderData = {
        booking: {
          id: parseInt(formData.bookingId),
        },
        totalPrice: parseFloat(formData.totalAmount),
        status: formData.status,
        payment: {
          paymentMethod: formData.paymentMethod,
        },
      };

      let response;
      if (editingOrder) {
        response = await axios.put(`http://localhost:8080/api/admin/orders/${editingOrder.id}`, orderData, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        setOrders(orders.map((o) => (o.id === editingOrder.id ? response.data : o)));
        toast({ description: "Cập nhật đơn hàng thành công!" });
      } else {
        response = await axios.post("http://localhost:8080/api/admin/orders", orderData, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        setOrders([...orders, response.data]);
        toast({ description: "Tạo đơn hàng mới thành công!" });
      }
    } catch (error) {
      console.error("Error saving order:", error.message);
      toast({
        variant: "destructive",
        description: "Lỗi khi lưu đơn hàng. Vui lòng thử lại.",
      });
    }
  };

  const handleExportExcel = () => {
    exportToExcel(filteredOrders, "orders.xlsx", setExportLoading, toast);
  };

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <Toaster />
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">Quản lý đơn hàng</h1>
              <p className="text-blue-100 text-sm">Tổng số đơn hàng: {filteredOrders.length}</p>
            </div>
            <div className="mt-4 md:mt-0 flex gap-2">
              <Button
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-sm"
                onClick={fetchOrders}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
                Làm mới
              </Button>
              <Button
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-sm"
                onClick={handleExportExcel}
                disabled={exportLoading || filteredOrders.length === 0}
              >
                {exportLoading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-1" />
                )}
                Xuất Excel
              </Button>
            </div>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Tìm kiếm theo mã đơn, khách hàng, phim hoặc rạp..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-sm"
                />
              </div>
              <Button variant="outline" className="text-sm">
                <Filter className="h-4 w-4 mr-1" />
                Bộ lọc
              </Button>
            </div>
          </CardContent>
        </Card>
        {loading ? (
          <div className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-gray-600 text-sm">
              Không tìm thấy đơn hàng nào. Vui lòng kiểm tra API hoặc xóa bộ lọc.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <Card key={order.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-gray-900 dark:text-slate-100 text-sm line-clamp-2">#{order.id}</h3>
                          {getStatusBadge(order.status)}
                        </div>
                        <div className="text-xs text-gray-600">
                          <Calendar className="h-3 w-3 inline mr-1" />
                          {order.createdAt || "N/A"}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center text-xs">
                            <User className="h-3 w-3 mr-2 text-gray-400" />
                            <span className="font-medium">Khách hàng:</span>
                            <span className="ml-1 text-gray-600">{order.booking?.user?.name || "N/A"}</span>
                          </div>
                          <div className="text-xs">
                            <span className="font-medium">SĐT:</span>
                            <span className="ml-1 text-gray-600">{order.booking?.user?.phone || "N/A"}</span>
                          </div>
                          <div className="text-xs">
                            <span className="font-medium">Email:</span>
                            <span className="ml-1 text-gray-600">{order.booking?.user?.email || "N/A"}</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center text-xs">
                            <Film className="h-3 w-3 mr-2 text-gray-400" />
                            <span className="font-medium">Phim:</span>
                            <span className="ml-1 text-gray-600">{order.booking?.movie?.title || "N/A"} (ID: {order.booking?.movie?.id || "N/A"})</span>
                          </div>
                          <div className="text-xs">
                            <span className="font-medium">Thể loại:</span>
                            <span className="ml-1 text-gray-600">{order.booking?.movie?.category || "N/A"}</span>
                          </div>
                          <div className="text-xs">
                            <span className="font-medium">Rạp:</span>
                            <span className="ml-1 text-gray-600">{order.booking?.cinema?.name || "N/A"} (ID: {order.booking?.cinema?.id || "N/A"})</span>
                          </div>
                          <div className="text-xs">
                            <span className="font-medium">Phòng:</span>
                            <span className="ml-1 text-gray-600">{order.booking?.room?.numberRoom || "N/A"} (ID: {order.booking?.room?.id || "N/A"})</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center text-xs">
                            <Clock className="h-3 w-3 inline mr-2 text-gray-400" />
                            <span className="font-medium">Suất chiếu:</span>
                            <span className="ml-1 text-gray-600">{order.booking?.showtimes?.[0]?.timeStart || order.booking?.bookingTime || "N/A"}</span>
                          </div>
                          <div className="text-xs">
                            <span className="font-medium">Ghế:</span>
                            <span className="ml-1 text-gray-600">
                              {Object.keys(order.booking?.seatId || {}).filter((key) => order.booking?.seatId[key]).join(", ") || "N/A"}
                            </span>
                          </div>
                          <div className="text-xs">
                            <span className="font-medium">Vé:</span>
                            <span className="ml-1 text-gray-600">
                              {Object.keys(order.booking?.ticketId || {}).filter((key) => order.booking?.ticketId[key]).join(", ") || "N/A"}
                            </span>
                          </div>
                          <div className="text-xs">
                            <span className="font-medium">Combo:</span>
                            <span className="ml-1 text-gray-600">{order.booking?.comboId !== 0 ? `Combo ${order.booking.comboId}` : "Không có"}</span>
                          </div>
                          <div className="text-xs">
                            <span className="font-medium">Thanh toán:</span>
                            <span className="ml-1 text-gray-600">{order.payment?.paymentMethod || "N/A"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-2">
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900 dark:text-slate-100 line-clamp-2">
                          {formatCurrency(order.totalPrice)}
                        </p>
                        <p className="text-xs text-gray-600">Tổng tiền</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="text-sm">
                            <MoreHorizontal className="h-4 w-4 mr-1" />
                            Thao tác
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetail(order)} className="text-sm">
                            <Eye className="h-4 w-4 mr-1" />
                            Xem chi tiết
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-sm">
                            <Download className="h-4 w-4 mr-1" />
                            In vé
                          </DropdownMenuItem>
                          {order.status === "PENDING" && (
                            <>
                              <DropdownMenuItem className="text-green-600 text-sm">Xác nhận đơn hàng</DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600 text-sm">Hủy đơn hàng</DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {selectedOrder && selectedOrder.booking && (
          <OrderDetailModal
            order={selectedOrder}
            isOpen={showDetailModal}
            onClose={() => {
              setShowDetailModal(false);
              setSelectedOrder(null);
            }}
          />
        )}
        {showAddModal && (
          <OrderModal
            isOpen={showAddModal}
            onClose={() => setShowAddModal(false)}
            onSave={handleSaveOrder}
            isEdit={false}
          />
        )}
        {showEditModal && editingOrder && (
          <OrderModal
            order={editingOrder}
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setEditingOrder(null);
            }}
            onSave={handleSaveOrder}
            isEdit={true}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}