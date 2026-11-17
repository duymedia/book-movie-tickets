package com.example.tttn.backend.model;

import java.time.LocalDateTime;
import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "seats")
@Data
public class Seat {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "row_index", nullable = false)
    private Integer rowIndex;

    @Column(name = "col_index", nullable = false)
    private Integer colIndex;

    @Column(name = "seat_type", nullable = false)
    private Integer seatType; // 1: standard, 2: vip, 3: couple

    @Column(name = "status", nullable = false)
    private String status; // available, booked, broken

    @ManyToOne
    @JoinColumn(name = "cinema_id", nullable = false)
    private Cinema cinema;

    @ManyToOne
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @Column(name = "couple_seat_id")
    private Long coupleSeatId; // ID của ghế liền kề nếu là ghế đôi

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