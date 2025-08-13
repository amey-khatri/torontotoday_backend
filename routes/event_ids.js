const express = require("express");
const router = express.Router();
const Event = require("../models/event");
const Event_id = require("../models/event_id");

// Get all event IDs
router.get("/", async (req, res) => {
  try {
    const event_ids = await Event_id.find();
    res.json({
      count: event_ids.length,
      event_ids,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Delete all event IDs
router.delete("/", async (req, res) => {
  try {
    const result = await Event_id.deleteMany({});
    res.json({ message: `${result.deletedCount} event IDs deleted` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
