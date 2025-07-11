const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  eventbriteId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: String,
  category: String,
  startTime: Date,
  endTime: Date,
  url: String,
  image: String,
  location: {
    latitude: Number,
    longitude: Number,
  },
  fetchedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Event", eventSchema);
