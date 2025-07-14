const express = require("express");
const router = express.Router();
const Venue = require("../models/venue");
const { processEvents } = require("../services/venue_eventbrite");

// POST /venues/fetch
// body: { eventIds: [ "123", "456", … ] }
router.post("/fetch", async (req, res) => {
  const { eventIds } = req.body;
  if (!Array.isArray(eventIds) || eventIds.length === 0) {
    return res
      .status(400)
      .json({ error: "Must provide a non-empty array of eventIds" });
  }

  try {
    await processEvents(eventIds);
    return res.json({ message: "Venues fetched & upserted." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to process events" });
  }
});

// Optional: list all stored venues
router.get("/", async (req, res) => {
  try {
    const venues = await Venue.find();
    res.json({
      count: venues.length,
      venues,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load venues" });
  }
});

// Optional: delete all venues
router.delete("/", async (req, res) => {
  try {
    const result = await Venue.deleteMany({});
    res.json({ message: `${result.deletedCount} venues deleted` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
