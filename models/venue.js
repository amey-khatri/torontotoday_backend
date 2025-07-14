const mongoose = require("mongoose");

const venueSchema = new mongoose.Schema({
  venueid: { type: String, required: true, unique: true },
  venueName: { type: String, required: true, unique: true },
});

module.exports = mongoose.model("Venue", venueSchema);
