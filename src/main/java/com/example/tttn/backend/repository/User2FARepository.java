package com.example.tttn.backend.repository;

import com.example.tttn.backend.model.User2FA;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface User2FARepository extends JpaRepository<User2FA, Long> {
    Optional<User2FA> findByUserId(Long userId);
}