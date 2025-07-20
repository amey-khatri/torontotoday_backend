// services/eventbrite.js
const axios = require("axios");
const Venue = require("../models/venue");
const Event = require("../models/event"); // Add this import
const pl = require("p-limit");
const pLimit = typeof pl === "function" ? pl : pl.default;
const client = axios.create({
  baseURL: "https://www.eventbriteapi.com/v3/",
  headers: { Authorization: `Bearer ${process.env.EVENTBRITE_TOKEN}` },
});

let rateLimitHit = false;

// Fetch list of event objects for a given venue
// Returns an array of { event, venue } objects
async function fetchEventsAtVenue(venue) {
  if (rateLimitHit) {
    console.log(`Skipping venue ${venue.venueid} due to previous rate limit`);
    return [];
  }

  try {
    // Add delay between requests
    await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms delay

    const res = await client.get(`venues/${venue.venueid}/events/`);
    if (!res.data || !res.data.events) {
      console.log(`No events found for venue ${venue.venueid}`);
      return []; // Return empty array instead of throwing
    }

    // Filter events to only include those starting in the next week
    const now = new Date();
    const weekAway = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const filteredEvents = res.data.events.filter((event) => {
      const start = new Date(event.start.local);
      return start > now && start <= weekAway;
    });

    // Fetch ticket information for each event
    const events = await Promise.all(
      filteredEvents.map(async (event) => {
        try {
          const ticketResponse = await client.get(
            `events/${event.id}/ticket_classes/`
          );

          const ticketClasses = ticketResponse.data.ticket_classes;
          let price = "Free";

          if (ticketClasses && ticketClasses.length > 0) {
            const firstTicket = ticketClasses[0];
            if (firstTicket.cost && firstTicket.cost.value > 0) {
              price = `${firstTicket.cost.major_value}`;
            }
          }

          return {
            event,
            ticketInfo: { price }, // Store the processed price
            venue,
          };
        } catch (ticketErr) {
          console.warn(
            `Failed to fetch tickets for event ${event.id}:`,
            ticketErr.message
          );
          return {
            event,
            ticketInfo: { price: "Free" }, // Default to Free instead of null
            venue,
          };
        }
      })
    );

    // Fix: Correct JSON.stringify usage
    //console.log(JSON.stringify(events, null, 2));
    return events;
  } catch (err) {
    if (err.response?.status === 429) {
      console.log(
        `❌ Rate limit hit for venue ${venue.venueid}, stopping further requests...`
      );
      rateLimitHit = true; // Set flag to stop future requests
      return [];
    }
    console.error(
      `Error fetching events for venue ${venue.venueid}:`,
      err.response?.data || err.message
    );
    return [];
  }
}

// Fetch all events at all stored venues
async function fetchAllEvents(concurrency = 10) {
  rateLimitHit = false; // Reset flag at start
  const limit = pLimit(concurrency);
  const venues = await Venue.find({});

  console.log(`Found ${venues.length} venues to process.`);

  const tasks = venues.map((v) => limit(() => fetchEventsAtVenue(v)));
  const results = await Promise.all(tasks);

  // Remove null/undefined and empty arrays
  const events = results
    .filter((result) => result && Array.isArray(result) && result.length > 0)
    .flat();

  console.log(`Fetched ${events.length} events across all venues.`);

  // Display all object parameters with proper formatting
  //console.log(JSON.stringify(events, null, 2));

  // Use bulkWrite for better performance
  if (events.length > 0) {
    const bulkOps = events.map(({ event, ticketInfo, venue }) => ({
      updateOne: {
        filter: { eventbriteId: event.id },
        update: {
          $set: {
            eventbriteId: event.id,
            name: event.name.text,
            description: event.description.text,
            category: event.category_id,
            price: ticketInfo?.price || "Free",
            startTime: new Date(event.start.local),
            endTime: new Date(event.end.local),
            url: event.url,
            image: event.logo?.url || "",
            address: venue.venueAddress,
            location: {
              latitude: venue.venueLocation.latitude,
              longitude: venue.venueLocation.longitude,
            },
          },
        },
        upsert: true,
      },
    }));

    try {
      const result = await Event.bulkWrite(bulkOps);
      console.log(`Successfully processed ${events.length} events:`, {
        inserted: result.upsertedCount,
        updated: result.modifiedCount,
      });
      return result;
    } catch (err) {
      console.error("Error in bulk operation:", err.message);
      throw err;
    }
  }

  if (rateLimitHit) {
    console.log("⚠️ Execution stopped early due to rate limit");
    return { error: "Rate limit hit", processedEvents: events.length };
  }
}

module.exports = { fetchAllEvents, fetchEventsAtVenue };
