package com.example.tttn.backend.controller;

import com.example.tttn.backend.config.JwtConfig;
import com.example.tttn.backend.exception.NotFoundException;
import com.example.tttn.backend.model.User;
import com.example.tttn.backend.model.User2FA;
import com.example.tttn.backend.repository.User2FARepository;
import com.example.tttn.backend.repository.UserRepository;
import com.example.tttn.backend.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
public class AuthController {

    private final AuthService authService;
    private final JwtConfig jwtConfig;
    private final User2FARepository user2FARepository; // Correct field name
    private final UserRepository userRepository;

    @Autowired
    public AuthController(
            AuthService authService,
            JwtConfig jwtConfig,
            UserRepository userRepository,
            User2FARepository user2FARepository) { // Consistent parameter name
        this.authService = authService;
        this.jwtConfig = jwtConfig;
        this.user2FARepository = user2FARepository;
        this.userRepository = userRepository;
    }

    @PostMapping("/auth/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest loginRequest) {
        try {
            String token = authService.login(loginRequest.email(), loginRequest.password());
            return ResponseEntity.ok(new LoginResponse(true, "Đăng nhập thành công", token));
        } catch (NotFoundException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new LoginResponse(false, e.getMessage(), null));
        }
    }

    @PostMapping("/auth/google")
    public ResponseEntity<LoginResponse> googleLogin(@RequestBody GoogleLoginRequest request) {
        try {
            String token = authService.googleLogin(request.idToken());
            return ResponseEntity.ok(new LoginResponse(true, "Đăng nhập Google thành công", token));
        } catch (NotFoundException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new LoginResponse(false, e.getMessage(), null));
        }
    }

    @PostMapping("/auth/logout")
    public ResponseEntity<LogoutResponse> logout(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String token = extractToken(authHeader);
            String message = authService.logout(token);
            return ResponseEntity.ok(new LogoutResponse(true, message));
        } catch (NotFoundException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new LogoutResponse(false, e.getMessage()));
        }
    }

    @GetMapping("/auth/verify")
    public ResponseEntity<Map<String, Object>> verifyEmail(@RequestParam("token") String token) {
        try {
            authService.verifyEmail(token);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Xác nhận email thành công");
            return ResponseEntity.ok(response);
        } catch (NotFoundException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    @PostMapping("/auth/forgot-password")
    public ResponseEntity<ForgotPasswordResponse> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        try {
            authService.sendOtpForForgotPassword(request.email());
            return ResponseEntity
                    .ok(new ForgotPasswordResponse(true, "Mã xác thực đã được gửi qua email", request.email()));
        } catch (NotFoundException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ForgotPasswordResponse(false, e.getMessage(), request.email()));
        }
    }

    @PostMapping("/auth/verify-otp")
    public ResponseEntity<ForgotPasswordResponse> verifyOtp(@RequestBody VerifyOtpRequest request) {
        try {
            authService.verifyOtpAndResetPassword(request.email(), request.otp());
            return ResponseEntity
                    .ok(new ForgotPasswordResponse(true, "Mật khẩu mới đã được gửi qua email", request.email()));
        } catch (NotFoundException | IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ForgotPasswordResponse(false, e.getMessage(), request.email()));
        }
    }

    @PostMapping("/auth/register")
    public ResponseEntity<RegisterResponse> register(@RequestBody User user,
            @RequestHeader(required = false) String role) {
        try {
            String message = authService.register(user, role);
            return ResponseEntity.ok(new RegisterResponse(true, message, user.getEmail()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new RegisterResponse(false, e.getMessage(), user.getEmail()));
        }
    }

    @PostMapping("/change-password")
    public ResponseEntity<ChangePasswordResponse> changePassword(
            @RequestBody ChangePasswordRequest request,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String token = extractToken(authHeader);
            authService.changePassword(token, request.oldPassword(), request.newPassword());
            return ResponseEntity.ok(new ChangePasswordResponse(true, "Đổi mật khẩu thành công"));
        } catch (NotFoundException | IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ChangePasswordResponse(false, e.getMessage()));
        }
    }

    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String token = extractToken(authHeader);
            return ResponseEntity.ok(authService.getAllUsers(token));
        } catch (NotFoundException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
        }
    }

    @GetMapping("/user/email")
    public ResponseEntity<?> getUserByEmail(@RequestParam("email") String email,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String token = extractToken(authHeader);
            return ResponseEntity.ok(authService.getUserByEmail(email, token));
        } catch (NotFoundException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
        }
    }

    @GetMapping("/user/{id}")
    public ResponseEntity<?> getUserById(@PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String token = extractToken(authHeader);
            return ResponseEntity.ok(authService.getUserById(id, token));
        } catch (NotFoundException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
        }
    }

    @PostMapping("/user")
    public ResponseEntity<?> createUser(@RequestBody User user, @RequestHeader(required = false) String role,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String token = extractToken(authHeader);
            return ResponseEntity.ok(authService.createUser(user, role, token));
        } catch (NotFoundException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
        }
    }

    @PutMapping("/user/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody User user,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String token = extractToken(authHeader);
            return ResponseEntity.ok(authService.updateUser(id, token, user));
        } catch (NotFoundException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
        }
    }

    @DeleteMapping("/user/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String token = extractToken(authHeader);
            authService.deleteUser(id, token);
            return ResponseEntity.ok("Xóa người dùng thành công");
        } catch (NotFoundException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
        }
    }

    @GetMapping("/admin/users")
    public ResponseEntity<?> getAllUsersForAdmin(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String token = extractToken(authHeader);
            if (!authService.hasRole(token, "ADMIN")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Forbidden");
            }
            return ResponseEntity.ok(authService.getAllUsers(token));
        } catch (NotFoundException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Forbidden");
        }
    }

    @GetMapping("/admin/user/{id}")
    public ResponseEntity<?> getUserByIdForAdmin(@PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String token = extractToken(authHeader);
            if (!authService.hasRole(token, "ADMIN")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Forbidden");
            }
            return ResponseEntity.ok(authService.getUserById(id, token));
        } catch (NotFoundException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Forbidden");
        }
    }

    @GetMapping("/admin/user/email")
    public ResponseEntity<?> getUserByEmailForAdmin(@RequestParam("email") String email,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String token = extractToken(authHeader);
            if (!authService.hasRole(token, "ADMIN")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Forbidden");
            }
            return ResponseEntity.ok(authService.getUserByEmail(email, token));
        } catch (NotFoundException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Forbidden");
        }
    }

    @PostMapping("/admin/user")
    public ResponseEntity<?> createAdminUser(@RequestBody User user,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String token = extractToken(authHeader);
            if (!authService.hasRole(token, "ADMIN")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Forbidden");
            }
            // Lấy role từ body của user thay vì header
            String role = user.getRole() != null ? user.getRole() : "USER";
            return ResponseEntity.ok(authService.createUser(user, role, token));
        } catch (NotFoundException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Forbidden");
        }
    }

    @PutMapping("/admin/user/{id}")
    public ResponseEntity<?> updateAdminUser(@PathVariable Long id, @RequestBody User user,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String token = extractToken(authHeader);
            if (!authService.hasRole(token, "ADMIN")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Forbidden");
            }
            return ResponseEntity.ok(authService.updateUser(id, token, user));
        } catch (NotFoundException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Forbidden");
        }
    }

    @DeleteMapping("/admin/user/{id}")
    public ResponseEntity<?> deleteAdminUser(@PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String token = extractToken(authHeader);
            if (!authService.hasRole(token, "ADMIN")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Forbidden");
            }
            authService.deleteUser(id, token);
            return ResponseEntity.ok("Xóa người dùng thành công");
        } catch (NotFoundException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Forbidden");
        }
    }

    @GetMapping("/staff/users")
    public ResponseEntity<?> getAllUsersForStaff(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String token = extractToken(authHeader);
            if (!authService.hasRole(token, "STAFF")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Forbidden");
            }
            return ResponseEntity.ok(authService.getAllUsers(token));
        } catch (NotFoundException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Forbidden");
        }
    }

    @GetMapping("/staff/user/{id}")
    public ResponseEntity<?> getUserByIdForStaff(@PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String token = extractToken(authHeader);
            if (!authService.hasRole(token, "STAFF")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Forbidden");
            }
            return ResponseEntity.ok(authService.getUserById(id, token));
        } catch (NotFoundException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Forbidden");
        }
    }

    @GetMapping("/staff/user/email")
    public ResponseEntity<?> getUserByEmailForStaff(@RequestParam("email") String email,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String token = extractToken(authHeader);
            if (!authService.hasRole(token, "STAFF")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Forbidden");
            }
            return ResponseEntity.ok(authService.getUserByEmail(email, token));
        } catch (NotFoundException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Forbidden");
        }
    }

    @PostMapping("/staff/user")
    public ResponseEntity<?> createStaffUser(@RequestBody User user, @RequestHeader(required = false) String role,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String token = extractToken(authHeader);
            if (!authService.hasRole(token, "STAFF")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Forbidden");
            }
            return ResponseEntity.ok(authService.createUser(user, role, token));
        } catch (NotFoundException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Forbidden");
        }
    }

    @PutMapping("/staff/user/{id}")
    public ResponseEntity<?> updateStaffUser(@PathVariable Long id, @RequestBody User user,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String token = extractToken(authHeader);
            if (!authService.hasRole(token, "STAFF")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Forbidden");
            }
            return ResponseEntity.ok(authService.updateUser(id, token, user));
        } catch (NotFoundException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Forbidden");
        }
    }

    @DeleteMapping("/staff/user/{id}")
    public ResponseEntity<?> deleteStaffUser(@PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String token = extractToken(authHeader);
            if (!authService.hasRole(token, "STAFF")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Forbidden");
            }
            authService.deleteUser(id, token);
            return ResponseEntity.ok("Xóa người dùng thành công");
        } catch (NotFoundException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Forbidden");
        }
    }

    @PostMapping("/2fa/enable")
    public ResponseEntity<Map<String, Object>> enable2FA(
            @RequestBody TwoFARequest request,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String token = extractToken(authHeader);
            Map<String, Object> result = authService.enable2FA(token, request.type());
            return ResponseEntity.ok(result);
        } catch (NotFoundException | IllegalArgumentException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    // Verify 2FA code
    @PostMapping("/2fa/verify")
    public ResponseEntity<Map<String, Object>> verify2FA(
            @RequestBody TwoFAVerifyRequest request,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String token = extractToken(authHeader);
            authService.verify2FA(token, request.type(), request.code());
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Xác thực 2FA thành công");
            return ResponseEntity.ok(response);
        } catch (NotFoundException | IllegalArgumentException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    // Disable 2FA
    @PostMapping("/2fa/disable")
    public ResponseEntity<Map<String, Object>> disable2FA(
            @RequestBody TwoFAVerifyRequest request,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String token = extractToken(authHeader);
            authService.disable2FA(token, request.type(), request.code());
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Tắt 2FA thành công");
            return ResponseEntity.ok(response);
        } catch (NotFoundException | IllegalArgumentException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    @GetMapping("/2fa/status")
    public ResponseEntity<Map<String, Object>> get2FAStatus(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            String token = extractToken(authHeader);
            String email = jwtConfig.extractEmail(token);
            User user = userRepository.findByEmail(email);
            if (user == null) {
                throw new NotFoundException("Người dùng không tồn tại");
            }
            Optional<User2FA> user2FA = user2FARepository.findByUserId(user.getId());
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("isTwoFactorEnabled", user2FA.map(User2FA::isTwoFactorEnabled).orElse(false));
            return ResponseEntity.ok(response);
        } catch (NotFoundException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    private String extractToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith(JwtConfig.TOKEN_PREFIX)) {
            throw new NotFoundException("Token không được cung cấp hoặc không hợp lệ");
        }
        return authHeader.substring(JwtConfig.TOKEN_PREFIX.length());
    }

    record LoginRequest(String email, String password) {
    }

    record LoginResponse(boolean success, String message, String token) {
    }

    record RegisterRequest(String email, String password) {
    }

    record RegisterResponse(boolean success, String message, String email) {
    }

    record ForgotPasswordRequest(String email) {
    }

    record ForgotPasswordResponse(boolean success, String message, String email) {
    }

    record VerifyOtpRequest(String email, String otp) {
    }

    record LogoutResponse(boolean success, String message) {
    }

    record GoogleLoginRequest(String idToken) {
    }

    record ChangePasswordRequest(String oldPassword, String newPassword) {
    }

    record ChangePasswordResponse(boolean success, String message) {
    }

    record TwoFARequest(String type) {
    }

    record TwoFAVerifyRequest(String type, String code) {
    }
}