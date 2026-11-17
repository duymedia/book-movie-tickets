package com.example.tttn.backend.controller;

import com.example.tttn.backend.config.JwtConfig;
import com.example.tttn.backend.exception.NotFoundException;
import com.example.tttn.backend.model.Payment;
import com.example.tttn.backend.service.PayPalService;
import com.example.tttn.backend.service.PaymentService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class PaymentController {

    private static final Logger logger = LoggerFactory.getLogger(PaymentController.class);

    private final PaymentService paymentService;
    private final PayPalService payPalService;
    private final JwtConfig jwtConfig;

    @Autowired
    public PaymentController(PaymentService paymentService, PayPalService payPalService, JwtConfig jwtConfig) {
        this.paymentService = paymentService;
        this.payPalService = payPalService;
        this.jwtConfig = jwtConfig;
    }

    @PostMapping("/admin/payments")
    public ResponseEntity<Payment> createPayment(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody Payment payment) {
        String token = extractToken(authHeader);
        Payment savedPayment = paymentService.createPayment(token, payment);
        return ResponseEntity.ok(savedPayment);
    }

    @PutMapping("/admin/payments/{id}")
    public ResponseEntity<Payment> updatePayment(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id,
            @RequestBody Payment payment) {
        String token = extractToken(authHeader);
        Payment updatedPayment = paymentService.updatePayment(token, id, payment);
        return ResponseEntity.ok(updatedPayment);
    }

    @DeleteMapping("/admin/payments/{id}")
    public ResponseEntity<Void> deletePayment(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id) {
        String token = extractToken(authHeader);
        paymentService.deletePayment(token, id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/admin/payments")
    public ResponseEntity<List<Payment>> getAllPaymentsForAdmin(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = extractToken(authHeader);
        List<Payment> payments = paymentService.getAllPaymentsForAdmin(token);
        return ResponseEntity.ok(payments);
    }

    @GetMapping("/payments/{id}")
    public ResponseEntity<Payment> getPaymentById(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id) {
        String token = extractToken(authHeader);
        Payment payment = paymentService.getPaymentById(token, id);
        return ResponseEntity.ok(payment);
    }

    @GetMapping("/payments")
    public ResponseEntity<List<Payment>> getAllPayments(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = extractToken(authHeader);
        List<Payment> payments = paymentService.getAllPayments(token);
        return ResponseEntity.ok(payments);
    }

    @PostMapping("/payments")
    public ResponseEntity<Map<String, Object>> processPayment(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam("orders") Long orderId,
            @RequestBody Payment paymentRequest) {
        String token = extractToken(authHeader);
        Map<String, Object> response = paymentService.processPayment(token, paymentRequest.getId(), orderId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/payments/paypal/success")
    public ResponseEntity<Map<String, Object>> handlePayPalSuccess(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody Map<String, Object> request) {
        try {
            String token = extractToken(authHeader);
            String paymentId = (String) request.get("paymentId");
            String payerId = (String) request.get("PayerID");
            Long orderId = request.get("orderId") != null ? Long.valueOf(request.get("orderId").toString()) : null;

            if (paymentId == null || paymentId.trim().isEmpty()) {
                logger.error("Thiếu paymentId trong yêu cầu");
                throw new IllegalArgumentException("Cần cung cấp paymentId");
            }
            if (payerId == null || payerId.trim().isEmpty()) {
                logger.error("Thiếu PayerID trong yêu cầu");
                throw new IllegalArgumentException("Cần cung cấp PayerID");
            }
            if (orderId == null) {
                logger.error("Thiếu orderId trong yêu cầu");
                throw new IllegalArgumentException("Cần cung cấp orderId");
            }

            logger.debug("Xử lý PayPal success: paymentId={}, payerId={}, orderId={}", paymentId, payerId, orderId);
            payPalService.executePayPalPayment(paymentId, payerId, orderId);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Thanh toán PayPal thành công cho order ID: " + orderId);
            logger.info("Xử lý PayPal success thành công: orderId={}, paymentId={}", orderId, paymentId);
            return ResponseEntity.ok(response);
        } catch (NotFoundException | IllegalStateException | IllegalArgumentException e) {
            logger.error("Lỗi xử lý thanh toán PayPal: error={}", e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        } catch (Exception e) {
            logger.error("Lỗi hệ thống xử lý PayPal: error={}", e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Lỗi hệ thống khi xử lý thanh toán PayPal: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @PostMapping("/payments/paypal/cancel")
    public ResponseEntity<Map<String, Object>> handlePayPalCancel(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody Map<String, Object> request) {
        try {
            String token = extractToken(authHeader);
            Long orderId = request.get("orderId") != null ? Long.valueOf(request.get("orderId").toString()) : null;

            if (orderId == null) {
                logger.error("Thiếu orderId trong yêu cầu");
                throw new IllegalArgumentException("Cần cung cấp orderId");
            }

            logger.debug("Xử lý PayPal cancel: orderId={}", orderId);
            payPalService.cancelPayPalPayment(orderId);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Thanh toán PayPal đã bị hủy cho order ID: " + orderId);
            logger.info("Xử lý PayPal cancel thành công: orderId={}", orderId);
            return ResponseEntity.ok(response);
        } catch (NotFoundException | IllegalArgumentException e) {
            logger.error("Lỗi xử lý hủy PayPal: error={}", e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        } catch (Exception e) {
            logger.error("Lỗi hệ thống hủy PayPal: error={}", e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Lỗi hệ thống khi hủy thanh toán PayPal: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
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