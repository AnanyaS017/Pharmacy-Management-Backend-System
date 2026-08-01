# Pharmacy Management Backend System
## System Design Document

---

# 1. Project Objective

The Pharmacy Backend System is a REST API application developed using Node.js, Express.js, PostgreSQL, and Redis. The system allows users to manage medicines, place orders, maintain inventory, search medicines, and receive medicine recommendations. It implements Redis caching for performance, Redis-based distributed locking for concurrency control, and a real-time WebSocket event for low stock alerts. It also integrates an AI-powered medicine recommendation feature based on user-submitted symptoms.

---

# 2. Technology Stack

| Technology | Purpose |
|------------|---------|
| Node.js | Backend Runtime |
| Express.js | REST API Framework |
| PostgreSQL | Relational Database |
| Redis | Caching, Concurrency Locking |
| Socket.IO | Real-time WebSocket Events |
| Groq API (Llama 3.1) | AI-powered Medicine Recommendation |
| Postman | API Testing |
| VS Code | Development |

---

# 3. System Architecture

```
                    Client (Postman / WebSocket Listener)

                              |

                              V

                      Express.js Server
                     (HTTP + Socket.IO)

                              |

                        Controllers

                              |

                           Models

                    /                    \

           PostgreSQL                  Redis
            Database              (Cache + Locks)

                              |

                    Socket.IO Event Emission
                    (lowStockAlert to clients)


        External Service: Groq API (LLM)
        Called from services/llmService.js
        for AI medicine recommendations
```

---

# 4. Project Structure

```
pharmacy-backend/

│── config/
│     ├── db.js
│     └── redis.js
│
│── Controller/
│     ├── medicineController.js
│     ├── orderController.js
│     └── llmController.js
│
│── models/
│     ├── medicineModel.js
│     └── orderModel.js
│
│── routes/
│     ├── medicineRoutes.js
│     ├── orderRoutes.js
│     └── llmRoutes.js
│
│── services/
│     └── llmService.js
│
│── app.js
│── package.json
│── .env
│── .gitignore
│── README.md
```

---

# 5. Database Design

## Medicines Table

| Column | Type |
|---------|------|
| id | SERIAL PRIMARY KEY |
| name | VARCHAR |
| category | VARCHAR |
| stock | INTEGER |
| price | DECIMAL |

---

## Orders Table

| Column | Type |
|---------|------|
| id | SERIAL PRIMARY KEY |
| user_id | INTEGER |
| total | DECIMAL |
| created_at | TIMESTAMP (default NOW()) |

---

## Order Items Table

| Column | Type |
|---------|------|
| id | SERIAL PRIMARY KEY |
| order_id | INTEGER (FK → orders.id) |
| medicine_id | INTEGER (FK → medicines.id) |
| quantity | INTEGER |

---

# 6. API Design

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Database connection health check |
| POST | `/medicine` | Add a new medicine |
| GET | `/medicine` | Get all medicines (Redis-cached) |
| GET | `/medicine/search?name=` | Search medicine by name |
| PUT | `/medicine/:id` | Update medicine stock (triggers low stock alert if applicable) |
| DELETE | `/medicine/:id` | Delete a medicine |
| GET | `/medicine/recommend/:id` | Recommend medicines in the same category (DB-based) |
| GET | `/medicine/low-stock` | Get all medicines below the stock threshold, emits alert event |
| POST | `/order` | Place an order (Redis lock + DB transaction) |
| GET | `/order/:id` | Get order details |
| POST | `/api/llm/recommend` | AI-generated medicine recommendation based on symptoms |

---

# 7. Redis Cache Design

The medicine list is cached in Redis under the key `"medicines"`.

**Workflow:**

1. Client requests the medicine list (`GET /medicine`).
2. Server checks Redis for the `"medicines"` key.
3. If cache exists → return cached data directly (logged as "Data fetched from Redis").
4. If cache does not exist:
   - Fetch data from PostgreSQL.
   - Store the result in Redis.
   - Return the response (logged as "Data fetched from PostgreSQL").

**Cache invalidation** — the `"medicines"` key is deleted whenever:
- A medicine is added
- A medicine's stock is updated
- A medicine is deleted

This ensures the cache never serves stale data after a write.

---

# 8. Redis Concurrency Control (Distributed Locking)

The **Place Order** API is a potential race condition point: two simultaneous orders for the same medicine could both read the same stock value, both pass validation, and both deduct stock — resulting in overselling.

**Solution:** Before processing an order, the server attempts to acquire a Redis lock:

```
Key:   lock:medicine:<medicine_id>
Value: current timestamp
Mode:  SET NX EX 5   (only set if not already set, auto-expire after 5 seconds)
```

**Workflow:**

1. Request to place an order arrives for a given `medicine_id`.
2. Server attempts to acquire the lock via `SET NX EX`.
3. If the lock is already held (another order for the same medicine is mid-processing) → return `409 Conflict`, asking the client to retry.
4. If the lock is acquired → proceed to validate stock, deduct stock, and create the order inside a PostgreSQL transaction.
5. On completion (success or failure), the lock is released if the current process still owns it.

The 5-second expiry acts as a safety net in case a request crashes before releasing the lock, preventing a permanently stuck lock.

**Database-level safety:** In addition to the Redis lock, the stock row is selected with `FOR UPDATE` inside the transaction, and the entire order (order creation, order item insertion, stock deduction) is wrapped in `BEGIN` / `COMMIT` / `ROLLBACK`. If any step fails, all changes roll back, so an order is never partially recorded.

---

# 9. Real-Time Low Stock Alert (Event-Driven Feature)

This is the system's event-driven / real-time requirement, implemented using **Socket.IO**.

**Trigger points:**
- `PUT /medicine/:id` (manual stock update)
- `POST /order` (stock deduction after a successful order)
- `GET /medicine/low-stock` (manual check, also broadcasts current low-stock items)

**Workflow:**

1. After stock is updated (via either update or order placement), the server checks if the new stock value is below the threshold (10 units).
2. If below threshold, the server emits a `lowStockAlert` event via Socket.IO to all connected clients.
3. Any connected client (e.g. an admin dashboard) receives the event instantly, with no polling required.

**Example event payload:**
```json
{
  "id": 2,
  "name": "Paracetamol",
  "stock": 5
}
```

This was tested using a standalone HTML page connecting to the server via the Socket.IO client, confirming the alert is received in real time immediately after a stock-reducing action.

---

# 10. AI-Powered Medicine Recommendation

There are two related but distinct recommendation features in this system:

**a) Category-based recommendation** (`GET /medicine/recommend/:id`)
A plain PostgreSQL query that returns other medicines in the same category as the given medicine ID. No AI involved — pure database logic.

**b) AI-powered symptom recommendation** (`POST /api/llm/recommend`)
This is the system's required AI-based functionality. It accepts free-text symptoms from the user and sends them to the Groq API (Llama 3.1 model) with a system prompt instructing it to provide general educational information only, avoid diagnosis, and recommend consulting a healthcare professional.

**Example request:**
```json
POST /api/llm/recommend
{
  "symptoms": "fever, headache"
}
```

**Example response:**
```json
{
  "success": true,
  "recommendation": "Fever and headache can be symptoms of various conditions..."
}
```

---

# 11. Request Workflow (Overall)

```
Client Request

     |
     V

Express Route

     |
     V

Controller
(input validation, business logic)

     |
     V

Model
(database queries, transactions)

     |
     V

Redis?  ---- Yes ----> Return cached data / acquire lock
     |
     No
     |
     V

PostgreSQL
(read/write, transaction if needed)

     |
     V

Store/Invalidate Redis cache (if applicable)

     |
     V

Emit Socket.IO event (if stock crosses low threshold)

     |
     V

Return HTTP Response
```

---

# 12. Features Implemented

- PostgreSQL database connection
- Add Medicine API
- Get Medicines API (Redis-cached)
- Update Medicine Stock API (with real-time low stock alert)
- Delete Medicine API
- Search Medicine API
- Category-based Recommendation API
- Place Order API (Redis distributed lock + PostgreSQL transaction)
- Get Order Details API
- Low Stock Alert API (standalone endpoint)
- Real-time low stock alert via Socket.IO
- AI-powered medicine recommendation via Groq API

---

# 13. Future Enhancements

- JWT Authentication
- Admin Dashboard
- Payment Gateway Integration
- Email/SMS Notifications
- Analytics Dashboard
- Invoice Generation
- Rate limiting on the AI recommendation endpoint

---

# 14. Conclusion

The Pharmacy Backend System provides a complete, modular backend for pharmacy inventory and order management using Node.js, Express.js, PostgreSQL, and Redis. It follows an MVC architecture, uses Redis both for caching and for distributed concurrency control, implements a real-time event-driven low stock alert via Socket.IO, and integrates an AI-powered recommendation feature via the Groq API — satisfying all mandatory technical requirements of the assignment.
