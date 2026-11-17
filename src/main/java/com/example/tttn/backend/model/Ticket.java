package com.example.tttn.backend.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "tickets")
@Data
public class Ticket {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false)
    private String name; // Tên loại vé (VD: "Người lớn", "Trẻ em")

    @Column(name = "age") // Độ tuổi áp dụng, có thể null nếu không giới hạn
    private Integer age;

    @Column(name = "price", nullable = false)
    private Double price; // Giá vé

    @Column(name = "image") // Hình ảnh của loại vé (URL hoặc đường dẫn), có thể null
    private String image;

    @Column(name = "type", nullable = false)
    private String type;
    
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