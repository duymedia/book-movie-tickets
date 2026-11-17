package com.example.tttn.backend.service;

import com.example.tttn.backend.config.JwtConfig;
import com.example.tttn.backend.exception.NotFoundException;
import com.example.tttn.backend.model.User;
import com.example.tttn.backend.model.User2FA;
import com.example.tttn.backend.model.UserRole;
import com.example.tttn.backend.model.UserVerify;
import com.example.tttn.backend.repository.User2FARepository;
import com.example.tttn.backend.repository.UserRepository;
import com.example.tttn.backend.repository.UserRoleRepository;
import com.example.tttn.backend.repository.UserVerifyRepository;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;

import jakarta.servlet.http.HttpServletRequest;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.UUID;

import java.util.regex.Pattern;

@Service
public class AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);

    public static final String JwtConfig = null;

    private final UserRepository userRepository;
    private final UserVerifyRepository userVerifyRepository;
    private final UserRoleRepository userRoleRepository;
    private final User2FARepository user2FARepository; // Add 2FA repository
    private final TwoFactorAuthService twoFactorAuthService; // Add 2FA service
    private final JwtConfig jwtConfig;
    private final EmailService emailService;
    private final BCryptPasswordEncoder passwordEncoder;

    private final Map<String, String> otpStorage = new HashMap<>(); // Lưu OTP: key là email, value là OTP
    private final Map<String, Long> otpExpiry = new HashMap<>(); // Lưu thời gian hết hạn: key là email, value là thời
                                                                 // gian

    @Value("${google.client-id}")
    private String googleClientId;

    @Value("${verification.token.expiration.minutes}")
    private int verificationTokenExpirationMinutes;

    @Value("${app.domain:duymedia.com}")
    private String defaultDomain;

    public AuthService(UserRepository userRepository, UserVerifyRepository userVerifyRepository,
            UserRoleRepository userRoleRepository, User2FARepository user2FARepository,
            TwoFactorAuthService twoFactorAuthService, JwtConfig jwtConfig, EmailService emailService) {
        this.userRepository = userRepository;
        this.userVerifyRepository = userVerifyRepository;
        this.userRoleRepository = userRoleRepository;
        this.user2FARepository = user2FARepository;
        this.twoFactorAuthService = twoFactorAuthService;
        this.jwtConfig = jwtConfig;
        this.emailService = emailService;
        this.passwordEncoder = new BCryptPasswordEncoder();
    }

    public String register(User user, String role) {
        // Validate required fields
        if (user == null) {
            throw new RuntimeException("Dữ liệu người dùng không được để trống");
        }
        if (user.getEmail() == null || user.getEmail().trim().isEmpty()) {
            throw new RuntimeException("Email không được để trống");
        }
        if (user.getPhone() == null || user.getPhone().trim().isEmpty()) {
            throw new RuntimeException("Số điện thoại không được để trống");
        }
        if (user.getPassword() == null || user.getPassword().isEmpty()) {
            throw new RuntimeException("Mật khẩu không được để trống");
        }
        if (user.getName() == null || user.getName().trim().isEmpty()) {
            throw new RuntimeException("Tên không được để trống");
        }

        // Check for existing email
        if (userRepository.findByEmail(user.getEmail()) != null) {
            throw new RuntimeException("Email đã tồn tại");
        }

        // Normalize phone number
        String rawPhone = user.getPhone().trim();
        logger.info("Raw phone input: {}", rawPhone);
        String normalizedPhone = rawPhone.startsWith("+") ? rawPhone : "+" + rawPhone;
        // Remove any non-numeric characters except the leading +
        normalizedPhone = normalizedPhone.replaceAll("[^\\+0-9]", "");

        // Validate phone format
        if (!normalizedPhone.matches("^\\+[0-9]{9,14}$")) {
            logger.error("Invalid phone format after normalization: {}", normalizedPhone);
            throw new RuntimeException(
                    "Số điện thoại không hợp lệ. Vui lòng nhập số bắt đầu bằng mã quốc gia (VD: +84, +1) và có 9-14 chữ số.");
        }
        logger.info("Normalized phone: {}", normalizedPhone);

        // Check for existing phone
        if (userRepository.findByPhone(normalizedPhone) != null) {
            throw new RuntimeException("Số điện thoại đã tồn tại");
        }
        user.setPhone(normalizedPhone);

        // Encode password and set user as inactive
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setActive(false);
        User savedUser = userRepository.save(user);

        // Assign role
        UserRole userRole = new UserRole();
        userRole.setUser(savedUser);
        userRole.setRole(role != null && !role.isEmpty() ? role : "USER");
        userRoleRepository.save(userRole);

        // Generate and save verification token
        String verificationToken = UUID.randomUUID().toString();
        UserVerify userVerify = new UserVerify();
        userVerify.setToken(verificationToken);
        userVerify.setUserId(savedUser.getId());
        userVerify.setExpiresAt(LocalDateTime.now().plusMinutes(verificationTokenExpirationMinutes));
        userVerifyRepository.save(userVerify);
        logger.info("Saved token in database: {}", userVerify.getToken());

        // Send verification email
        String verificationLink = "http://localhost:8080/api/auth/verify?token=" + verificationToken;
        String emailMessage = String.format(
                "Mã xác thực của bạn là: %s\nXác thực đăng ký của bạn: Tại đây (%s)",
                verificationToken, verificationLink);
        logger.info("Token in email: {}", verificationToken);
        emailService.sendEmail(user.getEmail(), "Xác nhận đăng ký", emailMessage);

        return "Đã gửi yêu cầu xác thực tới email: " + user.getEmail();
    }

    public String login(String email, String password) {
        User user = userRepository.findByEmail(email);
        if (user == null || !passwordEncoder.matches(password, user.getPassword())) {
            throw new NotFoundException("Email hoặc mật khẩu không đúng");
        }
        if (!user.isActive()) {
            throw new NotFoundException("Tài khoản chưa được kích hoạt. Vui lòng kiểm tra email để xác nhận.");
        }
        return jwtConfig.generateToken(email);
    }

    public String googleLogin(String idToken) {
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(),
                    new GsonFactory())
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();

            GoogleIdToken googleIdToken = verifier.verify(idToken);
            if (googleIdToken == null) {
                throw new NotFoundException("Token Google không hợp lệ");
            }

            GoogleIdToken.Payload payload = googleIdToken.getPayload();
            String email = payload.getEmail();
            String name = (String) payload.get("name");

            User user = userRepository.findByEmail(email);
            if (user == null) {
                user = new User();
                user.setEmail(email);
                user.setName(name != null ? name : "Duy Media");
                user.setPhone("");
                user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
                user.setActive(true);
                user = userRepository.save(user);

                UserRole userRole = new UserRole();
                userRole.setUser(user);
                userRole.setRole("USER");
                userRoleRepository.save(userRole);

                logger.info("Created new user from Google login: {}", email);
            } else if (!user.isActive()) {
                user.setActive(true);
                userRepository.save(user);
                logger.info("Activated existing user from Google login: {}", email);
            }

            return jwtConfig.generateToken(email);
        } catch (Exception e) {
            logger.error("Google login error: {}", e.getMessage());
            throw new NotFoundException("Đăng nhập Google thất bại: " + e.getMessage());
        }
    }

    public String logout(String token) {
        if (!jwtConfig.validateToken(token)) {
            throw new NotFoundException("Token không hợp lệ hoặc đã hết hạn");
        }
        logger.info("User logged out with token: {}", token);
        return "Đăng xuất thành công";
    }

    public void verifyEmail(String token) {
        UserVerify userVerify = userVerifyRepository.findByToken(token);
        if (userVerify == null || userVerify.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new NotFoundException("Token không hợp lệ hoặc đã hết hạn");
        }
        User user = userRepository.findById(userVerify.getUserId())
                .orElseThrow(() -> new NotFoundException("Người dùng không tồn tại"));
        if (user.isActive()) {
            throw new NotFoundException("Tài khoản đã được kích hoạt trước đó");
        }
        user.setActive(true);
        userRepository.save(user);
        userVerifyRepository.delete(userVerify);
        logger.info("User verified: {}", user.getEmail());
    }

    public void sendOtpForForgotPassword(String emailOrPhone) {
        User user;
        if (emailOrPhone.matches("^(\\+84|0)[0-9]{9,10}$")) {
            user = userRepository.findByPhone(emailOrPhone);
            if (user == null) {
                throw new NotFoundException("Số điện thoại không tồn tại");
            }
            String otp = generateRandomOTP();
            otpStorage.put(user.getEmail(), otp); // Use email as key for simplicity
            otpExpiry.put(user.getEmail(), System.currentTimeMillis() + 5 * 60 * 1000);
            // TODO: Integrate SMS service to send OTP
            logger.info("Sent OTP to phone: {}", emailOrPhone);
        } else {
            user = userRepository.findByEmail(emailOrPhone);
            if (user == null) {
                throw new NotFoundException("Email không tồn tại");
            }
            String otp = generateRandomOTP();
            otpStorage.put(emailOrPhone, otp);
            otpExpiry.put(emailOrPhone, System.currentTimeMillis() + 5 * 60 * 1000);
            String emailMessage = String
                    .format("Mã xác thực để đặt lại mật khẩu của bạn là: %s. Mã này sẽ hết hạn sau 5 phút.", otp);
            emailService.sendEmail(emailOrPhone, "Mã xác thực đặt lại mật khẩu", emailMessage);
            logger.info("Sent OTP to email: {}", emailOrPhone);
        }
    }

    public void verifyOtpAndResetPassword(String email, String otp) {
        String storedOtp = otpStorage.get(email);
        Long expiryTime = otpExpiry.get(email);

        if (storedOtp == null || expiryTime == null) {
            throw new IllegalArgumentException("Mã xác thực không tồn tại hoặc đã hết hạn");
        }
        if (System.currentTimeMillis() > expiryTime) {
            otpStorage.remove(email);
            otpExpiry.remove(email);
            throw new IllegalArgumentException("Mã xác thực đã hết hạn");
        }
        if (!storedOtp.equals(otp)) {
            throw new IllegalArgumentException("Mã xác thực không đúng");
        }

        User user = userRepository.findByEmail(email);
        if (user == null) {
            throw new NotFoundException("Email không tồn tại");
        }

        String newPassword = generateRandomPassword();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        String emailMessage = String.format("Mật khẩu mới của bạn là: %s", newPassword);
        emailService.sendEmail(email, "Đặt lại mật khẩu", emailMessage);
        logger.info("Sent new password to email: {}", email);

        otpStorage.remove(email);
        otpExpiry.remove(email);
    }

    public void changePassword(String token, String oldPassword, String newPassword) {
        if (!jwtConfig.validateToken(token)) {
            throw new NotFoundException("Token không hợp lệ hoặc đã hết hạn");
        }

        String email = jwtConfig.extractEmail(token);
        User user = userRepository.findByEmail(email);
        if (user == null) {
            throw new NotFoundException("Người dùng không tồn tại");
        }

        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new IllegalArgumentException("Mật khẩu cũ không đúng");
        }

        if (newPassword == null || newPassword.isEmpty()) {
            throw new IllegalArgumentException("Mật khẩu mới không được để trống");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        logger.info("Password changed for user: {}", email);
    }

    public List<User> getAllUsers(String token) {
        if (!jwtConfig.validateToken(token)) {
            throw new NotFoundException("Token không hợp lệ hoặc đã hết hạn");
        }
        List<User> users = userRepository.findAll();
        for (User user : users) {
            UserRole userRole = userRoleRepository.findByUserId(user.getId())
                    .orElseThrow(() -> new NotFoundException("Không tìm thấy vai trò cho user ID: " + user.getId()));
            user.setRole(userRole.getRole());
        }
        return users;
    }

    public User getUserByEmail(String email, String token) {
        if (!jwtConfig.validateToken(token)) {
            throw new NotFoundException("Token không hợp lệ hoặc đã hết hạn");
        }
        User user = userRepository.findByEmail(email);
        if (user == null) {
            throw new NotFoundException("Không tìm thấy người dùng với email: " + email);
        }
        UserRole userRole = userRoleRepository.findByUserId(user.getId())
                .orElseThrow(() -> new NotFoundException("Không tìm thấy vai trò cho user email: " + email));
        user.setRole(userRole.getRole());
        return user;
    }

    public User getUserById(Long id, String token) {
        if (!jwtConfig.validateToken(token)) {
            throw new NotFoundException("Token không hợp lệ hoặc đã hết hạn");
        }
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng với ID: " + id));
        UserRole userRole = userRoleRepository.findByUserId(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy vai trò cho user ID: " + id));
        user.setRole(userRole.getRole());
        return user;
    }

    public User updateUser(Long id, String token, User userDetails) {
        if (!jwtConfig.validateToken(token)) {
            throw new NotFoundException("Token không hợp lệ hoặc đã hết hạn");
        }
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng với ID: " + id));

        // Cập nhật name
        if (userDetails.getName() != null && !userDetails.getName().isEmpty()) {
            user.setName(userDetails.getName());
        }

        // Cập nhật email
        if (userDetails.getEmail() != null && !userDetails.getEmail().isEmpty()) {
            User existingUser = userRepository.findByEmail(userDetails.getEmail());
            if (existingUser != null && !existingUser.getId().equals(id)) {
                throw new RuntimeException("Email đã tồn tại");
            }
            user.setEmail(userDetails.getEmail());
        }

        // Cập nhật phone
        if (userDetails.getPhone() != null && !userDetails.getPhone().isEmpty()) {
            String normalizedPhone = userDetails.getPhone().startsWith("+") ? userDetails.getPhone()
                    : "+" + userDetails.getPhone();
            normalizedPhone = normalizedPhone.replaceAll("[^\\+0-9]", "");
            if (!normalizedPhone.matches("^\\+[0-9]{9,14}$")) {
                throw new IllegalArgumentException("Số điện thoại không hợp lệ");
            }
            User existingUser = userRepository.findByPhone(normalizedPhone);
            if (existingUser != null && !existingUser.getId().equals(id)) {
                throw new RuntimeException("Số điện thoại đã tồn tại");
            }
            user.setPhone(normalizedPhone);
        }

        // Cập nhật password
        if (userDetails.getPassword() != null && !userDetails.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(userDetails.getPassword()));
        }

        // Cập nhật active
        user.setActive(userDetails.isActive());

        // Cập nhật role
        String newRole = userDetails.getRole();
        if (newRole != null && !newRole.isEmpty() && List.of("USER", "STAFF", "ADMIN").contains(newRole)) {
            UserRole userRole = userRoleRepository.findByUserId(id)
                    .orElseThrow(() -> new NotFoundException("Không tìm thấy vai trò cho user ID: " + id));
            userRole.setRole(newRole);
            userRoleRepository.save(userRole);
            logger.info("Updated role for user ID {} to {}", id, newRole);
        } else if (newRole != null && !newRole.isEmpty()) {
            throw new IllegalArgumentException("Vai trò không hợp lệ: " + newRole);
        }

        User updatedUser = userRepository.save(user);
        UserRole userRole = userRoleRepository.findByUserId(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy vai trò cho user ID: " + id));
        updatedUser.setRole(userRole.getRole());

        return updatedUser;
    }

    public User createUser(User user, String role, String token) {
        if (!jwtConfig.validateToken(token)) {
            throw new NotFoundException("Token không hợp lệ hoặc đã hết hạn");
        }
        if (userRepository.findByEmail(user.getEmail()) != null) {
            throw new RuntimeException("Email đã tồn tại");
        }
        if (userRepository.findByPhone(user.getPhone()) != null) {
            throw new RuntimeException("Số điện thoại đã tồn tại");
        }
        if (user.getPhone() == null || !user.getPhone().matches("^(\\+84|0)[0-9]{9,10}$")) {
            throw new IllegalArgumentException("Số điện thoại không hợp lệ");
        }

        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setActive(true);
        User savedUser = userRepository.save(user);

        UserRole userRole = new UserRole();
        userRole.setUser(savedUser);
        userRole.setRole(role != null && !role.isEmpty() ? role : "USER");
        userRoleRepository.save(userRole);

        logger.info("Created user: {}", user.getEmail());
        return savedUser;
    }

    @Transactional
    public void deleteUser(Long id, String token) {
        if (!jwtConfig.validateToken(token)) {
            throw new NotFoundException("Token không hợp lệ hoặc đã hết hạn");
        }
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng với ID: " + id));

        userRoleRepository.deleteByUserId(id);
        userRepository.delete(user);
    }

    public boolean hasRole(String token, String expectedRole) {
        try {
            String email = jwtConfig.extractEmail(token);
            User user = userRepository.findByEmail(email);
            UserRole userRole = (user != null) ? userRoleRepository.findByUserId(user.getId()).orElse(null) : null;
            return userRole != null && expectedRole.equals(userRole.getRole());
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isAdmin(String token) {
        return hasRole(token, "ADMIN");
    }

    public boolean isStaff(String token) {
        return hasRole(token, "STAFF");
    }

    private String generateRandomPassword() {
        return String.valueOf(10000000 + new Random().nextInt(90000000));
    }

    private String generateRandomOTP() {
        return String.format("%06d", new Random().nextInt(999999)); // OTP 6 chữ số
    }

    @Scheduled(fixedRate = 60 * 1000)
    @Transactional
    public void deleteExpiredUsers() {
        logger.info("Checking expired users at: {}", LocalDateTime.now());
        List<UserVerify> expiredVerifications = userVerifyRepository.findAll().stream()
                .filter(uv -> uv.getExpiresAt().isBefore(LocalDateTime.now()))
                .toList();

        if (expiredVerifications.isEmpty()) {
            logger.info("No expired users found.");
        }

        for (UserVerify userVerify : expiredVerifications) {
            User user = userRepository.findById(userVerify.getUserId()).orElse(null);
            if (user != null && !user.isActive()) {
                logger.info("Deleting expired user: {} with expiration: {}", user.getEmail(),
                        userVerify.getExpiresAt());
                userRoleRepository.deleteByUserId(userVerify.getUserId());
                userRepository.delete(user);
            }
            userVerifyRepository.delete(userVerify);
        }
    }

    public Map<String, Object> enable2FA(String token, String type) {
        logger.info("Bắt đầu xử lý enable2FA cho type: {}", type);
        Map<String, Object> response = new HashMap<>();
        try {
            if (!jwtConfig.validateToken(token)) {
                logger.error("Token không hợp lệ hoặc đã hết hạn");
                throw new NotFoundException("Token không hợp lệ hoặc đã hết hạn");
            }
            String email = jwtConfig.extractEmail(token);
            logger.debug("Email từ token: {}", email);
            User user = userRepository.findByEmail(email);
            if (user == null) {
                logger.error("Không tìm thấy người dùng với email: {}", email);
                throw new NotFoundException("Người dùng không tồn tại");
            }
            if (!List.of("google").contains(type)) {
                logger.error("Loại 2FA không hợp lệ: {}", type);
                throw new IllegalArgumentException("Loại 2FA không hợp lệ");
            }

            String domain = getDomainFromRequest();
            if (!isValidDomain(domain)) {
                logger.warn("Domain không hợp lệ hoặc không lấy được: {}. Sử dụng mặc định: {}", domain, defaultDomain);
                domain = defaultDomain;
            }
            logger.info("Sử dụng domain cho 2FA: {}", domain);

            String secret = twoFactorAuthService.generateTotpSecret();
            logger.debug("TOTP secret được tạo: {}", secret);
            Map<String, String> qrResult = twoFactorAuthService.generateQrCodeUrl(secret, email, domain);
            logger.debug("Kết quả QR: totpUrl={}, qrCodeImage={}", qrResult.get("totpUrl"),
                    qrResult.get("qrCodeImage"));

            User2FA user2FA = user2FARepository.findByUserId(user.getId()).orElse(new User2FA());
            user2FA.setUserId(user.getId());
            user2FA.setTwoFactorSecret(secret);
            user2FA.setTwoFactorEnabled(false);
            user2FARepository.save(user2FA);

            Map<String, String> data = new HashMap<>();
            data.put("totpUrl", qrResult.get("totpUrl"));
            data.put("qrCodeImage", qrResult.get("qrCodeImage"));
            data.put("secret", secret);

            response.put("success", true);
            response.put("data", data);
            return response;
        } catch (NotFoundException | IllegalArgumentException e) {
            logger.error("Lỗi khi kích hoạt 2FA: {}", e.getMessage());
            response.put("success", false);
            response.put("message", e.getMessage());
            return response;
        } catch (Exception e) {
            logger.error("Lỗi không xác định khi kích hoạt 2FA: {}", e.getMessage());
            response.put("success", false);
            response.put("message", "Đã xảy ra lỗi khi kích hoạt 2FA.");
            return response;
        }
    }

    private String getDomainFromRequest() {
        try {
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder
                    .getRequestAttributes();
            if (attributes != null) {
                HttpServletRequest request = attributes.getRequest();
                // Ưu tiên header Origin
                String origin = request.getHeader("Origin");
                if (origin != null && !origin.isEmpty()) {
                    logger.debug("Origin header: {}", origin);
                    return origin.replaceFirst("^(http[s]?://)", "").replaceAll("/.*$", "");
                }
                // Fallback: header Host
                String host = request.getHeader("Host");
                if (host != null && !host.isEmpty()) {
                    logger.debug("Host header: {}", host);
                    return host;
                }
            }
        } catch (Exception e) {
            logger.error("Không thể lấy domain từ request: {}", e.getMessage());
        }
        logger.warn("Không tìm thấy Origin hoặc Host, sử dụng domain mặc định");
        return null;
    }

    private boolean isValidDomain(String domain) {
        if (domain == null || domain.trim().isEmpty()) {
            return false;
        }
        // Biểu thức chính quy: chấp nhận domain (example.com) hoặc host:port
        // (localhost:5173)
        String domainRegex = "^([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\\.)+[a-zA-Z]{2,}$|^localhost(:[0-9]+)?$";
        boolean isValid = Pattern.compile(domainRegex).matcher(domain).matches();
        logger.debug("Kiểm tra domain: {} -> {}", domain, isValid ? "Hợp lệ" : "Không hợp lệ");
        return isValid;
    }

    // Verify 2FA code and enable 2FA
    public void verify2FA(String token, String type, String code) {
        if (!jwtConfig.validateToken(token)) {
            throw new NotFoundException("Token không hợp lệ hoặc đã hết hạn");
        }
        String email = jwtConfig.extractEmail(token);
        User user = userRepository.findByEmail(email);
        if (user == null) {
            throw new NotFoundException("Người dùng không tồn tại");
        }
        if (!List.of("google").contains(type)) {
            throw new IllegalArgumentException("Loại 2FA không hợp lệ");
        }

        User2FA user2FA = user2FARepository.findByUserId(user.getId())
                .orElseThrow(() -> new NotFoundException("Không tìm thấy thông tin 2FA"));

        if (!twoFactorAuthService.verifyTotpCode(user2FA.getTwoFactorSecret(), code)) {
            throw new IllegalArgumentException("Mã xác thực không đúng");
        }

        user2FA.setTwoFactorEnabled(true);
        user2FARepository.save(user2FA);
    }

    // Disable 2FA
    public void disable2FA(String token, String type, String code) {
        if (!jwtConfig.validateToken(token)) {
            throw new NotFoundException("Token không hợp lệ hoặc đã hết hạn");
        }
        String email = jwtConfig.extractEmail(token);
        User user = userRepository.findByEmail(email);
        if (user == null) {
            throw new NotFoundException("Người dùng không tồn tại");
        }
        if (!List.of("google").contains(type)) {
            throw new IllegalArgumentException("Loại 2FA không hợp lệ");
        }

        twoFactorAuthService.disable2FA(user.getId(), code);
    }

    public boolean is2FAEnabled(Long userId) {
        return user2FARepository.findByUserId(userId)
                .map(User2FA::isTwoFactorEnabled)
                .orElse(false);
    }
}
