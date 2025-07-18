const mongoose = require("mongoose");

const venueSchema = new mongoose.Schema({
  venueid: { type: String, required: true, unique: true },
  venueName: { type: String, required: true, unique: true },
  venueAddress: { type: String, required: true },
  venueLocation: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
});

module.exports = mongoose.model("Venue", venueSchema);
