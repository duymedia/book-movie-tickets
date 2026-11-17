package com.example.tttn.backend.controller;

import com.example.tttn.backend.config.JwtConfig;
import com.example.tttn.backend.exception.NotFoundException;
import com.example.tttn.backend.model.Order;
import com.example.tttn.backend.service.OrderService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class OrderController {

    private static final Logger logger = LoggerFactory.getLogger(OrderController.class);

    private final OrderService orderService;
    private final JwtConfig jwtConfig;

    @Autowired
    public OrderController(OrderService orderService, JwtConfig jwtConfig) {
        this.orderService = orderService;
        this.jwtConfig = jwtConfig;
    }

    @PostMapping("/admin/orders")
    public ResponseEntity<Order> createOrder(
            @RequestHeader(value = "Authorization") String authHeader,
            @RequestBody Order order) {
        String token = extractToken(authHeader);
        Order createdOrder = orderService.createOrder(token, order);
        return ResponseEntity.ok(createdOrder);
    }

    @PutMapping("/admin/orders/{id}")
    public ResponseEntity<Order> updateOrder(
            @RequestHeader(value = "Authorization") String authHeader,
            @PathVariable Long id,
            @RequestBody Order orderDetails) {
        String token = extractToken(authHeader);
        Order updatedOrder = orderService.updateOrder(token, id, orderDetails);
        return ResponseEntity.ok(updatedOrder);
    }

    @DeleteMapping("/admin/orders/{id}")
    public ResponseEntity<Void> deleteOrder(
            @RequestHeader(value = "Authorization") String authHeader,
            @PathVariable Long id) {
        String token = extractToken(authHeader);
        orderService.deleteOrder(token, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/orders/cancel/{id}")
    public ResponseEntity<Void> cancelOrder(
            @RequestHeader(value = "Authorization") String authHeader,
            @PathVariable Long id) {
        String token = extractToken(authHeader);
        orderService.cancelOrder(token, id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/admin/orders")
    public ResponseEntity<List<Order>> getAllOrdersForAdmin(
            @RequestHeader(value = "Authorization") String authHeader) {
        String token = extractToken(authHeader);
        List<Order> orders = orderService.getAllOrdersForAdmin(token);
        return ResponseEntity.ok(orders);
    }

    @GetMapping("/orders")
    public ResponseEntity<List<Order>> getUserOrders(
            @RequestHeader(value = "Authorization") String authHeader) {
        String token = extractToken(authHeader);
        List<Order> orders = orderService.getUserOrders(token);
        return ResponseEntity.ok(orders);
    }

    @GetMapping("/orders/{id}")
    public ResponseEntity<Order> getOrderById(
            @RequestHeader(value = "Authorization") String authHeader,
            @PathVariable Long id) {
        String token = extractToken(authHeader);
        Order order = orderService.getOrderById(token, id);
        return ResponseEntity.ok(order);
    }

    private String extractToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith(JwtConfig.TOKEN_PREFIX)) {
            logger.error("Token không hợp lệ hoặc thiếu Bearer");
            throw new NotFoundException("Token không hợp lệ hoặc thiếu Bearer");
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