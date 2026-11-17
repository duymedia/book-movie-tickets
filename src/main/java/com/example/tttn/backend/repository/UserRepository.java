package com.example.tttn.backend.repository;

import com.example.tttn.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
    User findByEmail(String email);
    User findByPhone(String phone);
}