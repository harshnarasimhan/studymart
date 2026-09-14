package com.studymart.backend;

import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;

@RestController
@RequestMapping("/api/messages")
@CrossOrigin(origins = "*")
public class MessageController {

    private final List<Message> messages = new CopyOnWriteArrayList<>();
    private final AtomicLong nextId = new AtomicLong(1);

    // All messages a user is part of (as buyer or seller), oldest first
    @GetMapping
    public List<Message> forUser(@RequestParam String user) {
        return messages.stream()
                .filter(m -> m.buyer().equals(user) || m.seller().equals(user))
                .toList();
    }

    @PostMapping
    public Message send(@RequestBody Message incoming) {
        Message saved = new Message(
                nextId.getAndIncrement(),
                incoming.listingId(),
                incoming.listingTitle(),
                incoming.buyer(),
                incoming.seller(),
                incoming.sender(),
                incoming.text(),
                System.currentTimeMillis()
        );
        messages.add(saved);
        return saved;
    }
}