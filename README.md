# Pharmacy Management Backend System

A backend system for managing pharmacy medicine inventory and customer orders, built with Node.js, Express, PostgreSQL, and Redis. Includes an AI-powered medicine recommendation feature and real-time low-stock alerts via WebSockets.

Built as part of the **Advanced Backend System Design & AI-driven Data Systems** assignment (Option 2: Pharmacy Order and Inventory Management System).

## Features

- **MVC architecture** with clear separation of routes, controllers, and models
- **PostgreSQL** for persistent storage of medicines, orders, and order items
- **Redis** used for:
  - Caching the medicine list (`GET /medicine`) to reduce database load
  - Distributed locking to prevent race conditions when multiple orders are placed for the same medicine simultaneously
- **Real-time low stock alerts** via Socket.IO — connected clients are notified instantly when a medicine's stock drops below a threshold, without polling
- **AI-powered medicine recommendations** using the Groq API (Llama 3.1) based on user-submitted symptoms
- **Database transactions** for order placement, ensuring stock deduction and order creation either both succeed or both roll back

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | PostgreSQL |
| Caching / Locking | Redis |
| Real-time | Socket.IO |
| AI | Groq API (Llama 3.1) |

## Project Structure

\`\`\`
pharmacy-backend/
├── Controller/
│   ├── medicineController.js
│   ├── orderController.js
│   └── llmController.js
├── models/
│   ├── medicineModel.js
│   └── orderModel.js
├── routes/
│   ├── medicineRoutes.js
│   ├── orderRoutes.js
│   └── llmRoutes.js
├── services/
│   └── llmService.js
├── config/
│   ├── db.js
│   └── redis.js
├── app.js
├── System_Design_Document.md
└── package.json
\`\`\`

## Setup Instructions

### Prerequisites

- Node.js (v18+)
- PostgreSQL running locally or remotely
- Redis running locally or remotely
- A free [Groq API key](https://console.groq.com/keys)

### 1. Clone the repository

\`\`\`bash
git clone https://github.com/AnanyaS017/Pharmacy-Management-Backend-System.git
cd Pharmacy-Management-Backend-System
\`\`\`

### 2. Install dependencies

\`\`\`bash
npm install
\`\`\`

### 3. Configure environment variables

Create a \`.env\` file in the project root:

\`\`\`properties
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_USER=your_postgres_user
DB_PASSWORD=your_postgres_password
DB_NAME=pharmacy_db

GROQ_API_KEY=your_groq_api_key
\`\`\`

### 4. Set up the database

Create a PostgreSQL database named \`pharmacy_db\` (or whatever you set in \`.env\`), then create the following tables:

\`\`\`sql
CREATE TABLE medicines (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(255) NOT NULL,
    stock INTEGER NOT NULL,
    price NUMERIC(10, 2) NOT NULL
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    total NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    medicine_id INTEGER REFERENCES medicines(id),
    quantity INTEGER NOT NULL
);
\`\`\`

### 5. Run the server

\`\`\`bash
node app.js
\`\`\`

You should see:

\`\`\`
LLM Routes Loaded
Server running on port 3000
Redis Connected
\`\`\`

## API Endpoints

### Medicine

| Method | Endpoint | Description |
|---|---|---|
| POST | \`/medicine\` | Add a new medicine |
| GET | \`/medicine\` | Get all medicines (Redis-cached) |
| GET | \`/medicine/search?name=\` | Search medicines by name |
| PUT | \`/medicine/:id\` | Update medicine stock (triggers low stock alert if applicable) |
| DELETE | \`/medicine/:id\` | Delete a medicine |
| GET | \`/medicine/recommend/:id\` | Get related medicines by category |
| GET | \`/medicine/low-stock\` | Get all medicines below the stock threshold |

### Order

| Method | Endpoint | Description |
|---|---|---|
| POST | \`/order\` | Place an order (uses Redis lock + DB transaction) |
| GET | \`/order/:id\` | Get order details |

### AI Recommendation

| Method | Endpoint | Description |
|---|---|---|
| POST | \`/api/llm/recommend\` | Get an AI-generated medicine recommendation based on symptoms |

**Example request:**
\`\`\`json
POST /api/llm/recommend
{
  "symptoms": "fever, headache"
}
\`\`\`

**Example response:**
\`\`\`json
{
  "success": true,
  "recommendation": "Fever and headache can be symptoms of various conditions..."
}
\`\`\`

## Real-Time Events (WebSocket)

The server emits a \`lowStockAlert\` event via Socket.IO whenever a medicine's stock drops below 10 units — whether from a manual stock update or an order being placed.

**Event payload:**
\`\`\`json
{
  "id": 2,
  "name": "Paracetamol",
  "stock": 5
}
\`\`\`

Clients can listen for this event to build live dashboards without polling the API.

## Concurrency Handling

When placing an order, the server acquires a short-lived Redis lock (\`lock:medicine:<id>\`) before checking and deducting stock. This prevents two simultaneous orders for the same medicine from both passing the stock check and overselling inventory. The lock auto-expires after 5 seconds as a safety net. Stock deduction and order creation are additionally wrapped in a PostgreSQL transaction, so a failure partway through rolls back cleanly instead of leaving inconsistent data.

## System Design

See [\`System_Design_Document.md\`](./System_Design_Document.md) for the architecture diagram, database schema, Redis usage details, and event flow.

## Author

Ananya S Shetty
