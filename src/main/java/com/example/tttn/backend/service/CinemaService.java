package com.example.tttn.backend.service;

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
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class CinemaService {

    private static final Logger logger = LoggerFactory.getLogger(CinemaService.class);

    // Đường dẫn thư mục lưu ảnh
    private static final String UPLOAD_DIR = "uploads/cinemas/";
    private static final String IMAGE_BASE_URL = "http://localhost:8080/uploads/cinemas/";

    private final CinemaRepository cinemaRepository;
    private final MovieRepository movieRepository;
    private final RoomRepository roomRepository;
    private final SeatRepository seatRepository;
    private final AuthService authService;

    @Autowired
    public CinemaService(CinemaRepository cinemaRepository, MovieRepository movieRepository,
                         RoomRepository roomRepository, SeatRepository seatRepository,
                         AuthService authService) {
        this.cinemaRepository = cinemaRepository;
        this.movieRepository = movieRepository;
        this.roomRepository = roomRepository;
        this.seatRepository = seatRepository;
        this.authService = authService;

        // Tạo thư mục uploads/cinemas nếu chưa tồn tại
        try {
            Files.createDirectories(Paths.get(UPLOAD_DIR));
        } catch (IOException e) {
            logger.error("Không thể tạo thư mục upload: {}", e.getMessage());
            throw new RuntimeException("Không thể tạo thư mục upload", e);
        }
    }

    @Transactional
    public Cinema createCinema(String token, Cinema cinema, MultipartFile image) {
        if (!authService.hasRole(token, "ADMIN")) {
            logger.error("User with token {} does not have ADMIN role", token);
            throw new NotFoundException("Chỉ ADMIN mới có quyền tạo rạp chiếu phim");
        }

        // Kiểm tra các trường bắt buộc
        if (cinema.getName() == null || cinema.getName().isEmpty()) {
            throw new IllegalArgumentException("Tên rạp (name) không được để trống");
        }
        if (cinema.getAddress() == null || cinema.getAddress().isEmpty()) {
            throw new IllegalArgumentException("Địa chỉ (address) không được để trống");
        }
        if (cinema.getPhone() == null || cinema.getPhone().isEmpty()) {
            throw new IllegalArgumentException("Số điện thoại (phone) không được để trống");
        }
        if (cinema.getDescription() == null || cinema.getDescription().isEmpty()) {
            throw new IllegalArgumentException("Mô tả (description) không được để trống");
        }

        // Xử lý ảnh nếu có
        if (image != null && !image.isEmpty()) {
            String imagePath = saveImage(image);
            cinema.setImage(imagePath); // Lưu tên file
        }

        logger.info("Creating cinema: {}", cinema);
        Cinema savedCinema = cinemaRepository.save(cinema);
        // Cập nhật image thành URL đầy đủ
        if (savedCinema.getImage() != null) {
            savedCinema.setImage(IMAGE_BASE_URL + savedCinema.getImage());
        }
        logger.info("Created cinema: {}", savedCinema);
        return savedCinema;
    }

    public List<Cinema> getAllCinemas(String token) {
        
        List<Cinema> cinemas = cinemaRepository.findAll();
        // Cập nhật image thành URL đầy đủ
        return cinemas.stream().map(cinema -> {
            if (cinema.getImage() != null && !cinema.getImage().startsWith("http")) {
                cinema.setImage(IMAGE_BASE_URL + cinema.getImage());
            }
            return cinema;
        }).collect(Collectors.toList());
    }

    public List<Cinema> getAllCinemasAdmin(String token) {
        if (!authService.hasRole(token, "ADMIN")) {
            throw new NotFoundException("Chỉ ADMIN mới có quyền xem thông tin rạp chiếu phim");
        }
        List<Cinema> cinemas = cinemaRepository.findAll();
        // Cập nhật image thành URL đầy đủ
        return cinemas.stream().map(cinema -> {
            if (cinema.getImage() != null && !cinema.getImage().startsWith("http")) {
                cinema.setImage(IMAGE_BASE_URL + cinema.getImage());
            }
            return cinema;
        }).collect(Collectors.toList());
    }

    public Cinema getCinemaById(String token, Long id) {
        if (!authService.hasRole(token, "ADMIN")) {
            throw new NotFoundException("Chỉ ADMIN mới có quyền xem thông tin rạp chiếu phim");
        }
        Cinema cinema = cinemaRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy rạp chiếu phim có id = " + id));
        // Cập nhật image thành URL đầy đủ
        if (cinema.getImage() != null && !cinema.getImage().startsWith("http")) {
            cinema.setImage(IMAGE_BASE_URL + cinema.getImage());
        }
        return cinema;
    }

    @Transactional
    public Cinema updateCinema(String token, Long id, Cinema cinemaDetails, MultipartFile image) {
        if (!authService.hasRole(token, "ADMIN")) {
            throw new NotFoundException("Chỉ ADMIN mới có quyền cập nhật rạp chiếu phim");
        }

        Cinema cinema = cinemaRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy rạp chiếu phim có id = " + id));

        if (cinemaDetails.getName() != null && !cinemaDetails.getName().isEmpty()) {
            cinema.setName(cinemaDetails.getName());
        }
        if (cinemaDetails.getAddress() != null && !cinemaDetails.getAddress().isEmpty()) {
            cinema.setAddress(cinemaDetails.getAddress());
        }
        if (cinemaDetails.getPhone() != null && !cinemaDetails.getPhone().isEmpty()) {
            cinema.setPhone(cinemaDetails.getPhone());
        }
        if (cinemaDetails.getDescription() != null && !cinemaDetails.getDescription().isEmpty()) {
            cinema.setDescription(cinemaDetails.getDescription());
        }
       

        // Xử lý ảnh nếu có
        if (image != null && !image.isEmpty()) {
            // Xóa ảnh cũ nếu tồn tại
            if (cinema.getImage() != null && !cinema.getImage().startsWith("http")) {
                deleteImage(cinema.getImage());
            }
            String imagePath = saveImage(image);
            cinema.setImage(imagePath); // Lưu tên file
        }

        logger.info("Updating cinema with ID {}: {}", id, cinema);
        Cinema updatedCinema = cinemaRepository.save(cinema);
        // Cập nhật image thành URL đầy đủ
        if (updatedCinema.getImage() != null && !updatedCinema.getImage().startsWith("http")) {
            updatedCinema.setImage(IMAGE_BASE_URL + updatedCinema.getImage());
        }
        logger.info("Updated cinema: {}", updatedCinema);
        return updatedCinema;
    }

    @Transactional
    public void deleteCinema(String token, Long id) {
        if (!authService.hasRole(token, "ADMIN")) {
            throw new NotFoundException("Chỉ ADMIN mới có quyền xóa rạp chiếu phim");
        }

        Cinema cinema = cinemaRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy rạp chiếu phim có id = " + id));

        // Xóa ảnh nếu tồn tại
        if (cinema.getImage() != null && !cinema.getImage().startsWith("http")) {
            deleteImage(cinema.getImage());
        }

        // Xóa tất cả Seat liên quan trước
        List<Seat> seats = seatRepository.findByCinemaId(id);
        if (!seats.isEmpty()) {
            logger.info("Deleting {} seats associated with cinema ID: {}", seats.size(), id);
            seatRepository.deleteAll(seats);
        }

        // Xóa tất cả Movie liên quan trước
        List<Movie> movies = movieRepository.findByCinemaId(id);
        if (!movies.isEmpty()) {
            logger.info("Deleting {} movies associated with cinema ID: {}", movies.size(), id);
            movieRepository.deleteAll(movies);
        }

        // Xóa tất cả Room liên quan trước
        List<Room> rooms = roomRepository.findByCinemaId(id);
        if (!rooms.isEmpty()) {
            logger.info("Deleting {} rooms associated with cinema ID: {}", rooms.size(), id);
            roomRepository.deleteAll(rooms);
        }

        // Xóa rạp chiếu phim
        logger.info("Deleting cinema with ID: {}", id);
        cinemaRepository.delete(cinema);
        logger.info("Deleted cinema with ID: {}", id);
    }

    private String saveImage(MultipartFile image) {
        try {
            // Tạo tên file duy nhất
            String originalFilename = image.getOriginalFilename();
            String extension = originalFilename != null ? originalFilename.substring(originalFilename.lastIndexOf(".")) : ".jpg";
            String fileName = UUID.randomUUID().toString() + extension;
            Path filePath = Paths.get(UPLOAD_DIR + fileName);

            // Lưu file vào thư mục
            Files.write(filePath, image.getBytes());

            return fileName; // Trả về tên file
        } catch (IOException e) {
            logger.error("Lỗi khi lưu ảnh: {}", e.getMessage());
            throw new RuntimeException("Không thể lưu ảnh", e);
        }
    }

    private void deleteImage(String imagePath) {
        try {
            Path filePath = Paths.get(UPLOAD_DIR + imagePath);
            if (Files.exists(filePath)) {
                Files.delete(filePath);
                logger.info("Đã xóa ảnh: {}", imagePath);
            }
        } catch (IOException e) {
            logger.error("Lỗi khi xóa ảnh: {}", e.getMessage());
            throw new RuntimeException("Không thể xóa ảnh", e);
        }
    }
}