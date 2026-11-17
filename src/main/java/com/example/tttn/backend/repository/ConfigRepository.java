package com.example.tttn.backend.repository;

import com.example.tttn.backend.model.Config;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConfigRepository extends JpaRepository<Config, Long> {
}