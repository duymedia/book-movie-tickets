package com.example.tttn.backend.repository;

import com.example.tttn.backend.model.Room;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface RoomRepository extends JpaRepository<Room, Long> {
    List<Room> findByCinemaId(Long cinemaId);
} 
