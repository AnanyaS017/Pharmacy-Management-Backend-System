# Pharmacy Management Backend System
## System Design Document

---

# 1. Project Objective

The Pharmacy Backend System is a REST API application developed using Node.js, Express.js, PostgreSQL, and Redis. The system allows users to manage medicines, place orders, maintain inventory, search medicines, implement Redis caching, generate low stock alerts, and recommend medicines based on category.

---

# 2. Technology Stack

| Technology | Purpose |
|------------|---------|
| Node.js | Backend Runtime |
| Express.js | REST API Framework |
| PostgreSQL | Database |
| Redis | Caching |
| Postman | API Testing |
| VS Code | Development |

---

# 3. System Architecture

```
                Client (Postman)

                      |

                      V

              Express.js Server

                      |

                Controllers

                      |

                   Models

                /           \

       PostgreSQL        Redis
        Database          Cache
```

---

# 4. Project Structure

```
pharmacy-backend/

│── config/
│     ├── db.js
│     └── redis.js
│
│── controllers/
│     ├── medicineController.js
│     └── orderController.js
│
│── models/
│     ├── medicineModel.js
│     └── orderModel.js
│
│── routes/
│     ├── medicineRoutes.js
│     └── orderRoutes.js
│
│── app.js
│── package.json
│── .env
```

---

# 5. Database Design

## Medicines Table

| Column | Type |
|---------|------|
| id | SERIAL |
| name | VARCHAR |
| category | VARCHAR |
| stock | INTEGER |
| price | DECIMAL |

---

## Orders Table

| Column | Type |
|---------|------|
| id | SERIAL |
| user_id | INTEGER |
| total | DECIMAL |

---

## Order Items Table

| Column | Type |
|---------|------|
| id | SERIAL |
| order_id | INTEGER |
| medicine_id | INTEGER |
| quantity | INTEGER |

---

# 6. API Design

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | / | Database Connection |
| POST | /medicine | Add Medicine |
| GET | /medicine | Get Medicines |
| PUT | /medicine/:id | Update Medicine Stock |
| DELETE | /medicine/:id | Delete Medicine |
| GET | /medicine/search?name= | Search Medicine |
| POST | /order | Place Order |
| GET | /order/:id | Get Order Details |
| GET | /medicine/recommend/:id | AI Recommendation |

---

# 7. Redis Cache Design

The medicine list is cached using Redis.

Workflow:

1. Client requests medicine list.
2. Check Redis cache.
3. If cache exists:
   - Return data from Redis.
4. Otherwise:
   - Fetch data from PostgreSQL.
   - Store data in Redis.
   - Return response.

Cache is cleared whenever:
- Medicine is added.
- Medicine is updated.
- Medicine is deleted.

---

# 8. Low Stock Alert

After placing an order, the stock is updated.

If remaining stock is less than 10:

```
⚠️ LOW STOCK ALERT
Medicine: Paracetamol
Remaining Stock: 7
```

The alert is displayed in the VS Code terminal.

---

# 9. AI Recommendation

The recommendation API suggests medicines belonging to the same category.

Example:

Selected Medicine

```
Paracetamol
```

Recommended Medicines

```
Crocin
```

---

# 10. Workflow

```
Client

   |

   V

Express API

   |

Controller

   |

Model

   |

Redis Cache?

   |

Yes -----------------> Return Data

No

   |

PostgreSQL

   |

Store in Redis

   |

Return Response
```

---

# 11. Features Implemented

- PostgreSQL Database Connection
- Add Medicine API
- Get Medicines API
- Update Medicine Stock API
- Delete Medicine API
- Search Medicine API
- Place Order API
- Get Order Details API
- Redis Cache
- Low Stock Alert
- AI Recommendation

---

# 12. Future Enhancements

- JWT Authentication
- Admin Dashboard
- Payment Gateway Integration
- Email Notifications
- Analytics Dashboard
- Invoice Generation

---

# 13. Conclusion

The Pharmacy Backend System provides an efficient backend for pharmacy inventory management using Node.js, Express.js, PostgreSQL, and Redis. The application supports medicine management, order processing, caching, stock monitoring, and recommendation features while following a modular MVC architecture.