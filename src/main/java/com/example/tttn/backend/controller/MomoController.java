package com.example.tttn.backend.controller;

import com.example.tttn.backend.config.JwtConfig;
import com.example.tttn.backend.exception.NotFoundException;
import com.example.tttn.backend.service.MomoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
public class MomoController {

    private final MomoService momoService;

    @Autowired
    public MomoController(MomoService momoService) {
        this.momoService = momoService;
    }

    @PostMapping("/momo")
    public ResponseEntity<Map<String, Object>> initiateMoMoPayment(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, Object> paymentRequest) {
        try {
            String token = authHeader.substring("Bearer ".length());
            Map<String, Object> response = momoService.createMoMoPayment(token, paymentRequest);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Lỗi thanh toán: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }
}