// services/eventbrite.js
const axios = require("axios");
const Event = require("../models/event"); // Add this import
const Event_ids = require("../models/event_id"); // Add this import
const pl = require("p-limit");
const pLimit = typeof pl === "function" ? pl : pl.default;
const client = axios.create({
  baseURL: "https://www.eventbriteapi.com/v3/",
  headers: { Authorization: `Bearer ${process.env.EVENTBRITE_TOKEN}` },
});

let rateLimitHit = false;

const categoryMap = {
  103: "Music",
  101: "Business & Professional",
  110: "Food & Drink",
  113: "Community & Culture",
  105: "Performing & Visual Arts",
  104: "Film, Media & Entertainment",
  108: "Sports & Fitness",
  107: "Health & Wellness",
  102: "Science & Technology",
  109: "Travel & Outdoor",
  111: "Charity & Causes",
  114: "Religion & Spirituality",
  115: "Family & Education",
  116: "Seasonal & Holiday",
  112: "Government & Politics",
  106: "Fashion & Beauty",
  117: "Home & Lifestyle",
  118: "Auto, Boat & Air",
  119: "Hobbies & Special Interest",
  199: "Other",
  120: "School Activities",
};

// Returns an array of { event, venue } objects
async function fetchEventData(event_scraped) {
  const event_id =
    event_scraped?.ev_id ||
    event_scraped?.eventid ||
    event_scraped?.event_id ||
    event_scraped?.id;

  if (!event_id) {
    console.warn("Skipping record without event id:", event_scraped?._id);
    return null;
  }
  if (rateLimitHit) {
    console.log(`Skipping event ${event_id} due to previous rate limit`);
    return null;
  }

  try {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const res = await client.get(
      `events/${event_id}/?expand=venue,organizer,ticket_availability,category,format`
    );
    const event = res.data;

    let price = 0;
    const t = event.ticket_availability;
    if (t) {
      if (t.is_sold_out) {
        price = "Sold Out";
      } else if (t.minimum_ticket_price && t.maximum_ticket_price) {
        price =
          t.minimum_ticket_price.value !== t.maximum_ticket_price.value
            ? `${t.minimum_ticket_price.major_value} - ${t.maximum_ticket_price.major_value}`
            : `${t.minimum_ticket_price.major_value}`;
      }
    }
    return { event, price };
  } catch (err) {
    if (err.response?.status === 429) {
      console.log(
        `❌ Rate limit hit for event ${event_id}, stopping further requests...`
      );
      rateLimitHit = true;
      return null;
    }
    console.error(
      `Error fetching event ${event_id}:`,
      err.response?.data || err.message
    );
    return null;
  }
}

async function removeOutofBoundsEvents() {
  const now = new Date();
  const twoWeeksAway = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  try {
    const result = await Event.deleteMany({
      $or: [
        { startTime: { $lt: now } }, // Past events
        { startTime: { $gt: twoWeeksAway } }, // Beyond 2 weeks
      ],
    });
    console.log(`Removed ${result.deletedCount} out-of-bounds events`);
    return result;
  } catch (err) {
    console.error("Error removing out-of-bounds events:", err.message);
    throw err;
  }
}

async function fetchAllEvents(concurrency = 10) {
  rateLimitHit = false;
  const limit = pLimit(concurrency);
  const eventIDS = await Event_ids.find({});
  console.log(`Found ${eventIDS.length} events to process.`);

  await removeOutofBoundsEvents();

  const tasks = eventIDS.map((e) => limit(() => fetchEventData(e)));
  const results = await Promise.all(tasks);

  // Keep only successful objects
  const events = results.filter((r) => r && r.event);
  console.log(`Fetched ${events.length} events across all venues.`);

  // Only process events happening within the next 2 weeks
  const now = new Date();
  const twoWeeksAway = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const inWindow = events.filter(({ event }) => {
    const startStr = event.start?.local;
    if (!startStr) return false;
    const start = new Date(startStr);
    return !isNaN(start) && start >= now && start <= twoWeeksAway;
  });

  console.log(`Processing ${inWindow.length} events within next 2 weeks.`);

  if (inWindow.length > 0) {
    const bulkOps = inWindow.map(({ event, price }) => {
      const category =
        event.category?.name || categoryMap[event.category_id] || "Other";
      const address = event.venue?.address?.localized_address_display || "";
      const venueName = event.venue?.name || "";
      const latitude = Number(event.venue?.latitude) || 0;
      const longitude = Number(event.venue?.longitude) || 0;

      return {
        updateOne: {
          filter: { eventbriteId: event.id },
          update: {
            $set: {
              eventbriteId: event.id,
              name: event.name?.text || "",
              description: event.description?.text || "",
              category,
              price: price || "0.00",
              startTime: event.start?.local
                ? new Date(event.start.local)
                : undefined,
              endTime: event.end?.local ? new Date(event.end.local) : undefined,
              url: event.url,
              image:
                event.logo?.url ||
                "https://redthread.uoregon.edu/files/original/affd16fd5264cab9197da4cd1a996f820e601ee4.png",
              address,
              venueName,
              location: { latitude, longitude },
              fetchedAt: now,
              organizer: event.organizer?.name || "",
              format: event.format?.name || "",
            },
          },
          upsert: true,
        },
      };
    });

    // Drop any ops missing required fields
    const safeOps = bulkOps.filter(
      (op) =>
        op.updateOne.filter.eventbriteId &&
        op.updateOne.update.$set.startTime &&
        op.updateOne.update.$set.endTime
    );

    const result = await Event.bulkWrite(safeOps);
    console.log(`Successfully processed ${safeOps.length} events:`, {
      inserted: result.upsertedCount,
      updated: result.modifiedCount,
    });
    return result;
  }

  if (rateLimitHit) {
    console.log("⚠️ Execution stopped early due to rate limit");
    return { error: "Rate limit hit", processedEvents: events.length };
  }
}

module.exports = { fetchAllEvents };
