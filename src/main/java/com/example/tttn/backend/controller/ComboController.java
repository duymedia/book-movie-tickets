package com.example.tttn.backend.controller;

import com.example.tttn.backend.config.JwtConfig;
import com.example.tttn.backend.exception.NotFoundException;
import com.example.tttn.backend.model.Combo;
import com.example.tttn.backend.service.ComboService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
public class ComboController {

    private static final Logger logger = LoggerFactory.getLogger(ComboController.class);

    private final ComboService comboService;
    private final JwtConfig jwtConfig;

    @Autowired
    public ComboController(ComboService comboService, JwtConfig jwtConfig) {
        this.comboService = comboService;
        this.jwtConfig = jwtConfig;
    }

    @PostMapping(value = "/admin/combos", consumes = {"multipart/form-data"})
    public ResponseEntity<?> createCombo(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestPart("name") String name,
            @RequestPart("description") String description,
            @RequestPart("price") String price,
            @RequestPart(value = "quantity", required = false) String quantity,
            @RequestPart(value = "image", required = false) MultipartFile image) {
        try {
            String token = extractToken(authHeader, true);
            Combo combo = new Combo();
            combo.setName(name);
            combo.setDescription(description);
            combo.setPrice(Double.parseDouble(price));
            if (quantity != null && !quantity.trim().isEmpty()) {
                combo.setQuantity(Integer.parseInt(quantity));
            }
            return ResponseEntity.ok(comboService.createCombo(token, combo, image));
        } catch (NotFoundException | IllegalArgumentException e) {
            logger.error("Error creating combo: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            logger.error("Unexpected error creating combo: {}", e.getMessage());
            return ResponseEntity.status(500).body("Lỗi không xác định khi tạo combo");
        }
    }

    @PutMapping(value = "/admin/combos/{id}", consumes = {"multipart/form-data"})
    public ResponseEntity<?> updateCombo(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id,
            @RequestPart("name") String name,
            @RequestPart("description") String description,
            @RequestPart("price") String price,
            @RequestPart(value = "quantity", required = false) String quantity,
            @RequestPart(value = "image", required = false) MultipartFile image) {
        try {
            String token = extractToken(authHeader, true);
            Combo combo = new Combo();
            combo.setName(name);
            combo.setDescription(description);
            combo.setPrice(Double.parseDouble(price));
            if (quantity != null && !quantity.trim().isEmpty()) {
                combo.setQuantity(Integer.parseInt(quantity));
            }
            return ResponseEntity.ok(comboService.updateCombo(token, id, combo, image));
        } catch (NotFoundException | IllegalArgumentException e) {
            logger.error("Error updating combo with ID {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            logger.error("Unexpected error updating combo with ID {}: {}", id, e.getMessage());
            return ResponseEntity.status(500).body("Lỗi không xác định khi cập nhật combo");
        }
    }

    @DeleteMapping("/admin/combos/{id}")
    public ResponseEntity<?> deleteCombo(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id) {
        try {
            String token = extractToken(authHeader, true);
            comboService.deleteCombo(token, id);
            return ResponseEntity.ok("Xóa combo thành công");
        } catch (NotFoundException e) {
            logger.error("Error deleting combo with ID {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            logger.error("Unexpected error deleting combo with ID {}: {}", id, e.getMessage());
            return ResponseEntity.status(500).body("Lỗi không xác định khi xóa combo");
        }
    }

    @GetMapping("/combos")
    public ResponseEntity<?> getAllCombos(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String token = extractToken(authHeader, false);
            return ResponseEntity.ok(comboService.getAllCombos(token));
        } catch (NotFoundException e) {
            logger.error("Error retrieving combos: {}", e.getMessage());
            return ResponseEntity.status(401).body(e.getMessage());
        } catch (Exception e) {
            logger.error("Unexpected error retrieving combos: {}", e.getMessage());
            return ResponseEntity.status(500).body("Lỗi không xác định khi lấy danh sách combo");
        }
    }

    @GetMapping("/combos/{id}")
    public ResponseEntity<?> getComboById(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id) {
        try {
            String token = extractToken(authHeader, false);
            return ResponseEntity.ok(comboService.getComboById(token, id));
        } catch (NotFoundException e) {
            logger.error("Error retrieving combo with ID {}: {}", id, e.getMessage());
            return ResponseEntity.status(404).body(e.getMessage());
        } catch (Exception e) {
            logger.error("Unexpected error retrieving combo with ID {}: {}", id, e.getMessage());
            return ResponseEntity.status(500).body("Lỗi không xác định khi lấy combo");
        }
    }

    @GetMapping("/admin/combos")
    public ResponseEntity<?> getAllCombosForAdmin(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String token = extractToken(authHeader, true);
            return ResponseEntity.ok(comboService.getAllCombosForAdmin(token));
        } catch (NotFoundException e) {
            logger.error("Error retrieving combos for admin: {}", e.getMessage());
            return ResponseEntity.status(403).body(e.getMessage());
        } catch (Exception e) {
            logger.error("Unexpected error retrieving combos for admin: {}", e.getMessage());
            return ResponseEntity.status(500).body("Lỗi không xác định khi lấy danh sách combo");
        }
    }

    @GetMapping("/admin/combos/{id}")
    public ResponseEntity<?> getComboByIdForAdmin(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id) {
        try {
            String token = extractToken(authHeader, true);
            return ResponseEntity.ok(comboService.getComboByIdForAdmin(token, id));
        } catch (NotFoundException e) {
            logger.error("Error retrieving combo with ID {} for admin: {}", id, e.getMessage());
            return ResponseEntity.status(403).body(e.getMessage());
        } catch (Exception e) {
            logger.error("Unexpected error retrieving combo with ID {} for admin: {}", id, e.getMessage());
            return ResponseEntity.status(500).body("Lỗi không xác định khi lấy combo");
        }
    }

    private String extractToken(String authHeader, boolean requireToken) {
        if (authHeader == null) {
            if (requireToken) {
                logger.error("Authorization header is missing");
                throw new NotFoundException("Không có token");
            }
            return null; // Allow null token for public endpoints
        }
        if (!authHeader.startsWith(JwtConfig.TOKEN_PREFIX)) {
            logger.error("Invalid token format: {}", authHeader);
            throw new NotFoundException("Token không đúng định dạng (thiếu Bearer)");
        }
        String token = authHeader.substring(JwtConfig.TOKEN_PREFIX.length()).trim();
        if (token.isEmpty()) {
            logger.error("Token is empty");
            throw new NotFoundException("Token rỗng");
        }
        if (!jwtConfig.validateToken(token)) {
            logger.error("Invalid token");
            throw new NotFoundException("Token không hợp lệ");
        }
        return token;
    }
}