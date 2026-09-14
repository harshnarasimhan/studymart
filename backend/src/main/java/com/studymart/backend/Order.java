package com.studymart.backend;

public record Order(
        Long id,
        Long listingId,
        String listingTitle,
        String buyer,
        String seller,
        String sellerPaymentId,
        double price,
        String status,   // RESERVED (waiting for payment) or PAID
        long createdAt,
        Long paidAt      // null until paid
) {
    public Order markPaid() {
        return new Order(id, listingId, listingTitle, buyer, seller, sellerPaymentId, price,
                "PAID", createdAt, System.currentTimeMillis());
    }
}