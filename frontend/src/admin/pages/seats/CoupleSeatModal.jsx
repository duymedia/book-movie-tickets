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
import { Button } from "../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@radix-ui/react-select";
import { Armchair, Save, X, Loader2, Heart } from "lucide-react";
import { toast } from "react-hot-toast";

const CoupleSeatModal = ({ isOpen, onClose, onSave, rooms = [], cinemas = [] }) => {
  const [formData, setFormData] = useState({
    roomId: rooms[0]?.id?.toString() || "",
    cinemaId: "",
    rows: "10",
    seatsPerRow: "12",
  });
  const [seatLayout, setSeatLayout] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [firstCoupleSeat, setFirstCoupleSeat] = useState(null);
  const [seatConfig] = useState({
    type: "couple",
    status: "available",
  });
  const [saving, setSaving] = useState(false);

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
          (s) => s.id === seatId || (s.isCouple && s.id.includes(seatId))
        );
        rowSeats.push({
          id: seatId,
          row: rowLabels[row],
          number: seat,
          occupied: !!seatData,
          type: seatData?.type || "normal",
          isCouple: seatData?.isCouple || false,
          isSecondSeatOfCouple:
            seatData?.isCouple && seatId !== seatData.id.split("-")[0],
          status: seatData?.status || "available",
        });
      }
      layout.push(rowSeats);
    }
    setSeatLayout(layout);
  };

  useEffect(() => {
    if (isOpen) {
      const selectedRoom = rooms.find((r) => r.id === parseInt(formData.roomId));
      setFormData((prev) => ({
        ...prev,
        roomId: rooms[0]?.id?.toString() || "",
        cinemaId: selectedRoom?.cinemaId?.toString() || cinemas[0]?.id?.toString() || "",
      }));
      generateSeatLayout(
        parseInt(formData.rows) || 10,
        parseInt(formData.seatsPerRow) || 12,
        selectedSeats
      );
    }
  }, [isOpen, rooms, cinemas]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const parsedValue = value === "" ? "" : parseInt(value);
    if (name === "rows" || name === "seatsPerRow") {
      if (parsedValue < 0) {
        toast.error("Số hàng và số ghế mỗi hàng phải là số không âm");
        return;
      }
    }
    setFormData((prev) => {
      const newFormData = { ...prev, [name]: value };
      if (name === "rows" || name === "seatsPerRow") {
        const rows = name === "rows" ? parsedValue : parseInt(newFormData.rows) || 0;
        const seatsPerRow =
          name === "seatsPerRow" ? parsedValue : parseInt(newFormData.seatsPerRow) || 0;
        if (rows > 0 && seatsPerRow > 0) {
          generateSeatLayout(rows, seatsPerRow, selectedSeats);
        } else {
          setSeatLayout([]);
          setSelectedSeats([]);
          setFirstCoupleSeat(null);
        }
      }
      return newFormData;
    });
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => {
      const newFormData = { ...prev, [name]: value };
      if (name === "roomId") {
        const selectedRoom = rooms.find((r) => r.id === parseInt(value));
        newFormData.cinemaId = selectedRoom?.cinemaId?.toString() || "";
      }
      return newFormData;
    });
  };

  const handleSeatSelect = (rowIndex, seatIndex) => {
    if (!seatLayout[rowIndex]) return;
    const seat = seatLayout[rowIndex][seatIndex];
    const seatId = seat.id;

    if (seat.status === "maintenance" || seat.occupied) {
      toast.error("Ghế này không khả dụng");
      return;
    }

    if (seat.isSecondSeatOfCouple) {
      return;
    }

    let newSeats = [...selectedSeats];
    const existingSeatIndex = newSeats.findIndex(
      (s) => s.id === seatId || (s.isCouple && s.id.includes(seatId))
    );

    if (existingSeatIndex >= 0) {
      newSeats.splice(existingSeatIndex, 1);
      toast.success(`Đã bỏ chọn ghế đôi ${seatId}`);
      setFirstCoupleSeat(null);
    } else if (!firstCoupleSeat) {
      if (
        seatIndex + 1 >= parseInt(formData.seatsPerRow) ||
        seatLayout[rowIndex][seatIndex + 1]?.occupied ||
        seatLayout[rowIndex][seatIndex + 1]?.status === "maintenance"
      ) {
        toast.error("Không đủ không gian cho ghế đôi. Vui lòng chọn vị trí khác.");
        return;
      }
      setFirstCoupleSeat({ rowIndex, seatIndex, seatId });
      toast.info(`Đã chọn ghế đầu tiên ${seatId}. Vui lòng chọn ghế liền kề.`);
    } else {
      const firstSeat = seatLayout[firstCoupleSeat.rowIndex][firstCoupleSeat.seatIndex];
      const secondSeat = seat;
      if (
        firstCoupleSeat.rowIndex !== rowIndex ||
        parseInt(secondSeat.number) !== parseInt(firstSeat.number) + 1
      ) {
        toast.error("Vui lòng chọn ghế liền kề trong cùng hàng cho ghế đôi.");
        return;
      }

      newSeats = newSeats.filter(
        (s) => s.id !== firstSeat.id && s.id !== secondSeat.id
      );

      newSeats.push({
        id: `${firstSeat.id}-${secondSeat.id}`,
        name: `${firstSeat.id}-${secondSeat.id}`,
        row: firstSeat.row,
        number: `${firstSeat.number}-${secondSeat.number}`,
        rowIndex: firstCoupleSeat.rowIndex + 1,
        colIndex: firstCoupleSeat.seatIndex + 1,
        type: "couple",
        status: seatConfig.status,
        isCouple: true,
      });

      setSelectedSeats(newSeats);
      setFirstCoupleSeat(null);
      toast.success(`Đã chọn ghế đôi ${firstSeat.id}-${secondSeat.id}`);
    }

    setSelectedSeats(newSeats);
    generateSeatLayout(
      parseInt(formData.rows) || 10,
      parseInt(formData.seatsPerRow) || 12,
      newSeats
    );
  };

  const getSeatColor = (seat, rowIndex, seatIndex) => {
    if (seat.status === "maintenance") return "bg-red-500 dark:bg-red-600";
    const isSelected = selectedSeats.some(
      (s) => s.id === seat.id || (s.isCouple && s.id.includes(seat.id))
    );
    if (isSelected) {
      return "bg-pink-500 dark:bg-pink-600 hover:bg-pink-600 dark:hover:bg-pink-700";
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

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.roomId || selectedSeats.length === 0) {
      toast.error("Vui lòng chọn phòng và ít nhất một ghế đôi");
      return;
    }
    setSaving(true);
    try {
      const seatPromises = selectedSeats.map((seat) => {
        return onSave({
          name: seat.name,
          rowIndex: seat.rowIndex,
          colIndex: seat.colIndex,
          seatType: 3, // Couple seat
          status: seat.status,
          room: { id: parseInt(formData.roomId) },
          cinema: { id: parseInt(formData.cinemaId) },
          coupleSeatId: null,
        });
      });
      await Promise.all(seatPromises);
      toast.success("Thêm ghế đôi thành công");
      onClose();
    } catch (error) {
      toast.error("Lưu ghế đôi thất bại");
    } finally {
      setSaving(false);
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
            <Armchair className="h-4 w-4" />
            Thêm ghế đôi
          </DialogTitle>
          <DialogDescription>
            Chọn phòng và vị trí để thêm ghế đôi.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="roomId">Phòng chiếu</Label>
              <Select
                value={formData.roomId}
                onValueChange={(value) => handleSelectChange("roomId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn phòng" />
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
                  onChange={handleInputChange}
                  placeholder="10"
                  min="1"
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
                  onChange={handleInputChange}
                  placeholder="12"
                  min="1"
                  required
                />
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-md font-semibold dark:text-white">Chọn vị trí ghế đôi</h3>
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
                              (s) => s.id === seat.id || (s.isCouple && s.id.includes(seat.id))
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
                  Đã chọn {selectedSeats.length} ghế đôi: {selectedSeats.map((s) => s.id).join(", ")}
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

export default CoupleSeatModal;