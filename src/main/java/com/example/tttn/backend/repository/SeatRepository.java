package com.example.tttn.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.tttn.backend.model.Seat;

public interface SeatRepository extends  JpaRepository<Seat,Long>{
    List<Seat> findByCinemaId(Long cinemaId);
    List<Seat> findByRoomId(Long roomId);
    boolean existsByNameAndRoomId(String name, Long roomId);
}
