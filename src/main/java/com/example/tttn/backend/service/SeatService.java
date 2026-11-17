package com.example.tttn.backend.service;

import com.example.tttn.backend.config.JwtConfig;
import com.example.tttn.backend.exception.NotFoundException;
import com.example.tttn.backend.model.Seat;
import com.example.tttn.backend.model.Room;
import com.example.tttn.backend.model.Cinema;
import com.example.tttn.backend.repository.SeatRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class SeatService {

    private static final Logger logger = LoggerFactory.getLogger(SeatService.class);

    private final SeatRepository seatRepository;
    private final AuthService authService;
    private final JwtConfig jwtConfig;

    @Autowired
    public SeatService(SeatRepository seatRepository, AuthService authService, JwtConfig jwtConfig) {
        this.seatRepository = seatRepository;
        this.authService = authService;
        this.jwtConfig = jwtConfig;
    }
    public List<Seat> getAllSeats(String token) {
        return seatRepository.findAll();
    }
    public List<Seat> getAllSeatsAdmin(String token) {
        if (!authService.hasRole(token, "ADMIN")) {
            throw new NotFoundException("Chỉ ADMIN mới có quyền xem tất cả ghế");
        }
        return seatRepository.findAll();
    }

    public Seat getSeatById(String token, Long id) {
        if (!authService.hasRole(token, "ADMIN")) {
            throw new NotFoundException("Chỉ ADMIN mới có quyền xem thông tin ghế");
        }
        return seatRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy ghế với ID: " + id));
    }

    @Transactional
    public Seat createSeat(String token, Seat seat) {
        if (!authService.hasRole(token, "ADMIN")) {
            throw new NotFoundException("Chỉ ADMIN mới có quyền tạo ghế");
        }
        validateSeat(seat);

        // Check for duplicate seat
        if (seatRepository.existsByNameAndRoomId(seat.getName(), seat.getRoom().getId())) {
            throw new IllegalArgumentException("Ghế " + seat.getName() + " đã tồn tại trong phòng");
        }

        logger.info("Creating seat: {}", seat);
        Seat savedSeat = seatRepository.save(seat);
        logger.info("Created seat: {}", savedSeat);
        return savedSeat;
    }

    @Transactional
    public List<Seat> createBulkSeats(String token, Map<String, Object> payload) {
        if (!authService.hasRole(token, "ADMIN")) {
            throw new NotFoundException("Chỉ ADMIN mới có quyền tạo hàng loạt ghế");
        }

        Long roomId = Long.valueOf(payload.get("roomId").toString());
        Long cinemaId = Long.valueOf(payload.get("cinemaId").toString());
        Integer rows = Integer.valueOf(payload.get("rows").toString());
        Integer seatsPerRow = Integer.valueOf(payload.get("seatsPerRow").toString());
        Integer defaultSeatType = Integer.valueOf(payload.getOrDefault("defaultSeatType", "1").toString());
        String defaultStatus = (String) payload.getOrDefault("defaultStatus", "available");

        if (roomId == null || cinemaId == null || rows == null || seatsPerRow == null || rows <= 0 || seatsPerRow <= 0) {
            throw new IllegalArgumentException("Thông tin phòng, rạp, số hàng hoặc số ghế mỗi hàng không hợp lệ");
        }

        List<Seat> createdSeats = new ArrayList<>();
        Room room = new Room();
        room.setId(roomId);
        Cinema cinema = new Cinema();
        cinema.setId(cinemaId);

        for (int row = 1; row <= rows; row++) {
            for (int col = 1; col <= seatsPerRow; col++) {
                String seatName = String.format("%c%d", (char) ('A' + row - 1), col);
                if (seatRepository.existsByNameAndRoomId(seatName, roomId)) {
                    logger.warn("Seat {} already exists in room ID: {}, skipping", seatName, roomId);
                    continue;
                }

                Seat seat = new Seat();
                seat.setName(seatName);
                seat.setRowIndex(row);
                seat.setColIndex(col); 
                seat.setSeatType(defaultSeatType);
                seat.setStatus(defaultStatus);
                seat.setRoom(room);
                seat.setCinema(cinema);

                logger.debug("Creating bulk seat: {}", seat);
                Seat savedSeat = seatRepository.save(seat);
                createdSeats.add(savedSeat);
            }
        }

        logger.info("Created {} bulk seats for room ID: {}", createdSeats.size(), roomId);
        return createdSeats;
    }

    @Transactional
    public List<Seat> createCustomSeats(String token, Map<String, Object> payload) {
        if (!authService.hasRole(token, "ADMIN")) {
            throw new NotFoundException("Chỉ ADMIN mới có quyền tạo ghế tùy chỉnh");
        }

        Long roomId = Long.valueOf(payload.get("roomId").toString());
        Long cinemaId = Long.valueOf(payload.get("cinemaId").toString());
        List<Map<String, Object>> seatsData = (List<Map<String, Object>>) payload.get("seats");

        if (roomId == null || cinemaId == null || seatsData == null || seatsData.isEmpty()) {
            throw new IllegalArgumentException("Thiếu thông tin phòng, rạp hoặc danh sách ghế");
        }

        List<Seat> createdSeats = new ArrayList<>();
        Room room = new Room();
        room.setId(roomId);
        Cinema cinema = new Cinema();
        cinema.setId(cinemaId);

        for (Map<String, Object> seatData : seatsData) {
            String name = (String) seatData.get("name");
            Integer rowIndex = Integer.valueOf(seatData.get("rowIndex").toString());
            Integer colIndex = Integer.valueOf(seatData.get("colIndex").toString());
            Integer seatType = Integer.valueOf(seatData.get("seatType").toString());
            String status = (String) seatData.get("status");
            String coupleSeatId = (String) seatData.get("coupleSeatId");

            if (name == null || rowIndex == null || colIndex == null || seatType == null) {
                throw new IllegalArgumentException("Thông tin ghế không hợp lệ: " + seatData);
            }

            if (seatRepository.existsByNameAndRoomId(name, roomId)) {
                throw new IllegalArgumentException("Ghế " + name + " đã tồn tại trong phòng " + roomId);
            }

            Seat seat = new Seat();
            seat.setName(name);
            seat.setRowIndex(rowIndex);
            seat.setColIndex(colIndex);
            seat.setSeatType(seatType);
            seat.setStatus(status != null ? status : "available");
            seat.setRoom(room);
            seat.setCinema(cinema);

            if (seatType == 3 && coupleSeatId != null && !coupleSeatId.isEmpty()) {
                String[] parts = coupleSeatId.split("-");
                if (parts.length != 2) {
                    throw new IllegalArgumentException("Couple seat ID không hợp lệ: " + coupleSeatId);
                }
                String secondSeatName = parts[1];
                if (seatRepository.existsByNameAndRoomId(secondSeatName, roomId)) {
                    throw new IllegalArgumentException("Ghế phụ " + secondSeatName + " đã tồn tại trong phòng " + roomId);
                }
                if (!name.equals(parts[0])) {
                    throw new IllegalArgumentException("Tên ghế chính không khớp với coupleSeatId: " + coupleSeatId);
                }
                if (colIndex + 1 != colIndex + 1) { // Placeholder for adjacency check
                    throw new IllegalArgumentException("Ghế đôi phải ở cột liền kề: " + coupleSeatId);
                }

                // Save primary seat
                Seat savedPrimarySeat = seatRepository.save(seat);
                createdSeats.add(savedPrimarySeat);

                // Create and save secondary seat
                Seat secondarySeat = new Seat();
                secondarySeat.setName(secondSeatName);
                secondarySeat.setRowIndex(rowIndex);
                secondarySeat.setColIndex(colIndex + 1);
                secondarySeat.setSeatType(3);
                secondarySeat.setStatus(status != null ? status : "available");
                secondarySeat.setRoom(room);
                secondarySeat.setCinema(cinema);
                secondarySeat.setCoupleSeatId(savedPrimarySeat.getId()); // Secondary seat points to primary seat's ID

                Seat savedSecondarySeat = seatRepository.save(secondarySeat);
                createdSeats.add(savedSecondarySeat);

                // Update primary seat to point to secondary seat's ID
                savedPrimarySeat.setCoupleSeatId(savedSecondarySeat.getId());
                seatRepository.save(savedPrimarySeat);
            } else {
                // Save regular seat
                Seat savedSeat = seatRepository.save(seat);
                createdSeats.add(savedSeat);
            }
        }

        logger.info("Created {} custom seats for room ID: {}", createdSeats.size(), roomId);
        return createdSeats;
    }

    @Transactional
    public Seat updateSeat(String token, Long id, Seat seatDetails) {
        if (!authService.hasRole(token, "ADMIN")) {
            throw new NotFoundException("Chỉ ADMIN mới có quyền cập nhật ghế");
        }
        Seat seat = seatRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy ghế với ID: " + id));

        if (seatDetails.getRowIndex() != null) {
            seat.setRowIndex(seatDetails.getRowIndex());
        }
        if (seatDetails.getColIndex() != null) {
            seat.setColIndex(seatDetails.getColIndex());
        }
        if (seatDetails.getSeatType() != null) {
            seat.setSeatType(seatDetails.getSeatType());
        }
        if (seatDetails.getStatus() != null) {
            seat.setStatus(seatDetails.getStatus());
        }
        if (seatDetails.getName() != null && !seatDetails.getName().isEmpty()) {
            if (!seatDetails.getName().equals(seat.getName()) &&
                seatRepository.existsByNameAndRoomId(seatDetails.getName(), seat.getRoom().getId())) {
                throw new IllegalArgumentException("Ghế " + seatDetails.getName() + " đã tồn tại trong phòng");
            }
            seat.setName(seatDetails.getName());
        }
        if (seatDetails.getRoom() != null && seatDetails.getRoom().getId() != null) {
            seat.setRoom(seatDetails.getRoom());
        }
        if (seatDetails.getCinema() != null && seatDetails.getCinema().getId() != null) {
            seat.setCinema(seatDetails.getCinema());
        }

        logger.info("Updating seat with ID {}: {}", id, seat);
        Seat updatedSeat = seatRepository.save(seat);
        logger.info("Updated seat: {}", updatedSeat);
        return updatedSeat;
    }

    @Transactional
    public void deleteSeat(String token, Long id) {
        if (!authService.hasRole(token, "ADMIN")) {
            throw new NotFoundException("Chỉ ADMIN mới có quyền xóa ghế");
        }
        Seat seat = seatRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy ghế với ID: " + id));

        logger.info("Deleting seat with ID: {}", id);
        seatRepository.delete(seat);
        logger.info("Deleted seat with ID: {}", id);
    }

    public List<Seat> getSeatsByRoomId(String token, Long roomId) {
        if (roomId == null) {
            throw new IllegalArgumentException("ID phòng không được để trống");
        }
        List<Seat> seats = seatRepository.findByRoomId(roomId);
        if (seats.isEmpty()) {
            logger.warn("No seats found for room ID: {}", roomId);
            throw new NotFoundException("Không tìm thấy ghế nào cho phòng với ID: " + roomId);
        }
        logger.info("Retrieved {} seats for room ID: {}", seats.size(), roomId);
        return seats;
    }

    public List<Seat> getSeatsByRoomIdAdmin(String token, Long roomId) {
        if (!authService.hasRole(token, "ADMIN")) {
            throw new NotFoundException("Chỉ ADMIN mới có quyền tạo ghế");
        }
        if (roomId == null) {
            throw new IllegalArgumentException("ID phòng không được để trống");
        }
        List<Seat> seats = seatRepository.findByRoomId(roomId);
        if (seats.isEmpty()) {
            logger.warn("No seats found for room ID: {}", roomId);
            throw new NotFoundException("Không tìm thấy ghế nào cho phòng với ID: " + roomId);
        }
        logger.info("Retrieved {} seats for room ID: {}", seats.size(), roomId);
        return seats;
    }

    private void validateSeat(Seat seat) {
        if (seat.getRoom() == null || seat.getRoom().getId() == null) {
            throw new IllegalArgumentException("Phải cung cấp phòng (room) cho ghế");
        }
        if (seat.getCinema() == null || seat.getCinema().getId() == null) {
            throw new IllegalArgumentException("Phải cung cấp rạp (cinema) cho ghế");
        }
        if (seat.getRowIndex() == null || seat.getColIndex() == null) {
            throw new IllegalArgumentException("Chỉ số hàng (rowIndex) và cột (colIndex) không được để trống");
        }
        if (seat.getSeatType() == null) {
            throw new IllegalArgumentException("Loại ghế (seatType) không được để trống");
        }
        if (seat.getStatus() == null) {
            seat.setStatus("available");
        }
        if (seat.getName() == null || seat.getName().isEmpty()) {
            seat.setName(String.format("%c%d", (char) ('A' + seat.getRowIndex() - 1), seat.getColIndex()));
        }
    }
}