import React, { useState } from 'react';
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Edit, Plus } from "lucide-react";

const SeatLayoutView = ({
  seatLayout,
  isEditable,
  editMode,
  rows,
  seatsPerRow,
  selectedSeat,
  selectedSeatType,
  getSeatColor,
  getSeatIcon,
  getCoupleSeatSuggestions,
  handleRowsChange,
  handleSeatsPerRowChange,
  handleAddRow,
  handleRemoveRow,
  handleAddSeat,
  handleSeatClick,
  handleSuggestionClick,
  setEditMode,
  setSelectedSeat,
  setSelectedSeatType,
  handleSeatTypeChange,
  updateSeat
}) => {
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [addSeatDialogOpen, setAddSeatDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");

  const statusMap = {
    "available": "Sẵn sàng",
    "blocked": "Ẩn",
    "broken": "Hư",
  };

  const handleAddSeatConfirm = (type) => {
    if (!selectedSeat || !editMode || !isEditable) return;

    const { rowIndex, seatIndex } = selectedSeat;
    handleAddSeat(rowIndex, seatIndex, type);
    setAddSeatDialogOpen(false);
    setSelectedSeat(null);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-600 dark:to-slate-800 text-white py-3 px-8 rounded-xl inline-block mb-6 shadow-lg">
          <span className="font-semibold">MÀN HÌNH</span>
        </div>
      </div>
      {isEditable && editMode && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="rows">Số hàng</Label>
              <div className="flex items-center mt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveRow}
                  className="mr-2"
                  disabled={rows <= 1}
                >
                  −
                </Button>
                <Input
                  id="rows"
                  type="number"
                  value={rows}
                  onChange={handleRowsChange}
                  min="0"
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddRow}
                  className="ml-2"
                >
                  +
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="seatsPerRow">Ghế mỗi hàng</Label>
              <div className="flex items-center mt-1">
                <Input
                  id="seatsPerRow"
                  type="number"
                  value={seatsPerRow}
                  onChange={handleSeatsPerRowChange}
                  min="0"
                  className="flex-1"
                  disabled
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddSeat("normal")}
            >
              <Plus className="h-4 w-4 mr-2" />
              Thêm ghế thường
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddSeat("couple")}
            >
              <Plus className="h-4 w-4 mr-2" />
              Thêm ghế đôi
            </Button>
          </div>
          <p className="text-blue-800 dark:text-blue-200 text-sm">
            <Edit className="h-4 w-4 inline mr-2" />
            Chế độ chỉnh sửa: Nhấn trái để đổi trạng thái (Hư → Ẩn → Sẵn sàng), nhấn phải để thêm ghế
          </p>
        </div>
      )}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {seatLayout.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="flex items-center justify-center mb-2"
            >
              <div className="w-8 text-center font-bold text-slate-600 dark:text-slate-400 mr-6">
                {row[0]?.row || rowIndex}
              </div>
              <div className="flex gap-1">
                {row.map((seat, seatIndex) => (
                  seat && (
                    <div
                      key={seat.id}
                      className={`${
                        seat.isCouple ? "w-16 h-8" : "w-8 h-8"
                      } rounded-t-lg border-2 border-white dark:border-slate-600 ${
                        editMode && isEditable ? "cursor-pointer" : "cursor-default"
                      } ${getSeatColor(seat)} shadow-sm flex items-center justify-center transition-all duration-200 ${
                        editMode && isEditable ? "hover:scale-110" : ""
                      }`}
                      title={`${seat.id} - ${seat.type} - ${statusMap[seat.status] || seat.status} - ${seat.price.toLocaleString()}₫`}
                      onClick={(e) => {
                        if (editMode && isEditable) {
                          e.preventDefault();
                          handleSeatClick(rowIndex, seatIndex, e);
                        }
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        if (editMode && isEditable) {
                          setSelectedSeat({ rowIndex, seatIndex });
                          if (!seat) {
                            setAddSeatDialogOpen(true);
                          } else {
                            setStatusDialogOpen(true);
                            setSelectedStatus(seat.status || "available");
                          }
                        }
                      }}
                    >
                      {getSeatIcon(seat)}
                    </div>
                  )
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {seatLayout.flat().filter((s) => s?.type === "normal").length}
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-300">Ghế thường</p>
        </div>
        <div className="text-center p-4 bg-pink-50 dark:bg-pink-900/20 rounded-xl">
          <p className="text-2xl font-bold text-pink-600 dark:text-pink-400">
            {seatLayout.flat().filter((s) => s?.isCouple).length}
          </p>
          <p className="text-sm text-pink-700 dark:text-pink-300">Ghế đôi</p>
        </div>
        <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {seatLayout.flat().filter((s) => s?.status === "blocked").length}
          </p>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">Ẩn</p>
        </div>
        <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/20 rounded-xl">
          <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
            {seatLayout.flat().filter((s) => s?.status === "broken").length}
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300">Hư</p>
        </div>
      </div>
      {isEditable && (
        <div className="flex gap-2 justify-end">
          <Button
            variant={editMode ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setEditMode(!editMode);
              setSelectedSeat(null);
            }}
          >
            <Edit className="h-4 w-4 mr-2" />
            {editMode ? "Hoàn thành" : "Chỉnh sửa"}
          </Button>
        </div>
      )}
      <Dialog open={selectedSeat !== null || statusDialogOpen || addSeatDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setStatusDialogOpen(false);
          setAddSeatDialogOpen(false);
          setSelectedSeat(null);
          setSelectedStatus("");
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Quản lý ghế</DialogTitle>
          </DialogHeader>
          {statusDialogOpen && (
            <>
              <div className="py-4">
                <Label>Chọn trạng thái</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Sẵn sàng</SelectItem>
                    <SelectItem value="blocked">Ẩn</SelectItem>
                    <SelectItem value="broken">Hư</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Hủy</Button>
                <Button onClick={() => {
                  if (!selectedSeat || !editMode || !isEditable) return;
                  const { rowIndex, seatIndex } = selectedSeat;
                  handleSeatClick(rowIndex, seatIndex, { type: "contextmenu", status: selectedStatus });
                  setStatusDialogOpen(false);
                  setSelectedSeat(null);
                  setSelectedStatus("");
                }}>Cập nhật</Button>
              </DialogFooter>
            </>
          )}
          {addSeatDialogOpen && (
            <>
              <div className="py-4">
                <Label>Chọn loại ghế</Label>
                <Select value={selectedSeatType} onValueChange={setSelectedSeatType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn loại ghế" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Ghế thường</SelectItem>
                    <SelectItem value="couple">Ghế đôi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddSeatDialogOpen(false)}>Hủy</Button>
                <Button onClick={() => handleAddSeatConfirm(selectedSeatType)}>Thêm ghế</Button>
              </DialogFooter>
            </>
          )}
          {!statusDialogOpen && !addSeatDialogOpen && selectedSeat && (
            <Select
              value={selectedSeatType}
              onValueChange={(value) => {
                setSelectedSeatType(value);
                if (value !== "couple" && value !== "suggestions") {
                  handleSeatTypeChange(value, selectedSeat?.rowIndex, selectedSeat?.seatIndex);
                  if (selectedSeat) {
                    const seat = seatLayout[selectedSeat.rowIndex][selectedSeat.seatIndex];
                    updateSeat(seat.seatId, { seatType: value === "normal" ? 1 : value === "remove" ? null : 2 });
                  }
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn hành động" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Chuyển thành ghế thường</SelectItem>
                <SelectItem value="couple">Chuyển thành ghế đôi</SelectItem>
                <SelectItem value="suggestions">Chọn ghế đôi từ gợi ý</SelectItem>
                <SelectItem value="remove">Xóa ghế</SelectItem>
              </SelectContent>
            </Select>
          )}
          {(selectedSeatType === "couple" || selectedSeatType === "suggestions") && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Gợi ý vị trí ghế đôi
              </h4>
              {getCoupleSeatSuggestions().length > 0 ? (
                <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-md">
                  {getCoupleSeatSuggestions().map((suggestion) => (
                    <div
                      key={`${suggestion.rowIndex}-${suggestion.seatIndex}`}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer text-sm text-slate-600 dark:text-slate-400"
                      onClick={() => handleSuggestionClick(suggestion.rowIndex, suggestion.seatIndex)}
                    >
                      Ghế {suggestion.id} (Hàng {suggestion.rowIndex + 1})
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Không có vị trí phù hợp cho ghế đôi. Hãy thêm ghế hoặc kiểm tra lại sơ đồ.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SeatLayoutView;