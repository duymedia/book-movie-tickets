package com.example.tttn.backend.service;

import com.example.tttn.backend.config.JwtConfig;
import com.example.tttn.backend.exception.NotFoundException;
import com.example.tttn.backend.model.Cinema;
import com.example.tttn.backend.model.Movie;
import com.example.tttn.backend.model.Review;
import com.example.tttn.backend.model.Room;
import com.example.tttn.backend.model.Showtime;
import com.example.tttn.backend.repository.CinemaRepository;
import com.example.tttn.backend.repository.MovieRepository;
import com.example.tttn.backend.repository.ReviewRepository;
import com.example.tttn.backend.repository.RoomRepository;
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
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class MovieService {

    private static final Logger logger = LoggerFactory.getLogger(MovieService.class);

    // Đường dẫn thư mục lưu ảnh và URL cơ sở
    private static final String UPLOAD_DIR = "uploads/images/";
    private static final String IMAGE_BASE_URL = "http://localhost:8080/uploads/images/";
    private static final List<String> ALLOWED_IMAGE_EXTENSIONS = Arrays.asList(".jpg", ".jpeg", ".png", ".gif");

    private final MovieRepository movieRepository;
    private final CinemaRepository cinemaRepository;
    private final RoomRepository roomRepository;
    private final ReviewRepository reviewRepository;
    private final AuthService authService;
    private final JwtConfig jwtConfig;

    @Autowired
    public MovieService(MovieRepository movieRepository, CinemaRepository cinemaRepository,
                        RoomRepository roomRepository, ReviewRepository reviewRepository,
                        AuthService authService, JwtConfig jwtConfig) {
        this.movieRepository = movieRepository;
        this.cinemaRepository = cinemaRepository;
        this.roomRepository = roomRepository;
        this.reviewRepository = reviewRepository;
        this.authService = authService;
        this.jwtConfig = jwtConfig;

        // Tạo thư mục uploads/images nếu chưa tồn tại
        try {
            Files.createDirectories(Paths.get(UPLOAD_DIR));
            logger.info("Created or verified upload directory: {}", UPLOAD_DIR);
        } catch (IOException e) {
            logger.error("Failed to create upload directory: {}", e.getMessage());
            throw new RuntimeException("Cannot create upload directory", e);
        }
    }

    @Transactional
    public String uploadImage(String token, MultipartFile file) throws IOException {
        validateToken(token);
        if (!authService.hasRole(token, "ADMIN")) {
            logger.error("User with token {} does not have ADMIN role", token);
            throw new NotFoundException("Only ADMIN can upload images");
        }
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Image file cannot be empty");
        }

        // Kiểm tra định dạng tệp
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || !isValidImageExtension(originalFilename)) {
            throw new IllegalArgumentException("Invalid image format. Allowed formats: " + ALLOWED_IMAGE_EXTENSIONS);
        }

        // Tạo tên tệp duy nhất
        String extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        String fileName = UUID.randomUUID().toString() + extension;
        Path filePath = Paths.get(UPLOAD_DIR + fileName);

        // Lưu tệp
        Files.write(filePath, file.getBytes());
        String imageUrl = IMAGE_BASE_URL + fileName;

        logger.info("Uploaded image: {}", imageUrl);
        return imageUrl;
    }

    @Transactional(readOnly = true)
    public List<Movie> getAllMovies(String token) {
        validateToken(token);
        List<Movie> movies = movieRepository.findAll();
        // Cập nhật URL hình ảnh đầy đủ
        List<Movie> updatedMovies = movies.stream().map(this::updateImageUrl).collect(Collectors.toList());
        logger.info("Retrieved {} movies", updatedMovies.size());
        return updatedMovies;
    }

    @Transactional(readOnly = true)
    public List<Movie> getAllMoviesAdmin(String token) {
        validateToken(token);
        if (!authService.hasRole(token, "ADMIN")) {
            logger.error("User with token {} does not have ADMIN role", token);
            throw new NotFoundException("Chỉ ADMIN có quyền tạo combo");
        }
        List<Movie> movies = movieRepository.findAll();
        // Cập nhật URL hình ảnh đầy đủ
        List<Movie> updatedMovies = movies.stream().map(this::updateImageUrl).collect(Collectors.toList());
        logger.info("Retrieved {} movies", updatedMovies.size());
        return updatedMovies;
    }

    @Transactional(readOnly = true)
    public Movie getMovieById(String token, Long id) {
        validateToken(token);
        Movie movie = movieRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Movie not found with ID: " + id));
        // Cập nhật URL hình ảnh đầy đủ
        Movie updatedMovie = updateImageUrl(movie);
        logger.info("Retrieved movie with ID: {}", id);
        return updatedMovie;
    }

    @Transactional(readOnly = true)
    public Movie getMovieByIdAdmin(String token, Long id) {
        validateToken(token);
        if (!authService.hasRole(token, "ADMIN")) {
            logger.error("User with token {} does not have ADMIN role", token);
            throw new NotFoundException("Only ADMIN can create movies");
        }
        Movie movie = movieRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Movie not found with ID: " + id));
        // Cập nhật URL hình ảnh đầy đủ
        Movie updatedMovie = updateImageUrl(movie);
        logger.info("Retrieved movie with ID: {}", id);
        return updatedMovie;
    }

    @Transactional
    public Movie createMovie(String token, Movie movie, MultipartFile image) {
        validateToken(token);
        if (!authService.hasRole(token, "ADMIN")) {
            logger.error("User with token {} does not have ADMIN role", token);
            throw new NotFoundException("Only ADMIN can create movies");
        }
        validateMovie(movie);

        // Xử lý ảnh nếu có
        if (image != null && !image.isEmpty()) {
            String imagePath = saveImage(image);
            movie.setImage(imagePath); // Lưu tên tệp
        } else {
            throw new IllegalArgumentException("Movie image is required");
        }

        Cinema cinema = cinemaRepository.findById(movie.getCinema().getId())
                .orElseThrow(() -> new NotFoundException("Cinema not found with ID: " + movie.getCinema().getId()));
        Room room = roomRepository.findById(movie.getRoom().getId())
                .orElseThrow(() -> new NotFoundException("Room not found with ID: " + movie.getRoom().getId()));

        if (!room.getCinema().getId().equals(cinema.getId())) {
            throw new IllegalArgumentException("Room does not belong to this cinema");
        }

        movie.setCinema(cinema);
        movie.setRoom(room);

        if (movie.getShowtimes() != null) {
            movie.getShowtimes().forEach(showtime -> showtime.setMovie(movie));
        }

        logger.info("Creating movie: {}", movie.getTitle());
        Movie savedMovie = movieRepository.save(movie);
        // Cập nhật URL hình ảnh đầy đủ
        Movie updatedMovie = updateImageUrl(savedMovie);
        logger.info("Created movie with ID: {}", updatedMovie.getId());
        return updatedMovie;
    }

    @Transactional
    public Movie updateMovie(String token, Long id, Movie movieDetails, MultipartFile image) {
        validateToken(token);
        if (!authService.hasRole(token, "ADMIN")) {
            logger.error("User with token {} does not have ADMIN role", token);
            throw new NotFoundException("Only ADMIN can update movies");
        }
        Movie movie = movieRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Movie not found with ID: " + id));

        if (movieDetails.getTitle() != null && !movieDetails.getTitle().isEmpty()) {
            movie.setTitle(movieDetails.getTitle());
        }
        if (movieDetails.getCategory() != null && !movieDetails.getCategory().isEmpty()) {
            movie.setCategory(movieDetails.getCategory());
        }
        if (movieDetails.getDurationMinutes() != null) {
            movie.setDurationMinutes(movieDetails.getDurationMinutes());
        }
        if (movieDetails.getDescription() != null) {
            movie.setDescription(movieDetails.getDescription());
        }
        movie.setDirector(movieDetails.getDirector());
        movie.setActors(movieDetails.getActors());
        if (movieDetails.getCinema() != null && movieDetails.getCinema().getId() != null) {
            Cinema cinema = cinemaRepository.findById(movieDetails.getCinema().getId())
                    .orElseThrow(() -> new NotFoundException("Cinema not found with ID: " + movieDetails.getCinema().getId()));
            movie.setCinema(cinema);
        }
        if (movieDetails.getRoom() != null && movieDetails.getRoom().getId() != null) {
            Room room = roomRepository.findById(movieDetails.getRoom().getId())
                    .orElseThrow(() -> new NotFoundException("Room not found with ID: " + movieDetails.getRoom().getId()));
            if (!room.getCinema().getId().equals(movie.getCinema().getId())) {
                throw new IllegalArgumentException("Room does not belong to this cinema");
            }
            movie.setRoom(room);
        }
        if (movieDetails.getShowtimes() != null) {
            movie.getShowtimes().clear();
            movieDetails.getShowtimes().forEach(showtime -> {
                showtime.setMovie(movie);
                movie.getShowtimes().add(showtime);
            });
        }

        // Xử lý ảnh nếu có
        if (image != null && !image.isEmpty()) {
            // Xóa ảnh cũ nếu tồn tại
            if (movie.getImage() != null && !movie.getImage().startsWith("http")) {
                deleteImage(movie.getImage());
            }
            String imagePath = saveImage(image);
            movie.setImage(imagePath); // Lưu tên tệp
        }

        logger.info("Updating movie with ID {}: {}", id, movie.getTitle());
        Movie updatedMovie = movieRepository.save(movie);
        // Cập nhật URL hình ảnh đầy đủ
        updatedMovie = updateImageUrl(updatedMovie);
        logger.info("Updated movie with ID: {}", updatedMovie.getId());
        return updatedMovie;
    }

    @Transactional
    public void deleteMovie(String token, Long id) {
        validateToken(token);
        if (!authService.hasRole(token, "ADMIN")) {
            logger.error("User with token {} does not have ADMIN role", token);
            throw new NotFoundException("Only ADMIN can delete movies");
        }
        Movie movie = movieRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Movie not found with ID: " + id));

        // Xóa ảnh nếu tồn tại
        if (movie.getImage() != null && !movie.getImage().startsWith("http")) {
            deleteImage(movie.getImage());
        }

        movieRepository.delete(movie);
        logger.info("Deleted movie with ID: {}", id);
    }

    @Transactional(readOnly = true)
    public List<Movie> getMoviesByCinema(String token, Long cinemaId) {
        validateToken(token);
        List<Movie> movies = movieRepository.findByCinemaId(cinemaId);
        // Cập nhật URL hình ảnh đầy đủ
        List<Movie> updatedMovies = movies.stream().map(this::updateImageUrl).collect(Collectors.toList());
        logger.info("Retrieved {} movies for cinema ID: {}", updatedMovies.size(), cinemaId);
        return updatedMovies;
    }

    @Transactional(readOnly = true)
    public List<Movie> getMoviesByRoom(String token, Long roomId) {
        validateToken(token);
        List<Movie> movies = movieRepository.findByRoomId(roomId);
        // Cập nhật URL hình ảnh đầy đủ
        List<Movie> updatedMovies = movies.stream().map(this::updateImageUrl).collect(Collectors.toList());
        logger.info("Retrieved {} movies for room ID: {}", updatedMovies.size(), roomId);
        return updatedMovies;
    }

    @Transactional(readOnly = true)
    public List<Review> getReviewsByMovie(String token, Long movieId) {
        validateToken(token);
        List<Review> reviews = reviewRepository.findByMovieId(movieId);
        logger.info("Retrieved {} reviews for movie ID: {}", reviews.size(), movieId);
        return reviews;
    }

    private void validateToken(String token) {
        if (!jwtConfig.validateToken(token)) {
            throw new NotFoundException("Invalid or expired token");
        }
    }

    private void validateMovie(Movie movie) {
        if (movie == null) {
            throw new IllegalArgumentException("Movie data cannot be empty");
        }
        if (movie.getTitle() == null || movie.getTitle().isEmpty()) {
            throw new IllegalArgumentException("Movie title cannot be empty");
        }
        if (movie.getCategory() == null || movie.getCategory().isEmpty()) {
            throw new IllegalArgumentException("Movie category cannot be empty");
        }
        if (movie.getDurationMinutes() == null || movie.getDurationMinutes() <= 0) {
            throw new IllegalArgumentException("Movie duration must be a positive number");
        }
        if (movie.getCinema() == null || movie.getCinema().getId() == null) {
            throw new IllegalArgumentException("Cinema ID must be provided");
        }
        if (movie.getRoom() == null || movie.getRoom().getId() == null) {
            throw new IllegalArgumentException("Room ID must be provided");
        }
        if (movie.getShowtimes() == null || movie.getShowtimes().isEmpty()) {
            throw new IllegalArgumentException("At least one showtime must be provided");
        }
    }

    private String saveImage(MultipartFile image) {
        try {
            // Kiểm tra định dạng tệp
            String originalFilename = image.getOriginalFilename();
            if (originalFilename == null || !isValidImageExtension(originalFilename)) {
                throw new IllegalArgumentException("Invalid image format. Allowed formats: " + ALLOWED_IMAGE_EXTENSIONS);
            }

            // Tạo tên tệp duy nhất
            String extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            String fileName = UUID.randomUUID().toString() + extension;
            Path filePath = Paths.get(UPLOAD_DIR + fileName);

            // Lưu tệp
            Files.write(filePath, image.getBytes());

            return fileName; // Trả về tên tệp
        } catch (IOException e) {
            logger.error("Error saving image: {}", e.getMessage());
            throw new RuntimeException("Cannot save image", e);
        }
    }

    private void deleteImage(String imagePath) {
        try {
            Path filePath = Paths.get(UPLOAD_DIR + imagePath);
            if (Files.exists(filePath)) {
                Files.delete(filePath);
                logger.info("Deleted image: {}", imagePath);
            }
        } catch (IOException e) {
            logger.error("Error deleting image: {}", e.getMessage());
            throw new RuntimeException("Cannot delete image", e);
        }
    }

    private Movie updateImageUrl(Movie movie) {
        if (movie.getImage() != null && !movie.getImage().startsWith("http")) {
            movie.setImage(IMAGE_BASE_URL + movie.getImage());
        }
        return movie;
    }

    private boolean isValidImageExtension(String fileName) {
        return ALLOWED_IMAGE_EXTENSIONS.stream()
                .anyMatch(ext -> fileName.toLowerCase().endsWith(ext));
    }
}