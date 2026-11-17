package com.example.tttn.backend.model;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import jakarta.persistence.*;
import lombok.Data;

import com.fasterxml.jackson.annotation.JsonRawValue;

@Entity
@Table(name = "bookings")
@Data
public class Booking {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne
    @JoinColumn(name = "cinema_id", nullable = false)
    private Cinema cinema;

    @ManyToOne
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @Column(name = "seat_id", columnDefinition = "TEXT")
    @JsonRawValue
    private String seatId;

    @ManyToOne
    @JoinColumn(name = "movie_id", nullable = false)
    private Movie movie;

    @Column(name = "showtime_id", columnDefinition = "TEXT")
    @JsonRawValue
    private String showtimeId;

    @Column(name = "booking_time", nullable = false)
    private LocalDateTime bookingTime;

    @Column(name = "ticket_id", columnDefinition = "TEXT")
    @JsonRawValue
    private String ticketId;

    @Column(name = "amount", columnDefinition = "TEXT")
    @JsonRawValue
    private String amount;

    @Column(name = "combo_id", columnDefinition = "TEXT")
    @JsonRawValue
    private String comboId;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "data_json", columnDefinition = "TEXT")
    @JsonRawValue
    private String dataJson;

    @Transient
    private Map<Long, Integer> ticket = new HashMap<>();

    @Transient
    private Map<Long, Boolean> seat = new HashMap<>();

    @Transient
    private Map<Long, Integer> combos = new HashMap<>();

    @Transient
    private Map<Long, Boolean> showtimes = new HashMap<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        bookingTime = LocalDateTime.now();
        status = "PENDING";
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}