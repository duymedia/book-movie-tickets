package com.example.tttn.backend.controller;

import com.example.tttn.backend.config.JwtConfig;
import com.example.tttn.backend.exception.NotFoundException;
import com.example.tttn.backend.model.Ticket;
import com.example.tttn.backend.service.AuthService;
import com.example.tttn.backend.service.TicketService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class TicketController {

    private final TicketService ticketService;
    private final AuthService authService;
    private final JwtConfig jwtConfig;

    @Autowired
    public TicketController(TicketService ticketService, AuthService authService, JwtConfig jwtConfig) {
        this.ticketService = ticketService;
        this.authService = authService;
        this.jwtConfig = jwtConfig;
    }

    @GetMapping("/tickets")
    public ResponseEntity<?> getAllTickets(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = extractToken(authHeader);
        return ResponseEntity.ok(ticketService.getAllTickets(token));
    }
    @GetMapping("/admin/tickets")
    public ResponseEntity<?> getAllTicketsAdmin(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = extractToken(authHeader);
        return ResponseEntity.ok(ticketService.getAllTicketsAdmin(token));
    }

    @GetMapping("/tickets/{id}")
    public ResponseEntity<?> getTicketById(@PathVariable Long id,
                                           @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = extractToken(authHeader);
        return ResponseEntity.ok(ticketService.getTicketById(token, id));
    }
    

    @PostMapping("/admin/tickets")
    public ResponseEntity<?> createTicket(@RequestBody Ticket ticket,
                                          @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = extractToken(authHeader);
        return ResponseEntity.ok(ticketService.createTicket(token, ticket));
    }

    @PutMapping("/admin/tickets/{id}")
    public ResponseEntity<?> updateTicket(@PathVariable Long id, @RequestBody Ticket ticket,
                                          @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = extractToken(authHeader);
        return ResponseEntity.ok(ticketService.updateTicket(token, id, ticket));
    }

    @DeleteMapping("/admin/tickets/{id}")
    public ResponseEntity<?> deleteTicket(@PathVariable Long id,
                                          @RequestHeader(value = "Authorization", required = false) String authHeader) {
        String token = extractToken(authHeader);
        ticketService.deleteTicket(token, id);
        return ResponseEntity.ok("Xóa loại vé thành công");
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