require("dotenv").config();

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const cors = require("cors"); // NEW

// Allow local dev origins and a prod URL from .env
const allowedOrigins = [
  process.env.FRONTEND_URL, // e.g. https://yourdomain.com (prod)
  "http://localhost:5173", // Vite default
  "http://127.0.0.1:5173",
  "http://localhost:3001", // CRA alt
  "http://127.0.0.1:3001",
].filter(Boolean);

const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true); // allow REST clients/curl
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

mongoose.connect(process.env.MONGODB_URI, {});
const db = mongoose.connection;
db.on("error", (error) => console.error(error));
db.once("open", () => console.log("Connected to MongoDB"));

app.use(express.json());

const eventsRouter = require("./routes/events");
app.use("/events", eventsRouter);

const event_idsRouter = require("./routes/event_ids");
app.use("/event_ids", event_idsRouter);

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
