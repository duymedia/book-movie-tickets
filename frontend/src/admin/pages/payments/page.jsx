import { useState, useEffect, useMemo, useCallback, Component } from "react";
import axios from "axios";
import { debounce } from "lodash";
import DOMPurify from "dompurify";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { useToast } from "../../hooks/use-toast";
import { Toaster } from "../../components/ui/toaster";
import {
  Search,
  MoreHorizontal,
  Eye,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  Banknote,
  TrendingUp,
  Plus,
  Edit,
  Save,
  X,
  Loader2,
  DollarSign,
  Trash,
  RotateCcw,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";

// Base API URL
const API_URL = "http://localhost:8080/api";

// Danh sách ngân hàng Việt Nam
const VIETNAM_BANKS = [
  { value: "ACB", label: "Ngân hàng Á Châu (ACB)" },
  { value: "MBBANK", label: "Ngân hàng Quân đội (MB Bank)" },
  { value: "VCB", label: "Ngân hàng Ngoại thương Việt Nam (Vietcombank)" },
  { value: "VTB", label: "Ngân hàng Việt Nam Thịnh Vượng (VPBank)" },
  { value: "TPBANK", label: "Ngân hàng Tiên Phong (TPBank)" },
  { value: "SACOMBANK", label: "Ngân hàng Sài Gòn Thương Tín (Sacombank)" },
  { value: "TECHCOMBANK", label: "Ngân hàng Kỹ Thương (Techcombank)" },
];

// Error Boundary Component
class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center text-red-600">
          <p>Đã xảy ra lỗi. Vui lòng thử lại sau.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// Loading Skeleton Component
const PaymentSkeleton = () => (
  <Card className="border-0 shadow-lg">
    <CardContent className="p-6">
      <div className="animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-gray-200 rounded" />
            <div className="w-20 h-4 bg-gray-200 rounded" />
            <div className="w-16 h-6 bg-gray-200 rounded-full" />
          </div>
          <div className="w-24 h-4 bg-gray-200 rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="w-full h-4 bg-gray-200 rounded" />
            <div className="w-3/4 h-4 bg-gray-200 rounded" />
            <div className="w-5/6 h-4 bg-gray-200 rounded" />
          </div>
          <div className="space-y-2">
            <div className="w-full h-4 bg-gray-200 rounded" />
            <div className="w-2/3 h-4 bg-gray-200 rounded" />
            <div className="w-4/5 h-4 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Payment Detail Modal
const PaymentDetailModal = ({ payment, isOpen, onClose }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-xl bg-gradient-to-br from-white to-gray-100 shadow-lg rounded-2xl mx-auto transition-all duration-300 ease-in-out transform">
      <div className="p-5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-gray-800">
            <CreditCard className="h-6 w-6 text-blue-600" />
            Chi tiết phương thức thanh toán #{payment?.id}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Loại thanh toán</label>
                <p className="text-lg font-semibold text-gray-900">{payment?.paymentType || "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Phương thức thanh toán</label>
                <p className="text-lg font-semibold text-gray-900">{payment?.paymentMethod || "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Tên</label>
                <p className="text-lg font-semibold text-gray-900">{payment?.name || "N/A"}</p>
              </div>
            </div>
            <div className="space-y-4">
              {payment?.paymentType === "BANKING_VN" && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Chủ tài khoản</label>
                    <p className="text-lg font-semibold text-gray-900">{payment?.accountHolder || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Tên ngân hàng</label>
                    <p className="text-lg font-semibold text-gray-900">{payment?.bankName || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Số tài khoản</label>
                    <p className="text-lg font-semibold text-gray-900">{payment?.accountNumber || "N/A"}</p>
                  </div>
                </>
              )}
              {payment?.paymentType === "PAYPAL" && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Email PayPal</label>
                  <p className="text-lg font-semibold text-gray-900">{payment?.paypalEmail || "N/A"}</p>
                </div>
              )}
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h4 className="font-medium mb-2 text-gray-800">Trạng thái</h4>
            <p className="text-sm text-gray-600">{payment?.status || "N/A"}</p>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);

// Add/Edit Payment Modal
const PaymentModal = ({ payment, isOpen, onClose, onSave, isEdit = false }) => {
  const initialFormData = {
    paymentType: "",
    paymentMethod: "",
    name: "",
    bankName: "",
    accountNumber: "",
    accountHolder: "",
    paypalEmail: "",
    status: "Active",
  };

  const [formData, setFormData] = useState(initialFormData);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      if (isEdit && payment) {
        setFormData({
          paymentType: payment.paymentType || "",
          paymentMethod: payment.paymentMethod || "",
          name: payment.name || "",
          bankName: payment.bankName || "",
          accountNumber: payment.accountNumber || "",
          accountHolder: payment.accountHolder || "",
          paypalEmail: payment.paypalEmail || "",
          status: payment.status || "Active",
        });
        setErrors({});
      } else {
        setFormData(initialFormData);
        setErrors({});
      }
    }
  }, [isOpen, isEdit, payment]);

  useEffect(() => {
    if (formData.paymentType !== "BANKING_VN") {
      setFormData((prev) => ({ ...prev, bankName: "", accountNumber: "", accountHolder: "" }));
    }
    if (formData.paymentType !== "PAYPAL") {
      setFormData((prev) => ({ ...prev, paypalEmail: "" }));
    }
  }, [formData.paymentType]);

  const getPaymentMethods = () => {
    switch (formData.paymentType) {
      case "BANKING_VN":
        return VIETNAM_BANKS;
      case "PAYPAL":
        return [{ value: "PayPal", label: "PayPal" }];
      default:
        return [];
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.paymentType) newErrors.paymentType = "Loại thanh toán là bắt buộc";
    if (!formData.paymentMethod) newErrors.paymentMethod = "Phương thức thanh toán là bắt buộc";
    if (!formData.name) newErrors.name = "Tên là bắt buộc";

    if (formData.paymentType === "BANKING_VN") {
      if (!formData.bankName) newErrors.bankName = "Tên ngân hàng là bắt buộc";
      if (!formData.accountNumber) newErrors.accountNumber = "Số tài khoản là bắt buộc";
      else if (!/^\d{8,20}$/.test(formData.accountNumber)) {
        newErrors.accountNumber = "Số tài khoản phải là số từ 8 đến 20 chữ số";
      }
      if (!formData.accountHolder) newErrors.accountHolder = "Chủ tài khoản là bắt buộc";
    }

    if (formData.paymentType === "PAYPAL") {
      if (!formData.paypalEmail) newErrors.paypalEmail = "Email PayPal là bắt buộc";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.paypalEmail)) {
        newErrors.paypalEmail = "Email PayPal không hợp lệ";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!validateForm()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng kiểm tra và điền đầy đủ các trường bắt buộc",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
      toast({
        title: "Thành công",
        description: isEdit ? "Cập nhật phương thức thanh toán thành công" : "Tạo phương thức thanh toán thành công",
      });
      setFormData(initialFormData);
      setErrors({});
      onClose();
    } catch (err) {
      toast({
        title: "Lỗi",
        description: err.response?.data?.message || err.message || "Không thể lưu phương thức thanh toán",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setFormData(initialFormData);
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => handleClose({ preventDefault: () => {}, stopPropagation: () => {} })}>
      <DialogContent className="max-w-2xl animate-in fade-in-0 zoom-in-95 duration-300">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {isEdit ? "Chỉnh sửa phương thức thanh toán" : "Thêm phương thức thanh toán mới"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label htmlFor="paymentType" className="text-sm font-medium text-gray-700">
              Loại thanh toán
            </Label>
            <Select
              value={formData.paymentType}
              onValueChange={(value) => setFormData({ ...formData, paymentType: value, paymentMethod: "" })}
            >
              <SelectTrigger className={`mt-1 ${errors.paymentType ? "border-red-500" : ""}`}>
                <SelectValue placeholder="Chọn loại thanh toán" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BANKING_VN">Ngân hàng Việt Nam</SelectItem>
                <SelectItem value="PAYPAL">PayPal</SelectItem>
              </SelectContent>
            </Select>
            {errors.paymentType && <p className="text-red-500 text-xs mt-1">{errors.paymentType}</p>}
          </div>
          <div>
            <Label htmlFor="paymentMethod" className="text-sm font-medium text-gray-700">
              Phương thức thanh toán
            </Label>
            <Select
              value={formData.paymentMethod}
              onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
              disabled={!formData.paymentType}
            >
              <SelectTrigger className={`mt-1 ${errors.paymentMethod ? "border-red-500" : ""}`}>
                <SelectValue placeholder="Chọn phương thức" />
              </SelectTrigger>
              <SelectContent>
                {getPaymentMethods().map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.paymentMethod && <p className="text-red-500 text-xs mt-1">{errors.paymentMethod}</p>}
          </div>
          <div>
            <Label htmlFor="name" className="text-sm font-medium text-gray-700">
              Tên
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: DOMPurify.sanitize(e.target.value) })}
              placeholder="Ví dụ: Thanh toán Vietcombank"
              className={`mt-1 ${errors.name ? "border-red-500" : ""}`}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>
          {formData.paymentType === "BANKING_VN" && (
            <>
              <div>
                <Label htmlFor="accountHolder" className="text-sm font-medium text-gray-700">
                  Chủ tài khoản
                </Label>
                <Input
                  id="accountHolder"
                  value={formData.accountHolder}
                  onChange={(e) => setFormData({ ...formData, accountHolder: DOMPurify.sanitize(e.target.value) })}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  className={`mt-1 ${errors.accountHolder ? "border-red-500" : ""}`}
                />
                {errors.accountHolder && <p className="text-red-500 text-xs mt-1">{errors.accountHolder}</p>}
              </div>
              <div>
                <Label htmlFor="bankName" className="text-sm font-medium text-gray-700">
                  Tên ngân hàng
                </Label>
                <Input
                  id="bankName"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: DOMPurify.sanitize(e.target.value) })}
                  placeholder="Ví dụ: Vietcombank"
                  className={`mt-1 ${errors.bankName ? "border-red-500" : ""}`}
                />
                {errors.bankName && <p className="text-red-500 text-xs mt-1">{errors.bankName}</p>}
              </div>
              <div>
                <Label htmlFor="accountNumber" className="text-sm font-medium text-gray-700">
                  Số tài khoản
                </Label>
                <Input
                  id="accountNumber"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: DOMPurify.sanitize(e.target.value) })}
                  placeholder="Ví dụ: 1234567890"
                  className={`mt-1 ${errors.accountNumber ? "border-red-500" : ""}`}
                />
                {errors.accountNumber && <p className="text-red-500 text-xs mt-1">{errors.accountNumber}</p>}
              </div>
            </>
          )}
          {formData.paymentType === "PAYPAL" && (
            <div>
              <Label htmlFor="paypalEmail" className="text-sm font-medium text-gray-700">
                Email PayPal
              </Label>
              <Input
                id="paypalEmail"
                value={formData.paypalEmail}
                onChange={(e) => setFormData({ ...formData, paypalEmail: DOMPurify.sanitize(e.target.value) })}
                placeholder="Ví dụ: payment@example.com"
                className={`mt-1 ${errors.paypalEmail ? "border-red-500" : ""}`}
              />
              {errors.paypalEmail && <p className="text-red-500 text-xs mt-1">{errors.paypalEmail}</p>}
            </div>
          )}
          <div>
            <Label htmlFor="status" className="text-sm font-medium text-gray-700">
              Trạng thái
            </Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Chọn trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Hoạt động</SelectItem>
                <SelectItem value="Inactive">Không hoạt động</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" onClick={handleClose} variant="outline" className="flex-1">
              <X className="h-4 w-4 mr-2" />
              Hủy
            </Button>
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {saving ? "Đang lưu..." : "Lưu"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Main Payments Component
export default function Payments({ orderId = "123" }) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Helper to get auth token
  const getAuthHeader = useCallback(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      throw new Error("Không tìm thấy mã xác thực");
    }
    return { Authorization: `Bearer ${token}` };
  }, []);

  // Fetch payments with retry logic
  const fetchPayments = useCallback(
    async (retries = 3) => {
      setLoading(true);
      while (retries > 0) {
        try {
          const headers = getAuthHeader();
          let response;
          try {
            response = await axios.get(`${API_URL}/admin/payments`, { headers });
            setIsAdmin(true);
          } catch (adminErr) {
            if (adminErr.response?.status === 403) {
              response = await axios.get(`${API_URL}/payments`, { headers });
              setIsAdmin(false);
            } else {
              throw adminErr;
            }
          }
          setPayments(response.data);
          toast({
            title: "Thành công",
            description: "Tải danh sách phương thức thanh toán thành công",
          });
          break;
        } catch (err) {
          retries--;
          if (retries === 0) {
            console.error("Lỗi tải phương thức thanh toán:", err);
            setPayments([]);
            toast({
              title: "Lỗi",
              description:
                err.response?.data?.message || err.message || "Không thể tải danh sách phương thức thanh toán",
              variant: "destructive",
            });
          }
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
      setLoading(false);
    },
    [getAuthHeader, toast],
  );

  // Create payment
  const createPayment = useCallback(
    async (formData) => {
      try {
        const headers = getAuthHeader();
        const payload = {
          paymentType: formData.paymentType,
          paymentMethod: formData.paymentMethod,
          name: formData.name,
          bankName: formData.paymentType === "BANKING_VN" ? formData.bankName : null,
          accountNumber: formData.paymentType === "BANKING_VN" ? formData.accountNumber : null,
          accountHolder: formData.paymentType === "BANKING_VN" ? formData.accountHolder : null,
          paypalEmail: formData.paymentType === "PAYPAL" ? formData.paypalEmail : null,
          status: formData.status || "Active",
        };
        const response = await axios.post(`${API_URL}/admin/payments`, payload, { headers });
        setPayments((prev) => [...prev, response.data]);
        toast({
          title: "Thành công",
          description: "Tạo phương thức thanh toán thành công",
        });
      } catch (err) {
        console.error("Lỗi tạo phương thức thanh toán:", err);
        throw new Error(err.response?.data?.message || "Không thể tạo phương thức thanh toán");
      }
    },
    [getAuthHeader, toast],
  );

  // Update payment
  const updatePayment = useCallback(
    async (formData) => {
      try {
        const headers = getAuthHeader();
        if (!editingPayment?.id) {
          throw new Error("Không có phương thức thanh toán nào được chọn để cập nhật");
        }
        const payload = {
          paymentType: formData.paymentType,
          paymentMethod: formData.paymentMethod,
          name: formData.name,
          bankName: formData.paymentType === "BANKING_VN" ? formData.bankName : null,
          accountNumber: formData.paymentType === "BANKING_VN" ? formData.accountNumber : null,
          accountHolder: formData.paymentType === "BANKING_VN" ? formData.accountHolder : null,
          paypalEmail: formData.paymentType === "PAYPAL" ? formData.paypalEmail : null,
          status: formData.status,
        };
        const response = await axios.put(`${API_URL}/admin/payments/${editingPayment.id}`, payload, { headers });
        setPayments((prev) => prev.map((p) => (p.id === response.data.id ? response.data : p)));
        toast({
          title: "Thành công",
          description: "Cập nhật phương thức thanh toán thành công",
        });
      } catch (err) {
        console.error("Lỗi cập nhật phương thức thanh toán:", err);
        throw new Error(err.response?.data?.message || "Không thể cập nhật phương thức thanh toán");
      }
    },
    [editingPayment, getAuthHeader, toast],
  );

  // Delete payment
  const deletePayment = useCallback(
    async (id) => {
      try {
        const headers = getAuthHeader();
        await axios.delete(`${API_URL}/admin/payments/${id}`, { headers });
        setPayments((prev) => prev.filter((p) => p.id !== id));
        toast({
          title: "Thành công",
          description: "Xóa phương thức thanh toán thành công",
        });
      } catch (err) {
        console.error("Lỗi xóa phương thức thanh toán:", err);
        toast({
          title: "Lỗi",
          description: err.response?.data?.message || err.message || "Không thể xóa phương thức thanh toán",
          variant: "destructive",
        });
        throw err;
      }
    },
    [getAuthHeader, toast],
  );

  // Process payment
  const processPayment = useCallback(
    debounce(
      async (paymentId) => {
        try {
          const headers = getAuthHeader();
          const response = await axios.post(
            `${API_URL}/payments?orders=${orderId}`,
            { id: paymentId },
            { headers },
          );
          if (response.data.success && response.data.data?.approval_url) {
            window.location.href = response.data.data.approval_url;
          } else {
            toast({
              title: "Thành công",
              description: response.data.message || "Xử lý thanh toán thành công",
            });
          }
        } catch (err) {
          console.error("Lỗi xử lý thanh toán:", err);
          toast({
            title: "Lỗi",
            description: err.response?.data?.message || err.message || "Không thể xử lý thanh toán",
            variant: "destructive",
          });
        }
      },
      500,
      { leading: true, trailing: false },
    ),
    [getAuthHeader, orderId, toast],
  );

  // Handle PayPal success/cancel
  const handlePayPalCallback = useCallback(
    async (isSuccess, params) => {
      try {
        const headers = getAuthHeader();
        const endpoint = isSuccess ? `${API_URL}/payments/paypal/success` : `${API_URL}/payments/paypal/cancel`;
        const response = await axios.post(endpoint, params, { headers });
        toast({
          title: isSuccess ? "Thành công" : "Đã hủy",
          description: response.data.message,
          variant: isSuccess ? "default" : "destructive",
        });
        fetchPayments();
      } catch (err) {
        console.error(`Lỗi PayPal ${isSuccess ? "thành công" : "hủy"}:`, err);
        toast({
          title: "Lỗi",
          description:
            err.response?.data?.message || err.message || `Không thể xử lý PayPal ${isSuccess ? "thành công" : "hủy"}`,
          variant: "destructive",
        });
      }
    },
    [getAuthHeader, fetchPayments, toast],
  );

  // Fetch payments and handle PayPal callbacks
  useEffect(() => {
    fetchPayments();
    const urlParams = new URLSearchParams(window.location.search);
    const paymentId = urlParams.get("paymentId");
    const payerId = urlParams.get("PayerID");
    const cancel = urlParams.get("cancel");
    const orderIdParam = urlParams.get("orderId");

    if (paymentId && payerId && orderIdParam) {
      handlePayPalCallback(true, { paymentId, PayerID: payerId, orderId: orderIdParam });
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (cancel && orderIdParam) {
      handlePayPalCallback(false, { orderId: orderIdParam });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [fetchPayments, handlePayPalCallback]);

  // Memoized filtered payments
  const filteredPayments = useMemo(() => {
    const sanitizedSearchTerm = DOMPurify.sanitize(searchTerm);
    return payments.filter((payment) => {
      const matchesSearch =
        (payment.id?.toString().toLowerCase() || "").includes(sanitizedSearchTerm.toLowerCase()) ||
        (payment.name?.toLowerCase() || "").includes(sanitizedSearchTerm.toLowerCase()) ||
        (payment.paymentMethod?.toLowerCase() || "").includes(sanitizedSearchTerm.toLowerCase()) ||
        (payment.paypalEmail?.toLowerCase() || "").includes(sanitizedSearchTerm.toLowerCase()) ||
        (payment.accountHolder?.toLowerCase() || "").includes(sanitizedSearchTerm.toLowerCase()) ||
        (payment.accountNumber?.toLowerCase() || "").includes(sanitizedSearchTerm.toLowerCase());

      const matchesStatus =
        !statusFilter || statusFilter === "all" || payment.status?.toLowerCase() === statusFilter.toLowerCase();
      const matchesMethod =
        !methodFilter || methodFilter === "all" || payment.paymentMethod?.toLowerCase() === methodFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesMethod;
    });
  }, [payments, searchTerm, statusFilter, methodFilter]);

  // Payment stats
  const paymentStats = useMemo(
    () => ({
      total: payments.length,
      active: payments.filter((p) => p.status === "Active").length,
      inactive: payments.filter((p) => p.status === "Inactive").length,
      activePercentage: payments.length ? ((payments.filter((p) => p.status === "Active").length / payments.length) * 100).toFixed(1) : 0,
      inactivePercentage: payments.length ? ((payments.filter((p) => p.status === "Inactive").length / payments.length) * 100).toFixed(1) : 0,
    }),
    [payments],
  );

  // Helper functions
  const getStatusBadge = (status) => {
    switch (status) {
      case "Active":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Hoạt động</Badge>;
      case "Inactive":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Không hoạt động</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Active":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "Inactive":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getMethodIcon = (method) => {
    switch (method?.toLowerCase()) {
      case "paypal":
        return <CreditCard className="h-4 w-4 text-blue-600" />;
      default:
        return <Banknote className="h-4 w-4 text-green-600" />;
    }
  };

  const getMethodName = (method) => {
    if (!method) return "N/A";
    if (method.toLowerCase() === "paypal") return "PayPal";
    const bank = VIETNAM_BANKS.find((b) => b.value === method);
    return bank ? bank.label : method;
  };

  // Event handlers
  const handleViewDetail = useCallback(
    (e, payment) => {
      e.preventDefault();
      e.stopPropagation();
      setSelectedPayment(payment);
      setShowDetailModal(true);
    },
    [],
  );

  const handleEditPayment = useCallback(
    (payment) => {
      setEditingPayment(payment);
      setShowEditModal(true);
    },
    [],
  );

  const handleSavePayment = useCallback(
    async (formData) => {
      if (editingPayment) {
        await updatePayment(formData);
      } else {
        await createPayment(formData);
      }
    },
    [editingPayment, createPayment, updatePayment],
  );

  const handleAddPayment = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isAdmin) {
        toast({
          title: "Lỗi",
          description: "Chỉ quản trị viên mới có thể tạo phương thức thanh toán",
          variant: "destructive",
        });
        return;
      }
      setShowAddModal(true);
    },
    [isAdmin, toast],
  );

  const handleDeletePayment = useCallback(
    async (id) => {
      if (!isAdmin) {
        toast({
          title: "Lỗi",
          description: "Chỉ quản trị viên mới có thể xóa phương thức thanh toán",
          variant: "destructive",
        });
        return;
      }
      if (!window.confirm("Bạn có chắc chắn muốn xóa phương thức thanh toán này?")) {
        return;
      }
      await deletePayment(id);
    },
    [isAdmin, deletePayment, toast],
  );

  const closeDetailModal = useCallback(() => {
    setShowDetailModal(false);
    setSelectedPayment(null);
  }, []);

  const closeAddModal = useCallback(() => {
    setShowAddModal(false);
  }, []);

  const closeEditModal = useCallback(() => {
    setShowEditModal(false);
    setEditingPayment(null);
  }, []);

  const handleSearchChange = useCallback(
    debounce((value) => {
      setSearchTerm(value);
    }, 300),
    [],
  );

  const handleRefresh = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      fetchPayments();
    },
    [fetchPayments],
  );

  const handleResetFilters = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setSearchTerm("");
      setStatusFilter("");
      setMethodFilter("");
    },
    [],
  );

  // Render
  if (loading) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto p-4 sm:p-6">
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl p-6">
          <div className="animate-pulse">
            <div className="w-48 h-8 bg-white/20 rounded mb-2" />
            <div className="w-96 h-5 bg-white/20 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="w-12 h-6 bg-gray-200 rounded mb-1" />
                  <div className="w-16 h-4 bg-gray-200 rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <PaymentSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-8 max-w-7xl mx-auto p-4 sm:p-6">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <CreditCard className="h-6 w-6" />
                Quản lý phương thức thanh toán
              </h1>
              <p className="text-blue-100 text-sm">
                Tổng số phương thức: <span className="font-semibold">{paymentStats.total}</span>
                {filteredPayments.length !== paymentStats.total && (
                  <span> (Hiển thị: {filteredPayments.length})</span>
                )}
              </p>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-sm"
                  onClick={handleRefresh}
                  disabled={loading}
                  aria-label="Làm mới danh sách phương thức thanh toán"
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
                  Làm mới
                </Button>
                <Button
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-sm"
                  onClick={handleAddPayment}
                  aria-label="Thêm phương thức thanh toán mới"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Thêm phương thức
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-gray-50 to-gray-100 hover:shadow-xl transition-shadow duration-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tổng số phương thức</p>
                  <p className="text-2xl font-bold text-gray-900">{paymentStats.total}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 hover:shadow-xl transition-shadow duration-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Hoạt động</p>
                  <p className="text-2xl font-bold text-green-600">
                    {paymentStats.active} ({paymentStats.activePercentage}%)
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-red-100 hover:shadow-xl transition-shadow duration-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">Không hoạt động</p>
                  <p className="text-2xl font-bold text-red-600">
                    {paymentStats.inactive} ({paymentStats.inactivePercentage}%)
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Section */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              <div className="relative col-span-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Tìm kiếm phương thức..."
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                  aria-label="Tìm kiếm phương thức thanh toán"
                  value={searchTerm}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-300">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="Active">Hoạt động</SelectItem>
                  <SelectItem value="Inactive">Không hoạt động</SelectItem>
                </SelectContent>
              </Select>
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-300">
                  <SelectValue placeholder="Phương thức" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {VIETNAM_BANKS.map((bank) => (
                    <SelectItem key={bank.value} value={bank.value}>
                      {bank.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="PayPal">PayPal</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                className="border-gray-200"
                onClick={handleResetFilters}
                aria-label="Đặt lại bộ lọc"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Đặt lại bộ lọc
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Payments List */}
        <div className="space-y-4">
          {filteredPayments.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-gray-600">Không tìm thấy phương thức thanh toán nào.</p>
            </Card>
          ) : (
            filteredPayments.map((payment) => (
              <Card key={payment.id} className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(payment.status)}
                            <h3 className="font-semibold text-gray-900">#{payment.id}</h3>
                          </div>
                          {getStatusBadge(payment.status)}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center text-sm">
                            <span className="font-medium">Tên:</span>
                            <span className="ml-1 text-gray-600">{payment.name}</span>
                          </div>
                          <div className="flex items-center text-sm">
                            {getMethodIcon(payment.paymentMethod)}
                            <span className="font-medium ml-2">Phương thức:</span>
                            <span className="ml-1 text-gray-600">{getMethodName(payment.paymentMethod)}</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <span className="font-medium">Loại:</span>
                            <span className="ml-1 text-gray-600">{payment.paymentType}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {payment.paymentType === "BANKING_VN" && (
                            <>
                              <div className="text-sm">
                                <span className="font-medium">Chủ tài khoản:</span>
                                <span className="ml-1 text-gray-600">{payment.accountHolder || "N/A"}</span>
                              </div>
                              <div className="text-sm">
                                <span className="font-medium">Tên ngân hàng:</span>
                                <span className="ml-1 text-gray-600">{payment.bankName || "N/A"}</span>
                              </div>
                              <div className="text-sm">
                                <span className="font-medium">Số tài khoản:</span>
                                <span className="ml-1 text-gray-600">{payment.accountNumber || "N/A"}</span>
                              </div>
                            </>
                          )}
                          {payment.paymentType === "PAYPAL" && (
                            <div className="text-sm">
                              <span className="font-medium">Email PayPal:</span>
                              <span className="ml-1 text-gray-600">{payment.paypalEmail || "N/A"}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-3">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => handleViewDetail(e, payment)}
                          className="border-blue-200 text-blue-600 hover:bg-blue-50"
                          aria-label={`Xem chi tiết phương thức thanh toán ${payment.id}`}
                        >
                          <Eye className="h-3 w-3 mr-2" />
                          Chi tiết
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-gray-200"
                              aria-label="Mở menu tùy chọn"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {isAdmin && (
                              <>
                                <DropdownMenuItem onSelect={() => handleEditPayment(payment)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Chỉnh sửa
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() => handleDeletePayment(payment.id)}
                                  className="text-red-600"
                                >
                                  <Trash className="h-4 w-4 mr-2" />
                                  Xóa
                                </DropdownMenuItem>
                              </>
                            )}
                            {!isAdmin && (
                              <DropdownMenuItem onSelect={() => processPayment(payment.id)}>
                                <DollarSign className="h-4 w-4 mr-2" />
                                Thanh toán
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Modals and Toaster */}
        <PaymentDetailModal payment={selectedPayment} isOpen={showDetailModal} onClose={closeDetailModal} />
        <PaymentModal
          key={`add-${showAddModal}`}
          isOpen={showAddModal}
          onClose={closeAddModal}
          onSave={handleSavePayment}
          isEdit={false}
        />
        <PaymentModal
          key={`edit-${editingPayment?.id || "none"}`}
          payment={editingPayment}
          isOpen={showEditModal}
          onClose={closeEditModal}
          onSave={handleSavePayment}
          isEdit={true}
        />
        <Toaster />
      </div>
    </ErrorBoundary>
  );
}