package com.example.tttn.backend.service;

import com.example.tttn.backend.config.JwtConfig;
import com.example.tttn.backend.exception.NotFoundException;
import com.example.tttn.backend.model.Cinema;
import com.example.tttn.backend.model.Movie;
import com.example.tttn.backend.model.Room;
import com.example.tttn.backend.model.Seat;
import com.example.tttn.backend.repository.CinemaRepository;
import com.example.tttn.backend.repository.MovieRepository;
import com.example.tttn.backend.repository.RoomRepository;
import com.example.tttn.backend.repository.SeatRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class RoomService {

    private static final Logger logger = LoggerFactory.getLogger(RoomService.class);

    private final RoomRepository roomRepository;
    private final CinemaRepository cinemaRepository;
    private final MovieRepository movieRepository; // Thêm MovieRepository để xóa Movie
    private final SeatRepository seatRepository; // Thêm SeatRepository
    private final AuthService authService;
    private final JwtConfig jwtConfig;

    @Autowired
    public RoomService(RoomRepository roomRepository, CinemaRepository cinemaRepository,
                       MovieRepository movieRepository, SeatRepository seatRepository,
                       AuthService authService, JwtConfig jwtConfig) {
        this.roomRepository = roomRepository;
        this.cinemaRepository = cinemaRepository;
        this.movieRepository = movieRepository;
        this.seatRepository = seatRepository;
        this.authService = authService;
        this.jwtConfig = jwtConfig;
    }

    // Lấy tất cả rooms
    public List<Room> getAllRooms(String token) {
        logger.info("Fetching all rooms");
        return roomRepository.findAll();
    }
    

    // Lấy room theo ID
    public Room getRoomById(String token, Long id) {
        logger.info("Fetching room with ID: {}", id);
        return roomRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy phòng với ID: " + id));
    }

    public List<Room> getRoomsByCinemaId(String token, Long cinemaId) {
        logger.info("Fetching rooms for cinema ID: {}", cinemaId);
        // Kiểm tra xem cinema có tồn tại không
        cinemaRepository.findById(cinemaId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy rạp chiếu phim với ID: " + cinemaId));
        List<Room> rooms = roomRepository.findByCinemaId(cinemaId);
        if (rooms.isEmpty()) {
            logger.warn("No rooms found for cinema ID: {}", cinemaId);
        }
        return rooms;
    }

    // Tạo room
    @Transactional
    public Room createRoom(String token, Room room) {
        if (!authService.hasRole(token, "ADMIN")) {
            throw new NotFoundException("Chỉ ADMIN mới có quyền tạo phòng");
        }
        if (room.getNumberRoom() == null || room.getNumberRoom().isEmpty()) {
            throw new IllegalArgumentException("Số phòng (numberRoom) không được để trống");
        }
        if (room.getCinema() == null || room.getCinema().getId() == null) {
            throw new IllegalArgumentException("Phải cung cấp ID rạp chiếu phim (cinema_id) khi tạo phòng");
        }

        Cinema cinema = cinemaRepository.findById(room.getCinema().getId())
                .orElseThrow(() -> new NotFoundException("Không tìm thấy rạp chiếu phim với ID: " + room.getCinema().getId()));
        room.setCinema(cinema);

        logger.info("Creating room: {}", room);
        Room savedRoom = roomRepository.save(room);
        logger.info("Created room: {}", savedRoom);
        return savedRoom;
    }

    // Cập nhật room
    @Transactional
    public Room updateRoom(String token, Long id, Room roomDetails) {
        if (!authService.hasRole(token, "ADMIN")) {
            throw new NotFoundException("Chỉ ADMIN mới có quyền cập nhật phòng");
        }
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy phòng với ID: " + id));

        if (roomDetails.getNumberRoom() != null && !roomDetails.getNumberRoom().isEmpty()) {
            room.setNumberRoom(roomDetails.getNumberRoom());
        }
        if (roomDetails.getCinema() != null && roomDetails.getCinema().getId() != null) {
            Cinema cinema = cinemaRepository.findById(roomDetails.getCinema().getId())
                    .orElseThrow(() -> new NotFoundException("Không tìm thấy rạp chiếu phim với ID: " + roomDetails.getCinema().getId()));
            room.setCinema(cinema);
        }

        logger.info("Updating room with ID {}: {}", id, room);
        Room updatedRoom = roomRepository.save(room);
        logger.info("Updated room: {}", updatedRoom);
        return updatedRoom;
    }

    // Xóa room
    @Transactional
    public void deleteRoom(String token, Long id) {
        if (!authService.hasRole(token, "ADMIN")) {
            throw new NotFoundException("Chỉ ADMIN mới có quyền xóa phòng");
        }

        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy phòng với ID: " + id));

        // Xóa tất cả Seat liên quan trước (khóa ngoại room_id trong seats)
        List<Seat> seats = seatRepository.findByRoomId(id);
        if (!seats.isEmpty()) {
            logger.info("Deleting {} seats associated with room ID: {}", seats.size(), id);
            seatRepository.deleteAll(seats);
        }

        // Xóa tất cả Movie liên quan trước (khóa ngoại room_id trong movies)
        List<Movie> movies = movieRepository.findByRoomId(id);
        if (!movies.isEmpty()) {
            logger.info("Deleting {} movies associated with room ID: {}", movies.size(), id);
            movieRepository.deleteAll(movies);
        }

        // Xóa Room
        logger.info("Deleting room with ID: {}", id);
        roomRepository.delete(room);
        logger.info("Deleted room with ID: {}", id);
    }
}