import { useState, useEffect } from "react";
import axios from "axios";
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
  DialogFooter,
} from "../../components/ui/dialog";
import {
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Download,
  QrCode,
  CheckCircle,
  XCircle,
  Clock,
  Ticket,
  Calendar,
  MapPin,
  Film,
  User,
  Plus,
  Edit,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { useToast } from "../../hooks/use-toast";
import { Toaster } from "../../components/ui/toaster";

const API_URL = "http://localhost:8080/api";

const TicketSkeleton = () => (
  <Card className="border-0 shadow-lg">
    <CardContent className="p-6">
      <div className="animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-slate-200 rounded"></div>
            <div className="w-20 h-4 bg-slate-200 rounded"></div>
            <div className="w-16 h-6 bg-slate-200 rounded-full"></div>
          </div>
          <div className="w-24 h-4 bg-slate-200 rounded"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="w-full h-4 bg-slate-200 rounded"></div>
            <div className="w-3/4 h-4 bg-slate-200 rounded"></div>
            <div className="w-5/6 h-4 bg-slate-200 rounded"></div>
          </div>
          <div className="space-y-2">
            <div className="w-full h-4 bg-slate-200 rounded"></div>
            <div className="w-2/3 h-4 bg-slate-200 rounded"></div>
            <div className="w-4/5 h-4 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

const TicketDetailModal = ({ ticket, isOpen, onClose }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-2xl modal-animate-in">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Ticket className="h-5 w-5" />
          Chi tiết vé {ticket?.id}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-600">Tên vé</label>
              <p className="text-lg font-semibold">{ticket?.name || "N/A"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Độ tuổi</label>
              <p className="text-lg font-semibold">{ticket?.age || "N/A"}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-600">Giá vé</label>
              <p className="text-lg font-semibold text-green-600">
                {ticket?.price?.toLocaleString() || "0"}₫
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Loại vé</label>
              <p className="text-lg font-semibold">{ticket?.type || "N/A"}</p>
            </div>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);

const TicketFormModal = ({ isOpen, onClose, ticket, onSubmit, isEdit = false }) => {
  const [formData, setFormData] = useState({
    name: ticket?.name || "",
    age: ticket?.age || "",
    price: ticket?.price || "",
    type: ticket?.type || "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTypeChange = (value) => {
    setFormData((prev) => ({ ...prev, type: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md modal-animate-in">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Chỉnh sửa vé" : "Tạo vé mới"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-600">Tên vé</label>
            <Input
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Nhập tên vé"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600">Độ tuổi</label>
            <Input
              name="age"
              type="number"
              value={formData.age}
              onChange={handleChange}
              placeholder="Nhập độ tuổi (nếu có)"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600">Giá vé</label>
            <Input
              name="price"
              type="number"
              value={formData.price}
              onChange={handleChange}
              placeholder="Nhập giá vé"
              required
              min="0"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600">Loại vé</label>
            <Select value={formData.type} onValueChange={handleTypeChange} required>
              <SelectTrigger>
                <SelectValue placeholder="Chọn loại vé" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Vé ghế đơn</SelectItem>
                <SelectItem value="couple">Vé ghế đôi</SelectItem>
                <SelectItem value="vip">Vé ghế vip</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit">{isEdit ? "Cập nhật" : "Tạo"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default function Tickets() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [isModalTransitioning, setIsModalTransitioning] = useState(false);

  const toggleModal = (modalType, ticket = null, editMode = false) => {
    if (isModalTransitioning) return;

    setIsModalTransitioning(true);
    setShowDetailModal(false);
    setShowFormModal(false);
    setSelectedTicket(null);
    setIsEdit(false);

    setTimeout(() => {
      try {
        if (modalType === "detail") {
          if (!ticket) throw new Error("No ticket selected for details");
          setSelectedTicket(ticket);
          setShowDetailModal(true);
        } else if (modalType === "form") {
          if (editMode && !ticket) throw new Error("No ticket selected for editing");
          setSelectedTicket(ticket);
          setIsEdit(editMode);
          setShowFormModal(true);
        }
      } catch (err) {
        toast({
          title: "Error",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setIsModalTransitioning(false);
      }
    }, 300);
  };

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("No authentication token found");
      const response = await axios.get(`${API_URL}/admin/tickets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTickets(response.data);
    } catch (err) {
      toast({
        title: "Error",
        description: err.message || "Failed to fetch tickets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createTicket = async (formData) => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("No authentication token found");
      const response = await axios.post(`${API_URL}/admin/tickets`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTickets((prev) => [...prev, response.data]);
      toggleModal(null);
      toast({
        title: "Success",
        description: "Ticket created successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err.message || "Failed to create ticket",
        variant: "destructive",
      });
    }
  };

  const updateTicket = async (formData) => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("No authentication token found");
      if (!selectedTicket?.id) throw new Error("No ticket selected for update");
      const response = await axios.put(`${API_URL}/admin/tickets/${selectedTicket.id}`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTickets((prev) => prev.map((t) => (t.id === response.data.id ? response.data : t)));
      toggleModal(null);
      toast({
        title: "Success",
        description: "Ticket updated successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err.message || "Failed to update ticket",
        variant: "destructive",
      });
    }
  };

  const deleteTicket = async (id) => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("No authentication token found");
      await axios.delete(`${API_URL}/admin/tickets/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTickets((prev) => prev.filter((t) => t.id !== id));
      toast({
        title: "Success",
        description: "Ticket deleted successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete ticket",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.id.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const ticketStats = {
    total: tickets.length,
    valid: tickets.filter((t) => t.status === "valid").length,
    used: tickets.filter((t) => t.status === "used").length,
    cancelled: tickets.filter((t) => t.status === "cancelled").length,
    expired: tickets.filter((t) => t.status === "expired").length,
  };

  const getStatusBadge = (status = "valid") => {
    switch (status) {
      case "valid":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Có hiệu lực</Badge>;
      case "used":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Đã sử dụng</Badge>;
      case "expired":
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Hết hạn</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Đã hủy</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status = "valid") => {
    switch (status) {
      case "valid":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "used":
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case "expired":
        return <Clock className="h-4 w-4 text-gray-600" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const handleViewDetail = (ticket) => toggleModal("detail", ticket);
  const handleEditTicket = (ticket) => toggleModal("form", ticket, true);
  const handleCreateTicket = () => toggleModal("form");
  const handleFormSubmit = (formData) => {
    if (isEdit) {
      updateTicket(formData);
    } else {
      createTicket(formData);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl p-8">
          <div className="animate-pulse">
            <div className="w-48 h-8 bg-white/20 rounded mb-2"></div>
            <div className="w-96 h-5 bg-white/10 rounded"></div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="w-12 h-6 bg-slate-200 rounded mb-1"></div>
                  <div className="w-16 h-4 bg-slate-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <TicketSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl p-8 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <Ticket className="h-8 w-8" />
              Quản lý vé
            </h1>
            <p className="text-blue-100 text-lg">Theo dõi và quản lý tình trạng vé đã bán</p>
          </div>
          <div className="mt-4 md:mt-0 flex gap-3">
            <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
              <Download className="h-4 w-4 mr-2" />
              Xuất báo cáo
            </Button>
            <Button className="bg-white text-blue-600 hover:bg-blue-50" onClick={handleCreateTicket}>
              <Plus className="h-4 w-4 mr-2" />
              Tạo vé mới
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 to-slate-100 hover:shadow-xl transition-all duration-300">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-slate-900">{ticketStats.total}</div>
            <div className="text-sm text-slate-600">Tổng vé</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 hover:shadow-xl transition-all duration-300">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{ticketStats.valid}</div>
            <div className="text-sm text-green-700">Có hiệu lực</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-xl transition-all duration-300">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{ticketStats.used}</div>
            <div className="text-sm text-blue-700">Đã sử dụng</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-red-100 hover:shadow-xl transition-all duration-300">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{ticketStats.cancelled}</div>
            <div className="text-sm text-red-700">Đã hủy</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-gray-50 to-gray-100 hover:shadow-xl transition-all duration-300">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{ticketStats.expired}</div>
            <div className="text-sm text-gray-700">Hết hạn</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Tìm kiếm vé..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-300">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="valid">Có hiệu lực</SelectItem>
                <SelectItem value="used">Đã sử dụng</SelectItem>
                <SelectItem value="cancelled">Đã hủy</SelectItem>
                <SelectItem value="expired">Hết hạn</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-300">
                <SelectValue placeholder="Thời gian" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hôm nay</SelectItem>
                <SelectItem value="week">Tuần này</SelectItem>
                <SelectItem value="month">Tháng này</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="border-slate-200 hover:bg-slate-700">
              <Filter className="h-4 w-4 mr-2" />
              Bộ lọc nâng cao
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {filteredTickets.map((ticket) => (
          <Card
            key={ticket.id}
            className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(ticket.status)}
                        <h3 className="font-semibold text-slate-900">{ticket.id}</h3>
                      </div>
                      {getStatusBadge(ticket.status)}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <Film className="h-3 w-3 mr-2 text-slate-400" />
                        <span className="font-medium">Tên vé:</span>
                        <span className="ml-1 text-slate-600">{ticket.name}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <MapPin className="h-3 w-3 mr-2 text-slate-400" />
                        <span className="font-medium">Loại vé:</span>
                        <span className="ml-1 text-slate-600">{ticket.type || "N/A"}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <MapPin className="h-3 w-3 mr-2 text-slate-400" />
                        <span className="font-medium">Độ tuổi:</span>
                        <span className="ml-1 text-slate-600">{ticket.age || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-3">
                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-900">{ticket.price.toLocaleString()}₫</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetail(ticket)}
                      className="hover:bg-blue-50 hover:border-blue-300"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Chi tiết
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="hover:bg-slate-50">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditTicket(ticket)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Chỉnh sửa
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => deleteTicket(ticket.id)}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Xóa vé
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <TicketDetailModal
        ticket={selectedTicket}
        isOpen={showDetailModal}
        onClose={() => toggleModal(null)}
      />
      <TicketFormModal
        isOpen={showFormModal}
        onClose={() => toggleModal(null)}
        ticket={selectedTicket}
        onSubmit={handleFormSubmit}
        isEdit={isEdit}
      />
      <Toaster />
    </div>
  );
};

const modalStyles = `
@keyframes modalFadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
.modal-animate-in {
  animation: modalFadeIn 0.3s ease-out;
}
`;
const styleSheet = document.createElement("style");
styleSheet.innerText = modalStyles;
document.head.appendChild(styleSheet);