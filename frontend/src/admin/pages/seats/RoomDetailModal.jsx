import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Monitor } from "lucide-react";

const RoomDetailModal = ({ room, isOpen, onClose }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Monitor className="h-5 w-5" />
          Chi tiết phòng: {room?.numberRoom}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Tên phòng
              </label>
              <p className="text-lg font-semibold dark:text-white">{room?.numberRoom}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Rạp chiếu
              </label>
              <p className="text-lg dark:text-white">{room?.cinema?.name || room?.cinemaName || "N/A"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Số hàng
              </label>
              <p className="text-lg dark:text-white">{room?.rows || 0}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Ghế mỗi hàng
              </label>
              <p className="text-lg dark:text-white">{room?.seatsPerRow || 0}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Tổng ghế
              </label>
              <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                {room?.totalSeats || 0}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Ghế VIP
              </label>
              <p className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                {room?.vipSeats || 0}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Ghế đôi
              </label>
              <p className="text-lg font-semibold text-pink-600 dark:text-pink-400">
                {room?.coupleSeats || 0}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Trạng thái
              </label>
              <p className="text-lg dark:text-white">
                {room?.status === "active" ? "Hoạt động" : "Bảo trì"}
              </p>
            </div>
          </div>
        </div>
        {room?.description && (
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
            <h4 className="font-medium mb-2 dark:text-white">Mô tả</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {room.description}
            </p>
          </div>
        )}
      </div>
    </DialogContent>
  </Dialog>
);

export default RoomDetailModal;