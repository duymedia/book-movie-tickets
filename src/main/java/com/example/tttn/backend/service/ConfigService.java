package com.example.tttn.backend.service;

import com.example.tttn.backend.exception.NotFoundException;
import com.example.tttn.backend.model.Config;
import com.example.tttn.backend.repository.ConfigRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ConfigService {

    private static final Logger logger = LoggerFactory.getLogger(ConfigService.class);

    private final ConfigRepository configRepository;
    private final AuthService authService;

    @Autowired
    public ConfigService(ConfigRepository configRepository, AuthService authService) {
        this.configRepository = configRepository;
        this.authService = authService;
    }

    @Transactional
    public Config initializeDefaultConfig(String token) {
        logger.info("Kiểm tra và khởi tạo cấu hình mặc định");
        if (!authService.hasRole(token, "ADMIN")) {
            logger.error("User with token {} does not have ADMIN role", token);
            throw new NotFoundException("Chỉ ADMIN mới có quyền khởi tạo cấu hình hệ thống");
        }
        if (configRepository.count() > 0) {
            logger.warn("Cấu hình đã tồn tại, không thể khởi tạo lại");
            throw new IllegalStateException("Cấu hình đã được khởi tạo trước đó");
        }

        Config defaultConfig = new Config();
        // Thiết lập tất cả các trường là chuỗi rỗng
        defaultConfig.setTitle("");
        defaultConfig.setKeyword("");
        defaultConfig.setWebsiteName("");
        defaultConfig.setLogo("");
        defaultConfig.setDescription("");
        defaultConfig.setHotline("");
        defaultConfig.setFbAdmin("");
        defaultConfig.setZaloAdmin("");
        defaultConfig.setAdminName("");

        Config savedConfig = configRepository.save(defaultConfig);
        logger.info("Đã tạo cấu hình mặc định thành công với ID: {}", savedConfig.getId());
        return savedConfig;
    }

    @Transactional(readOnly = true)
    public Config getConfig(String token) {
        return configRepository.findById(1L)
                .orElseThrow(() -> {
                    logger.error("Không tìm thấy cấu hình với ID: 1");
                    return new NotFoundException("Không tìm thấy cấu hình hệ thống");
                });
    }

    @Transactional(readOnly = true)
    public Config getConfigAdmin(String token) {
        if (!authService.hasRole(token, "ADMIN")) {
            logger.error("User with token {} does not have ADMIN role", token);
            throw new NotFoundException("Chỉ ADMIN mới có quyền xem cấu hình hệ thống");
        }
        return configRepository.findById(1L)
                .orElseThrow(() -> {
                    logger.error("Không tìm thấy cấu hình với ID: 1");
                    return new NotFoundException("Không tìm thấy cấu hình hệ thống");
                });
    }

    @Transactional
    public Config updateConfig(String token, Config config) {
        logger.info("Yêu cầu cập nhật cấu hình hệ thống");
        if (!authService.hasRole(token, "ADMIN")) {
            logger.error("User with token {} does not have ADMIN role", token);
            throw new NotFoundException("Chỉ ADMIN mới có quyền cập nhật cấu hình hệ thống");
        }
        Config existingConfig = configRepository.findById(1L)
                .orElseThrow(() -> {
                    logger.error("Không tìm thấy cấu hình với ID: 1");
                    return new NotFoundException("Không tìm thấy cấu hình hệ thống");
                });

        existingConfig.setTitle(config.getTitle());
        existingConfig.setKeyword(config.getKeyword());
        existingConfig.setWebsiteName(config.getWebsiteName());
        existingConfig.setLogo(config.getLogo());
        existingConfig.setDescription(config.getDescription());
        existingConfig.setHotline(config.getHotline());
        existingConfig.setFbAdmin(config.getFbAdmin());
        existingConfig.setZaloAdmin(config.getZaloAdmin());
        existingConfig.setAdminName(config.getAdminName());

        Config updatedConfig = configRepository.save(existingConfig);
        logger.info("Cập nhật cấu hình thành công");
        return updatedConfig;
    }
}