package com.studymart.backend;

import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;

/**
 * The single in-memory "shelf" of listings.
 * Both ListingController and OrderController share this one object (Spring creates it once).
 * Later this becomes a database repository and the controllers stay the same.
 */
@Service
public class ListingStore {

    private final List<Listing> listings = new CopyOnWriteArrayList<>();
    private final AtomicLong nextId = new AtomicLong(1);

    public ListingStore() {
        add(new Listing(null, "Calculus: Early Transcendentals", "BOOK", "GOOD", 25.0, "Aoife", "@aoife-rev", "8th edition, light highlighting", null));
        add(new Listing(null, "Casio fx-991 Scientific Calculator", "GADGET", "GOOD", 12.0, "Sam", "sam@upi", "Works perfectly, has cover", null));
        add(new Listing(null, "A4 Ring Binders x5", "STATIONERY", "NEW", 5.0, "Priya", "@priya-rev", "Unused, assorted colours", null));
    }

    public List<Listing> all() {
        return listings;
    }

    public Optional<Listing> find(Long id) {
        return listings.stream().filter(l -> l.id().equals(id)).findFirst();
    }

    public Listing add(Listing l) {
        Listing saved = new Listing(nextId.getAndIncrement(), l.title(), l.category(), l.condition(),
                l.price(), l.seller(), l.sellerPaymentId(), l.description(), "AVAILABLE");
        listings.add(saved);
        return saved;
    }

    public void update(Listing updated) {
        for (int i = 0; i < listings.size(); i++) {
            if (listings.get(i).id().equals(updated.id())) {
                listings.set(i, updated);
                return;
            }
        }
    }

    public void remove(Long id) {
        listings.removeIf(l -> l.id().equals(id));
    }
}
