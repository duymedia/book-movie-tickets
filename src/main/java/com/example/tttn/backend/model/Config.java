package com.example.tttn.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "config")
@Getter
@Setter
public class Config {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "keyword", columnDefinition = "TEXT")
    private String keyword;

    @Column(name = "website_name", nullable = false)
    private String websiteName;

    @Column(name = "logo")
    private String logo;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "hotline")
    private String hotline;

    @Column(name = "fb_admin")
    private String fbAdmin;

    @Column(name = "zalo_admin")
    private String zaloAdmin;

    @Column(name = "admin_name")
    private String adminName;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}