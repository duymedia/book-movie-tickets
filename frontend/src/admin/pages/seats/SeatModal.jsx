import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Button } from "../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Monitor, Save, X, Loader2, Heart } from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import axios from "axios";

const API_BASE_URL = "http://localhost:8080/api/admin";

const SeatModal = ({ isOpen, onClose, onSave, isEdit = false, cinemas = [] }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    cinemaId: "",
    roomId: "",
    rows: "",
    seatsPerRow: "",
    description: "",
    seats: [],
  });
  const [seatLayout, setSeatLayout] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [firstCoupleSeat, setFirstCoupleSeat] = useState(null);
  const [seatConfig, setSeatConfig] = useState({
    type: "normal",
    status: "available",
  });
  const [rooms, setRooms] = useState([]);
  const [saving, setSaving] = useState(false);
  const token = localStorage.getItem("authToken");

  // Fetch rooms when cinema changes
  useEffect(() => {
    if (!formData.cinemaId || !token) return;

    const fetchRooms = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/rooms/cinema/${formData.cinemaId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRooms(response.data);
        setFormData((prev) => ({ ...prev, roomId: "" }));
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: error.response?.data?.message || "Không thể tải danh sách phòng.",
        });
      }
    };

    fetchRooms();
  }, [formData.cinemaId, token, toast]);

  // Initialize form data
  useEffect(() => {
    if (isOpen) {
      setFormData({
        cinemaId: cinemas[0]?.id?.toString() || "",
        roomId: "",
        rows: "",
        seatsPerRow: "",
        description: "",
        seats: [],
      });
      setSeatLayout([]);
      setSelectedSeats([]);
      setFirstCoupleSeat(null);
    }
  }, [isOpen, cinemas]);

  const generateSeatLayout = (rows, seatsPerRow, seats = []) => {
    if (rows <= 0 || seatsPerRow <= 0) {
      setSeatLayout([]);
      return;
    }
    const layout = [];
    const rowLabels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    for (let row = 0; row < rows; row++) {
      const rowSeats = [];
      for (let seat = 1; seat <= seatsPerRow; seat++) {
        const seatId = `${rowLabels[row]}${seat}`;
        const seatData = seats.find(
          (s) => s.id === seatId || (s.isCouple && s.coupleSeatId?.includes(seatId))
        );
        rowSeats.push({
          id: seatId,
          row: rowLabels[row],
          number: seat,
          occupied: !!seatData,
          type: seatData?.type || "normal",
          isCouple: seatData?.isCouple || false,
          isSecondSeatOfCouple:
            seatData?.isCouple && seatId !== seatData.id,
          status: seatData?.status || "available",
        });
      }
      layout.push(rowSeats);
    }
    setSeatLayout(layout);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.cinemaId || !formData.roomId || !formData.rows || !formData.seatsPerRow || formData.seats.length === 0) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Vui lòng chọn rạp, phòng, nhập số hàng, số ghế mỗi hàng và chọn ít nhất một ghế.",
      });
      return;
    }

    setSaving(true);
    try {
      const seatPayload = {
        roomId: parseInt(formData.roomId),
        cinemaId: parseInt(formData.cinemaId),
        seats: formData.seats.map((seat) => {
          const [rowLabel, col] = seat.id.split(/(?=\d+)/);
          const rowIndex = rowLabel.charCodeAt(0) - 65 + 1;
          const seatTypeMap = { normal: 1, vip: 2, couple: 3 };
          return {
            name: seat.id,
            rowIndex,
            colIndex: parseInt(col),
            seatType: seatTypeMap[seat.type] || 1,
            status: seat.status,
            coupleSeatId: seat.isCouple ? seat.coupleSeatId : null,
          };
        }),
      };

      await axios.post(`${API_BASE_URL}/seats/custom`, seatPayload, {
        headers: { Authorization: "Bearer " + token },
      });

      toast({
        title: "Thành công",
        description: "Tạo ghế thành công",
      });
      await onSave(formData);
      onClose();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.response?.data?.message || "Tạo ghế thất bại",
      });
    } finally {
      setSaving(false);
    }
  };

  const getSeatColor = (seat, rowIndex, seatIndex) => {
    if (seat.status === "maintenance") return "bg-red-500 dark:bg-red-600";
    const isSelected = selectedSeats.some(
      (s) => s.id === seat.id || (s.isCouple && s.coupleSeatId?.includes(seat.id))
    );
    if (isSelected) {
      if (seat.isCouple || seat.type === "couple") {
        return "bg-pink-500 dark:bg-pink-600 hover:bg-pink-600 dark:hover:bg-pink-700";
      }
      return "bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700";
    }
    if (
      seatConfig.type === "couple" &&
      firstCoupleSeat &&
      rowIndex === firstCoupleSeat.rowIndex &&
      seatIndex === firstCoupleSeat.seatIndex + 1
    ) {
      return "bg-pink-300 dark:bg-pink-400 hover:bg-pink-400 dark:hover:bg-pink-500 animate-pulse";
    }
    return "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600";
  };

  const getSeatIcon = (seat) => {
    if (seat.isCouple || seat.type === "couple") {
      return <Heart className="h-2.5 w-2.5 text-white" />;
    }
    return <span className="text-[10px] text-white font-bold">{seat.number}</span>;
  };

  const handleSeatSelect = (rowIndex, seatIndex) => {
    if (!seatLayout[rowIndex]) return;
    const seat = seatLayout[rowIndex][seatIndex];
    const seatId = seat.id;

    if (seat.status === "maintenance") {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Ghế này đang bảo trì",
      });
      return;
    }

    if (seat.isSecondSeatOfCouple) {
      return;
    }

    let newSeats = [...selectedSeats];
    const existingSeatIndex = newSeats.findIndex(
      (s) => s.id === seatId || (s.isCouple && s.coupleSeatId?.includes(seatId))
    );

    if (seatConfig.type === "normal") {
      if (existingSeatIndex >= 0) {
        newSeats.splice(existingSeatIndex, 1);
        toast({
          title: "Thông báo",
          description: `Đã bỏ chọn ghế ${seatId}`,
        });
      } else {
        newSeats.push({
          id: seatId,
          row: seat.row,
          number: seat.number,
          type: "normal",
          status: seatConfig.status,
          isCouple: false,
        });
        toast({
          title: "Thông báo",
          description: `Đã chọn ghế ${seatId}`,
        });
      }
    } else if (seatConfig.type === "couple") {
      if (existingSeatIndex >= 0) {
        newSeats.splice(existingSeatIndex, 1);
        toast({
          title: "Thông báo",
          description: `Đã bỏ chọn ghế đôi ${newSeats[existingSeatIndex].coupleSeatId}`,
        });
        setFirstCoupleSeat(null);
      } else if (!firstCoupleSeat) {
        if (
          seatIndex + 1 >= parseInt(formData.seatsPerRow) ||
          seatLayout[rowIndex][seatIndex + 1]?.occupied ||
          seatLayout[rowIndex][seatIndex + 1]?.status === "maintenance"
        ) {
          toast({
            variant: "destructive",
            title: "Lỗi",
            description: "Không đủ không gian cho ghế đôi. Vui lòng chọn vị trí khác.",
          });
          return;
        }
        setFirstCoupleSeat({ rowIndex, seatIndex, seatId });
        toast({
          title: "Thông báo",
          description: `Đã chọn ghế đầu tiên ${seatId}. Vui lòng chọn ghế liền kề.`,
        });
      } else {
        const firstSeat = seatLayout[firstCoupleSeat.rowIndex][firstCoupleSeat.seatIndex];
        const secondSeat = seat;
        if (
          firstCoupleSeat.rowIndex !== rowIndex ||
          parseInt(secondSeat.number) !== parseInt(firstSeat.number) + 1
        ) {
          toast({
            variant: "destructive",
            title: "Lỗi",
            description: "Vui lòng chọn ghế liền kề trong cùng hàng cho ghế đôi.",
          });
          return;
        }

        newSeats = newSeats.filter(
          (s) => s.id !== firstSeat.id && s.id !== secondSeat.id
        );

        newSeats.push({
          id: firstSeat.id, // Primary seat ID (e.g., C1)
          row: firstSeat.row,
          number: firstSeat.number,
          type: "couple",
          status: seatConfig.status,
          isCouple: true,
          coupleSeatId: `${firstSeat.id}-${secondSeat.id}`, // Full pair ID (e.g., C1-C2)
        });

        setSelectedSeats(newSeats);
        setFormData((prev) => ({ ...prev, seats: newSeats }));
        setFirstCoupleSeat(null);
        toast({
          title: "Thông báo",
          description: `Đã chọn ghế đôi ${firstSeat.id}-${secondSeat.id}`,
        });
      }
    }

    setSelectedSeats(newSeats);
    setFormData((prev) => ({ ...prev, seats: newSeats }));
    generateSeatLayout(
      parseInt(formData.rows) || 10,
      parseInt(formData.seatsPerRow) || 12,
      newSeats
    );
  };

  const handleRowsColsChange = (e) => {
    const { name, value } = e.target;
    const parsedValue = value === "" ? "" : parseInt(value);
    const newFormData = { ...formData, [name]: value };

    if (parsedValue < 0) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Số hàng và số ghế mỗi hàng phải là số không âm",
      });
      return;
    }

    setFormData(newFormData);

    const rows = name === "rows" ? parsedValue : parseInt(newFormData.rows) || 0;
    const seatsPerRow =
      name === "seatsPerRow" ? parsedValue : parseInt(newFormData.seatsPerRow) || 0;

    if (rows > 0 && seatsPerRow > 0) {
      newFormData.totalSeats = (rows * seatsPerRow).toString();
      generateSeatLayout(rows, seatsPerRow, selectedSeats);
      setFormData(newFormData);
    } else {
      setSeatLayout([]);
      newFormData.totalSeats = "";
      setFormData(newFormData);
      setSelectedSeats([]);
      setFirstCoupleSeat(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto scrollbar-hide">
        <style>
          {`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
            .scrollbar-hide {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}
        </style>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            {isEdit ? "Chỉnh sửa ghế ngồi" : "Thêm ghế ngồi mới"}
          </DialogTitle>
          <DialogDescription>
            Chọn rạp, phòng và vị trí ghế để tạo ghế mới.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="cinemaId">Rạp chiếu</Label>
              <Select
                value={formData.cinemaId}
                onValueChange={(value) =>
                  setFormData({ ...formData, cinemaId: value })
                }
              >
                <SelectTrigger>
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
            </div>
            <div>
              <Label htmlFor="roomId">Phòng chiếu</Label>
              <Select
                value={formData.roomId}
                onValueChange={(value) =>
                  setFormData({ ...formData, roomId: value })
                }
                disabled={!formData.cinemaId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn phòng chiếu" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((room) => (
                    <SelectItem key={room.id} value={room.id.toString()}>
                      {room.numberRoom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="rows">Số hàng</Label>
                <Input
                  id="rows"
                  name="rows"
                  type="number"
                  value={formData.rows}
                  onChange={handleRowsColsChange}
                  placeholder="10"
                  min="0"
                  required
                />
              </div>
              <div>
                <Label htmlFor="seatsPerRow">Ghế/hàng</Label>
                <Input
                  id="seatsPerRow"
                  name="seatsPerRow"
                  type="number"
                  value={formData.seatsPerRow}
                  onChange={handleRowsColsChange}
                  placeholder="12"
                  min="0"
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Mô tả về ghế ngồi..."
                rows={2}
              />
            </div>
            <div className="space-y-3">
              <h3 className="text-md font-semibold dark:text-white">Cấu hình ghế</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="seatType">Loại ghế</Label>
                  <Select
                    id="seatType"
                    value={seatConfig.type}
                    onValueChange={(value) => {
                      setSeatConfig({ ...seatConfig, type: value });
                      setFirstCoupleSeat(null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn loại ghế" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Ghế thường</SelectItem>
                      <SelectItem value="couple">Ghế đôi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="seatStatus">Trạng thái</Label>
                  <Select
                    id="seatStatus"
                    value={seatConfig.status}
                    onValueChange={(value) =>
                      setSeatConfig({ ...seatConfig, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Sẵn sàng</SelectItem>
                      <SelectItem value="maintenance">Bảo trì</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-md font-semibold dark:text-white">Chọn vị trí ghế</h3>
              {seatLayout.length > 0 ? (
                <div className="overflow-x-auto scrollbar-hide">
                  <div className="inline-block min-w-full">
                    <div className="flex mb-1 gap-0.5">
                      <div className="w-10 h-6 flex items-center justify-center"></div>
                      {Array.from({ length: parseInt(formData.seatsPerRow) || 0 }).map(
                        (_, colIndex) => (
                          <div
                            key={colIndex}
                            className="w-6 h-6 flex items-center justify-center text-[10px] text-slate-600 dark:text-slate-400"
                          >
                            {colIndex + 1}
                          </div>
                        )
                      )}
                    </div>
                    {seatLayout.map((row, rowIndex) => (
                      <div key={rowIndex} className="flex items-center mb-1">
                        <div className="w-6 text-center font-bold text-[12px] text-slate-600 dark:text-slate-400 mr-4">
                          {row[0]?.row}
                        </div>
                        <div className="flex gap-0.5">
                          {row.map((seat, seatIndex) => {
                            if (seat.isSecondSeatOfCouple) return null;
                            const isSelected = selectedSeats.some(
                              (s) => s.id === seat.id || (s.isCouple && s.coupleSeatId?.includes(seat.id))
                            );
                            const isFirstCouple =
                              firstCoupleSeat && firstCoupleSeat.seatId === seat.id;
                            const isSuggested =
                              seatConfig.type === "couple" &&
                              firstCoupleSeat &&
                              rowIndex === firstCoupleSeat.rowIndex &&
                              seatIndex === firstCoupleSeat.seatIndex + 1;
                            return (
                              <div
                                key={seat.id}
                                className={`${
                                  seat.isCouple || seat.type === "couple" ? "w-12 h-6" : "w-6 h-6"
                                } rounded-t-md border-[1.5px] border-white dark:border-slate-600 ${
                                  seat.status === "maintenance" || (seat.occupied && !isSelected)
                                    ? "cursor-not-allowed"
                                    : "cursor-pointer"
                                } ${getSeatColor(seat, rowIndex, seatIndex)} shadow-xs flex items-center justify-center transition-all duration-150 ${
                                  (isSelected || isFirstCouple || isSuggested)
                                    ? "hover:scale-105"
                                    : ""
                                }`}
                                title={`${seat.id} - ${seat.type} - ${seat.status}`}
                                onClick={() => handleSeatSelect(rowIndex, seatIndex)}
                              >
                                {getSeatIcon(seat)}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-center text-sm text-slate-600 dark:text-slate-400">
                  Nhập số hàng và ghế mỗi hàng để tạo sơ đồ.
                </p>
              )}
              {selectedSeats.length > 0 && (
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Đã chọn {selectedSeats.length} ghế: {selectedSeats.map((s) => s.id).join(", ")}
                </p>
              )}
              {firstCoupleSeat && (
                <p className="text-xs text-pink-600 dark:text-pink-400">
                  Đã chọn ghế đầu tiên: {firstCoupleSeat.seatId}. Chọn ghế liền kề.
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2 pt-3">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1 text-sm"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Hủy
            </Button>
            <Button type="submit" disabled={saving} className="flex-1 text-sm">
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5 mr-1" />
              )}
              {saving ? "Đang lưu..." : "Lưu"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SeatModal;