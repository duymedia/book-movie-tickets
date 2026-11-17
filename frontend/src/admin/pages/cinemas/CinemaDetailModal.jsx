import React, { useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Badge } from "../../components/ui/badge";
import { BiBuilding } from "react-icons/bi";

const getStatusDisplay = (status) => {
  switch (status) {
    case "active":
      return { text: "Hoạt động", className: "bg-green-500 text-white" };
    case "maintenance":
      return { text: "Bảo trì", className: "bg-yellow-500 text-white" };
    case "closed":
      return { text: "Đóng cửa", className: "bg-gray-500 text-white" };
    default:
      return { text: status || "Không xác định", className: "bg-gray-200 text-gray-800" };
  }
};

const CinemaDetailModal = ({ cinema, isOpen, onClose }) => {
  const status = cinema ? getStatusDisplay(cinema.status) : { text: "Không xác định", className: "bg-gray-200 text-gray-800" };

  const handleDialogOpenChange = useCallback(
    (open) => {
      if (!open) {
        onClose();
      }
    },
    [onClose]
  );

  if (!cinema) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BiBuilding className="h-5 w-5" />
            Chi tiết rạp: {cinema.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {cinema.image && (
            <div className="relative w-full h-48 rounded-lg overflow-hidden">
              <img
                src={cinema.image}
                alt={cinema.name}
                className="w-full h-full object-cover"
                onError={(e) => (e.target.src = "/placeholder.jpg")}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Tên rạp</label>
                <p className="text-lg font-semibold">{cinema.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Địa chỉ</label>
                <p className="text-lg">{cinema.address}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Số điện thoại</label>
                <p className="text-lg">{cinema.phone}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Mô tả</label>
                <p className="text-lg">{cinema.description}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Trạng thái</label>
                <p className="text-lg">
                  <Badge className={status.className}>{status.text}</Badge>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Tổng phòng chiếu</label>
                <p className="text-lg font-semibold text-blue-600">{cinema.totalRooms || 0}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Tổng ghế</label>
                <p className="text-lg font-semibold text-green-600">{cinema.totalSeats || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CinemaDetailModal;