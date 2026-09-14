package com.studymart.backend;

public record User(
        String name,
        String email,
        String password,
        String college,
        String paymentId   // how buyers pay this user: Revolut tag, UPI ID, IBAN...
) {}
