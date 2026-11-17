package com.example.tttn.backend.service;

import com.example.tttn.backend.exception.NotFoundException;
import com.example.tttn.backend.repository.BookingRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.commons.codec.binary.Hex;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.HashMap;
import java.util.Map;

@Service
public class MomoService {

    private final AuthService authService;
    private final BookingRepository bookingRepository;
    private final ObjectMapper mapper;
    private final String partnerCode = "<your-partner-code>";
    private final String accessKey = "<your-access-key>";
    private final String secretKey = "<your-secret-key>";
    private final String moMoEndpoint = "https://test-payment.momo.vn/v2/gateway/api/create";
    private final String redirectUrl = "http://localhost:8080/payment-result";
    private final String ipnUrl = "http://localhost:8080/api/momo/ipn";

    @Autowired
    public MomoService(AuthService authService, BookingRepository bookingRepository, ObjectMapper mapper) {
        this.authService = authService;
        this.bookingRepository = bookingRepository;
        this.mapper = mapper;
    }

    @Transactional
    public Map<String, Object> createMoMoPayment(String token, Map<String, Object> paymentRequest) throws Exception {
        if (!authService.hasRole(token, "USER")) {
            throw new NotFoundException("Chỉ USER được thực hiện thanh toán");
        }

        Long cinemaId = Long.parseLong(paymentRequest.get("cinemaId").toString());
        Long userId = Long.parseLong(paymentRequest.get("userId").toString());
        int amount = Integer.parseInt(paymentRequest.get("amount").toString());
        String orderInfo = paymentRequest.get("orderInfo").toString();

        // Tạo orderId duy nhất
        String orderId = "Booking_" + System.currentTimeMillis();
        String requestId = "Request_" + System.currentTimeMillis();

        // Tạo yêu cầu MoMo
        Map<String, Object> moMoRequest = new HashMap<>();
        moMoRequest.put("partnerCode", partnerCode);
        moMoRequest.put("accessKey", accessKey);
        moMoRequest.put("requestId", requestId);
        moMoRequest.put("amount", amount);
        moMoRequest.put("orderId", orderId);
        moMoRequest.put("orderInfo", orderInfo);
        moMoRequest.put("redirectUrl", redirectUrl);
        moMoRequest.put("ipnUrl", ipnUrl);
        moMoRequest.put("requestType", "captureWallet");
        moMoRequest.put("lang", "vi");

        // Tạo chữ ký (signature)
        String rawData = "accessKey=" + accessKey + "&amount=" + amount + "&extraData=&ipnUrl=" + ipnUrl +
                         "&orderId=" + orderId + "&orderInfo=" + orderInfo + "&partnerCode=" + partnerCode +
                         "&redirectUrl=" + redirectUrl + "&requestId=" + requestId + "&requestType=captureWallet";
        String signature = HmacSHA256(rawData, secretKey);
        moMoRequest.put("signature", signature);

        // Gửi yêu cầu đến MoMo API
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(moMoEndpoint))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(moMoRequest)))
                .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        Map<String, Object> moMoResponse = mapper.readValue(response.body(), new TypeReference<>() {});
        if (moMoResponse.get("resultCode").equals(0)) {
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("data", Map.of("payUrl", moMoResponse.get("payUrl")));
            return result;
        } else {
            throw new RuntimeException("Thất bại khi tạo thanh toán MoMo: " + moMoResponse.get("message"));
        }
    }

    private String HmacSHA256(String data, String key) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKeySpec = new SecretKeySpec(key.getBytes(), "HmacSHA256");
        mac.init(secretKeySpec);
        byte[] rawHmac = mac.doFinal(data.getBytes());
        return Hex.encodeHexString(rawHmac);
    }
}