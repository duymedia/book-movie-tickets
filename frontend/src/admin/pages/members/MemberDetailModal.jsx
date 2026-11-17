import React, { useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Badge } from "../../components/ui/badge";
import { FiUser } from "react-icons/fi";
import { cn } from "../../lib/utils";

const getStatusDisplay = (active) => {
  if (active === null || active === undefined) {
    return {
      text: "Không xác định",
      className: "bg-yellow-200 text-yellow-800",
    };
  }
  return active
    ? { text: "Hoạt động", className: "bg-green-500 text-white" }
    : { text: "Bảo trì", className: "bg-gray-200 text-gray-800" };
};

const MemberDetailModal = ({ member, isOpen, onClose }) => {
  const status = member
    ? getStatusDisplay(member.active)
    : { text: "Không xác định", className: "bg-yellow-200 text-yellow-800" };

  const handleDialogOpenChange = useCallback(
    (open) => {
      if (!open) {
        onClose();
      }
    },
    [onClose]
  );

  if (!member) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <FiUser className="h-5 w-5" />
            Chi tiết thành viên: {member.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600">ID</label>
                <p className="text-base sm:text-lg font-semibold">{member.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Họ tên</label>
                <p className="text-base sm:text-lg font-semibold">{member.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Email</label>
                <p className="text-base sm:text-lg truncate" title={member.email}>{member.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Số điện thoại</label>
                <p className="text-base sm:text-lg">{member.phone}</p>
              </div>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600">Trạng thái</label>
                <p className="text-base sm:text-lg">
                  <Badge className={cn(status.className, "text-xs sm:text-sm")}>{status.text}</Badge>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Vai trò</label>
                <p className="text-base sm:text-lg">
                  <Badge className="bg-blue-200 text-blue-800 text-xs sm:text-sm">{member.role}</Badge>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Ngày tham gia</label>
                <p className="text-base sm:text-lg">{member.joinDate}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Cập nhật lần cuối</label>
                <p className="text-base sm:text-lg">{member.updatedAt}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MemberDetailModal;