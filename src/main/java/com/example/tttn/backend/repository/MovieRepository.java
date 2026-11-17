package com.example.tttn.backend.repository;

import com.example.tttn.backend.model.Movie;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MovieRepository extends JpaRepository<Movie, Long> {
    List<Movie> findByCinemaId(Long cinemaId);
    List<Movie> findByRoomId(Long roomId);
} 
