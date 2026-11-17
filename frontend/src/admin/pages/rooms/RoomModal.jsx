import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Monitor, Save, X, Loader2 } from "lucide-react";
import { useToast } from "../../hooks/use-toast";

const RoomModal = ({
  room,
  isOpen,
  onClose,
  onSave,
  isEdit = false,
  cinemas,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    cinema: "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      if (room && isEdit) {
        setFormData({
          name: room.name || "",
          cinema: room.cinemaId || "",
        });
      } else {
        setFormData({
          name: "",
          cinema: "",
        });
      }
      setErrors({});
      setIsDirty(false);
    }
  }, [isOpen, room, isEdit]);

  const handleInputChange = useCallback(
    (field, value) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setIsDirty(true);
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: null }));
      }
    },
    [errors]
  );

  const handleSave = async (e) => {
    e.preventDefault();
    const validationErrors = validateFormData(formData, isEdit);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSaving(true);
    try {
      const errors = await onSave(formData);
      if (Object.keys(errors).length > 0) {
        setErrors(errors);
        return;
      }
      setIsDirty(false);
      onClose();
    } catch (error) {
      toast({
        title: "Lỗi",
        description:
          error.response?.data?.message || "Đã xảy ra lỗi khi lưu phòng.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDialogOpenChange = useCallback(
    (open) => {
      if (!open) {
        setFormData({
          name: "",
          cinema: "",
        });
        setErrors({});
        setIsDirty(false);
        onClose();
      }
    },
    [isDirty, saving, onClose]
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            {isEdit ? "Chỉnh sửa phòng chiếu" : "Thêm phòng chiếu mới"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label htmlFor="name">Tên phòng</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Phòng 1, Phòng VIP..."
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>
          <div>
            <Label htmlFor="cinema">Rạp chiếu</Label>
            <Select
              value={formData.cinema}
              onValueChange={(value) => handleInputChange("cinema", value)}
            >
              <SelectTrigger className={errors.cinema ? "border-red-500" : ""}>
                <SelectValue placeholder="Chọn rạp chiếu" />
              </SelectTrigger>
              <SelectContent>
                {cinemas.map((cinema) => (
                  <SelectItem key={cinema.id} value={cinema.id.toString()}>
                    {cinema.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.cinema && (
              <p className="text-red-500 text-sm mt-1">{errors.cinema}</p>
            )}
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={() => handleDialogOpenChange(false)}
              variant="outline"
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Hủy
            </Button>
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {saving ? "Đang lưu..." : "Lưu"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Utility functions
const validateFormData = (formData, isEdit = false) => {
  const errors = {};

  if (!formData.name || formData.name.length < 2) {
    errors.name = "Tên phòng phải có ít nhất 2 ký tự";
  }

  if (!formData.cinema) {
    errors.cinema = "Vui lòng chọn rạp chiếu";
  }

  return errors;
};

export default RoomModal;