package com.example.tttn.backend.service;

import com.example.tttn.backend.exception.NotFoundException;
import com.example.tttn.backend.model.User2FA;
import com.example.tttn.backend.repository.User2FARepository;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import dev.samstevens.totp.code.*;
import dev.samstevens.totp.secret.DefaultSecretGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import dev.samstevens.totp.time.TimeProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.net.URLEncoder;

@Service
public class TwoFactorAuthService {
    private static final Logger logger = LoggerFactory.getLogger(TwoFactorAuthService.class);
    private final User2FARepository user2FARepository;

    public TwoFactorAuthService(User2FARepository user2FARepository) {
        this.user2FARepository = user2FARepository;
    }

    public String generateTotpSecret() {
        String secret = new DefaultSecretGenerator().generate();
        if (!secret.matches("^[A-Z2-7]+$")) {
            logger.error("Bí mật TOTP không hợp lệ: {}", secret);
            throw new IllegalStateException("Không thể tạo bí mật TOTP hợp lệ");
        }
        return secret;
    }

    public Map<String, String> generateQrCodeUrl(String secret, String email, String issuer) {
        try {
            if (secret == null || secret.trim().isEmpty() || !secret.matches("^[A-Z2-7]+$")) {
                throw new IllegalArgumentException("Bí mật TOTP không hợp lệ");
            }
            String encodedIssuer = URLEncoder.encode(issuer, StandardCharsets.UTF_8.toString());
            String label = String.format("%s:%s", issuer, email);
            String totpUrl = String.format("otpauth://totp/%s?secret=%s&issuer=%s",
                    label, secret, encodedIssuer);
            QRCodeWriter qrCodeWriter = new QRCodeWriter();
            BitMatrix bitMatrix = qrCodeWriter.encode(totpUrl, BarcodeFormat.QR_CODE, 200, 200);
            ByteArrayOutputStream pngOutputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", pngOutputStream);
            byte[] pngData = pngOutputStream.toByteArray();
            String base64Image = "data:image/png;base64," + Base64.getEncoder().encodeToString(pngData);
            Map<String, String> result = new HashMap<>();
            result.put("totpUrl", totpUrl);
            result.put("qrCodeImage", base64Image);
            return result;
        } catch (Exception e) {
            logger.error("Không thể tạo mã QR: {}", e.getMessage());
            throw new RuntimeException("Không thể tạo mã QR");
        }
    }

    public boolean verifyTotpCode(String secret, String code) {
        TimeProvider timeProvider = new SystemTimeProvider();
        CodeGenerator codeGenerator = new DefaultCodeGenerator();
        CodeVerifier verifier = new DefaultCodeVerifier(codeGenerator, timeProvider);
        return verifier.isValidCode(secret, code);
    }

    @Transactional
    public User2FA enable2FA(Long userId, String secret) {
        User2FA user2FA = user2FARepository.findByUserId(userId)
                .orElse(new User2FA());
        user2FA.setUserId(userId);
        user2FA.setTwoFactorSecret(secret);
        user2FA.setTwoFactorEnabled(true);
        return user2FARepository.save(user2FA);
    }

    @Transactional
    public void disable2FA(Long userId, String code) {
        logger.info("Disabling 2FA for userId: {}", userId);
        User2FA user2FA = user2FARepository.findByUserId(userId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy thông tin 2FA cho người dùng"));

        if (!user2FA.isTwoFactorEnabled()) {
            logger.warn("2FA đã tắt cho userId: {}", userId);
            throw new IllegalStateException("2FA chưa được kích hoạt");
        }

        if (code == null || code.trim().isEmpty()) {
            logger.error("Mã xác thực không được cung cấp cho userId: {}", userId);
            throw new IllegalArgumentException("Mã xác thực là bắt buộc để tắt 2FA");
        }

        if (!verifyTotpCode(user2FA.getTwoFactorSecret(), code)) {
            logger.error("Mã xác thực không hợp lệ cho userId: {}", userId);
            throw new IllegalArgumentException("Mã xác thực không đúng");
        }

        user2FA.setTwoFactorEnabled(false);
        user2FA.setTwoFactorSecret(null);
        user2FARepository.save(user2FA);
        logger.debug("2FA disabled for userId: {}", userId);
    }
}