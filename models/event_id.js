const mongoose = require("mongoose");

const event_idSchema = new mongoose.Schema({
  ev_id: { type: String, required: true, unique: true },
  first_seen_at: { type: Date, default: Date.now },
  last_seen_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Event_id", event_idSchema);
