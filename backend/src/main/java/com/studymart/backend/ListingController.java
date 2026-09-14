package com.studymart.backend;

import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/listings")
@CrossOrigin(origins = "*")
public class ListingController {

    private final ListingStore store;

    // Spring hands us the shared ListingStore automatically
    public ListingController(ListingStore store) {
        this.store = store;
    }

    // GET /api/listings              -> available listings only (what buyers see)
    // GET /api/listings?status=ALL   -> everything, including reserved/sold (for "my listings")
    @GetMapping
    public List<Listing> all(@RequestParam(required = false) String category,
                             @RequestParam(defaultValue = "AVAILABLE") String status) {
        return store.all().stream()
                .filter(l -> status.equalsIgnoreCase("ALL") || l.status().equalsIgnoreCase(status))
                .filter(l -> category == null || category.isBlank() || l.category().equalsIgnoreCase(category))
                .toList();
    }

    @PostMapping
    public Listing create(@RequestBody Listing incoming) {
        return store.add(incoming);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        store.remove(id);
    }
}
