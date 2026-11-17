import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Plus,
  Filter,
  MoreHorizontal,
  Trash2,
  Eye,
  Armchair,
  Monitor,
  DollarSign,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Badge } from "../../components/ui/badge";
import { useToast } from "../../hooks/use-toast";
import { Toaster } from "../../components/ui/toaster";
import SeatModal from "./SeatModal";
import RoomDetailModal from "./RoomDetailModal";
import SeatLayout from "./SeatLayout";
import axios from "axios";
import { debounce } from "lodash";

// Error Boundary Component
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center text-red-500 p-4 dark:text-red-400">
          <h1>Something went wrong. Please try again.</h1>
          <p>Error: {this.state.error?.message}</p>
          <Button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4"
          >
            Retry
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Loading Skeleton Component
const SeatLayoutSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="text-center">
      <div className="w-32 h-8 bg-slate-200 dark:bg-slate-700 rounded mx-auto mb-4"></div>
    </div>
    <div className="space-y-2">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex items-center justify-center">
          <div className="w-6 h-4 bg-slate-200 dark:bg-slate-700 rounded mr-4"></div>
          <div className="flex gap-1">
            {[...Array(10)].map((_, j) => (
              <div
                key={j}
                className="w-6 h-6 bg-slate-200 dark:bg-slate-700 rounded"
              ></div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const API_BASE_URL = "http://localhost:8080/api";

export default function SeatsPage() {
  const { toast } = useToast();
  const [selectedCinema, setSelectedCinema] = useState("all");
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRoomDetail, setSelectedRoomDetail] = useState(null);
  const [cinemas, setCinemas] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [expandedRooms, setExpandedRooms] = useState({});
  const [seatTypes] = useState([
    {
      id: 1,
      name: "Normal",
      price: 80000,
      color: "bg-blue-500 dark:bg-blue-600",
    },
    {
      id: 3,
      name: "Couple",
      price: 200000,
      color: "bg-pink-500 dark:bg-pink-600",
    },
  ]);
  const token = localStorage.getItem("authToken");
  const debouncedViewRoomRef = useRef(null);

  // Centralized API error handler
  const handleApiError = useCallback(
    (error, defaultMessage) => {
      const message =
        error.response?.data?.message || error.message || defaultMessage;
      if (error.response?.status === 401) {
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: "Please log in again.",
        });
        localStorage.removeItem("authToken");
        window.location.href = "/login"; // Redirect to login
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: message,
        });
      }
    },
    [toast]
  );

  // Fetch cinemas
  const fetchCinemas = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/cinemas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCinemas(response.data);
    } catch (error) {
      handleApiError(error, "Failed to fetch cinemas.");
    }
  }, [token, handleApiError]);

  // Fetch rooms and their seats
  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      const [roomsResponse, seatsResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/admin/rooms`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE_URL}/admin/seats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const seats = seatsResponse.data;
      const roomsWithDetails = roomsResponse.data.map((room) => {
        const roomSeats = seats.filter((s) => s.room?.id === room.id);
        const normalSeats = roomSeats.filter((s) => s.seatType === 1).length;
        const coupleSeatIds = new Set();
        let coupleSeats = 0;
        roomSeats.forEach((seat) => {
          if (seat.seatType === 3 && seat.coupleSeatId) {
            const pairSeat = roomSeats.find(
              (s) => s.id === seat.coupleSeatId && s.coupleSeatId === seat.id
            );
            if (pairSeat && !coupleSeatIds.has(seat.id)) {
              coupleSeats++;
              coupleSeatIds.add(seat.id);
              coupleSeatIds.add(pairSeat.id);
            }
          }
        });

        return {
          ...room,
          totalSeats: roomSeats.length,
          normalSeats,
          coupleSeats,
          seats: roomSeats,
          cinema: room.cinema?.name || "N/A",
          cinemaId: room.cinema?.id,
          status: room.status || "active",
        };
      });

      setRooms(roomsWithDetails);
    } catch (error) {
      handleApiError(error, "Failed to fetch rooms.");
    } finally {
      setLoading(false);
    }
  }, [token, handleApiError]);

  // Initial data fetch
  useEffect(() => {
    if (!token) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please log in to view rooms.",
      });
      window.location.href = "/login";
      return;
    }
    fetchCinemas();
    fetchRooms();
  }, [token, fetchCinemas, fetchRooms, toast]);

  // Filter rooms by selected cinema
  const filteredRooms =
    selectedCinema === "all"
      ? rooms
      : rooms.filter((room) => room.cinemaId === parseInt(selectedCinema));

  const handleSelectRoom = useCallback((room) => {
    setSelectedRoom(room);
  }, []);

  const handleViewRoom = useCallback((e, room) => {
    e.stopPropagation();
    if (debouncedViewRoomRef.current) {
      debouncedViewRoomRef.current.cancel();
    }
    debouncedViewRoomRef.current = debounce(() => {
      setSelectedRoomDetail(room);
      setShowDetailModal(true);
    }, 300);
    debouncedViewRoomRef.current();
  }, []);

  const handleDeleteRoom = useCallback(
    async (e, room) => {
      e.stopPropagation();
      try {
        setLoading(true);
        await axios.delete(`${API_BASE_URL}/admin/rooms/${room.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRooms((prev) => prev.filter((r) => r.id !== room.id));
        if (selectedRoom?.id === room.id) setSelectedRoom(null);
        if (selectedRoomDetail?.id === room.id) {
          setSelectedRoomDetail(null);
          setShowDetailModal(false);
        }
        toast({
          title: "Success",
          description: `Room ${room.numberRoom} deleted successfully.`,
        });
      } catch (error) {
        handleApiError(error, "Failed to delete room.");
      } finally {
        setLoading(false);
      }
    },
    [token, selectedRoom, selectedRoomDetail, toast, handleApiError]
  );

  const handleSaveSeats = useCallback(
    async (formData) => {
      try {
        setLoading(true);
        const payload = {
          roomId: parseInt(formData.roomId),
          cinemaId: parseInt(formData.cinemaId),
          seats: formData.seats, // Assuming SeatModal provides seat data
        };

        await axios.post(`${API_BASE_URL}/admin/seats/custom`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Refresh rooms and seats
        await fetchRooms();

        toast({
          title: "Success",
          description: "Seats created successfully.",
        });
      } catch (error) {
        handleApiError(error, "Failed to create seats.");
      } finally {
        setLoading(false);
      }
    },
    [token, fetchRooms, handleApiError, toast]
  );

  const handleSaveSeatLayout = useCallback(
    async (updatedRoom) => {
      try {
        setLoading(true);
        const roomData = {
          numberRoom: updatedRoom.numberRoom,
          rows: updatedRoom.rows,
          seatsPerRow: updatedRoom.seatsPerRow,
          description: updatedRoom.description,
          status: updatedRoom.status,
          cinema: { id: updatedRoom.cinemaId },
        };

        // Update room
        await axios.put(
          `${API_BASE_URL}/admin/rooms/${updatedRoom.id}`,
          roomData,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        // Update seats
        const seatPayload = {
          roomId: updatedRoom.id,
          cinemaId: updatedRoom.cinemaId,
          seats: updatedRoom.seats.map((seat) => {
            const nameParts = seat.id.split("-");
            const primaryName = nameParts[0];
            const rowLabel = primaryName.match(/[A-Z]+/)[0];
            const col = primaryName.match(/\d+/)[0];
            const rowIndex = rowLabel.charCodeAt(0) - 65 + 1;
            const seatTypeMap = { normal: 1, couple: 3 };
            let coupleSeatId = null;
            if (seat.isCouple) {
              const coupleParts = seat.id.split("-");
              const pairSeat = updatedRoom.seats.find(
                (s) =>
                  s.id === coupleParts[1] &&
                  s.primarySeat?.colIndex === parseInt(col) + 1
              );
              if (pairSeat) coupleSeatId = pairSeat.id;
            }
            return {
              name: primaryName,
              rowIndex,
              colIndex: parseInt(col),
              seatType: seatTypeMap[seat.type] || 1,
              status: seat.status,
              coupleSeatId,
            };
          }),
        };

        await axios.post(`${API_BASE_URL}/admin/seats/custom`, seatPayload, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setRooms((prev) =>
          prev.map((r) => (r.id === updatedRoom.id ? updatedRoom : r))
        );
        setSelectedRoom(updatedRoom);
        if (selectedRoomDetail?.id === updatedRoom.id) {
          setSelectedRoomDetail(updatedRoom);
        }
        toast({
          title: "Success",
          description: "Seat layout updated successfully.",
        });
      } catch (error) {
        handleApiError(error, "Failed to update seat layout.");
      } finally {
        setLoading(false);
      }
    },
    [token, selectedRoomDetail, toast, handleApiError]
  );

  const toggleRoomExpansion = (roomId) => {
    setExpandedRooms((prev) => ({
      ...prev,
      [roomId]: !prev[roomId],
    }));
  };

  if (!token) {
    return (
      <div className="text-center p-8">
        <p className="text-red-500 dark:text-red-400">
          Please log in to access this page.
        </p>
        <Button asChild className="mt-4">
          <a href="/login">Go to Login</a>
        </Button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-8 max-w-7xl mx-auto p-4">
        <Toaster />
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-lg p-8 text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                <Armchair className="h-8 w-8" />
                Seat Management
              </h1>
              <p className="text-blue-100 text-sm">
                Manage seat layouts and ticket prices per room
              </p>
            </div>
            <Button
              onClick={() => setShowAddModal(true)}
              className="mt-4 md:mt-0 bg-white text-blue-600 hover:bg-blue-50 shadow-lg"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Seats
            </Button>
          </div>
        </div>
        <Card className="border-0 shadow-lg dark:bg-gray-800">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select value={selectedCinema} onValueChange={setSelectedCinema}>
                <SelectTrigger className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600">
                  <SelectValue placeholder="Select Cinema" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cinemas</SelectItem>
                  {cinemas.map((cinema) => (
                    <SelectItem key={cinema.id} value={cinema.id.toString()}>
                      {cinema.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedRoom ? selectedRoom.id.toString() : "all"}
                onValueChange={(value) => {
                  if (value === "all") {
                    setSelectedRoom(null);
                  } else {
                    const room = filteredRooms.find(
                      (r) => r.id === parseInt(value)
                    );
                    setSelectedRoom(room || null);
                  }
                }}
              >
                <SelectTrigger className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600">
                  <SelectValue placeholder="Select Room" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rooms</SelectItem>
                  {filteredRooms.map((room) => (
                    <SelectItem key={room.id} value={room.id.toString()}>
                      {room.numberRoom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                className="border-gray-200 hover:bg-gray-500 dark:hover:bg-gray-600"
                onClick={() =>
                  toast({
                    title: "Info",
                    description: "Filter functionality not implemented yet.",
                  })
                }
              >
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
            <Card className="border-0 shadow-lg dark:bg-gray-800">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-t-lg">
                <CardTitle className="flex items-center dark:text-white">
                  <Monitor className="h-5 w-5 mr-2" />
                  Rooms & Seats List
                  {selectedCinema !== "all" && (
                    <Badge className="ml-2">
                      {cinemas.find((c) => c.id === parseInt(selectedCinema))
                        ?.name || "N/A"}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {loading ? (
                  <div className="flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <span className="ml-2 text-gray-600 dark:text-gray-400">
                      Loading rooms...
                    </span>
                  </div>
                ) : filteredRooms.length === 0 ? (
                  <p className="text-center text-gray-600 dark:text-gray-400">
                    No rooms match the selected filters.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {filteredRooms.map((room) => (
                      <div
                        key={room.id}
                        className={`p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/30 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600/50 ${
                          selectedRoom?.id === room.id
                            ? "ring-2 ring-blue-500"
                            : ""
                        }`}
                        onClick={() => handleSelectRoom(room)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-gray-900 dark:text-white">
                                {room.numberRoom}
                              </h4>
                              <Badge
                                variant={
                                  room.status === "active"
                                    ? "default"
                                    : "secondary"
                                }
                                className={
                                  room.status === "active"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                                    : ""
                                }
                              >
                                {room.status === "active"
                                  ? "Active"
                                  : "Maintenance"}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleRoomExpansion(room.id);
                                }}
                              >
                                {expandedRooms[room.id] ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {room.totalSeats} seats
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              {room.rows} rows × {room.seatsPerRow} seats
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-2 py-1 rounded">
                                {room.normalSeats} Normal
                              </span>
                              <span className="text-xs bg-pink-100 dark:bg-pink-900/20 text-pink-700 dark:text-pink-400 px-2 py-1 rounded">
                                {room.coupleSeats} Couple
                              </span>
                            </div>
                            {room.description && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-2">
                                {room.description}
                              </p>
                            )}
                            {expandedRooms[room.id] && (
                              <div className="mt-2">
                                <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                  Seat List
                                </h5>
                                {room.seats.length > 0 ? (
                                  <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 max-h-40 overflow-y-auto">
                                    {room.seats
                                      .filter(
                                        (seat) =>
                                          seat.seatType === 1 ||
                                          seat.seatType === 3
                                      )
                                      .map((seat) => {
                                        const seatTypeName =
                                          seatTypes.find(
                                            (t) => t.id === seat.seatType
                                          )?.name || "Unknown";
                                        const isCoupleSeat =
                                          seat.seatType === 3 &&
                                          seat.coupleSeatId;
                                        const pairSeat = isCoupleSeat
                                          ? room.seats.find(
                                              (s) =>
                                                s.id === seat.coupleSeatId &&
                                                s.coupleSeatId === seat.id
                                            )
                                          : null;
                                        const displayName =
                                          isCoupleSeat && pairSeat
                                            ? `${seat.name}-${pairSeat.name}`
                                            : seat.name;
                                        return (
                                          <li
                                            key={seat.id}
                                            className="flex justify-between"
                                          >
                                            <span>
                                              {displayName} ({seatTypeName})
                                            </span>
                                            <span>
                                              {seat.status
                                                .charAt(0)
                                                .toUpperCase() +
                                                seat.status.slice(1)}
                                              {isCoupleSeat
                                                ? ` (Pair: ${
                                                    pairSeat
                                                      ? pairSeat.name
                                                      : seat.coupleSeatId
                                                  })`
                                                : ""}
                                            </span>
                                          </li>
                                        );
                                      })}
                                  </ul>
                                ) : (
                                  <p className="text-xs text-gray-500 dark:text-gray-500">
                                    No seats available
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="dark:hover:bg-gray-600"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => handleViewRoom(e, room)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600 dark:text-red-400"
                                onClick={(e) => handleDeleteRoom(e, room)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-lg dark:bg-gray-800">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-t-lg">
                <CardTitle className="flex items-center justify-between dark:text-white">
                  <span className="flex items-center">
                    <Armchair className="h-5 w-5 mr-2" />
                    {selectedRoom
                      ? `Seats - ${selectedRoom.numberRoom}`
                      : "Quick Actions"}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {loading ? (
                  <SeatLayoutSkeleton />
                ) : selectedRoom ? (
                  <SeatLayout
                    room={selectedRoom}
                    isEditable={true}
                    onSave={handleSaveSeatLayout}
                  />
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button
                        onClick={() => setShowAddModal(true)}
                        variant="outline"
                        className="h-20 flex-col gap-2 border-green-200 text-green-600 hover:bg-green-50 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-900/20"
                      >
                        <Plus className="h-6 w-6" />
                        <span>Add New Seats</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-20 flex-col gap-2 border-orange-200 text-orange-600 hover:bg-orange-50 dark:border-orange-400 dark:text-orange-400 dark:hover:bg-orange-900/20"
                        onClick={() =>
                          toast({
                            title: "Info",
                            description:
                              "Update ticket prices not implemented yet.",
                          })
                        }
                      >
                        <DollarSign className="h-6 w-6" />
                        <span>Update Ticket Prices</span>
                      </Button>
                    </div>
                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold mb-4 dark:text-white">
                        Overview Statistics
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {filteredRooms.reduce(
                              (sum, room) => sum + (room?.totalSeats || 0),
                              0
                            )}
                          </p>
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            Total Seats
                          </p>
                        </div>
                        <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                            {filteredRooms.reduce(
                              (sum, room) => sum + (room?.normalSeats || 0),
                              0
                            )}
                          </p>
                          <p className="text-sm text-purple-700 dark:text-blue-300">
                            Normal Seats
                          </p>
                        </div>
                        <div className="text-center p-4 bg-pink-50 dark:bg-pink-900/20 rounded-xl">
                          <p className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                            {filteredRooms.reduce(
                              (sum, room) => sum + (room?.coupleSeats || 0),
                              0
                            )}
                          </p>
                          <p className="text-sm text-pink-700 dark:text-pink-300">
                            Couple Seats
                          </p>
                        </div>
                        <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {
                              filteredRooms.filter(
                                (room) => room.status === "active"
                              ).length
                            }
                          </p>
                          <p className="text-sm text-green-700 dark:text-green-300">
                            Active Rooms
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        {selectedRoomDetail && (
          <RoomDetailModal
            room={selectedRoomDetail}
            isOpen={showDetailModal}
            onClose={() => {
              setShowDetailModal(false);
              setSelectedRoomDetail(null);
            }}
          />
        )}
        <SeatModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSave={handleSaveSeats}
          isEdit={false}
          cinemas={cinemas}
        />
      </div>
    </ErrorBoundary>
  );
}
