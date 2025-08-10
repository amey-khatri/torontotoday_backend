require("dotenv").config();

const express = require("express");
const app = express();
const mongoose = require("mongoose");

mongoose.connect(process.env.databaseURL, {});
const db = mongoose.connection;
db.on("error", (error) => console.error(error));
db.once("open", () => console.log("Connected to MongoDB"));

app.use(express.json());

const eventsRouter = require("./routes/events");
app.use("/events", eventsRouter);

const venuesRouter = require("./routes/venues");
app.use("/venues", venuesRouter);

const event_idsRouter = require("./routes/event_ids");
app.use("/event_ids", event_idsRouter);

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
