package com.example.tttn.backend.repository;

import com.example.tttn.backend.model.UserVerify;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserVerifyRepository extends JpaRepository<UserVerify, Long> {
    UserVerify findByToken(String token);
    UserVerify findByUserId(Long userId);
}