package com.studymart.backend;
 
public record Message(
        Long id,
        Long listingId,
        String listingTitle,
        String buyer,     // the user who started the conversation
        String seller,    // the listing's owner
        String sender,    // who sent this particular message (buyer or seller)
        String text,
        Long sentAt       // epoch milliseconds (set by the server)
) {}