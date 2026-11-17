package com.example.tttn.backend.repository;

import com.example.tttn.backend.model.Order;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderRepository extends JpaRepository<Order, Long> {
    Optional<Order> findByBookingId(Long bookingId);
}