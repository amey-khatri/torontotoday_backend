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
  try {
    const res = await client.get(`events/${eventid}/?expand=venue`);
    const venue = res.data.venue;

    if (!venue || !venue.id || !venue.name) {
      console.log(`⚠️ Incomplete venue data for event ${eventid}, skipping...`);
      return null;
    }

    console.log(`✅ Fetched venue for event ${eventid}: ${venue.name}`);

    return {
      id: venue.id.toString(),
      name: venue.name,
      address:
        venue.address?.localized_address_display || "Address not available",
      location: {
        latitude: venue.latitude || 0,
        longitude: venue.longitude || 0,
      },
    };
  } catch (err) {
    const status = err.response?.status;
    const errorMessage = err.response?.data?.error_description || err.message;

    // Handle specific error cases without stopping execution
    if (status === 400) {
      console.log(`❌ Bad request for event ${eventid}: ${errorMessage}`);
    } else if (status === 401) {
      console.log(
        `❌ Unauthorized access for event ${eventid}: ${errorMessage}`
      );
    } else if (status === 403) {
      console.log(`❌ Forbidden access for event ${eventid}: ${errorMessage}`);
    } else if (status === 404) {
      console.log(`❌ Event ${eventid} not found: ${errorMessage}`);
    } else if (status === 429) {
      console.log(`❌ Rate limit hit for event ${eventid}, skipping...`);
    } else {
      console.log(
        `❌ Error fetching venue for event ${eventid}: ${errorMessage}`
      );
    }

    // Return null so this event gets filtered out
    return null;
  }
}

async function processEvents(eventIds = [], concurrency = 5) {
  // Reduced concurrency to avoid rate limits
  const limit = pLimit(concurrency);
  const tasks = eventIds.map((id) => limit(() => fetchVenue(id)));
  const results = await Promise.all(tasks);

  // Filter out null values (failed requests)
  const venues = results.filter((venue) => venue);

  console.log(
    `✅ Successfully fetched ${venues.length} out of ${eventIds.length} venues`
  );

  if (venues.length) {
    const ops = venues.map(({ id, name, address, location }) => ({
      updateOne: {
        filter: { venueid: id },
        update: {
          $set: {
            venueName: name,
            venueAddress: address,
            venueLocation: location,
          },
          $setOnInsert: { venueid: id },
        },
        upsert: true,
      },
    }));

    try {
      const result = await Venue.bulkWrite(ops, { ordered: false });
      console.log(`✅ Bulk upsert complete:`, {
        upserted: result.upsertedCount,
        modified: result.modifiedCount,
        matched: result.matchedCount,
      });
    } catch (err) {
      // If the only errors are duplicate‐key (11000), ignore them
      const isDupKeyError = err && err.code === 11000;
      if (isDupKeyError) {
        console.log(
          `⚠️ Duplicate keys encountered (skipped), inserted/upserted others.`
        );
      } else {
        // Some other error—rethrow
        console.error("❌ Bulk write error:", err.message);
        throw err;
      }
    }
  } else {
    console.log("❌ No valid venues found from the provided event IDs.");
  }
}

module.exports = { processEvents };
