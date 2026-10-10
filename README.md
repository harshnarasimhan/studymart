# StudyMart

A peer-to-peer marketplace for buying and selling second-hand school and college supplies, textbooks, stationery, gadgets, and anything else that helps students learn for less.

Built as a full-stack project to practice connecting a **Java backend** to a **TypeScript frontend** over a REST API.

## Demo

- **Live demo:** [studymart-for-second-hand-supplies.netlify.app](https://studymart-for-second-hand-supplies.netlify.app/)
- **Video explanation:** [Watch the walkthrough on Google Drive](https://drive.google.com/file/d/11G0Yi0p3mA7TFvYQP-G7NmLH-TAdbRGw/view?usp=sharing)

## Features

- **Landing page** with categories and a preview of live listings
- **Login-gated interactions**: anyone can browse the landing page, but buying, selling, and messaging require an account
- **Buyer catalogue** with search, category filter, and condition filter
- **Seller dashboard** to post listings and track their status
- **First-come-first-served reservations**: the backend locks a listing the instant it's reserved, so it disappears from the catalogue for everyone else
- **Buyer–seller chat** for arranging pickup details, one thread per order
- **In-app payment** via a generated QR code that encodes the seller's payment ID and the exact order amount
- **Order history**: a profile page listing "My purchases" and "My sales"

## Tech stack

| Layer    | Technology                                   |
| -------- | -------------------------------------------- |
| Frontend | HTML, CSS, TypeScript, built with [Vite](https://vitejs.dev/) |
| Backend  | Java 17, Spring Boot (Spring Web)            |
| Data     | In-memory (see [Known limitations](#known-limitations-and-what-would-replace-them)) |
| Payment  | `qrcode` npm package (simulated checkout)    |

There is no database, no authentication tokens, and no real payment processor. Those are the natural "next steps" listed below. Everything else in the flow (reservations, chat, order status) is real and enforced by the backend, not just faked in the UI.

## Project structure

```
studymart/
├── backend/                  # Spring Boot app
│   └── src/main/java/com/studymart/backend/
│       ├── BackendApplication.java
│       ├── Listing.java          # a for-sale item
│       ├── ListingStore.java     # shared in-memory list of listings
│       ├── ListingController.java
│       ├── User.java
│       ├── UserController.java   # register / login
│       ├── Order.java
│       ├── OrderController.java  # reserve / pay / cancel
│       ├── Message.java
│       └── MessageController.java
└── frontend/                 # Vite + TypeScript app
    ├── index.html
    └── src/
        ├── main.ts           # all app logic and API calls
        └── style.css
```

## Running it locally

### Backend (needs JDK 17+)

```bash
cd backend
./mvnw spring-boot:run      # macOS/Linux
mvnw.cmd spring-boot:run    # Windows
```

Runs on <http://localhost:8080>.

### Frontend (needs Node.js)

```bash
cd frontend
npm install
npm run dev
```

Runs on <http://localhost:5173>. Open that URL. The frontend calls the backend directly, so **both must be running at the same time**.

## API overview

| Method | Endpoint                      | Purpose                                      |
| ------ | ----------------------------- | -------------------------------------------- |
| GET    | `/api/listings`               | Available listings (filter by category)      |
| GET    | `/api/listings?status=ALL`    | All listings regardless of status            |
| POST   | `/api/listings`               | Create a listing                             |
| DELETE | `/api/listings/{id}`          | Remove a listing                             |
| POST   | `/api/users/register`         | Create an account                            |
| POST   | `/api/users/login`            | Log in                                       |
| GET    | `/api/orders?user={name}`     | Orders where the user is buyer or seller     |
| POST   | `/api/orders`                 | Reserve a listing (first come, first served) |
| POST   | `/api/orders/{id}/pay`        | Confirm payment                              |
| DELETE | `/api/orders/{id}`            | Cancel an unpaid reservation                 |
| GET    | `/api/messages?user={name}`   | Messages involving the user                  |
| POST   | `/api/messages`               | Send a chat message                          |

## How a sale works, end to end

1. A listing starts as `AVAILABLE`.
2. A buyer clicks **Reserve**, which calls `POST /api/orders`. The backend checks the listing is still available (the check and update happen inside a `synchronized` method, so two simultaneous clicks can't both win) and flips it to `RESERVED`.
3. Buyer and seller chat about pickup. Messages are polled every 3 seconds rather than pushed live.
4. The buyer presses **Pay**, sees a QR code (payload: order ID, seller's payment ID, amount), and confirms payment.
5. `POST /api/orders/{id}/pay` marks the order `PAID` and the listing `SOLD`. The listing is now filtered out of every buyer's catalogue permanently.

## Known limitations (and what would replace them)

- **No database**: all data lives in memory and is lost when the backend restarts. *Next step:* an embedded H2 or a real PostgreSQL database behind Spring Data JPA.
- **Passwords stored in plain text**: *next step:* hash them with BCrypt and add proper session tokens (Spring Security + JWT) instead of trusting the frontend's `localStorage`.
- **Payment is simulated**: the QR code encodes a payment request, but no money actually moves. *Next step:* a real provider (Stripe, Revolut Business, or a UPI intent) confirmed via a webhook rather than a client-side "I've paid" button.
- **Chat uses polling, not push**: fine for a demo, but a production version would use WebSockets (`spring-boot-starter-websocket`) so messages arrive instantly without repeated requests.

## Possible future features

- Ratings and reviews for buyers and sellers
- Filtering listings by college/campus
- Image uploads for listings
- Push notifications for new messages
