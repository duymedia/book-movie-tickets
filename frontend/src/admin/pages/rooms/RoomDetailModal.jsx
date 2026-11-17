import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Monitor } from "lucide-react";
import axios from "axios";
import { useToast } from "../../hooks/use-toast";

const RoomDetailModal = ({ room, isOpen, onClose }) => {
  const [totalSeats, setTotalSeats] = useState(0);
  const { toast } = useToast();
  const token = localStorage.getItem("authToken");

  useEffect(() => {
    if (isOpen && room?.id) {
      const fetchSeats = async () => {
        try {
          const response = await axios.get(
            `http://localhost:8080/api/admin/seats/room/${room.id}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          setTotalSeats(response.data.length);
        } catch (error) {
          setTotalSeats(0);
          toast({
            title: "Lỗi",
            description: "Không thể lấy danh sách ghế.",
            variant: "destructive",
            duration: 3000,
          });
        }
      };
      fetchSeats();
    }
  }, [isOpen, room, token, toast]);

  const handleDialogOpenChange = useCallback(
    (open) => {
      if (!open) {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Chi tiết phòng: {room?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Tên phòng
            </label>
            <p className="text-lg font-semibold dark:text-white">
              {room?.name}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Rạp chiếu
            </label>
            <p className="text-lg dark:text-white">{room?.cinema}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Tổng số ghế
            </label>
            <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
              {totalSeats}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RoomDetailModal;