import QRCode from "qrcode";
 
// ===== Types (must match the Java records) =====
interface Listing {
  id: number;
  title: string;
  category: string;
  condition: string;
  price: number;
  seller: string;
  sellerPaymentId: string;
  description: string;
  status: "AVAILABLE" | "RESERVED" | "SOLD";
}
 
interface User {
  name: string;
  email: string;
  college: string;
  paymentId: string;
}
 
interface Order {
  id: number;
  listingId: number;
  listingTitle: string;
  buyer: string;
  seller: string;
  sellerPaymentId: string;
  price: number;
  status: "RESERVED" | "PAID";
  createdAt: number;
  paidAt: number | null;
}
 
interface Message {
  id: number;
  listingId: number;
  listingTitle: string;
  buyer: string;
  seller: string;
  sender: string;
  text: string;
  sentAt: number;
}
 
// A conversation = one listing + one buyer talking to its seller
interface Conversation {
  key: string;
  listingId: number;
  listingTitle: string;
  buyer: string;
  seller: string;
  messages: Message[];
}
 
type View = "home" | "login" | "choose" | "browse" | "sell" | "orders" | "messages";
 
const API = "http://localhost:8080/api";
 
// ===== State =====
let currentUser: User | null = JSON.parse(localStorage.getItem("studymart-user") ?? "null");
let afterLogin: View = "choose";
let myOrders: Order[] = [];
 
// ===== Small helpers =====
const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
 
function showMessage(el: HTMLElement, text: string, isError = false): void {
  el.textContent = text;
  el.classList.toggle("error", isError);
  el.hidden = false;
  setTimeout(() => (el.hidden = true), 3500);
}
 
async function api<T>(path: string, options?: RequestInit): Promise<{ ok: boolean; data: T }> {
  const response = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const text = await response.text();
  return { ok: response.ok, data: (text ? JSON.parse(text) : null) as T };
}
 
const euro = (n: number) => `€${n.toFixed(2)}`;
 
// ===== Navigation between views =====
function showView(view: View): void {
  document.querySelectorAll<HTMLElement>(".view").forEach((v) => (v.hidden = true));
  $(`#view-${view}`).hidden = false;
  window.scrollTo({ top: 0 });
  renderNav();
 
  if (view === "home") loadHomeListings();
  if (view === "browse") loadCatalogue();
  if (view === "sell") loadMyListings();
  if (view === "orders") loadOrders();
  if (view === "messages") loadConversations();
  if (view === "choose") $("#choose-name").textContent = currentUser?.name ?? "";
}
 
// Anything marked data-protected sends you to login first
function go(view: View): void {
  if (!currentUser) {
    afterLogin = view;
    showView("login");
  } else {
    showView(view);
  }
}
 
function renderNav(): void {
  $("#nav-auth").innerHTML = currentUser
    ? `<span class="hello">Hi, ${currentUser.name}</span>
       <button class="btn small outline" id="logout">Log out</button>`
    : `<button class="btn small outline" id="nav-login">Log in</button>
       <button class="btn small primary" id="nav-register">Register</button>`;
}
 
document.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;
 
  const viewEl = target.closest<HTMLElement>("[data-view]");
  if (viewEl) {
    event.preventDefault();
    const view = viewEl.dataset.view as View;
    viewEl.hasAttribute("data-protected") ? go(view) : showView(view);
    return;
  }
 
  const categoryEl = target.closest<HTMLElement>("[data-category]");
  if (categoryEl) {
    $<HTMLSelectElement>("#filter-category").value = categoryEl.dataset.category!;
    go("browse");
    return;
  }
 
  if (target.id === "nav-login") { switchTab("login"); afterLogin = "choose"; showView("login"); }
  if (target.id === "nav-register") { switchTab("register"); afterLogin = "choose"; showView("login"); }
  if (target.id === "logout") {
    currentUser = null;
    activeConversation = null;
    conversations = [];
    myOrders = [];
    localStorage.removeItem("studymart-user");
    showView("home");
  }
 
  const tab = target.closest<HTMLElement>(".tab");
  if (tab) switchTab(tab.dataset.tab as "login" | "register");
});
 
// ===== Login / Register =====
function switchTab(tab: "login" | "register"): void {
  document.querySelectorAll<HTMLElement>(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === tab));
  $("#login-form").hidden = tab !== "login";
  $("#register-form").hidden = tab !== "register";
  $("#auth-error").hidden = true;
}
 
async function authenticate(path: "login" | "register", body: object): Promise<void> {
  const { ok, data } = await api<User & { error?: string }>(`/users/${path}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!ok) {
    showMessage($("#auth-error"), data?.error ?? "Something went wrong", true);
    return;
  }
  currentUser = data;
  localStorage.setItem("studymart-user", JSON.stringify(currentUser));
  showView(afterLogin);
}
 
$<HTMLFormElement>("#login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  authenticate("login", Object.fromEntries(new FormData(e.target as HTMLFormElement)));
});
 
$<HTMLFormElement>("#register-form").addEventListener("submit", (e) => {
  e.preventDefault();
  authenticate("register", Object.fromEntries(new FormData(e.target as HTMLFormElement)));
});
 
// ===== Listings =====
async function fetchListings(category = "", status = "AVAILABLE"): Promise<Listing[]> {
  const params = new URLSearchParams({ status });
  if (category) params.set("category", category);
  return (await api<Listing[]>(`/listings?${params}`)).data;
}
 
function statusBadge(status: Listing["status"]): string {
  const label = { AVAILABLE: "Available", RESERVED: "Reserved", SOLD: "Sold" }[status];
  return `<span class="status ${status.toLowerCase()}">${label}</span>`;
}
 
function card(l: Listing, actionHtml: string, showStatus = false): string {
  return `
    <article class="card">
      <div class="card-top"><span class="tag">${l.category}</span>${showStatus ? statusBadge(l.status) : ""}</div>
      <h3>${l.title}</h3>
      <p class="desc">${l.description ?? ""}</p>
      <p class="meta">Condition: ${l.condition} · Seller: ${l.seller}</p>
      <div class="row">
        <strong>${euro(l.price)}</strong>
        ${actionHtml}
      </div>
    </article>`;
}
 
function renderInto(container: HTMLElement, listings: Listing[], action: (l: Listing) => string, emptyText: string, showStatus = false): void {
  container.innerHTML = listings.length
    ? listings.map((l) => card(l, action(l), showStatus)).join("")
    : `<p class="muted">${emptyText}</p>`;
}
 
async function loadHomeListings(): Promise<void> {
  const listings = await fetchListings();
  renderInto(
    $("#home-listings"),
    listings.slice(0, 6),
    () => `<button class="btn small primary" data-view="browse" data-protected>Reserve</button>`,
    "No listings available right now."
  );
}
 
async function loadCatalogue(): Promise<void> {
  const search = $<HTMLInputElement>("#search").value.toLowerCase();
  const category = $<HTMLSelectElement>("#filter-category").value;
  const condition = $<HTMLSelectElement>("#filter-condition").value;
 
  const listings = (await fetchListings(category)).filter(
    (l) => l.title.toLowerCase().includes(search) && (!condition || l.condition === condition)
  );
  renderInto(
    $("#browse-listings"),
    listings,
    (l) =>
      l.seller === currentUser?.name
        ? `<span class="muted">Your listing</span>`
        : `<button class="btn small primary reserve" data-id="${l.id}">Reserve</button>`,
    "Nothing matches your filters."
  );
}
 
["#search", "#filter-category", "#filter-condition"].forEach((sel) =>
  $(sel).addEventListener("input", loadCatalogue)
);
 
// Reserve = create an order (first come, first served), then open chat with the seller
$("#browse-listings").addEventListener("click", async (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>(".reserve");
  if (!button || !currentUser) return;
  button.disabled = true;
 
  const { ok, data } = await api<Order & { error?: string }>("/orders", {
    method: "POST",
    body: JSON.stringify({ listingId: Number(button.dataset.id), buyer: currentUser.name }),
  });
 
  if (!ok) {
    showMessage($("#browse-message"), data?.error ?? "Could not reserve", true);
    loadCatalogue(); // refresh: it's probably gone
    return;
  }
  myOrders.push(data);
  openChat({
    key: `${data.listingId}:${currentUser.name}`,
    listingId: data.listingId,
    listingTitle: data.listingTitle,
    buyer: currentUser.name,
    seller: data.seller,
    messages: [],
  });
});
 
// Sell: post a listing + manage my own
$<HTMLFormElement>("#sell-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target as HTMLFormElement;
  const data = new FormData(form);
  await api("/listings", {
    method: "POST",
    body: JSON.stringify({
      title: data.get("title"),
      category: data.get("category"),
      condition: data.get("condition"),
      price: Number(data.get("price")),
      seller: currentUser!.name,
      sellerPaymentId: currentUser!.paymentId,
      description: data.get("description"),
    }),
  });
  form.reset();
  showMessage($("#sell-message"), "Listing posted!");
  loadMyListings();
});
 
async function loadMyListings(): Promise<void> {
  const listings = (await fetchListings("", "ALL")).filter((l) => l.seller === currentUser?.name);
  renderInto(
    $("#my-listings"),
    listings,
    (l) =>
      l.status === "AVAILABLE"
        ? `<button class="btn small danger remove" data-id="${l.id}">Remove</button>`
        : `<span class="muted">${l.status === "RESERVED" ? "Awaiting payment" : "Sold ✓"}</span>`,
    "You haven't listed anything yet.",
    true
  );
}
 
$("#my-listings").addEventListener("click", async (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>(".remove");
  if (!button) return;
  await api(`/listings/${button.dataset.id}`, { method: "DELETE" });
  loadMyListings();
});
 
// ===== Orders (profile page) =====
async function fetchOrders(): Promise<Order[]> {
  if (!currentUser) return [];
  return (await api<Order[]>(`/orders?user=${encodeURIComponent(currentUser.name)}`)).data;
}
 
function orderRow(o: Order, iAmBuyer: boolean): string {
  const when = new Date(o.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  const other = iAmBuyer ? `Seller: ${o.seller}` : `Buyer: ${o.buyer}`;
  let action = "";
  if (o.status === "PAID") {
    action = `<span class="status sold">Paid ✓</span>`;
  } else if (iAmBuyer) {
    action = `<button class="btn small primary pay" data-id="${o.id}">Pay now</button>
              <button class="btn small outline cancel" data-id="${o.id}">Cancel</button>`;
  } else {
    action = `<span class="status reserved">Awaiting payment</span>`;
  }
  return `
    <div class="order">
      <div>
        <strong>${o.listingTitle}</strong>
        <div class="meta">${other} · ${when} · Order #${o.id}</div>
      </div>
      <div class="order-right">
        <strong>${euro(o.price)}</strong>${action}
        <button class="btn small outline message" data-id="${o.id}">Message</button>
      </div>
    </div>`;
}
 
async function loadOrders(): Promise<void> {
  if (!currentUser) return;
  $("#profile-name").textContent = currentUser.name;
  $("#profile-details").textContent = `${currentUser.college} · ${currentUser.email} · pays to ${currentUser.paymentId}`;
 
  myOrders = await fetchOrders();
  const purchases = myOrders.filter((o) => o.buyer === currentUser!.name);
  const sales = myOrders.filter((o) => o.seller === currentUser!.name);
  $("#purchases").innerHTML = purchases.length ? purchases.map((o) => orderRow(o, true)).join("") : `<p class="muted">No purchases yet.</p>`;
  $("#sales").innerHTML = sales.length ? sales.map((o) => orderRow(o, false)).join("") : `<p class="muted">No sales yet.</p>`;
}
 
$("#view-orders").addEventListener("click", async (event) => {
  const target = event.target as HTMLElement;
  const pay = target.closest<HTMLButtonElement>(".pay");
  if (pay) {
    const order = myOrders.find((o) => o.id === Number(pay.dataset.id));
    if (order) openPayment(order);
    return;
  }
  const message = target.closest<HTMLButtonElement>(".message");
  if (message) {
    const o = myOrders.find((x) => x.id === Number(message.dataset.id));
    if (o) openChat({ key: `${o.listingId}:${o.buyer}`, listingId: o.listingId, listingTitle: o.listingTitle, buyer: o.buyer, seller: o.seller, messages: [] });
    return;
  }
  const cancel = target.closest<HTMLButtonElement>(".cancel");
  if (cancel) {
    const { ok, data } = await api<{ error?: string }>(`/orders/${cancel.dataset.id}`, { method: "DELETE" });
    showMessage($("#orders-message"), ok ? "Reservation cancelled — the listing is available again." : data?.error ?? "Could not cancel", !ok);
    loadOrders();
  }
});
 
// ===== Payment (QR code) =====
let payingOrder: Order | null = null;
 
async function openPayment(order: Order): Promise<void> {
  payingOrder = order;
  $("#pay-summary").textContent = `${order.listingTitle} — ${euro(order.price)} to ${order.seller}`;
  $("#pay-to").textContent = order.sellerPaymentId;
 
  // In production this string would be a real payment link (Stripe checkout, UPI intent, Revolut.me…).
  const payload = `studymart://pay?order=${order.id}&to=${encodeURIComponent(order.sellerPaymentId)}&amount=${order.price.toFixed(2)}&currency=EUR`;
  await QRCode.toCanvas($<HTMLCanvasElement>("#pay-qr"), payload, { width: 220, margin: 1 });
 
  $("#pay-modal").hidden = false;
}
 
function closePayment(): void {
  $("#pay-modal").hidden = true;
  payingOrder = null;
}
 
$("#pay-close").addEventListener("click", closePayment);
$("#pay-modal").addEventListener("click", (e) => { if (e.target === e.currentTarget) closePayment(); });
 
$("#pay-confirm").addEventListener("click", async () => {
  if (!payingOrder) return;
  const { ok } = await api(`/orders/${payingOrder.id}/pay`, { method: "POST" });
  closePayment();
  if (ok) {
    if (!$("#view-orders").hidden) { loadOrders(); showMessage($("#orders-message"), "Payment confirmed — enjoy your purchase!"); }
    if (!$("#view-messages").hidden) loadConversations();
  }
});
 
// ===== Messages / chat =====
let conversations: Conversation[] = [];
let activeConversation: Conversation | null = null;
let seenCount = 0;
 
async function fetchMessages(): Promise<Message[]> {
  if (!currentUser) return [];
  return (await api<Message[]>(`/messages?user=${encodeURIComponent(currentUser.name)}`)).data;
}
 
// Every order is a conversation (even with no messages yet), plus any message threads
function groupIntoConversations(messages: Message[], orders: Order[]): Conversation[] {
  const map = new Map<string, Conversation>();
  for (const o of orders) {
    const key = `${o.listingId}:${o.buyer}`;
    map.set(key, { key, listingId: o.listingId, listingTitle: o.listingTitle, buyer: o.buyer, seller: o.seller, messages: [] });
  }
  for (const m of messages) {
    const key = `${m.listingId}:${m.buyer}`;
    if (!map.has(key)) {
      map.set(key, { key, listingId: m.listingId, listingTitle: m.listingTitle, buyer: m.buyer, seller: m.seller, messages: [] });
    }
    map.get(key)!.messages.push(m);
  }
  const lastActivity = (c: Conversation) => c.messages.length ? c.messages[c.messages.length - 1].sentAt : 0;
  return [...map.values()].sort((a, b) => lastActivity(b) - lastActivity(a));
}
 
async function loadConversations(): Promise<void> {
  const [messages, orders] = await Promise.all([fetchMessages(), fetchOrders()]);
  myOrders = orders;
  conversations = groupIntoConversations(messages, orders);
 
  if (activeConversation && !conversations.some((c) => c.key === activeConversation!.key)) {
    conversations.unshift(activeConversation);
  }
  if (activeConversation) {
    activeConversation = conversations.find((c) => c.key === activeConversation!.key) ?? activeConversation;
  }
 
  renderConversationList();
  renderChat();
  seenCount = messages.length;
  $("#unread-badge").hidden = true;
}
 
const otherParty = (c: Conversation) => (c.buyer === currentUser?.name ? c.seller : c.buyer);
 
function renderConversationList(): void {
  $("#conversation-list").innerHTML = conversations.length
    ? conversations
        .map((c) => {
          const last = c.messages[c.messages.length - 1];
          return `
          <button class="conversation ${c.key === activeConversation?.key ? "active" : ""}" data-key="${c.key}">
            <strong>${otherParty(c)}</strong>
            <span class="conv-title">${c.listingTitle}</span>
            <span class="conv-preview">${last ? last.text : "No messages yet"}</span>
          </button>`;
        })
        .join("")
    : `<p class="muted">No conversations yet. A chat opens automatically when you reserve an item, or when someone reserves one of yours.</p>`;
}
 
// The order that belongs to this conversation (same listing, same buyer), if any
function orderFor(c: Conversation): Order | undefined {
  return myOrders.find((o) => o.listingId === c.listingId && o.buyer === c.buyer);
}
 
function renderChat(): void {
  const header = $("#chat-header");
  const box = $("#chat-messages");
  const form = $<HTMLFormElement>("#chat-form");
 
  if (!activeConversation) {
    box.innerHTML = "";
    form.hidden = true;
    return;
  }
  const c = activeConversation;
  const order = orderFor(c);
  const iAmBuyer = c.buyer === currentUser?.name;
 
  let orderHtml = "";
  if (order?.status === "PAID") orderHtml = `<span class="status sold">Paid ✓</span>`;
  else if (order && iAmBuyer) orderHtml = `<button class="btn small primary" id="chat-pay">Pay ${euro(order.price)}</button>`;
  else if (order) orderHtml = `<span class="status reserved">Reserved · awaiting payment</span>`;
 
  header.innerHTML = `
    <div>
      <strong>${otherParty(c)}</strong><span class="muted"> · about “${c.listingTitle}”</span>
    </div>
    ${orderHtml}`;
  form.hidden = false;
 
  const shouldStick = box.scrollTop + box.clientHeight >= box.scrollHeight - 40;
  box.innerHTML = c.messages.length
    ? c.messages
        .map((m) => {
          const mine = m.sender === currentUser?.name;
          const time = new Date(m.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          return `<div class="bubble ${mine ? "mine" : "theirs"}">${m.text}<span class="time">${time}</span></div>`;
        })
        .join("")
    : `<p class="muted center">Say hi to ${otherParty(c)} and agree a pickup spot. Once you're happy, press Pay above.</p>`;
  if (shouldStick || c.messages.length <= 1) box.scrollTop = box.scrollHeight;
}
 
$("#chat-header").addEventListener("click", (event) => {
  if ((event.target as HTMLElement).id !== "chat-pay" || !activeConversation) return;
  const order = orderFor(activeConversation);
  if (order) openPayment(order);
});
 
function openChat(conversation: Conversation): void {
  activeConversation = conversation;
  showView("messages");
  setTimeout(() => $<HTMLInputElement>("#chat-input").focus(), 50);
}
 
$("#conversation-list").addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>(".conversation");
  if (!button) return;
  activeConversation = conversations.find((c) => c.key === button.dataset.key) ?? null;
  renderConversationList();
  renderChat();
});
 
$<HTMLFormElement>("#chat-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = $<HTMLInputElement>("#chat-input");
  const text = input.value.trim();
  if (!text || !activeConversation || !currentUser) return;
  const c = activeConversation;
  input.value = "";
  await api("/messages", {
    method: "POST",
    body: JSON.stringify({
      listingId: c.listingId,
      listingTitle: c.listingTitle,
      buyer: c.buyer,
      seller: c.seller,
      sender: currentUser.name,
      text,
    }),
  });
  loadConversations();
});
 
// Poll every 3 seconds: refresh the chat if open, otherwise show an unread badge
setInterval(async () => {
  if (!currentUser) return;
  if (!$("#view-messages").hidden) {
    loadConversations();
  } else {
    const messages = await fetchMessages();
    const unread = messages.length - seenCount;
    const badge = $("#unread-badge");
    badge.textContent = String(unread);
    badge.hidden = unread <= 0;
  }
}, 3000);
 
// ===== Start on the landing page =====
showView("home");
 
