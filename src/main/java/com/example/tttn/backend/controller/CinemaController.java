package com.example.tttn.backend.controller;

import com.example.tttn.backend.config.JwtConfig;
import com.example.tttn.backend.exception.NotFoundException;
import com.example.tttn.backend.model.Cinema;
import com.example.tttn.backend.service.AuthService;
import com.example.tttn.backend.service.CinemaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
public class CinemaController {

    private final CinemaService cinemaService;
    private final AuthService authService;
    private final JwtConfig jwtConfig;

    @Autowired
    public CinemaController(CinemaService cinemaService, AuthService authService, JwtConfig jwtConfig) {
        this.cinemaService = cinemaService;
        this.authService = authService;
        this.jwtConfig = jwtConfig;
    }

    @GetMapping("/cinemas")
    public ResponseEntity<?> getAllCinemas(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = extractToken(authHeader);
        return ResponseEntity.ok(cinemaService.getAllCinemas(token));
    }

    @GetMapping("/admin/cinemas")
    public ResponseEntity<?> getAllCinemasAdmin(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = extractToken(authHeader);
        return ResponseEntity.ok(cinemaService.getAllCinemasAdmin(token));
    }

    @GetMapping("/admin/cinemas/{id}")
    public ResponseEntity<?> getCinemaById(@PathVariable Long id,
                                           @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = extractToken(authHeader);
        return ResponseEntity.ok(cinemaService.getCinemaById(token, id));
    }

    @PostMapping(value = "/admin/cinemas", consumes = {"multipart/form-data"})
    public ResponseEntity<?> createCinema(
            @RequestPart("name") String name,
            @RequestPart("address") String address,
            @RequestPart("phone") String phone,
            @RequestPart("description") String description,
 
            @RequestPart(value = "image", required = false) MultipartFile image,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = extractToken(authHeader);
        Cinema cinema = new Cinema();
        cinema.setName(name);
        cinema.setAddress(address);
        cinema.setPhone(phone);
        cinema.setDescription(description);
       
        return ResponseEntity.ok(cinemaService.createCinema(token, cinema, image));
    }

    @PutMapping(value = "/admin/cinemas/{id}", consumes = {"multipart/form-data"})
    public ResponseEntity<?> updateCinema(
            @PathVariable Long id,
            @RequestPart("name") String name,
            @RequestPart("address") String address,
            @RequestPart("phone") String phone,
            @RequestPart("description") String description,
            @RequestPart(value = "image", required = false) MultipartFile image,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = extractToken(authHeader);
        Cinema cinema = new Cinema();
        cinema.setName(name);
        cinema.setAddress(address);
        cinema.setPhone(phone);
        cinema.setDescription(description);
        
        return ResponseEntity.ok(cinemaService.updateCinema(token, id, cinema, image));
    }

    @DeleteMapping("/admin/cinemas/{id}")
    public ResponseEntity<?> deleteCinema(@PathVariable Long id,
                                          @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = extractToken(authHeader);
        cinemaService.deleteCinema(token, id);
        return ResponseEntity.ok("Xóa rạp chiếu phim thành công");
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