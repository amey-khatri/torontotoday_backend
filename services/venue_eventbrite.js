// services/venue_eventbrite.js
const axios = require("axios");
const Venue = require("../models/venue");
const pl = require("p-limit");
const pLimit = typeof pl === "function" ? pl : pl.default;

const client = axios.create({
  baseURL: "https://www.eventbriteapi.com/v3/",
  headers: { Authorization: `Bearer ${process.env.EVENTBRITE_TOKEN}` },
});

// 1) Fetch both id and name with expand=venue
async function fetchVenue(eventid) {
  const res = await client.get(`events/${eventid}/?expand=venue`);
  const venue = res.data.venue;
  if (!venue || !venue.id || !venue.name) {
    // missing data → caller will skip
    return null;
  }
  return {
    id: venue.id.toString(),
    name: venue.name,
  };
}

async function processEvents(eventIds = [], concurrency = 10) {
  const limit = pLimit(concurrency);
  const tasks = eventIds.map((id) => limit(() => fetchVenue(id)));
  const results = await Promise.all(tasks);
  const venues = results.filter((venue) => venue); // Removes null values

  if (venues.length) {
    const ops = venues.map(({ id, name }) => ({
      updateOne: {
        filter: { venueid: id },
        update: {
          $set: { venueName: name },
          $setOnInsert: { venueid: id },
        },
        upsert: true,
      },
    }));
    try {
      await Venue.bulkWrite(ops, { ordered: false });
      console.log(`✅ Bulk upsert complete (duplicates skipped).`);
    } catch (err) {
      // If the only errors are duplicate‐key (11000), ignore them
      const isDupKeyError = err && err.code === 11000;
      if (isDupKeyError) {
        console.log(
          `⚠️ Duplicate keys encountered (skipped), inserted/upserted others.`
        );
      } else {
        // Some other error—rethrow
        throw err;
      }
    }
  } else {
    console.log("No valid venues found.");
  }
}

module.exports = { processEvents };
