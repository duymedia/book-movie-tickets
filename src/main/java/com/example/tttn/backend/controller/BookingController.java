package com.example.tttn.backend.controller;

import com.example.tttn.backend.config.JwtConfig;
import com.example.tttn.backend.exception.NotFoundException;
import com.example.tttn.backend.model.Booking;
import com.example.tttn.backend.service.AuthService;
import com.example.tttn.backend.service.BookingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingService bookingService;
    private final AuthService authService;
    private final JwtConfig jwtConfig;

    @Autowired
    public BookingController(BookingService bookingService, AuthService authService, JwtConfig jwtConfig) {
        this.bookingService = bookingService;
        this.authService = authService;
        this.jwtConfig = jwtConfig;
    }

    @GetMapping
    public ResponseEntity<?> getAllBookings(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = extractToken(authHeader);
        return ResponseEntity.ok(bookingService.getAllBookings(token));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getBookingById(@PathVariable Long id,
                                           @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = extractToken(authHeader);
        return ResponseEntity.ok(bookingService.getBookingById(token, id));
    }

    @PostMapping
    public ResponseEntity<?> createBooking(@RequestBody Booking booking,
                                           @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = extractToken(authHeader);
        return ResponseEntity.ok(bookingService.createBooking(token, booking));
    }

    private String extractToken(String authHeader) {
        if (authHeader == null) {
            throw new NotFoundException("Không có token");
        }
        if (!authHeader.startsWith(JwtConfig.TOKEN_PREFIX)) {
            throw new NotFoundException("Token không đúng định dạng (thiếu Bearer)");
        }
        String token = authHeader.substring(JwtConfig.TOKEN_PREFIX.length());
        if (token.trim().isEmpty()) {
            throw new NotFoundException("Token rỗng");
        }
        if (!jwtConfig.validateToken(token)) {
            throw new NotFoundException("Token không hợp lệ");
        }
        return token;
    }
}