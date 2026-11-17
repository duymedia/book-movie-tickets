package com.example.tttn.backend.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
@Data
public class Payment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "payment_type", nullable = false)
    private String paymentType;

    @Column(name = "method_payment")
    private String paymentMethod;

    @Column(name = "name")
    private String name;

    @Column(name = "bank_name")
    private String bankName;

    @Column(name = "account_number")
    private String accountNumber;

    @Column(name = "paypal_email")
    private String paypalEmail;

    @Column(name = "status")
    private String status;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Phương thức validate không có annotation, gọi thủ công trong service
    public void validatePayment() {
        if (paymentType == null || paymentType.isEmpty()) {
            throw new IllegalArgumentException("Payment type cannot be null or empty");
        }

        switch (paymentType) {
            case "BANKING_VN":
                if (bankName == null || bankName.isEmpty() || accountNumber == null || accountNumber.isEmpty()) {
                    throw new IllegalArgumentException("Bank name and account number are required for BANKING_VN");
                }
                break;
            case "PAYPAL":
                if (paypalEmail == null || paypalEmail.isEmpty()) {
                    throw new IllegalArgumentException("PayPal email is required for PAYPAL");
                }
                break;
            default:
                throw new IllegalArgumentException("Unsupported payment type: " + paymentType);
        }
    }
}