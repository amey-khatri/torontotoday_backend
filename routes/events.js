const express = require("express");
const router = express.Router();
const Event = require("../models/event");
const { fetchAllEvents } = require("../services/eventbrite");

// Get all events
router.get("/", async (req, res) => {
  try {
    const events = await Event.find();
    res.json({
      count: events.length,
      events: events,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get one event
router.get("/:id", getEvent, (req, res) => {
  res.json(req.event);
});

// Delete one event
router.delete("/:id", getEvent, async (req, res) => {
  try {
    await req.event.deleteOne();
    res.json({ message: "Event deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete all events
router.delete("/", async (req, res) => {
  try {
    const result = await Event.deleteMany({});
    res.json({ message: `${result.deletedCount} events deleted` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

async function getEvent(req, res, next) {
  let event;
  try {
    event = await Event.findById(req.params.id);
    if (event == null) {
      return res.status(404).json({ message: "Cannot find event" });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  req.event = event;
  next();
}

// Fetch all events at given venues
router.post("/fetch-events", async (req, res) => {
  try {
    await fetchAllEvents();
    res.json({ message: "Events fetched and stored successfully." });
  } catch (err) {
    console.error("Error fetching events:", err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

module.exports = router;
