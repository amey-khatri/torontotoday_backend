const express = require("express");
const router = express.Router();
const Event = require("../models/event");
const { fetchAndStore } = require("../scheduler/fetchEvents");

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

// Create an event
router.post("/", async (req, res) => {
  const event = new Event({
    id: req.body.id,
    name: req.body.name,
    description: req.body.description,
    location: req.body.location,
    link: req.body.link,
    price: req.body.price,
    dateTime: req.body.dateTime,
    image: req.body.image,
    latitude: req.body.latitude,
    longitude: req.body.longitude,
  });

  try {
    const newEvent = await event.save();
    res.status(201).json(newEvent);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
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

module.exports = router;
