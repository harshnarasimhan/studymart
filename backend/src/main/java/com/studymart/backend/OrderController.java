package com.studymart.backend;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "*")
public class OrderController {

    private final ListingStore store;
    private final List<Order> orders = new CopyOnWriteArrayList<>();
    private final AtomicLong nextId = new AtomicLong(1);

    public OrderController(ListingStore store) {
        this.store = store;
    }

    record ReserveRequest(Long listingId, String buyer) {}

    // All orders where the user is the buyer or the seller
    @GetMapping
    public List<Order> forUser(@RequestParam String user) {
        return orders.stream()
                .filter(o -> o.buyer().equals(user) || o.seller().equals(user))
                .toList();
    }

    // Reserve a listing: first come, first served.
    // 'synchronized' means two buyers clicking at the same instant are handled one after the other,
    // so only the first one succeeds.
    @PostMapping
    public synchronized ResponseEntity<?> reserve(@RequestBody ReserveRequest req) {
        Optional<Listing> found = store.find(req.listingId());
        if (found.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "Listing no longer exists"));
        }
        Listing listing = found.get();
        if (!listing.status().equals("AVAILABLE")) {
            return ResponseEntity.status(409).body(Map.of("error", "Sorry — someone reserved this just before you"));
        }
        if (listing.seller().equals(req.buyer())) {
            return ResponseEntity.status(400).body(Map.of("error", "You can't reserve your own listing"));
        }

        store.update(listing.withStatus("RESERVED"));
        Order order = new Order(nextId.getAndIncrement(), listing.id(), listing.title(), req.buyer(),
                listing.seller(), listing.sellerPaymentId(), listing.price(), "RESERVED",
                System.currentTimeMillis(), null);
        orders.add(order);
        return ResponseEntity.ok(order);
    }

    // Buyer confirms payment -> order PAID, listing SOLD
    @PostMapping("/{id}/pay")
    public ResponseEntity<?> pay(@PathVariable Long id) {
        for (int i = 0; i < orders.size(); i++) {
            Order o = orders.get(i);
            if (o.id().equals(id)) {
                Order paid = o.markPaid();
                orders.set(i, paid);
                store.find(o.listingId()).ifPresent(l -> store.update(l.withStatus("SOLD")));
                return ResponseEntity.ok(paid);
            }
        }
        return ResponseEntity.status(404).body(Map.of("error", "Order not found"));
    }

    // Cancel an unpaid reservation -> listing becomes AVAILABLE again
    @DeleteMapping("/{id}")
    public ResponseEntity<?> cancel(@PathVariable Long id) {
        Optional<Order> found = orders.stream().filter(o -> o.id().equals(id)).findFirst();
        if (found.isEmpty()) return ResponseEntity.status(404).body(Map.of("error", "Order not found"));
        Order o = found.get();
        if (o.status().equals("PAID")) {
            return ResponseEntity.status(400).body(Map.of("error", "A paid order can't be cancelled"));
        }
        orders.remove(o);
        store.find(o.listingId()).ifPresent(l -> store.update(l.withStatus("AVAILABLE")));
        return ResponseEntity.ok().build();
    }
}
