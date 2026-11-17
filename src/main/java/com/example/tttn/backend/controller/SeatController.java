package com.example.tttn.backend.controller;

import com.example.tttn.backend.config.JwtConfig;
import com.example.tttn.backend.exception.NotFoundException;
import com.example.tttn.backend.model.Seat;
import com.example.tttn.backend.service.AuthService;
import com.example.tttn.backend.service.SeatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class SeatController {

    private final SeatService seatService;
    private final AuthService authService;
    private final JwtConfig jwtConfig;

    @Autowired
    public SeatController(SeatService seatService, AuthService authService, JwtConfig jwtConfig) {
        this.seatService = seatService;
        this.authService = authService;
        this.jwtConfig = jwtConfig;
    }

    @GetMapping("/seats")
    public ResponseEntity<?> getAllSeats(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = extractToken(authHeader);
        return ResponseEntity.ok(seatService.getAllSeats(token));
    }
    
    @GetMapping("/admin/seats")
    public ResponseEntity<?> getAllSeatsAdmin(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = extractToken(authHeader);
        return ResponseEntity.ok(seatService.getAllSeatsAdmin(token));
    }

    @GetMapping("/admin/seats/{id}")
    public ResponseEntity<?> getSeatById(@PathVariable Long id,
                                         @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = extractToken(authHeader);
        return ResponseEntity.ok(seatService.getSeatById(token, id));
    }

    @GetMapping("/seats/room/{roomId}") 
    public ResponseEntity<?> getSeatsByRoomId(@PathVariable Long roomId,
                                             @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = extractToken(authHeader);
        return ResponseEntity.ok(seatService.getSeatsByRoomId(token, roomId));
    }

    @GetMapping("/admin/seats/room/{roomId}") 
    public ResponseEntity<?> getSeatsByRoomIdAdmin(@PathVariable Long roomId,
                                             @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = extractToken(authHeader);
        return ResponseEntity.ok(seatService.getSeatsByRoomId(token, roomId));
    }

    @PostMapping
    public ResponseEntity<?> createSeat(@RequestBody Seat seat,
                                        @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = extractToken(authHeader);
        return ResponseEntity.ok(seatService.createSeat(token, seat));
    }

    @PostMapping("/admin/seats/bulk")
    public ResponseEntity<?> createBulkSeats(@RequestBody Map<String, Object> payload,
                                            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = extractToken(authHeader);
        return ResponseEntity.ok(seatService.createBulkSeats(token, payload));
    }

    @PostMapping("/admin/seats/custom")
    public ResponseEntity<?> createCustomSeats(@RequestBody Map<String, Object> payload,
                                              @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = extractToken(authHeader);
        return ResponseEntity.ok(seatService.createCustomSeats(token, payload));
    }

    @PutMapping("/admin/seats/{id}")
    public ResponseEntity<?> updateSeat(@PathVariable Long id, @RequestBody Seat seat,
                                        @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = extractToken(authHeader);
        return ResponseEntity.ok(seatService.updateSeat(token, id, seat));
    }

    @DeleteMapping("/admin/seats/{id}")
    public ResponseEntity<?> deleteSeat(@PathVariable Long id,
                                        @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = extractToken(authHeader);
        seatService.deleteSeat(token, id);
        return ResponseEntity.ok(Map.of("message", "Xóa ghế thành công", "success", true));
    }

    private String extractToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith(JwtConfig.TOKEN_PREFIX)) {
            throw new NotFoundException("Token không được cung cấp hoặc không hợp lệ");
        }
        return authHeader.substring(JwtConfig.TOKEN_PREFIX.length());
    }
}