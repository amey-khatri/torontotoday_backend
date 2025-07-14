// services/eventbrite.js
const axios = require("axios");
const Venue = require("../models/venue");
const client = axios.create({
  baseURL: "https://www.eventbriteapi.com/v3/",
  headers: { Authorization: `Bearer ${process.env.EVENTBRITE_TOKEN}` },
});

// /**
//  * Fetch all events within a date range.
//  */
// async function fetchAllEvents(page = 1) {
//   const now = new Date().toISOString();
//   const weekOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

//   try {
//     const res = await client.get("events/", {
//       params: {
//         "start_date.range_start": now,
//         "start_date.range_end": weekOut,
//         page: page,
//         page_size: 50,
//         expand: "venue, category",
//       },
//     });

//     return res.data; // { events: [...], pagination: {...} }
//   } catch (err) {
//     console.error(
//       "Error fetching Eventbrite events:",
//       err.response?.data || err.message
//     );
//     throw err;
//   }
// }

async function fetchEventsAtVenue(venueid) {
  try {
    const res = await client.get(`venues/${venueid}/events/`);
    if (!res.data || !res.data.events) {
      throw new Error(`No events found for venue ${venueid}`);
    }

    // Filter events to only include those starting in the next week
    const now = new Date();
    const weekAway = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    res.data.events = res.data.events.filter((event) => {
      const start = new Date(event.start.local);
      return start > now && start <= weekAway;
    });

    return res.data; // { events: [...], pagination: {...} }
  } catch (err) {
    console.error(
      `Error fetching events for venue ${venueid}:`,
      err.response?.data || err.message
    );
    throw err;
  }
}

/**
 * Fetch and filter events by Toronto location
 */
async function fetchAllEvents() {
  const venues = await Venue.find({}, "venueid");
  const venueIds = venues.map((v) => v.venueid);

  for (const venueid of venueIds) {
    try {
      const data = await fetchEventsAtVenue(venueid);
      data.events.forEach((event) => {
        console.log(
          `${event.name.text} - ${event.start.local} to ${event.end.local}`
        );
      });
      //return data.events; // Return the first set of events found
    } catch (err) {
      console.error(`Failed to fetch events for venue ${venueid}:`, err);
    }
  }
}

module.exports = { fetchAllEvents };
