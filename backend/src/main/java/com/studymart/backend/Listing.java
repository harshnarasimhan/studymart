package com.studymart.backend;

public record Listing(
        Long id,
        String title,
        String category,        // BOOK, STATIONERY, GADGET, OTHER
        String condition,       // NEW, GOOD, FAIR
        double price,
        String seller,
        String sellerPaymentId, // where buyers pay the seller (Revolut tag, UPI ID, IBAN...)
        String description,
        String status           // AVAILABLE, RESERVED, SOLD
) {
    public Listing withStatus(String newStatus) {
        return new Listing(id, title, category, condition, price, seller, sellerPaymentId, description, newStatus);
    }
}
