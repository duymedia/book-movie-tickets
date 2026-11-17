package com.example.tttn.backend.repository;

import com.example.tttn.backend.model.Review;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByCinemaId(Long cinemaId);
    List<Review> findByMovieId(Long movieId);
    List<Review> findByUserId(Long userId);
}