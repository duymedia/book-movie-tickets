package com.example.tttn.backend.service;

import com.example.tttn.backend.config.JwtConfig;
import com.example.tttn.backend.exception.NotFoundException;
import com.example.tttn.backend.model.Ticket;
import com.example.tttn.backend.repository.TicketRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

@Service
public class TicketService {

    private static final Logger logger = LoggerFactory.getLogger(TicketService.class);
    private static final String UPLOAD_DIR = "uploads/tickets/";

    private final TicketRepository ticketRepository;
    private final AuthService authService;
    private final JwtConfig jwtConfig;

    @Autowired
    public TicketService(TicketRepository ticketRepository, AuthService authService, JwtConfig jwtConfig) {
        this.ticketRepository = ticketRepository;
        this.authService = authService;
        this.jwtConfig = jwtConfig;

        try {
            Files.createDirectories(Paths.get(UPLOAD_DIR));
        } catch (IOException e) {
            logger.error("Không thể tạo thư mục upload: {}", e.getMessage());
            throw new RuntimeException("Không thể tạo thư mục upload", e);
        }
    }

    public List<Ticket> getAllTickets(String token) {
        return ticketRepository.findAll();
    }

    public List<Ticket> getAllTicketsAdmin(String token) {
        if (!authService.hasRole(token, "ADMIN")) {
            throw new NotFoundException("Chỉ ADMIN mới có quyền xem thông tin loại vé");
        }
        return ticketRepository.findAll();
    }

    public Ticket getTicketById(String token, Long id) {
        return ticketRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy loại vé với ID: " + id));
    }

    @Transactional
    public Ticket createTicket(String token, Ticket ticket) {
        if (!authService.hasRole(token, "ADMIN")) {
            throw new NotFoundException("Chỉ ADMIN mới có quyền tạo loại vé");
        }

        if (ticket.getName() == null || ticket.getName().isEmpty()) {
            throw new IllegalArgumentException("Tên loại vé (name) không được để trống");
        }
        if (ticket.getPrice() == null || ticket.getPrice() < 0) {
            throw new IllegalArgumentException("Giá vé (price) phải được cung cấp và không âm");
        }
        if (ticket.getType() == null || ticket.getType().isEmpty()) {
            throw new IllegalArgumentException("Loại vé (type) không được để trống");
        }

        if (ticket.getImage() != null && !ticket.getImage().isEmpty()) {
            String imagePath = saveImage(ticket.getImage());
            ticket.setImage(imagePath);
        }

        logger.info("Creating ticket: {}", ticket);
        Ticket savedTicket = ticketRepository.save(ticket);
        logger.info("Created ticket: {}", savedTicket);
        return savedTicket;
    }

    @Transactional
    public Ticket updateTicket(String token, Long id, Ticket ticketDetails) {
        if (!authService.hasRole(token, "ADMIN")) {
            throw new NotFoundException("Chỉ ADMIN mới có quyền cập nhật loại vé");
        }

        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy loại vé với ID: " + id));

        if (ticketDetails.getName() != null && !ticketDetails.getName().isEmpty()) {
            ticket.setName(ticketDetails.getName());
        }
        if (ticketDetails.getAge() != null) {
            ticket.setAge(ticketDetails.getAge());
        }
        if (ticketDetails.getPrice() != null && ticketDetails.getPrice() >= 0) {
            ticket.setPrice(ticketDetails.getPrice());
        }
        if (ticketDetails.getType() != null && !ticketDetails.getType().isEmpty()) {
            ticket.setType(ticketDetails.getType());
        }

        if (ticketDetails.getImage() != null && !ticketDetails.getImage().isEmpty()) {
            if (ticket.getImage() != null) {
                deleteImage(ticket.getImage());
            }
            String imagePath = saveImage(ticketDetails.getImage());
            ticket.setImage(imagePath);
        }

        logger.info("Updating ticket with ID {}: {}", id, ticket);
        Ticket updatedTicket = ticketRepository.save(ticket);
        logger.info("Updated ticket: {}", updatedTicket);
        return updatedTicket;
    }

    @Transactional
    public void deleteTicket(String token, Long id) {
        if (!authService.hasRole(token, "ADMIN")) {
            throw new NotFoundException("Chỉ ADMIN mới có quyền xóa loại vé");
        }

        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy loại vé với ID: " + id));

        if (ticket.getImage() != null) {
            deleteImage(ticket.getImage());
        }

        logger.info("Deleting ticket with ID: {}", id);
        ticketRepository.delete(ticket);
        logger.info("Deleted ticket with ID: {}", id);
    }

    private String saveImage(String base64Image) {
        try {
            String[] parts = base64Image.split(",");
            String imageData = parts.length > 1 ? parts[1] : parts[0];
            byte[] decodedBytes = Base64.getDecoder().decode(imageData);
            String fileName = UUID.randomUUID().toString() + ".jpg";
            Path filePath = Paths.get(UPLOAD_DIR + fileName);
            Files.write(filePath, decodedBytes);
            return fileName;
        } catch (IOException e) {
            logger.error("Lỗi khi lưu ảnh: {}", e.getMessage());
            throw new RuntimeException("Không thể lưu ảnh", e);
        }
    }

    private void deleteImage(String imagePath) {
        try {
            Path filePath = Paths.get(UPLOAD_DIR + imagePath);
            if (Files.exists(filePath)) {
                Files.delete(filePath);
                logger.info("Đã xóa ảnh: {}", imagePath);
            }
        } catch (IOException e) {
            logger.error("Lỗi khi xóa ảnh: {}", e.getMessage());
            throw new RuntimeException("Không thể xóa ảnh", e);
        }
    }
}