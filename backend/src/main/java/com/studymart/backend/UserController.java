package com.studymart.backend;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    // email -> user (in memory, like the listings)
    private final Map<String, User> users = new ConcurrentHashMap<>();

    record LoginRequest(String email, String password) {}
    record UserResponse(String name, String email, String college, String paymentId) {}

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User incoming) {
        String key = incoming.email().toLowerCase();
        if (users.containsKey(key)) {
            return ResponseEntity.status(409).body(Map.of("error", "That email is already registered"));
        }
        users.put(key, incoming);
        return ResponseEntity.ok(new UserResponse(incoming.name(), incoming.email(), incoming.college(), incoming.paymentId()));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        User user = users.get(req.email().toLowerCase());
        if (user == null || !user.password().equals(req.password())) {
            return ResponseEntity.status(401).body(Map.of("error", "Wrong email or password"));
        }
        return ResponseEntity.ok(new UserResponse(user.name(), user.email(), user.college(), user.paymentId()));
    }
}

