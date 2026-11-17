package com.example.tttn.backend.repository;

import com.example.tttn.backend.model.UserRole;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRoleRepository extends JpaRepository<UserRole, Long> {
    void deleteByUserId(Long userId);
    Optional<UserRole> findByUserId(Long userId);
}