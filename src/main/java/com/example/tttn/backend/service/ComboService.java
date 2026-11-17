
package com.example.tttn.backend.service;

import com.example.tttn.backend.config.JwtConfig;
import com.example.tttn.backend.exception.NotFoundException;
import com.example.tttn.backend.model.Combo;
import com.example.tttn.backend.repository.ComboRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
public class ComboService {

    private static final String UPLOAD_DIR = "uploads/images/";
    private static final String IMAGE_BASE_URL = "http://localhost:8080/uploads/images/";
    private static final List<String> ALLOWED_IMAGE_EXTENSIONS = Arrays.asList(".jpg", ".jpeg", ".png", ".gif");
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

    private static final Logger logger = LoggerFactory.getLogger(ComboService.class);

    private final ComboRepository comboRepository;
    private final AuthService authService;
    private final JwtConfig jwtConfig;

    @Autowired
    public ComboService(ComboRepository comboRepository, AuthService authService, JwtConfig jwtConfig) {
        this.comboRepository = comboRepository;
        this.authService = authService;
        this.jwtConfig = jwtConfig;

        try {
            Files.createDirectories(Paths.get(UPLOAD_DIR));
            logger.info("Created or verified upload directory: {}", UPLOAD_DIR);
        } catch (IOException e) {
            logger.error("Failed to create upload directory: {}", e.getMessage());
            throw new RuntimeException("Cannot create upload directory", e);
        }
    }

    @Transactional
    public String uploadImage(String token, MultipartFile file) throws IOException {
        validateToken(token, true, false);
        if (!authService.hasRole(token, "ADMIN")) {
            logger.error("User with token {} does not have ADMIN role for image upload", token);
            throw new NotFoundException("Chỉ ADMIN có quyền tải lên hình ảnh");
        }
        return saveImage(file);
    }

    @Transactional
    public Combo createCombo(String token, Combo combo, MultipartFile image) {
        validateToken(token, true, false);
        if (!authService.hasRole(token, "ADMIN")) {
            logger.error("User with token {} does not have ADMIN role", token);
            throw new NotFoundException("Chỉ ADMIN có quyền tạo combo");
        }

        validateCombo(combo);

        // Set default quantity to 0 if not provided (new combo starts with no stock)
        if (combo.getQuantity() == null) {
            combo.setQuantity(0);
            logger.info("No quantity provided for combo {}, defaulting to 0", combo.getName());
        }

        // Handle image
        if (image != null && !image.isEmpty()) {
            String imageUrl = saveImage(image);
            combo.setImage(imageUrl);
        } else if (combo.getImage() == null || combo.getImage().isEmpty()) {
            logger.warn("No image provided for combo: {}", combo.getName());
            combo.setImage(null); // Allow null image if not provided
        }

        logger.info("Creating combo: {} with quantity: {}", combo.getName(), combo.getQuantity());
        Combo savedCombo = comboRepository.save(combo);
        logger.info("Created combo with ID: {}", savedCombo.getId());
        return savedCombo;
    }

    @Transactional
    public Combo updateCombo(String token, Long id, Combo comboDetails, MultipartFile image) {
        validateToken(token, true, false);
        if (!authService.hasRole(token, "ADMIN")) {
            logger.error("User with token {} does not have ADMIN role", token);
            throw new NotFoundException("Chỉ ADMIN có quyền cập nhật combo");
        }

        Combo existingCombo = comboRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy combo với ID: " + id));

        // Update fields
        if (comboDetails.getName() != null && !comboDetails.getName().isEmpty()) {
            existingCombo.setName(comboDetails.getName());
        }
        if (comboDetails.getDescription() != null) {
            existingCombo.setDescription(comboDetails.getDescription());
        }
        if (comboDetails.getPrice() != null && comboDetails.getPrice() >= 0) {
            existingCombo.setPrice(comboDetails.getPrice());
        }
        // Update quantity only if provided; otherwise, retain existing quantity
        if (comboDetails.getQuantity() != null) {
            if (comboDetails.getQuantity() >= 0) {
                existingCombo.setQuantity(comboDetails.getQuantity());
            } else {
                throw new IllegalArgumentException("Số lượng combo không được âm");
            }
        }

        // Handle image
        String oldImageUrl = existingCombo.getImage();
        if (image != null && !image.isEmpty()) {
            String newImageUrl = saveImage(image);
            existingCombo.setImage(newImageUrl);
            deleteImageFile(oldImageUrl);
        } else if (comboDetails.getImage() != null) {
            existingCombo.setImage(comboDetails.getImage());
            deleteImageFile(oldImageUrl);
        }

        logger.info("Updating combo with ID: {} to quantity: {}", id, existingCombo.getQuantity());
        Combo updatedCombo = comboRepository.save(existingCombo);
        logger.info("Updated combo: {}", updatedCombo.getId());
        return updatedCombo;
    }

    @Transactional
    public void deleteCombo(String token, Long id) {
        validateToken(token, true, false);
        if (!authService.hasRole(token, "ADMIN")) {
            logger.error("User with token {} does not have ADMIN role", token);
            throw new NotFoundException("Chỉ ADMIN có quyền xóa combo");
        }

        Combo combo = comboRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy combo với ID: " + id));

        // Delete associated image
        deleteImageFile(combo.getImage());

        logger.info("Deleting combo with ID: {}", id);
        comboRepository.delete(combo);
        logger.info("Deleted combo with ID: {}", id);
    }

    @Transactional(readOnly = true)
    public List<Combo> getAllCombos(String token) {
        validateToken(token, false, true); // No role required for public access
        List<Combo> combos = comboRepository.findAll();
        logger.info("Retrieved {} combos", combos.size());
        return combos;
    }

    @Transactional(readOnly = true)
    public Combo getComboById(String token, Long id) {
        validateToken(token, false, true); // No role required for public access
        Combo combo = comboRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy combo với ID: " + id));
        logger.info("Retrieved combo with ID: {}", id);
        return combo;
    }

    @Transactional(readOnly = true)
    public List<Combo> getAllCombosForAdmin(String token) {
        validateToken(token, true, false);
        if (!authService.hasRole(token, "ADMIN") && !authService.hasRole(token, "STAFF")) {
            logger.error("User with token {} does not have ADMIN or STAFF role", token);
            throw new NotFoundException("Chỉ ADMIN hoặc STAFF có quyền xem danh sách combo");
        }
        List<Combo> combos = comboRepository.findAll();
        logger.info("Retrieved {} combos for admin/staff", combos.size());
        return combos;
    }

    @Transactional(readOnly = true)
    public Combo getComboByIdForAdmin(String token, Long id) {
        validateToken(token, true, false);
        if (!authService.hasRole(token, "ADMIN") && !authService.hasRole(token, "STAFF")) {
            logger.error("User with token {} does not have ADMIN or STAFF role", token);
            throw new NotFoundException("Chỉ ADMIN hoặc STAFF có quyền xem combo");
        }
        Combo combo = comboRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy combo với ID: " + id));
        logger.info("Retrieved combo with ID: {} for admin/staff", id);
        return combo;
    }

    private void validateToken(String token, boolean requireToken, boolean allowPublic) {
        if (!allowPublic && token == null && requireToken) {
            logger.error("Token is required for this operation");
            throw new NotFoundException("Token không hợp lệ hoặc đã hết hạn");
        }
        if (token != null && !jwtConfig.validateToken(token)) {
            logger.error("Invalid or expired token");
            throw new NotFoundException("Token không hợp lệ hoặc đã hết hạn");
        }
    }

    private void validateCombo(Combo combo) {
        if (combo == null) {
            throw new IllegalArgumentException("Dữ liệu combo không được để trống");
        }
        if (combo.getName() == null || combo.getName().isEmpty()) {
            throw new IllegalArgumentException("Tên combo không được để trống");
        }
        if (combo.getPrice() == null || combo.getPrice() < 0) {
            throw new IllegalArgumentException("Giá combo phải được cung cấp và không âm");
        }
        // Quantity is optional; validated in createCombo/updateCombo
        if (combo.getQuantity() != null && combo.getQuantity() < 0) {
            throw new IllegalArgumentException("Số lượng combo không được âm");
        }
    }

    private String saveImage(MultipartFile image) {
        try {
            if (image == null || image.isEmpty()) {
                throw new IllegalArgumentException("Image file cannot be empty");
            }

            // Validate file type
            String originalFilename = image.getOriginalFilename();
            if (originalFilename == null || !isValidImageExtension(originalFilename)) {
                throw new IllegalArgumentException("Invalid image format. Allowed formats: " + ALLOWED_IMAGE_EXTENSIONS);
            }

            // Validate file size
            if (image.getSize() > MAX_FILE_SIZE) {
                throw new IllegalArgumentException("File size exceeds 5MB limit");
            }

            // Generate unique filename
            String extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            String fileName = UUID.randomUUID().toString() + extension;
            Path filePath = Paths.get(UPLOAD_DIR + fileName);

            // Save file
            Files.write(filePath, image.getBytes());
            String imageUrl = IMAGE_BASE_URL + fileName;

            logger.info("Saved image: {}", imageUrl);
            return imageUrl;
        } catch (IOException e) {
            logger.error("Failed to save image: {}", e.getMessage());
            throw new RuntimeException("Cannot save image", e);
        }
    }

    private void deleteImageFile(String imageUrl) {
        if (imageUrl != null && imageUrl.startsWith(IMAGE_BASE_URL)) {
            try {
                String fileName = imageUrl.replace(IMAGE_BASE_URL, "");
                Path filePath = Paths.get(UPLOAD_DIR + fileName);
                Files.deleteIfExists(filePath);
                logger.info("Deleted image: {}", fileName);
            } catch (IOException e) {
                logger.warn("Failed to delete image file {}: {}", imageUrl, e.getMessage());
            }
        }
    }

    private boolean isValidImageExtension(String fileName) {
        return ALLOWED_IMAGE_EXTENSIONS.stream()
                .anyMatch(ext -> fileName.toLowerCase().endsWith(ext));
    }
}