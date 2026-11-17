package com.example.tttn.backend.controller;

import com.example.tttn.backend.config.JwtConfig;
import com.example.tttn.backend.exception.NotFoundException;
import com.example.tttn.backend.model.Review;
import com.example.tttn.backend.service.ReviewService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ReviewController {

    private final ReviewService reviewService;
    private final JwtConfig jwtConfig;

    @Autowired
    public ReviewController(ReviewService reviewService, JwtConfig jwtConfig) {
        this.reviewService = reviewService;
        this.jwtConfig = jwtConfig;
    }

    @PostMapping("/reviews")
    public ResponseEntity<ReviewResponse> createReview(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody Review review) {
        try {
            String token = extractToken(authHeader);
            Review savedReview = reviewService.createReview(token, review);
            return ResponseEntity.ok(new ReviewResponse(true, "Tạo đánh giá thành công", savedReview));
        } catch (NotFoundException | IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ReviewResponse(false, e.getMessage(), null));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ReviewResponse(false, "Đã xảy ra lỗi hệ thống: " + e.getMessage(), null));
        }
    }

    @PutMapping("/admin/reviews/{id}")
    public ResponseEntity<ReviewResponse> updateReview(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id,
            @RequestBody Review review) {
        try {
            String token = extractToken(authHeader);
            Review updatedReview = reviewService.updateReview(token, id, review);
            return ResponseEntity.ok(new ReviewResponse(true, "Cập nhật đánh giá thành công", updatedReview));
        } catch (NotFoundException | IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ReviewResponse(false, e.getMessage(), null));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ReviewResponse(false, "Đã xảy ra lỗi hệ thống: " + e.getMessage(), null));
        }
    }

    @DeleteMapping("/admin/reviews/{id}")
    public ResponseEntity<DeleteReviewResponse> deleteReview(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id) {
        try {
            String token = extractToken(authHeader);
            reviewService.deleteReview(token, id);
            return ResponseEntity.ok(new DeleteReviewResponse(true, "Xóa đánh giá thành công"));
        } catch (NotFoundException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new DeleteReviewResponse(false, e.getMessage()));
        }
    }

    @GetMapping("/admin/reviews")
    public ResponseEntity<Map<String, Object>> getAllReviews(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String token = extractToken(authHeader);
            List<Review> reviews = reviewService.getAllReviews(token);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Lấy tất cả đánh giá thành công");
            response.put("data", reviews);
            return ResponseEntity.ok(response);
        } catch (NotFoundException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }
    }

    @GetMapping("/cinemas/{cinemaId}/reviews")
    public ResponseEntity<Map<String, Object>> getReviewsByCinema(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long cinemaId) {
        try {
            String token = extractToken(authHeader);
            List<Review> reviews = reviewService.getReviewsByCinema(token, cinemaId);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Lấy danh sách đánh giá thành công");
            response.put("data", reviews);
            return ResponseEntity.ok(response);
        } catch (NotFoundException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    @GetMapping("/movies/{movieId}/reviews")
    public ResponseEntity<Map<String, Object>> getReviewsByMovie(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long movieId) {
        try {
            String token = extractToken(authHeader);
            List<Review> reviews = reviewService.getReviewsByMovie(token, movieId);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Lấy danh sách đánh giá thành công");
            response.put("data", reviews);
            return ResponseEntity.ok(response);
        } catch (NotFoundException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    @GetMapping("/users/{userId}/reviews")
    public ResponseEntity<Map<String, Object>> getReviewsByUser(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long userId) {
        try {
            String token = extractToken(authHeader);
            List<Review> reviews = reviewService.getReviewsByUser(token, userId);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Lấy danh sách đánh giá thành công");
            response.put("data", reviews);
            return ResponseEntity.ok(response);
        } catch (NotFoundException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    private String extractToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith(JwtConfig.TOKEN_PREFIX)) {
            throw new NotFoundException("Token không được cung cấp hoặc không hợp lệ");
        }
        String token = authHeader.substring(JwtConfig.TOKEN_PREFIX.length());
        if (token.trim().isEmpty()) {
            throw new NotFoundException("Token rỗng");
        }
        return token;
    }

    record ReviewResponse(boolean success, String message, Review review) {}
    record DeleteReviewResponse(boolean success, String message) {}
}