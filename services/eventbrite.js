// services/eventbrite.js
const axios = require("axios");
const client = axios.create({
  baseURL: "https://www.eventbriteapi.com/v3/",
  headers: { Authorization: `Bearer ${process.env.EVENTBRITE_TOKEN}` },
});

/**
 * Fetch all events within a date range.
 */
async function fetchAllEvents(page = 1) {
  const now = new Date().toISOString();
  const weekOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const res = await client.get("events/", {
      params: {
        "start_date.range_start": now,
        "start_date.range_end": weekOut,
        page: page,
        page_size: 50,
        expand: "venue, category",
      },
    });

    return res.data; // { events: [...], pagination: {...} }
  } catch (err) {
    console.error(
      "Error fetching Eventbrite events:",
      err.response?.data || err.message
    );
    throw err;
  }
}

/**
 * Fetch and filter events by Toronto location
 */
async function fetchTorontoEvents(page = 1) {
  const { events, pagination } = await fetchAllEvents(page);

  const torontoEvents = events.filter((event) => {
    return event.venue.city === "Toronto";
  });

  return { torontoEvents, pagination };
}

module.exports = { fetchTorontoEvents };
