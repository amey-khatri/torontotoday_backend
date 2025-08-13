const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  eventbriteId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  category: { type: String },
  price: { type: String }, // Add this line
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  url: { type: String },
  image: { type: String },
  address: { type: String }, // Add this line
  venueName: { type: String }, // Add this line
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  fetchedAt: { type: Date, default: Date.now },
  organizer: { type: String }, // Add this line
  format: { type: String }, // Add this line
});

module.exports = mongoose.model("Event", eventSchema);
