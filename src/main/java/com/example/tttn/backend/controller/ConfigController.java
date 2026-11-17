package com.example.tttn.backend.controller;

import com.example.tttn.backend.config.JwtConfig;
import com.example.tttn.backend.exception.NotFoundException;
import com.example.tttn.backend.model.Config;
import com.example.tttn.backend.service.ConfigService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class ConfigController {

    private static final Logger logger = LoggerFactory.getLogger(ConfigController.class);

    private final ConfigService configService;
    private final JwtConfig jwtConfig;

    @Autowired
    public ConfigController(ConfigService configService, JwtConfig jwtConfig) {
        this.configService = configService;
        this.jwtConfig = jwtConfig;
    }
    @GetMapping("/config")
    public ResponseEntity<Config> getConfig(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = extractToken(authHeader);
        logger.info("Yêu cầu lấy cấu hình hệ thống");
        Config config = configService.getConfig(token);
        return ResponseEntity.ok(config);
    }
    @GetMapping("/admin/config")
    public ResponseEntity<Config> getConfigAdmin(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = extractToken(authHeader);
        logger.info("Yêu cầu lấy cấu hình hệ thống");
        Config config = configService.getConfigAdmin(token);
        return ResponseEntity.ok(config);
    }

    @PutMapping("/admin/config")
    public ResponseEntity<Config> updateConfig(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody Config config) {
        String token = extractToken(authHeader);
        logger.info("Yêu cầu cập nhật cấu hình hệ thống");
        Config updatedConfig = configService.updateConfig(token, config);
        return ResponseEntity.ok(updatedConfig);
    }

    @PostMapping("/admin/config/init")
    public ResponseEntity<Config> initializeConfig(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String token = extractToken(authHeader);
            logger.info("Yêu cầu khởi tạo cấu hình mặc định");
            Config config = configService.initializeDefaultConfig(token);
            logger.debug("Cấu hình mặc định được tạo: {}", config);
            return ResponseEntity.status(HttpStatus.CREATED).body(config);
        } catch (IllegalStateException e) {
            logger.warn("Yêu cầu khởi tạo bị từ chối: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(null);
        } catch (NotFoundException e) {
            logger.error("Lỗi xác thực: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(null);
        }
    }

    private String extractToken(String authHeader) {
        if (authHeader == null) {
            logger.error("Không có token");
            throw new NotFoundException("Không có token");
        }
        if (!authHeader.startsWith(JwtConfig.TOKEN_PREFIX)) {
            logger.error("Token không đúng định dạng (thiếu Bearer)");
            throw new NotFoundException("Token không đúng định dạng (thiếu Bearer)");
        }
        String token = authHeader.substring(JwtConfig.TOKEN_PREFIX.length());
        if (token.trim().isEmpty()) {
            logger.error("Token rỗng");
            throw new NotFoundException("Token rỗng");
        }
        if (!jwtConfig.validateToken(token)) {
            logger.error("Token không hợp lệ");
            throw new NotFoundException("Token không hợp lệ");
        }
        return token;
    }
}