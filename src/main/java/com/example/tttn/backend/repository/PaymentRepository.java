package com.example.tttn.backend.repository;

import com.example.tttn.backend.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
}