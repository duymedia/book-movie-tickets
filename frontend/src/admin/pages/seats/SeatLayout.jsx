import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useToast } from "../../hooks/use-toast";
import SeatLayoutView from "./SeatLayoutView";
import { Heart } from "lucide-react";

const API_BASE_URL = "http://localhost:8080/api/admin";

const SeatLayout = ({ room, isEditable = false, onSave }) => {
  const { toast } = useToast();
  const [seatLayout, setSeatLayout] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [rows, setRows] = useState(room?.rows || 10);
  const [seatsPerRow, setSeatsPerRow] = useState(room?.seatsPerRow || 12);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [selectedSeatType, setSelectedSeatType] = useState("normal");
  const [loading, setLoading] = useState(true);
  const [changedSeats, setChangedSeats] = useState({}); // Track changed seat statuses
  const token = localStorage.getItem("authToken");

  const seatTypes = [
    { id: 1, name: "Ghế thường", price: 80000, type: "normal" },
    { id: 2, name: "Ghế đôi", price: 200000, type: "couple" },
    { id: 3, name: "Bảo trì", price: 0, type: "broken" },
    { id: 4, name: "Hỏng", price: 0, type: "blocked" },
  ];

  const fetchSeats = useCallback(async () => {
    if (!room?.id) return;
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/seats/room/${room.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const seats = response.data;
      generateSeatLayout(seats);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description:
          error.response?.data?.message || "Không thể tải danh sách ghế.",
      });
      setSeatLayout([]);
    } finally {
      setLoading(false);
    }
  }, [room, token, toast]);

  useEffect(() => {
    fetchSeats();
  }, [fetchSeats]);

  const generateSeatLayout = (seats) => {
    if (!seats || seats.length === 0) {
      setRows(10);
      setSeatsPerRow(12);
      setSeatLayout(createEmptyLayout(10, 12));
      return;
    }

    const maxRow = Math.max(...seats.map((s) => s.rowIndex));
    const maxCol = Math.max(...seats.map((s) => s.colIndex));
    setRows(maxRow);
    setSeatsPerRow(maxCol);

    const layout = Array.from({ length: maxRow }, () =>
      Array(maxCol).fill(null)
    );
    const processedCoupleSeats = new Set();

    seats.forEach((seat) => {
      const rowIndex = seat.rowIndex - 1;
      const colIndex = seat.colIndex - 1;
      const seatType =
        seatTypes.find((t) => t.id === seat.seatType)?.type || "normal";
      const price =
        seatTypes.find((t) => t.id === seat.seatType)?.price || 80000;

      if (
        seat.seatType === 3 &&
        seat.coupleSeatId &&
        !processedCoupleSeats.has(seat.coupleSeatId)
      ) {
        const coupleSeat = seats.find((s) => s.id === seat.coupleSeatId);
        if (coupleSeat) {
          processedCoupleSeats.add(seat.id);
          processedCoupleSeats.add(coupleSeat.id);
          const primaryColIndex =
            Math.min(seat.colIndex, coupleSeat.colIndex) - 1;
          const coupleId = `${seat.name}-${coupleSeat.name}`;
          layout[rowIndex][primaryColIndex] = {
            seatId: seat.id,
            id: coupleId,
            row: String.fromCharCode(65 + rowIndex),
            number: `${Math.min(seat.colIndex, coupleSeat.colIndex)}-${Math.max(
              seat.colIndex,
              coupleSeat.colIndex
            )}`,
            type: "couple",
            status: seat.status,
            price,
            isCouple: true,
            primarySeat:
              seat.colIndex <= coupleSeat.colIndex ? seat : coupleSeat,
            secondarySeat:
              seat.colIndex > coupleSeat.colIndex ? seat : coupleSeat,
          };
          const secondaryColIndex =
            Math.max(seat.colIndex, coupleSeat.colIndex) - 1;
          if (secondaryColIndex >= 0 && secondaryColIndex < maxCol) {
            layout[rowIndex][secondaryColIndex] = null;
          }
        }
      } else if (
        seat.seatType !== 3 ||
        !seat.coupleSeatId ||
        !processedCoupleSeats.has(seat.id)
      ) {
        layout[rowIndex][colIndex] = {
          seatId: seat.id,
          id: seat.name,
          row: String.fromCharCode(65 + rowIndex),
          number: seat.colIndex,
          type: seatType,
          status: seat.status,
          price,
          isCouple: false,
        };
      }
    });

    setSeatLayout(layout);
  };

  const createEmptyLayout = (rows, seatsPerRow) => {
    const rowLabels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return Array.from({ length: rows }, (_, rowIndex) =>
      Array.from({ length: seatsPerRow }, (_, colIndex) => {
        const seatId = `${rowLabels[rowIndex]}${colIndex + 1}`;
        return {
          id: seatId,
          row: rowLabels[rowIndex],
          number: colIndex + 1,
          type: "normal",
          status: "available",
          price: 80000,
          isCouple: false,
        };
      })
    );
  };

  const getSeatColor = (seat) => {
    if (!seat) return "bg-transparent";
    if (seat.status === "broken") return "bg-red-500 dark:bg-red-600";
    if (seat.status === "blocked") return "bg-yellow-500 dark:bg-secondary-600";
    if (seat.status === "occupied") return "bg-gray-400 dark:bg-gray-500";
    switch (seat.type) {
      case "vip":
        return "bg-purple-500 dark:bg-purple-600 hover:bg-purple-600 dark:hover:bg-purple-700";
      case "couple":
        return "bg-pink-500 dark:bg-pink-600 hover:bg-pink-600 dark:hover:bg-pink-700";
      default:
        return "bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700";
    }
  };

  const getSeatIcon = (seat) => {
    if (!seat) return null;
    if (seat.type === "couple") {
      return <Heart className="h-4 w-4 text-white" />;
    }
    return <span className="text-xs text-white font-bold">{seat.number}</span>;
  };

  const getCoupleSeatSuggestions = () => {
    const suggestions = [];
    const rowLabels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    seatLayout.forEach((row, rowIndex) => {
      for (let seatIndex = 0; seatIndex < seatsPerRow - 1; seatIndex++) {
        const seat = row[seatIndex];
        const nextSeat = row[seatIndex + 1];
        if (
          (!seat || !seat.isCouple) &&
          (!nextSeat || !nextSeat.isCouple) &&
          (!seat || seat.id !== nextSeat?.id)
        ) {
          suggestions.push({
            rowIndex,
            seatIndex,
            id: `${rowLabels[rowIndex]}${seatIndex + 1}`,
          });
        }
      }
    });

    return suggestions;
  };

  const updateSeatStatus = async (seatId, status) => {
    try {
      await axios.put(
        `${API_BASE_URL}/seats/${seatId}`,
        { status: status === "blocked" ? "blocked" : status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({
        title: "Thành công",
        description: `Đã cập nhật trạng thái ghế ${seatId}`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description:
          error.response?.data?.message || "Không thể cập nhật trạng thái ghế",
      });
      throw error;
    }
  };

  const updateSeat = async (seatId, { seatType }) => {
    if (!seatId) return;
    try {
      await axios.put(
        `${API_BASE_URL}/seats/${seatId}`,
        { seatType },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({
        title: "Thành công",
        description: `Đã cập nhật loại ghế ${seatId}`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description:
          error.response?.data?.message || "Không thể cập nhật loại ghế",
      });
      throw error;
    }
  };

  const handleSeatClick = async (rowIndex, seatIndex, event) => {
    if (!editMode || !isEditable) return;

    const seat = seatLayout[rowIndex]?.[seatIndex];
    if (!seat || !seat.seatId) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Ghế không hợp lệ hoặc chưa được lưu trong cơ sở dữ liệu",
      });
      return;
    }

    let newStatus;
    if (event.type === "contextmenu" && event.status) {
      newStatus = event.status;
    } else {
      // Cycle status: broken → blocked → available
      if (seat.status === "available") {
        newStatus = "broken";
      } else if (seat.status === "broken") {
        newStatus = "blocked";
      } else {
        newStatus = "available";
      }
    }

    // Update seat status via API
    try {
      await updateSeatStatus(seat.seatId, newStatus);
    } catch {
      return; // Exit if API update fails
    }

    const newLayout = [...seatLayout];
    newLayout[rowIndex][seatIndex] = {
      ...seat,
      status: newStatus,
    };

    setSeatLayout(newLayout);
    toast({
      title: "Thành công",
      description: `Ghế ${seat.id} được đặt thành ${
        newStatus === "available"
          ? "sẵn sàng"
          : newStatus === "broken"
          ? "hư"
          : "ẩn"
      }`,
    });

    if (event.type === "contextmenu") {
      setSelectedSeat({ rowIndex, seatIndex });
      setSelectedSeatType(seat.type);
    }
  };

  const handleSeatTypeChange = (newType, rowIndex, seatIndex) => {
    if (rowIndex == null || seatIndex == null) return;

    const newLayout = [...seatLayout];
    const seat = newLayout[rowIndex][seatIndex];
    const rowLabels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    if (newType === "normal") {
      if (seat.isCouple) {
        const primaryColIndex = seatIndex;
        const secondaryColIndex =
          seat.primarySeat.colIndex < seat.secondarySeat.colIndex
            ? seatIndex + 1
            : seatIndex - 1;
        newLayout[rowIndex][primaryColIndex] = {
          seatId: seat.primarySeat.id,
          id: `${rowLabels[rowIndex]}${seat.primarySeat.colIndex}`,
          row: rowLabels[rowIndex],
          number: seat.primarySeat.colIndex,
          type: "normal",
          status: "available",
          price: 80000,
          isCouple: false,
        };
        if (secondaryColIndex >= 0 && secondaryColIndex < seatsPerRow) {
          newLayout[rowIndex][secondaryColIndex] = {
            seatId: seat.secondarySeat.id,
            id: `${rowLabels[rowIndex]}${seat.secondarySeat.colIndex}`,
            row: rowLabels[rowIndex],
            number: seat.secondarySeat.colIndex,
            type: "normal",
            status: "available",
            price: 80000,
            isCouple: false,
          };
        }
        toast({
          title: "Thành công",
          description: `Ghế ${seat.id} được chuyển thành ghế thường`,
        });
      } else {
        const newColIndex = seatIndex;
        newLayout[rowIndex][newColIndex] = {
          seatId: null,
          id: `${rowLabels[rowIndex]}${newColIndex + 1}`,
          row: rowLabels[rowIndex],
          number: newColIndex + 1,
          type: "normal",
          status: "available",
          price: 80000,
          isCouple: false,
        };
        toast({
          title: "Thành công",
          description: `Đã thêm ghế thường ${rowLabels[rowIndex]}${
            newColIndex + 1
          }`,
        });
      }
      setSelectedSeat(null);
    } else if (newType === "couple") {
      if (seatIndex >= seatsPerRow - 1) {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description:
            "Ghế đôi cần hai ghế liền kề, không thể đặt ở vị trí cuối hàng",
        });
        return;
      }

      const nextSeat = newLayout[rowIndex][seatIndex + 1];
      if (nextSeat && nextSeat.isCouple && nextSeat.id !== seat?.id) {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: "Ghế bên cạnh đã là một phần của ghế đôi khác",
        });
        return;
      }

      const coupleId = `${
        seat?.id || `${rowLabels[rowIndex]}${seatIndex + 1}`
      }-${rowLabels[rowIndex]}${seatIndex + 2}`;
      const coupleNumber = `${seat?.number || seatIndex + 1}-${seatIndex + 2}`;
      newLayout[rowIndex][seatIndex] = {
        seatId: null,
        id: coupleId,
        row: rowLabels[rowIndex],
        number: coupleNumber,
        type: "couple",
        status: "available",
        price: 200000,
        isCouple: true,
        primarySeat: { colIndex: seatIndex + 1 },
        secondarySeat: { colIndex: seatIndex + 2 },
      };
      newLayout[rowIndex][seatIndex + 1] = null;
      toast({
        title: "Thành công",
        description: `Ghế ${coupleId} được chuyển thành ghế đôi`,
      });
      setSelectedSeat(null);
    } else if (newType === "remove") {
      if (seat.isCouple) {
        const primaryColIndex = seatIndex;
        const secondaryColIndex =
          seat.primarySeat.colIndex < seat.secondarySeat.colIndex
            ? seatIndex + 1
            : seatIndex - 1;
        newLayout[rowIndex][primaryColIndex] = null;
        if (secondaryColIndex >= 0 && secondaryColIndex < seatsPerRow) {
          newLayout[rowIndex][secondaryColIndex] = null;
        }
      } else {
        newLayout[rowIndex][seatIndex] = null;
      }
      toast({
        title: "Thành công",
        description: `Ghế ${seat.id} đã được xóa`,
      });
      setSelectedSeat(null);
    }

    setSeatLayout(newLayout);
    onSave({
      ...room,
      rows,
      seatsPerRow,
      totalSeats: newLayout.flat().filter((seat) => seat !== null).length,
      seats: newLayout
        .flat()
        .filter((seat) => seat !== null)
        .map((seat) => ({
          seatId: seat.seatId,
          id: seat.id,
          row: seat.row,
          number: seat.number,
          type: seat.type,
          status: seat.status,
          price: seat.price,
          isCouple: seat.isCouple,
          primarySeat: seat.primarySeat,
          secondarySeat: seat.secondarySeat,
        })),
      vipSeats: newLayout.flat().filter((s) => s?.type === "vip").length,
      coupleSeats: newLayout.flat().filter((s) => s?.type === "couple").length,
    });
  };

  const handleSuggestionClick = (rowIndex, seatIndex) => {
    handleSeatTypeChange("couple", rowIndex, seatIndex);
  };

  const handleRowsChange = (e) => {
    const newRows = parseInt(e.target.value) || 0;
    if (newRows < 0) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Số hàng phải là số không âm",
      });
      return;
    }
    setRows(newRows);
    const newLayout = Array.from({ length: newRows }, (_, i) =>
      i < seatLayout.length ? [...seatLayout[i]] : Array(seatsPerRow).fill(null)
    );
    setSeatLayout(newLayout);
    onSave({
      ...room,
      rows: newRows,
      seatsPerRow,
      totalSeats: newLayout.flat().filter((seat) => seat !== null).length,
      seats: newLayout
        .flat()
        .filter((seat) => seat !== null)
        .map((seat) => ({
          seatId: seat.seatId,
          id: seat.id,
          row: seat.row,
          number: seat.number,
          type: seat.type,
          status: seat.status,
          price: seat.price,
          isCouple: seat.isCouple,
          primarySeat: seat.primarySeat,
          secondarySeat: seat.secondarySeat,
        })),
      vipSeats: newLayout.flat().filter((s) => s?.type === "vip").length,
      coupleSeats: newLayout.flat().filter((s) => s?.type === "couple").length,
    });
  };

  const handleAddRow = () => {
    const newRows = rows + 1;
    setRows(newRows);
    const newLayout = [...seatLayout, Array(seatsPerRow).fill(null)];
    setSeatLayout(newLayout);
    onSave({
      ...room,
      rows: newRows,
      seatsPerRow,
      totalSeats: newLayout.flat().filter((seat) => seat !== null).length,
      seats: newLayout
        .flat()
        .filter((seat) => seat !== null)
        .map((seat) => ({
          seatId: seat.seatId,
          id: seat.id,
          row: seat.row,
          number: seat.number,
          type: seat.type,
          status: seat.status,
          price: seat.price,
          isCouple: seat.isCouple,
          primarySeat: seat.primarySeat,
          secondarySeat: seat.secondarySeat,
        })),
      vipSeats: newLayout.flat().filter((s) => s?.type === "vip").length,
      coupleSeats: newLayout.flat().filter((s) => s?.type === "couple").length,
    });
  };

  const handleRemoveRow = () => {
    if (rows <= 1) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Số hàng không thể nhỏ hơn 1",
      });
      return;
    }
    const newRows = rows - 1;
    setRows(newRows);
    setSeatLayout(seatLayout.slice(0, newRows));
  };

  const handleAddSeat = (rowIndex, seatIndex, type) => {
    const newLayout = [...seatLayout];
    const rowLabels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const colIndex =
      seatIndex !== undefined
        ? seatIndex
        : newLayout[rowIndex].findIndex((s) => !s);

    if (
      colIndex === -1 ||
      colIndex >= seatsPerRow ||
      newLayout[rowIndex][colIndex]
    ) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Vị trí đã có ghế hoặc không hợp lệ",
      });
      return;
    }

    if (type === "normal") {
      const seatId = `${rowLabels[rowIndex]}${colIndex + 1}`;
      newLayout[rowIndex][colIndex] = {
        seatId: null,
        id: seatId,
        row: rowLabels[rowIndex],
        number: colIndex + 1,
        type: "normal",
        status: "available",
        price: 80000,
        isCouple: false,
      };
      toast({
        title: "Thành công",
        description: `Đã thêm ghế thường ${seatId}`,
      });
    } else if (type === "couple") {
      if (colIndex >= seatsPerRow - 1 || newLayout[rowIndex][colIndex + 1]) {
        toast({
          variant: "destructive",
          title: "Lỗi",
          description: "Không đủ chỗ để thêm ghế đôi ở vị trí này",
        });
        return;
      }
      const coupleId = `${rowLabels[rowIndex]}${colIndex + 1}-${
        rowLabels[rowIndex]
      }${colIndex + 2}`;
      const coupleNumber = `${colIndex + 1}-${colIndex + 2}`;
      newLayout[rowIndex][colIndex] = {
        seatId: null,
        id: coupleId,
        row: rowLabels[rowIndex],
        number: coupleNumber,
        type: "couple",
        status: "available",
        price: 200000,
        isCouple: true,
        primarySeat: { colIndex: colIndex + 1 },
        secondarySeat: { colIndex: colIndex + 2 },
      };
      newLayout[rowIndex][colIndex + 1] = null;
      toast({
        title: "Thành công",
        description: `Đã thêm ghế đôi ${coupleId}`,
      });
    }

    setSeatLayout(newLayout);
    onSave({
      ...room,
      rows,
      seatsPerRow,
      totalSeats: newLayout.flat().filter((seat) => seat !== null).length,
      seats: newLayout
        .flat()
        .filter((seat) => seat !== null)
        .map((seat) => ({
          seatId: seat.seatId,
          id: seat.id,
          row: seat.row,
          number: seat.number,
          type: seat.type,
          status: seat.status,
          price: seat.price,
          isCouple: seat.isCouple,
          primarySeat: seat.primarySeat,
          secondarySeat: seat.secondarySeat,
        })),
      vipSeats: newLayout.flat().filter((s) => s?.type === "vip").length,
      coupleSeats: newLayout.flat().filter((s) => s?.type === "couple").length,
    });
  };

  const handleSeatsPerRowChange = (e) => {
    const newSeatsPerRow = parseInt(e.target.value) || 0;
    if (newSeatsPerRow < 0) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Số ghế mỗi hàng phải là số không âm",
      });
      return;
    }
    setSeatsPerRow(newSeatsPerRow);
    const newLayout = seatLayout.map((row) => {
      const newRow = Array(newSeatsPerRow).fill(null);
      row.forEach((seat, i) => {
        if (seat && i < newSeatsPerRow) newRow[i] = seat;
      });
      return newRow;
    });
    setSeatLayout(newLayout);
    onSave({
      ...room,
      rows,
      seatsPerRow: newSeatsPerRow,
      totalSeats: newLayout.flat().filter((seat) => seat !== null).length,
      seats: newLayout
        .flat()
        .filter((seat) => seat !== null)
        .map((seat) => ({
          seatId: seat.seatId,
          id: seat.id,
          row: seat.row,
          number: seat.number,
          type: seat.type,
          status: seat.status,
          price: seat.price,
          isCouple: seat.isCouple,
          primarySeat: seat.primarySeat,
          secondarySeat: seat.secondarySeat,
        })),
      vipSeats: newLayout.flat().filter((s) => s?.type === "vip").length,
      coupleSeats: newLayout.flat().filter((s) => s?.type === "couple").length,
    });
  };

  const handleSaveChanges = async () => {
    if (rows <= 0 || seatsPerRow <= 0) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Số hàng và số ghế mỗi hàng phải lớn hơn 0",
      });
      return;
    }

    // Update seats via API
    try {
      for (const [seatId, status] of Object.entries(changedSeats)) {
        await axios.put(
          `${API_BASE_URL}/seats/${seatId}`,
          { status },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      toast({
        title: "Thành công",
        description: "Đã cập nhật trạng thái ghế qua API",
      });
      setChangedSeats({}); // Clear changed seats after saving
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description:
          error.response?.data?.message || "Không thể cập nhật trạng thái ghế",
      });
      return;
    }

    const updatedSeats = seatLayout
      .flat()
      .filter((seat) => seat !== null)
      .map((seat) => ({
        id: seat.id,
        row: seat.row,
        number: seat.number,
        type: seat.type,
        status: seat.status,
        price: seat.price,
        isCouple: seat.isCouple,
        primarySeat: seat.primarySeat,
        secondarySeat: seat.secondarySeat,
      }));

    onSave({
      ...room,
      rows,
      seatsPerRow,
      totalSeats: updatedSeats.length,
      seats: updatedSeats,
      vipSeats: updatedSeats.filter((s) => s.type === "vip").length,
      coupleSeats: updatedSeats.filter((s) => s.type === "couple").length,
    });

    toast({
      title: "Thành công",
      description: "Đã lưu thay đổi",
    });
  };

  if (loading) {
    return (
      <p className="text-center text-slate-600 dark:text-slate-400">
        Đang tải sơ đồ ghế...
      </p>
    );
  }

  if (!room) {
    return (
      <p className="text-center text-slate-600 dark:text-slate-400">
        Vui lòng chọn một phòng để xem sơ đồ ghế.
      </p>
    );
  }

  return (
    <SeatLayoutView
      seatLayout={seatLayout}
      isEditable={isEditable}
      editMode={editMode}
      rows={rows}
      seatsPerRow={seatsPerRow}
      selectedSeat={selectedSeat}
      selectedSeatType={selectedSeatType}
      getSeatColor={getSeatColor}
      getSeatIcon={getSeatIcon}
      getCoupleSeatSuggestions={getCoupleSeatSuggestions}
      handleRowsChange={handleRowsChange}
      handleSeatsPerRowChange={handleSeatsPerRowChange}
      handleAddRow={handleAddRow}
      handleRemoveRow={handleRemoveRow}
      handleAddSeat={handleAddSeat}
      handleSeatClick={handleSeatClick}
      handleSuggestionClick={handleSuggestionClick}
      setEditMode={setEditMode}
      setSelectedSeat={setSelectedSeat}
      setSelectedSeatType={setSelectedSeatType}
      handleSeatTypeChange={handleSeatTypeChange}
      updateSeat={updateSeat}
    />
  );
};

export default SeatLayout;
