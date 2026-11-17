package com.example.tttn.backend.service;

import com.example.tttn.backend.config.JwtConfig;
import com.example.tttn.backend.exception.NotFoundException;
import com.example.tttn.backend.model.Review;
import com.example.tttn.backend.model.Cinema;
import com.example.tttn.backend.model.Movie;
import com.example.tttn.backend.model.User;
import com.example.tttn.backend.repository.ReviewRepository;
import com.example.tttn.backend.repository.CinemaRepository;
import com.example.tttn.backend.repository.MovieRepository;
import com.example.tttn.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.PersistenceException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ReviewService {

    private static final Logger logger = LoggerFactory.getLogger(ReviewService.class);

    private final ReviewRepository reviewRepository;
    private final CinemaRepository cinemaRepository;
    private final MovieRepository movieRepository;
    private final UserRepository userRepository;
    private final AuthService authService;
    private final JwtConfig jwtConfig;

    @Autowired
    public ReviewService(ReviewRepository reviewRepository, CinemaRepository cinemaRepository,
                         MovieRepository movieRepository, UserRepository userRepository,
                         AuthService authService, JwtConfig jwtConfig) {
        this.reviewRepository = reviewRepository;
        this.cinemaRepository = cinemaRepository;
        this.movieRepository = movieRepository;
        this.userRepository = userRepository;
        this.authService = authService;
        this.jwtConfig = jwtConfig;
    }

    @Transactional
    public Review createReview(String token, Review review) {
        validateToken(token);
        boolean isAdmin = authService.hasRole(token, "ADMIN");
        boolean isUser = authService.hasRole(token, "USER");
        if (!isAdmin && !isUser) {
            throw new NotFoundException("Chỉ USER hoặc ADMIN được tạo đánh giá");
        }

        Long userId = getUserIdFromToken(token);
        validateReview(review, userId);

        try {
            review.setUser(userRepository.findById(userId)
                    .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng")));

            if (review.getCinema() != null && review.getCinema().getId() != null) {
                review.setCinema(cinemaRepository.findById(review.getCinema().getId())
                        .orElseThrow(() -> new NotFoundException("Không tìm thấy rạp chiếu phim")));
                review.setMovie(null); // Ensure movie is null
                logger.debug("Creating review for cinema_id: {}", review.getCinema().getId());
            } else if (review.getMovie() != null && review.getMovie().getId() != null) {
                review.setMovie(movieRepository.findById(review.getMovie().getId())
                        .orElseThrow(() -> new NotFoundException("Không tìm thấy phim")));
                review.setCinema(null); // Ensure cinema is null
                logger.debug("Creating review for movie_id: {}", review.getMovie().getId());
            }

            Review saved = reviewRepository.save(review);
            logger.info("Tạo review ID: {}", saved.getId());
            return saved;
        } catch (PersistenceException e) {
            logger.error("Lỗi khi lưu review: {}", e.getMessage(), e);
            throw new RuntimeException("Không thể lưu đánh giá do lỗi cơ sở dữ liệu: " + e.getMessage());
        }
    }

    @Transactional
    public Review updateReview(String token, Long id, Review reviewDetails) {
        validateToken(token);
        if (!authService.hasRole(token, "ADMIN")) {
            throw new NotFoundException("Chỉ ADMIN được cập nhật đánh giá");
        }

        Review existingReview = reviewRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy đánh giá với ID: " + id));

        try {
            if (reviewDetails.getRating() != null && reviewDetails.getRating() >= 1 && reviewDetails.getRating() <= 5) {
                existingReview.setRating(reviewDetails.getRating());
            }
            if (reviewDetails.getComment() != null) {
                existingReview.setComment(reviewDetails.getComment());
            }
            if (reviewDetails.getCinema() != null && reviewDetails.getCinema().getId() != null) {
                existingReview.setCinema(cinemaRepository.findById(reviewDetails.getCinema().getId())
                        .orElseThrow(() -> new NotFoundException("Không tìm thấy rạp chiếu phim")));
                existingReview.setMovie(null);
            } else if (reviewDetails.getMovie() != null && reviewDetails.getMovie().getId() != null) {
                existingReview.setMovie(movieRepository.findById(reviewDetails.getMovie().getId())
                        .orElseThrow(() -> new NotFoundException("Không tìm thấy phim")));
                existingReview.setCinema(null);
            }
            validateReview(existingReview, existingReview.getUser().getId());
            Review updated = reviewRepository.save(existingReview);
            logger.info("Cập nhật review ID: {}", updated.getId());
            return updated;
        } catch (PersistenceException e) {
            logger.error("Lỗi khi cập nhật review: {}", e.getMessage(), e);
            throw new RuntimeException("Không thể cập nhật đánh giá do lỗi cơ sở dữ liệu: " + e.getMessage());
        }
    }

    @Transactional
    public void deleteReview(String token, Long id) {
        validateToken(token);
        if (!authService.hasRole(token, "ADMIN")) {
            throw new NotFoundException("Chỉ ADMIN được xóa đánh giá");
        }

        Review review = reviewRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy đánh giá với ID: " + id));

        reviewRepository.delete(review);
        logger.info("Xóa review ID: {}", id);
    }

    @Transactional(readOnly = true)
    public List<Review> getAllReviews(String token) {
        validateToken(token);
        if (!authService.hasRole(token, "ADMIN")) {
            throw new NotFoundException("Chỉ ADMIN được xem tất cả đánh giá");
        }
        List<Review> reviews = reviewRepository.findAll();
        logger.info("Lấy {} review tổng cộng", reviews.size());
        return reviews;
    }

    @Transactional(readOnly = true)
    public List<Review> getReviewsByCinema(String token, Long cinemaId) {
        validateToken(token);
        if (!authService.hasRole(token, "USER") && !authService.hasRole(token, "ADMIN")) {
            throw new NotFoundException("Chỉ USER hoặc ADMIN được xem đánh giá của rạp");
        }
        cinemaRepository.findById(cinemaId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy rạp chiếu phim với ID: " + cinemaId));
        List<Review> reviews = reviewRepository.findByCinemaId(cinemaId);
        logger.info("Lấy {} review cho rạp ID {}", reviews.size(), cinemaId);
        return reviews;
    }

    @Transactional(readOnly = true)
    public List<Review> getReviewsByMovie(String token, Long movieId) {
        validateToken(token);
        if (!authService.hasRole(token, "USER") && !authService.hasRole(token, "ADMIN")) {
            throw new NotFoundException("Chỉ USER hoặc ADMIN được xem đánh giá của phim");
        }
        movieRepository.findById(movieId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy phim với ID: " + movieId));
        List<Review> reviews = reviewRepository.findByMovieId(movieId);
        logger.info("Lấy {} review cho phim ID {}", reviews.size(), movieId);
        return reviews;
    }

    @Transactional(readOnly = true)
    public List<Review> getReviewsByUser(String token, Long userId) {
        validateToken(token);
        Long currentUserId = getUserIdFromToken(token);
        boolean isAdmin = authService.hasRole(token, "ADMIN");
        boolean isUser = authService.hasRole(token, "USER");

        if (!isAdmin && !isUser) {
            throw new NotFoundException("Chỉ USER hoặc ADMIN được xem đánh giá");
        }
        if (!isAdmin && !currentUserId.equals(userId)) {
            throw new NotFoundException("Bạn không có quyền xem đánh giá của người dùng khác");
        }

        userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng với ID: " + userId));
        List<Review> reviews = reviewRepository.findByUserId(userId);
        logger.info("Lấy {} review cho người dùng ID {}", reviews.size(), userId);
        return reviews;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getAverageRating(Long id, String type) {
        List<Review> reviews;
        if ("cinema".equalsIgnoreCase(type)) {
            cinemaRepository.findById(id)
                    .orElseThrow(() -> new NotFoundException("Không tìm thấy rạp chiếu phim với ID: " + id));
            reviews = reviewRepository.findByCinemaId(id);
        } else if ("movie".equalsIgnoreCase(type)) {
            movieRepository.findById(id)
                    .orElseThrow(() -> new NotFoundException("Không tìm thấy phim với ID: " + id));
            reviews = reviewRepository.findByMovieId(id);
        } else {
            throw new IllegalArgumentException("Loại đánh giá không hợp lệ: " + type);
        }

        if (reviews.isEmpty()) {
            return Map.of(type + "Id", id, "averageRating", 0.0, "reviewCount", 0);
        }

        double averageRating = reviews.stream()
                .mapToInt(Review::getRating)
                .average()
                .orElse(0.0);
        logger.info("Đánh giá trung bình cho {} ID {}: {} sao ({} review)", type, id, averageRating, reviews.size());
        return Map.of(
                type + "Id", id,
                "averageRating", Math.round(averageRating * 100.0) / 100.0,
                "reviewCount", reviews.size()
        );
    }

    private void validateToken(String token) {
        if (!jwtConfig.validateToken(token)) {
            throw new NotFoundException("Token không hợp lệ hoặc đã hết hạn");
        }
    }

    private Long getUserIdFromToken(String token) {
        String email = jwtConfig.extractEmail(token);
        User user = userRepository.findByEmail(email);
        if (user == null) {
            throw new NotFoundException("Người dùng không tồn tại");
        }
        return user.getId();
    }

    private void validateReview(Review review, Long userId) {
        if (review == null) {
            throw new IllegalArgumentException("Dữ liệu đánh giá không được để trống");
        }

        boolean hasCinema = review.getCinema() != null && review.getCinema().getId() != null;
        boolean hasMovie = review.getMovie() != null && review.getMovie().getId() != null;

        if (hasCinema && hasMovie) {
            throw new IllegalArgumentException("Đánh giá chỉ có thể cho rạp chiếu phim hoặc phim, không được cả hai");
        }
        if (!hasCinema && !hasMovie) {
            throw new IllegalArgumentException("Cần cung cấp ID rạp chiếu phim hoặc ID phim");
        }

        if (review.getRating() == null || review.getRating() < 1 || review.getRating() > 5) {
            throw new IllegalArgumentException("Điểm đánh giá phải từ 1 đến 5 sao");
        }
    }
}