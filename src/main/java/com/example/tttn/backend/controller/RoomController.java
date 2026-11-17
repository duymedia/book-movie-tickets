package com.example.tttn.backend.controller;

import com.example.tttn.backend.config.JwtConfig;
import com.example.tttn.backend.exception.NotFoundException;
import com.example.tttn.backend.model.Room;
import com.example.tttn.backend.service.RoomService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/rooms")
public class RoomController {

    private final RoomService roomService;
    private final JwtConfig jwtConfig;
 
    @Autowired
    public RoomController(RoomService roomService, JwtConfig jwtConfig) {
        this.roomService = roomService;
        this.jwtConfig = jwtConfig;
    }

    // Lấy tất cả rooms
    @GetMapping
    public ResponseEntity<?> getAllRooms(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = extractToken(authHeader);
        return ResponseEntity.ok(roomService.getAllRooms(token));
    }

    // Lấy room theo ID
    @GetMapping("/{id}")
    public ResponseEntity<?> getRoomById(@PathVariable Long id,
                                         @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = extractToken(authHeader);
        return ResponseEntity.ok(roomService.getRoomById(token, id));
    }

    @GetMapping("/cinema/{cinemaId}")
    public ResponseEntity<?> getRoomsByCinemaId(@PathVariable Long cinemaId,
                                               @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = extractToken(authHeader);
        return ResponseEntity.ok(roomService.getRoomsByCinemaId(token, cinemaId));
    }

    // Tạo room
    @PostMapping
    public ResponseEntity<?> createRoom(@RequestBody Room room,
                                        @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = extractToken(authHeader);
        return ResponseEntity.ok(roomService.createRoom(token, room));
    }

    // Cập nhật room
    @PutMapping("/{id}")
    public ResponseEntity<?> updateRoom(@PathVariable Long id, @RequestBody Room room,
                                        @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = extractToken(authHeader);
        return ResponseEntity.ok(roomService.updateRoom(token, id, room));
    }

    // Xóa room
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteRoom(@PathVariable Long id,
                                        @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = extractToken(authHeader);
        roomService.deleteRoom(token, id);
        return ResponseEntity.ok("Xóa phòng thành công");
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