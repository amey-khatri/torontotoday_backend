const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  eventbriteId: { type: String, required: true, unique: true }, // new
  name: { type: String, required: true },
  description: { type: String },
  category: { type: String }, // new
  dateTimeStart: { type: Date }, // rename/alias
  dateTimeEnd: { type: Date }, // new
  link: { type: String, required: true },
  image: { type: String },
  price: { type: String, required: true },
  location: {
    latitude: { type: Number },
    longitude: { type: Number },
  },
  fetchedAt: { type: Date, default: Date.now }, // new
});

module.exports = mongoose.model("Event", eventSchema);
