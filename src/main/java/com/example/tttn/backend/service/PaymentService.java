package com.example.tttn.backend.service;

import com.example.tttn.backend.exception.NotFoundException;
import com.example.tttn.backend.model.Booking;
import com.example.tttn.backend.model.Order;
import com.example.tttn.backend.model.Payment;
import com.example.tttn.backend.repository.BookingRepository;
import com.example.tttn.backend.repository.OrderRepository;
import com.example.tttn.backend.repository.PaymentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class PaymentService {

    private static final Logger logger = LoggerFactory.getLogger(PaymentService.class);

    private final PaymentRepository paymentRepository;
    private final BookingRepository bookingRepository;
    private final OrderRepository orderRepository;
    private final AuthService authService;
    private final PayPalService payPalService;

    @Autowired
    public PaymentService(
            PaymentRepository paymentRepository,
            BookingRepository bookingRepository,
            OrderRepository orderRepository,
            AuthService authService,
            PayPalService payPalService) {
        this.paymentRepository = paymentRepository;
        this.bookingRepository = bookingRepository;
        this.orderRepository = orderRepository;
        this.authService = authService;
        this.payPalService = payPalService;
    }

    @Transactional
    public Payment createPayment(String token, Payment payment) {
        if (!authService.hasRole(token, "ADMIN")) {
            logger.error("User with token {} does not have ADMIN role", token);
            throw new NotFoundException("Chỉ ADMIN mới có quyền tạo phương thức thanh toán");
        }

        if (payment.getStatus() == null) {
            payment.setStatus("Active");
        }
        payment.validatePayment();
        logger.info("Creating payment: {}", payment);
        Payment savedPayment = paymentRepository.save(payment);
        logger.info("Created payment with ID: {}", savedPayment.getId());
        return savedPayment;
    }

    @Transactional
    public Payment updatePayment(String token, Long id, Payment payment) {
        if (!authService.hasRole(token, "ADMIN")) {
            logger.error("User with token {} does not have ADMIN role", token);
            throw new NotFoundException("Chỉ ADMIN mới có quyền cập nhật phương thức thanh toán");
        }

        Payment existingPayment = paymentRepository.findById(id)
                .orElseThrow(() -> {
                    logger.error("Không tìm thấy payment với ID: {}", id);
                    return new NotFoundException("Không tìm thấy payment với ID: " + id);
                });

        existingPayment.setPaymentType(payment.getPaymentType());
        existingPayment.setPaymentMethod(payment.getPaymentMethod());
        existingPayment.setName(payment.getName());
        existingPayment.setBankName(payment.getBankName());
        existingPayment.setAccountNumber(payment.getAccountNumber());
        existingPayment.setPaypalEmail(payment.getPaypalEmail());
        existingPayment.setStatus(payment.getStatus());

        existingPayment.validatePayment();
        logger.info("Updating payment with ID: {}", id);
        Payment updatedPayment = paymentRepository.save(existingPayment);
        logger.info("Updated payment: {}", updatedPayment);
        return updatedPayment;
    }

    @Transactional
    public void deletePayment(String token, Long id) {
        if (!authService.hasRole(token, "ADMIN")) {
            logger.error("User with token {} does not have ADMIN role", token);
            throw new NotFoundException("Chỉ ADMIN mới có quyền xóa phương thức thanh toán");
        }

        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> {
                    logger.error("Không tìm thấy payment với ID: {}", id);
                    return new NotFoundException("Không tìm thấy payment với ID: " + id);
                });
        logger.info("Deleting payment with ID: {}", id);
        paymentRepository.delete(payment);
        logger.info("Deleted payment with ID: {}", id);
    }

    public Payment getPaymentById(String token, Long id) {
        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> {
                    logger.error("Không tìm thấy payment với ID: {}", id);
                    return new NotFoundException("Không tìm thấy payment với ID: " + id);
                });
        logger.info("Retrieved payment with ID: {}", id);
        return payment;
    }

    public List<Payment> getAllPayments(String token) {
        List<Payment> payments = paymentRepository.findAll();
        logger.info("Retrieved {} payments", payments.size());
        return payments;
    }

    public List<Payment> getAllPaymentsForAdmin(String token) {
        if (!authService.hasRole(token, "ADMIN")) {
            logger.error("User with token {} does not have ADMIN role", token);
            throw new NotFoundException("Chỉ ADMIN mới có quyền xem danh sách phương thức thanh toán");
        }
        List<Payment> payments = paymentRepository.findAll();
        logger.info("Retrieved {} payments for admin", payments.size());
        return payments;
    }

    @Transactional
    public Map<String, Object> processPayment(String token, Long paymentId, Long orderId) {
        // Kiểm tra quyền USER

        // Lấy Payment
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> {
                    logger.error("Không tìm thấy phương thức thanh toán với ID: {}", paymentId);
                    return new NotFoundException("Không tìm thấy phương thức thanh toán với ID: " + paymentId);
                });
        if (!"Active".equals(payment.getStatus())) {
            logger.error("Phương thức thanh toán không hoạt động: paymentId={}", paymentId);
            throw new IllegalStateException("Phương thức thanh toán không hoạt động");
        }

        // Lấy Order
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> {
                    logger.error("Không tìm thấy order với ID: {}", orderId);
                    return new NotFoundException("Không tìm thấy order với ID: " + orderId);
                });
        if ("COMPLETED".equals(order.getStatus())) {
            logger.error("Order đã được hoàn tất trước đó: orderId={}", orderId);
            throw new IllegalStateException("Order đã được hoàn tất trước đó");
        }

        // Lấy Booking liên quan đến Order
        Booking booking = bookingRepository.findById(order.getBooking().getId())
                .orElseThrow(() -> {
                    logger.error("Không tìm thấy booking với ID: {}", order.getBooking().getId());
                    return new NotFoundException("Không tìm thấy booking với ID: " + order.getBooking().getId());
                });
        if ("COMPLETED".equals(booking.getStatus())) {
            logger.error("Booking đã được thanh toán trước đó: bookingId={}", booking.getId());
            throw new IllegalStateException("Booking đã được thanh toán trước đó");
        }

        // Xử lý thanh toán theo paymentMethod
        Map<String, Object> response = new HashMap<>();
        logger.debug("Kiểm tra paymentMethod: {}", payment.getPaymentMethod());
        if ("PayPal".equalsIgnoreCase(payment.getPaymentMethod())) {
            try {
                double amount = order.getTotalPrice();
                String currency = "USD"; // Có thể lấy từ cấu hình hoặc Order
                String description = "Thanh toán vé xem phim cho Order ID: " + orderId;

                logger.info("Gọi PayPalService để khởi tạo thanh toán: orderId={}, amount={}, currency={}", 
                            orderId, amount, currency);
                Map<String, Object> paypalResult = payPalService.createPayPalPayment(
                        orderId, amount, currency, description);
                response.put("success", true);
                response.put("message", "Khởi tạo thanh toán PayPal thành công");
                response.put("data", paypalResult);

                // Lưu payment vào Order
                order.setPayment(payment);
                orderRepository.save(order);
                logger.info("Khởi tạo thanh toán PayPal thành công: orderId={}, paymentId={}", 
                            orderId, paymentId);
                return response;
            } catch (Exception e) {
                logger.error("Lỗi khi xử lý thanh toán PayPal: orderId={}, paymentId={}, error={}", 
                             orderId, paymentId, e.getMessage(), e);
                throw new RuntimeException("Lỗi khi khởi tạo thanh toán PayPal: " + e.getMessage());
            }
        } else {
            // Xử lý thanh toán khác
            logger.info("Processing non-PayPal payment for order ID: {} with payment ID: {}", orderId, paymentId);

            order.setStatus("COMPLETED");
            order.setPayment(payment);
            orderRepository.save(order);
            logger.info("Updated order ID: {} to status COMPLETED with payment ID: {}", orderId, paymentId);

            booking.setStatus("COMPLETED");
            bookingRepository.save(booking);
            logger.info("Updated booking ID: {} to status COMPLETED", booking.getId());

            response.put("success", true);
            response.put("message", "Đặt đơn hàng " + orderId + " thành công!");
            return response;
        }
    }
}