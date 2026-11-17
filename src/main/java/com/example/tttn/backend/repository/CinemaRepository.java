package com.example.tttn.backend.repository;

import com.example.tttn.backend.model.Cinema;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CinemaRepository extends JpaRepository<Cinema, Long> {
    Cinema findById(long id);
}