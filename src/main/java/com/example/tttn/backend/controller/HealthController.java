package com.example.tttn.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {
    @GetMapping("/api/ping")
    public ResponseEntity<PingResponse> ping() {
        PingResponse response = new PingResponse(true,"Máy chủ đang chạy");
        return ResponseEntity.ok(response);
    }
}
record PingResponse(boolean success, String message) {}