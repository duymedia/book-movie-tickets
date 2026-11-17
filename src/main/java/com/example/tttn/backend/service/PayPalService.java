package com.example.tttn.backend.service;

import com.example.tttn.backend.exception.NotFoundException;
import com.example.tttn.backend.model.Order;
import com.example.tttn.backend.repository.OrderRepository;
import com.example.tttn.backend.repository.BookingRepository;
import com.example.tttn.backend.model.Booking;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.paypal.api.payments.*;
import com.paypal.base.rest.APIContext;
import com.paypal.base.rest.PayPalRESTException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class PayPalService {

    private static final Logger logger = LoggerFactory.getLogger(PayPalService.class);

    private final OrderRepository orderRepository;
    private final BookingRepository bookingRepository;
    private final ObjectMapper objectMapper;
    private final APIContext apiContext;
    private final String successUrl;
    private final String cancelUrl;

    // Hard-coded cấu hình PayPal
    private static final String CLIENT_ID = "AeWnfV9coBr4t6-zoq9SsoY9w7xRB7SDur-DhKqRXXqm6oh7YsM4Tov8vefHITuU0H79UpgzpTECPvfq";
    private static final String CLIENT_SECRET = "ELM7TrjJgxeCnuH31RsIf7TpvCosbV4O6zbXCOq2eTKD_6XmnEHIAVFnEX0_0LmvlMIqcFL1UdaLjpcA";
    private static final String MODE = "sandbox";
    private static final String SUCCESS_URL = "http://localhost:8080/api/payments/paypal/success";
    private static final String CANCEL_URL = "http://localhost:8080/api/payments/paypal/cancel";

    @Autowired
    public PayPalService(OrderRepository orderRepository, BookingRepository bookingRepository, ObjectMapper objectMapper) {
        this.orderRepository = orderRepository;
        this.bookingRepository = bookingRepository;
        this.objectMapper = objectMapper;

        // Kiểm tra cấu hình PayPal
        if (CLIENT_ID == null || CLIENT_ID.trim().isEmpty() || CLIENT_ID.equals("YOUR_PAYPAL_CLIENT_ID") ||
            CLIENT_SECRET == null || CLIENT_SECRET.trim().isEmpty() || CLIENT_SECRET.equals("YOUR_PAYPAL_CLIENT_SECRET")) {
            logger.error("Cấu hình PayPal không hợp lệ: clientId={}, clientSecret={}", CLIENT_ID, CLIENT_SECRET);
            throw new IllegalStateException("Cần cung cấp client-id và client-secret hợp lệ trong cấu hình PayPal");
        }
        if (!"sandbox".equalsIgnoreCase(MODE) && !"live".equalsIgnoreCase(MODE)) {
            logger.error("Chế độ PayPal không hợp lệ: mode={}", MODE);
            throw new IllegalStateException("Chế độ PayPal phải là 'sandbox' hoặc 'live'");
        }

        // Khởi tạo APIContext
        this.apiContext = new APIContext(CLIENT_ID, CLIENT_SECRET, MODE);
        this.successUrl = SUCCESS_URL;
        this.cancelUrl = CANCEL_URL;
        logger.info("Khởi tạo PayPalService: mode={}, successUrl={}, cancelUrl={}", MODE, SUCCESS_URL, CANCEL_URL);
    }

    @Transactional
    public Map<String, Object> createPayPalPayment(Long orderId, double amount, String currency, String description) throws PayPalRESTException {
        logger.info("Tạo thanh toán PayPal: orderId={}, amount={}, currency={}", orderId, amount, currency);

        // Kiểm tra Order
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> {
                    logger.error("Không tìm thấy order với ID: {}", orderId);
                    return new NotFoundException("Không tìm thấy order với ID: " + orderId);
                });

        if (!"PENDING".equals(order.getStatus())) {
            logger.error("Order không ở trạng thái PENDING: orderId={}, status={}", 
                         orderId, order.getStatus());
            throw new IllegalStateException("Đơn hàng không ở trạng thái chờ thanh toán");
        }

        if (amount <= 0) {
            logger.error("Số tiền không hợp lệ: amount={}", amount);
            throw new IllegalArgumentException("Số tiền phải lớn hơn 0");
        }

        if (currency == null || currency.trim().isEmpty()) {
            logger.error("Đơn vị tiền tệ không hợp lệ: currency={}", currency);
            throw new IllegalArgumentException("Cần cung cấp đơn vị tiền tệ hợp lệ");
        }

        // Tạo Amount
        Amount paypalAmount = new Amount();
        paypalAmount.setCurrency(currency);
        paypalAmount.setTotal(String.format("%.2f", amount));

        // Tạo Transaction
        Transaction transaction = new Transaction();
        transaction.setDescription(description);
        transaction.setAmount(paypalAmount);

        List<Transaction> transactions = new ArrayList<>();
        transactions.add(transaction);

        // Tạo Payer
        Payer payer = new Payer();
        payer.setPaymentMethod("paypal");

        // Tạo Payment
        Payment payment = new Payment();
        payment.setIntent("sale");
        payment.setPayer(payer);
        payment.setTransactions(transactions);

        // Tạo Redirect URLs
        RedirectUrls redirectUrls = new RedirectUrls();
        redirectUrls.setReturnUrl(successUrl);
        redirectUrls.setCancelUrl(cancelUrl);
        payment.setRedirectUrls(redirectUrls);

        try {
            // Gọi PayPal API để tạo thanh toán
            Payment createdPayment = payment.create(apiContext);
            logger.info("Tạo thanh toán PayPal thành công: paymentId={}", createdPayment.getId());

            // Lưu PayPal payment ID và orderId vào data_json của Order
            Map<String, Object> dataJson = order.getDataJson() != null && !order.getDataJson().isEmpty()
                    ? objectMapper.readValue(order.getDataJson(), new TypeReference<Map<String, Object>>() {})
                    : new HashMap<>();
            dataJson.put("paypal_payment_id", createdPayment.getId());
            dataJson.put("orderId", orderId);
            order.setDataJson(objectMapper.writeValueAsString(dataJson));
            orderRepository.save(order);
            logger.debug("Lưu paypal_payment_id và orderId vào data_json: orderId={}, paymentId={}", 
                         orderId, createdPayment.getId());

            // Lấy URL phê duyệt
            String approvalUrl = createdPayment.getLinks().stream()
                    .filter(link -> "approval_url".equals(link.getRel()))
                    .findFirst()
                    .map(Links::getHref)
                    .orElseThrow(() -> {
                        logger.error("Không tìm thấy approval_url trong phản hồi PayPal: paymentId={}", 
                                     createdPayment.getId());
                        return new RuntimeException("Không tìm thấy URL phê duyệt thanh toán");
                    });

            // Trả về phản hồi
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("paymentUrl", approvalUrl);
            result.put("paymentId", createdPayment.getId());
            return result;
        } catch (PayPalRESTException e) {
            logger.error("Lỗi PayPal API khi tạo thanh toán: orderId={}, error={}", orderId, e.getMessage(), e);
            throw new RuntimeException("Lỗi PayPal API khi tạo thanh toán: " + e.getMessage());
        } catch (Exception e) {
            logger.error("Lỗi khi lưu paypal_payment_id vào data_json: orderId={}, error={}", 
                         orderId, e.getMessage(), e);
            throw new RuntimeException("Lỗi khi lưu thông tin thanh toán PayPal: " + e.getMessage());
        }
    }

    @Transactional
    public void executePayPalPayment(String paymentId, String payerId, Long orderId) throws PayPalRESTException {
        logger.info("Thực thi thanh toán PayPal: paymentId={}, payerId={}, orderId={}", 
                    paymentId, payerId, orderId);

        // Kiểm tra Order
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> {
                    logger.error("Không tìm thấy order với ID: {}", orderId);
                    return new NotFoundException("Không tìm thấy order với ID: " + orderId);
                });

        // Kiểm tra Payment ID từ data_json
        try {
            Map<String, Object> dataJson = order.getDataJson() != null && !order.getDataJson().isEmpty()
                    ? objectMapper.readValue(order.getDataJson(), new TypeReference<Map<String, Object>>() {})
                    : new HashMap<>();
            String storedPaymentId = (String) dataJson.get("paypal_payment_id");
            Long storedOrderId = dataJson.get("orderId") != null ? Long.valueOf(dataJson.get("orderId").toString()) : null;
            if (storedPaymentId == null) {
                logger.error("Không tìm thấy paypal_payment_id trong data_json: orderId={}", orderId);
                throw new IllegalStateException("Không tìm thấy payment ID trong order");
            }
            if (!paymentId.equals(storedPaymentId) || !orderId.equals(storedOrderId)) {
                logger.error("Payment ID hoặc Order ID không khớp: paymentId={}, orderId={}, storedPaymentId={}, storedOrderId={}", 
                             paymentId, orderId, storedPaymentId, storedOrderId);
                throw new IllegalStateException("Payment ID hoặc Order ID không khớp với order");
            }
        } catch (Exception e) {
            logger.error("Lỗi khi đọc paypal_payment_id từ data_json: orderId={}, error={}", 
                         orderId, e.getMessage(), e);
            throw new RuntimeException("Lỗi khi đọc thông tin thanh toán PayPal: " + e.getMessage());
        }

        // Tạo Payment và PaymentExecution
        Payment payment = new Payment();
        payment.setId(paymentId);

        PaymentExecution paymentExecution = new PaymentExecution();
        paymentExecution.setPayerId(payerId);

        try {
            // Thực thi thanh toán
            Payment executedPayment = payment.execute(apiContext, paymentExecution);
            if ("approved".equals(executedPayment.getState())) {
                order.setStatus("COMPLETED");
                orderRepository.save(order);
                // Cập nhật trạng thái Booking liên quan
                Booking booking = order.getBooking();
                if (booking != null) {
                    booking.setStatus("COMPLETED");
                    bookingRepository.save(booking);
                    logger.info("Cập nhật booking trạng thái COMPLETED: bookingId={}", booking.getId());
                } else {
                    logger.warn("Không tìm thấy booking liên quan đến orderId={}", orderId);
                }
                logger.info("Thực thi thanh toán PayPal thành công: orderId={}, paymentId={}", 
                            orderId, paymentId);
            } else {
                order.setStatus("FAILED");
                orderRepository.save(order);
                logger.error("Thanh toán PayPal thất bại: orderId={}, paymentId={}, state={}", 
                             orderId, paymentId, executedPayment.getState());
                throw new IllegalStateException("Thanh toán PayPal thất bại: " + executedPayment.getState());
            }
        } catch (PayPalRESTException e) {
            logger.error("Lỗi PayPal API khi thực thi thanh toán: orderId={}, error={}", orderId, e.getMessage(), e);
            throw new RuntimeException("Lỗi PayPal API khi thực thi thanh toán: " + e.getMessage());
        }
    }

    @Transactional
    public void cancelPayPalPayment(Long orderId) {
        logger.info("Hủy thanh toán PayPal: orderId={}", orderId);

        // Kiểm tra Order
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> {
                    logger.error("Không tìm thấy order với ID: {}", orderId);
                    return new NotFoundException("Không tìm thấy order với ID: " + orderId);
                });

        order.setStatus("FAILED");
        orderRepository.save(order);
        // Cập nhật trạng thái Booking liên quan
        Booking booking = order.getBooking();
        if (booking != null) {
            booking.setStatus("FAILED");
            bookingRepository.save(booking);
            logger.info("Cập nhật booking trạng thái FAILED: bookingId={}", booking.getId());
        } else {
            logger.warn("Không tìm thấy booking liên quan đến orderId={}", orderId);
        }
        logger.info("Hủy thanh toán PayPal thành công: orderId={}", orderId);
    }
}