const express = require("express");
const router = express.Router();
const Event = require("../models/event");
const Venue = require("../models/venue");
const { fetchAndStore } = require("../scheduler/fetchEvents");
const {
  fetchAllEvents,
  fetchEventsAtVenue,
} = require("../services/eventbrite");

// Get all events
router.get("/", async (req, res) => {
  try {
    const events = await Event.find();
    res.json(events);
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

// Manually trigger the Eventbrite sync
router.post("/fetch", async (req, res, next) => {
  try {
    await fetchAndStore();
    res.json({ message: "Eventbrite sync triggered successfully!" });
  } catch (err) {
    next(err);
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

router.post("/fetch-events-at-venue", async (req, res) => {
  const id = 269026003;
  const venue = await Venue.findOne({ venueid: id });
  if (!venue || !venue.venueid) {
    return res.status(400).json({ error: "Must provide a valid venue" });
  }

  try {
    const events = await fetchEventsAtVenue(venue);
    res.json(events);
  } catch (err) {
    console.error("Error fetching events at venue:", err);
    res.status(500).json({ error: "Failed to fetch events at venue" });
  }
});

module.exports = router;
