package com.example.tttn.backend.service;

import com.example.tttn.backend.config.JwtConfig;
import com.example.tttn.backend.exception.NotFoundException;
import com.example.tttn.backend.model.Booking;
import com.example.tttn.backend.model.Order;
import com.example.tttn.backend.model.User;
import com.example.tttn.backend.repository.BookingRepository;
import com.example.tttn.backend.repository.OrderRepository;
import com.example.tttn.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class OrderService {

    private static final Logger logger = LoggerFactory.getLogger(OrderService.class);

    private final OrderRepository orderRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final AuthService authService;
    private final JwtConfig jwtConfig;

    @Autowired
    public OrderService(OrderRepository orderRepository, BookingRepository bookingRepository,
                        UserRepository userRepository, AuthService authService, JwtConfig jwtConfig) {
        this.orderRepository = orderRepository;
        this.bookingRepository = bookingRepository;
        this.userRepository = userRepository;
        this.authService = authService;
        this.jwtConfig = jwtConfig;
    }

    @Transactional
    public Order createOrder(String token, Order order) {
        validateToken(token);
        if (!authService.hasRole(token, "ADMIN")) {
            logger.error("User with token {} does not have ADMIN role", token);
            throw new NotFoundException("Chỉ ADMIN mới có quyền tạo đơn hàng");
        }

        validateOrder(order);
        Booking booking = bookingRepository.findById(order.getBooking().getId())
                .orElseThrow(() -> {
                    logger.error("Không tìm thấy booking với ID: {}", order.getBooking().getId());
                    return new NotFoundException("Không tìm thấy booking với ID: " + order.getBooking().getId());
                });

        if ("COMPLETED".equals(booking.getStatus())) {
            logger.error("Booking đã hoàn tất, không thể tạo đơn hàng mới: bookingId={}", booking.getId());
            throw new IllegalArgumentException("Booking đã hoàn tất, không thể tạo đơn hàng mới");
        }

        if (order.getStatus() == null || order.getStatus().isEmpty()) {
            order.setStatus("PENDING");
        }

        logger.info("Creating order for booking ID: {}", order.getBooking().getId());
        Order savedOrder = orderRepository.save(order);
        logger.info("Created order with ID: {}", savedOrder.getId());
        return savedOrder;
    }

    @Transactional
    public Order updateOrder(String token, Long id, Order orderDetails) {
        validateToken(token);
        if (!authService.hasRole(token, "ADMIN")) {
            logger.error("User with token {} does not have ADMIN role", token);
            throw new NotFoundException("Chỉ ADMIN mới có quyền cập nhật đơn hàng");
        }

        Order existingOrder = orderRepository.findById(id)
                .orElseThrow(() -> {
                    logger.error("Không tìm thấy đơn hàng với ID: {}", id);
                    return new NotFoundException("Không tìm thấy đơn hàng với ID: " + id);
                });

        if ("COMPLETED".equals(existingOrder.getStatus())) {
            logger.error("Không thể cập nhật đơn hàng đã hoàn tất: orderId={}", id);
            throw new IllegalArgumentException("Không thể cập nhật đơn hàng đã hoàn tất");
        }

        if (orderDetails.getBooking() != null && orderDetails.getBooking().getId() != null) {
            Booking booking = bookingRepository.findById(orderDetails.getBooking().getId())
                    .orElseThrow(() -> {
                        logger.error("Không tìm thấy booking với ID: {}", orderDetails.getBooking().getId());
                        return new NotFoundException("Không tìm thấy booking với ID: " + orderDetails.getBooking().getId());
                    });
            if ("COMPLETED".equals(booking.getStatus())) {
                logger.error("Booking đã hoàn tất, không thể gán cho đơn hàng: bookingId={}", booking.getId());
                throw new IllegalArgumentException("Booking đã hoàn tất, không thể gán cho đơn hàng");
            }
            existingOrder.setBooking(booking);
        }
        // Sửa lỗi so sánh null cho totalPrice
        if (orderDetails.getTotalPrice() >= 0) {
            existingOrder.setTotalPrice(orderDetails.getTotalPrice());
            logger.debug("Cập nhật totalPrice cho orderId={}: {}", id, orderDetails.getTotalPrice());
        } else {
            logger.error("Giá trị totalPrice không hợp lệ cho orderId={}: {}", id, orderDetails.getTotalPrice());
            throw new IllegalArgumentException("Giá trị total_price phải không âm");
        }
        if (orderDetails.getStatus() != null && !orderDetails.getStatus().isEmpty()) {
            if (!isValidStatusTransition(existingOrder.getStatus(), orderDetails.getStatus())) {
                logger.error("Chuyển trạng thái đơn hàng không hợp lệ: từ {} sang {}, orderId={}", 
                             existingOrder.getStatus(), orderDetails.getStatus(), id);
                throw new IllegalArgumentException("Chuyển trạng thái đơn hàng không hợp lệ: từ " + existingOrder.getStatus() + " sang " + orderDetails.getStatus());
            }
            existingOrder.setStatus(orderDetails.getStatus());
        }
        if (orderDetails.getPayment() != null) {
            existingOrder.setPayment(orderDetails.getPayment());
        }

        logger.info("Updating order with ID: {}", id);
        Order updatedOrder = orderRepository.save(existingOrder);
        logger.info("Updated order: {}", updatedOrder.getId());
        return updatedOrder;
    }

    @Transactional
    public void deleteOrder(String token, Long id) {
        validateToken(token);
        if (!authService.hasRole(token, "ADMIN")) {
            logger.error("User with token {} does not have ADMIN role", token);
            throw new NotFoundException("Chỉ ADMIN mới có quyền xóa đơn hàng");
        }

        Order order = orderRepository.findById(id)
                .orElseThrow(() -> {
                    logger.error("Không tìm thấy đơn hàng với ID: {}", id);
                    return new NotFoundException("Không tìm thấy đơn hàng với ID: " + id);
                });

        if ("COMPLETED".equals(order.getStatus())) {
            logger.error("Không thể xóa đơn hàng đã hoàn tất: orderId={}", id);
            throw new IllegalArgumentException("Không thể xóa đơn hàng đã hoàn tất");
        }

        logger.info("Deleting order with ID: {}", id);
        orderRepository.delete(order);
        logger.info("Deleted order with ID: {}", id);
    }

    @Transactional
    public void cancelOrder(String token, Long id) {
        validateToken(token);
        if (!authService.hasRole(token, "USER")) {
            logger.error("User with token {} does not have USER role", token);
            throw new NotFoundException("Chỉ USER mới có quyền yêu cầu hủy đơn hàng");
        }

        Order order = orderRepository.findById(id)
                .orElseThrow(() -> {
                    logger.error("Không tìm thấy đơn hàng với ID: {}", id);
                    return new NotFoundException("Không tìm thấy đơn hàng với ID: " + id);
                });

        Long userId = getUserIdFromToken(token);
        if (!order.getBooking().getUser().getId().equals(userId)) {
            logger.error("User ID {} does not own order ID: {}", userId, id);
            throw new NotFoundException("Bạn không có quyền hủy đơn hàng này");
        }

        if (!"PENDING".equals(order.getStatus())) {
            logger.error("Chỉ đơn hàng ở trạng thái PENDING mới có thể hủy: orderId={}, status={}", id, order.getStatus());
            throw new IllegalArgumentException("Chỉ đơn hàng ở trạng thái PENDING mới có thể hủy");
        }

        order.setStatus("CANCELLED");
        orderRepository.save(order);
        logger.info("User ID {} cancelled order ID: {}", userId, id);
    }

    @Transactional(readOnly = true)
    public List<Order> getAllOrdersForAdmin(String token) {
        validateToken(token);
        if (!authService.hasRole(token, "ADMIN")) {
            logger.error("User with token {} does not have ADMIN role", token);
            throw new NotFoundException("Chỉ ADMIN mới có quyền xem danh sách đơn hàng");
        }

        List<Order> orders = orderRepository.findAll();
        logger.info("Retrieved {} orders for admin", orders.size());
        return orders;
    }

    @Transactional(readOnly = true)
    public List<Order> getUserOrders(String token) {
        validateToken(token);
        Long userId = getUserIdFromToken(token);
        List<Order> orders = orderRepository.findAll().stream()
                .filter(order -> order.getBooking().getUser().getId().equals(userId))
                .collect(Collectors.toList());

        logger.info("Retrieved {} orders for user ID: {}", orders.size(), userId);
        return orders;
    }

    @Transactional(readOnly = true)
    public Order getOrderById(String token, Long id) {
        validateToken(token);
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> {
                    logger.error("Không tìm thấy đơn hàng với ID: {}", id);
                    return new NotFoundException("Không tìm thấy đơn hàng với ID: " + id);
                });

        if (authService.hasRole(token, "USER")) {
            Long userId = getUserIdFromToken(token);
            if (!order.getBooking().getUser().getId().equals(userId)) {
                logger.error("User ID {} does not have permission to view order ID: {}", userId, id);
                throw new NotFoundException("Bạn không có quyền xem đơn hàng này");
            }
        } else if (!authService.hasRole(token, "ADMIN")) {
            logger.error("User with token {} does not have required role", token);
            throw new NotFoundException("Chỉ ADMIN hoặc chủ sở hữu đơn hàng mới có quyền xem");
        }

        logger.info("Retrieved order with ID: {}", id);
        return order;
    }

    private void validateToken(String token) {
        if (!jwtConfig.validateToken(token)) {
            logger.error("Token không hợp lệ hoặc đã hết hạn");
            throw new NotFoundException("Token không hợp lệ hoặc đã hết hạn");
        }
    }

    private Long getUserIdFromToken(String token) {
        String email = jwtConfig.extractEmail(token);
        User user = userRepository.findByEmail(email);
        if (user == null) {
            logger.error("Người dùng không tồn tại với email: {}", email);
            throw new NotFoundException("Người dùng không tồn tại");
        }
        return user.getId();
    }

    private void validateOrder(Order order) {
        if (order == null) {
            logger.error("Dữ liệu đơn hàng không được để trống");
            throw new IllegalArgumentException("Dữ liệu đơn hàng không được để trống");
        }
        if (order.getBooking() == null || order.getBooking().getId() == null) {
            logger.error("Cần cung cấp ID booking");
            throw new IllegalArgumentException("Cần cung cấp ID booking");
        }
        if (order.getTotalPrice() < 0) {
            logger.error("Giá trị total_price phải không âm: {}", order.getTotalPrice());
            throw new IllegalArgumentException("Giá trị total_price phải không âm");
        }
    }

    private boolean isValidStatusTransition(String currentStatus, String newStatus) {
        if ("PENDING".equals(currentStatus)) {
            return List.of("COMPLETED", "CANCELLED").contains(newStatus);
        }
        return false;
    }
}