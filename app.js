const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const pool = require("./config/db");
require("dotenv").config();
require("./config/redis");

const medicineRoutes = require("./routes/medicineRoutes");
const orderRoutes = require("./routes/orderRoutes");
const llmRoutes = require("./routes/llmRoutes");

const app = express();
const server = http.createServer(app); // wrap express app
const io = new Server(server, {
    cors: { origin: "*" } // restrict this in production
});

app.use(express.json());

// make io accessible inside controllers via req.app.get("io")
app.set("io", io);

app.use("/medicine", medicineRoutes);
app.use("/order", orderRoutes);
app.use("/api/llm", llmRoutes);

app.get("/test", (req, res) => res.send("Test route works"));

app.get("/", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");
        res.json({ message: "Database Connected!", time: result.rows[0].now });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Database Connection Failed" });
    }
});

// Socket connection handling
io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => { // listen on server, not app
    console.log(`Server running on port ${PORT}`);
});