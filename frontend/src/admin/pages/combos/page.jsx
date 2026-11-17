
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import {
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Coffee,
  Save,
  X,
  Loader2,
  Upload,
  AlertCircle,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { useToast } from "../../hooks/use-toast";
import { Toaster } from "../../components/ui/toaster";

// Base API URL
const API_URL = "http://localhost:8080/api";

export default function Combos() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [combos, setCombos] = useState([]);
  const [selectedCombo, setSelectedCombo] = useState(null);
  const [editingCombo, setEditingCombo] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isModalTransitioning, setIsModalTransitioning] = useState(false);

  // Unified modal handler
  const toggleModal = (modalType, combo = null, editMode = false) => {
    if (isModalTransitioning) return;

    setIsModalTransitioning(true);

    setShowDetailModal(false);
    setShowAddModal(false);
    setShowEditModal(false);
    setSelectedCombo(null);
    setEditingCombo(null);

    setTimeout(() => {
      try {
        if (modalType === "detail") {
          if (!combo) throw new Error("No combo selected for details");
          setSelectedCombo(combo);
          setShowDetailModal(true);
        } else if (modalType === "add") {
          setShowAddModal(true);
        } else if (modalType === "edit") {
          if (!combo) throw new Error("No combo selected for editing");
          setEditingCombo(combo);
          setShowEditModal(true);
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

  // Fetch all combos
  const fetchCombos = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("No authentication token found");
      const response = await axios.get(`${API_URL}/admin/combos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (Array.isArray(response.data)) {
        setCombos(response.data);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      console.error("Fetch combos error:", err);
      setCombos([]);
      toast({
        title: "Error",
        description: err.response?.data?.message || err.message || "Failed to fetch combos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Create a combo
  const createCombo = async (formData, imageFile, quantity) => {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) throw new Error("No authentication token found");

    const form = new FormData();
    form.append("name", formData.name);
    form.append("description", formData.description);
    form.append("price", parseFloat(formData.price) || 0);
    if (quantity !== null) {
      form.append("quantity", quantity.toString());
    }
    if (imageFile) {
      form.append("image", imageFile);
    }
    console.log("Creating combo with data:", [...form]);

    const response = await axios.post(`${API_URL}/admin/combos`, form, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
    });

    console.log("Create combo response:", response.data);
    setCombos(prev => [...prev, response.data]);
    await fetchCombos(); // Refresh combo list
    toggleModal(null);
    toast({
      title: "Success",
      description: `Combo "${formData.name}" created successfully with quantity: ${response.data.quantity || 0}`,
    });
  } catch (err) {
    console.error("Create combo error:", err);
    toast({
      title: "Error",
      description: err.response?.data?.message || err.message || "Failed to create combo",
      variant: "destructive",
    });
    throw err;
  }
};

  // Update a combo
  const updateCombo = async (formData, imageFile) => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("No authentication token found");
      if (!editingCombo?.id) throw new Error("No combo selected for update");

      const quantity = formData.quantity === "" || isNaN(parseInt(formData.quantity)) ? 0 : parseInt(formData.quantity);
      if (quantity < 0) {
        throw new Error("Số lượng còn lại không được nhỏ hơn 0");
      }

      const form = new FormData();
      form.append("name", formData.name);
      form.append("description", formData.description);
      form.append("price", parseFloat(formData.price) || 0);
      form.append("quantity", quantity.toString());
      if (imageFile) {
        form.append("image", imageFile);
      }
      console.log("Updating combo with data:", [...form]);

      const response = await axios.put(`${API_URL}/admin/combos/${editingCombo.id}`, form, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("Update combo response:", response.data);
      setCombos(prev =>
        prev.map(c => (c.id === response.data.id ? response.data : c))
      );
      await fetchCombos(); // Refresh combo list
      toggleModal(null);
      toast({
        title: "Success",
        description: `Combo "${formData.name}" updated successfully with quantity: ${response.data.quantity}`,
      });
    } catch (err) {
      console.error("Update combo error:", err);
      toast({
        title: "Error",
        description: err.response?.data?.message || err.message || "Failed to update combo",
        variant: "destructive",
      });
      throw err;
    }
  };

  // Delete a combo
  const deleteCombo = async (id) => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("No authentication token found");
      const response = await axios.delete(`${API_URL}/admin/combos/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCombos(prev => prev.filter(c => c.id !== id));
      await fetchCombos(); // Refresh combo list
      toast({
        title: "Success",
        description: response.data || "Combo deleted successfully",
      });
    } catch (err) {
      console.error("Delete combo error:", err);
      toast({
        title: "Error",
        description: err.response?.data?.message || err.message || "Failed to delete combo",
        variant: "destructive",
      });
    }
  };

  // Fetch combos on mount
  useEffect(() => {
    fetchCombos();
  }, []);

  // Filter combos
  const filteredCombos = combos.filter(
    combo =>
      combo?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      combo?.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount || 0);
  };

  // Get quantity status badge
  const getQuantityBadge = (quantity) => {
    if (quantity === 0) {
      return (
        <Badge variant="destructive" className="ml-2">
          <AlertCircle className="h-3 w-3 mr-1" />
          Hết hàng
        </Badge>
      );
    } else if (quantity <= 5) {
      return (
        <Badge variant="warning" className="ml-2">
          <AlertCircle className="h-3 w-3 mr-1" />
          Sắp hết ({quantity})
        </Badge>
      );
    }
    return null;
  };

  // Combo Detail Modal
  const ComboDetailModal = ({ combo, isOpen, onClose }) => (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl animate-in fade-in-0 zoom-in-95 duration-300">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coffee className="h-5 w-5" />
            Chi tiết combo: {combo?.name || "N/A"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600">Tên combo</label>
                <p className="text-lg font-semibold">{combo?.name || "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Mô tả</label>
                <p className="text-lg">{combo?.description || "N/A"}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600">Giá bán</label>
                <p className="text-lg font-semibold text-green-600">{formatCurrency(combo?.price)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Số lượng còn lại</label>
                <p className="text-lg font-semibold flex items-center">
                  {combo?.quantity || 0}
                  {getQuantityBadge(combo?.quantity || 0)}
                </p>
              </div>
            </div>
          </div>
          {combo?.image && (
            <div>
              <label className="text-sm font-medium text-slate-600">Hình ảnh</label>
              <img
                src={combo.image}
                alt={combo.name}
                className="w-32 h-32 object-cover rounded mt-2"
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  // Add/Edit Combo Modal
  const ComboModal = ({ combo, isOpen, onClose, onSave, isEdit = false }) => {
    const [formData, setFormData] = useState({
      name: "",
      description: "",
      price: "",
      quantity: "",
    });
    const [saving, setSaving] = useState(false);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
      if (combo && isEdit) {
        setFormData({
          name: combo.name || "",
          description: combo.description || "",
          price: combo.price?.toString() || "",
          quantity: combo.quantity?.toString() || "0",
        });
        setImagePreview(combo.image || null);
      } else {
        setFormData({
          name: "",
          description: "",
          price: "",
          quantity: "",
        });
        setImagePreview(null);
        setImageFile(null);
      }
    }, [combo, isEdit, isOpen]);

    // Handle file selection
    const handleFileChange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const validTypes = ["image/jpeg", "image/png", "image/gif"];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Error",
          description: "Chỉ hỗ trợ file JPG, PNG, hoặc GIF",
          variant: "destructive",
        });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "File không được lớn hơn 5MB",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);

      setImageFile(file);
    };

    // In ComboModal
const handleSave = async () => {
  if (!formData.name || !formData.price) {
    toast({
      title: "Error",
      description: "Tên combo và giá bán là bắt buộc",
      variant: "destructive",
    });
    return;
  }
  const quantity = formData.quantity === "" ? null : parseInt(formData.quantity);
  if (quantity !== null && (isNaN(quantity) || quantity < 0)) {
    toast({
      title: "Error",
      description: "Số lượng còn lại phải là số không âm",
      variant: "destructive",
    });
    return;
  }
  setSaving(true);
  try {
    await onSave(formData, imageFile, quantity);
  } finally {
    setSaving(false);
  }
};

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl animate-in fade-in-0 zoom-in-95 duration-300">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coffee className="h-5 w-5" />
              {isEdit ? "Chỉnh sửa combo" : "Thêm combo mới"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Tên combo</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Combo Couple"
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Bắp rang bơ x2, Coca Cola x2"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="price">Giá bán</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: e.target.value })}
                placeholder="150000"
                min="0"
                required
              />
            </div>
            <div>
              <Label htmlFor="quantity">Số lượng còn lại</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="Nhập số lượng còn lại (mặc định 0)"
                min="0"
              />
              <p className="text-sm text-gray-500 mt-1">Để trống để mặc định số lượng là 0</p>
            </div>
            <div>
              <Label>Hình ảnh</Label>
              <div className="space-y-2">
                {imagePreview && (
                  <div className="mt-2">
                    <img
                      src={imagePreview}
                      alt="Image preview"
                      className="w-32 h-32 object-cover rounded"
                      onError={() => setImagePreview(null)}
                    />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Chọn file
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/jpeg,image/png,image/gif"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <p className="text-sm text-gray-500">JPG, PNG, GIF, tối đa 5MB</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button onClick={onClose} variant="outline" className="flex-1">
                <X className="h-4 w-4 mr-2" />
                Hủy
              </Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {saving ? "Đang lưu..." : "Lưu"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl p-8 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Quản lý combo đồ ăn</h1>
            <p className="text-blue-100 text-lg">Quản lý các combo đồ ăn và thức uống</p>
          </div>
          <Button
            onClick={() => toggleModal("add")}
            className="mt-4 md:mt-0 bg-white text-blue-600 hover:bg-blue-50 shadow-lg"
          >
            <Plus className="h-4 w-4 mr-2" />
            Thêm combo mới
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Tìm kiếm combo..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Bộ lọc
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="overflow-hidden animate-pulse">
              <div className="aspect-square bg-gray-200"></div>
              <CardContent className="p-4 space-y-3">
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="flex justify-between">
                  <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-5 bg-gray-200 rounded w-8"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredCombos.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-gray-600">Không tìm thấy combo nào.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCombos.map(combo => (
            <Card
              key={combo.id}
              className="overflow-hidden animate-in fade-in-0 zoom-in-95"
              style={{ animationDelay: `${combo.id * 100}ms` }}
            >
              <div className="aspect-square relative">
                <img
                  src={combo.image || "/placeholder.svg?height=120&width=120"}
                  alt={combo.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-slate-100 line-clamp-2 flex items-center">
                      {combo.name}
                      {getQuantityBadge(combo.quantity || 0)}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">{combo.description}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-lg font-bold text-gray-900 dark:text-slate-100">
                        {formatCurrency(combo.price)}
                      </span>
                      <p className="text-sm text-gray-600">Còn lại: {combo.quantity || 0}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toggleModal("detail", combo)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Xem chi tiết
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleModal("edit", combo)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Chỉnh sửa
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => deleteCombo(combo.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Xóa
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ComboDetailModal combo={selectedCombo} isOpen={showDetailModal} onClose={() => toggleModal(null)} />
      <ComboModal isOpen={showAddModal} onClose={() => toggleModal(null)} onSave={createCombo} isEdit={false} />
      <ComboModal
        combo={editingCombo}
        isOpen={showEditModal}
        onClose={() => toggleModal(null)}
        onSave={updateCombo}
        isEdit={true}
      />
      <Toaster />
    </div>
  );
}