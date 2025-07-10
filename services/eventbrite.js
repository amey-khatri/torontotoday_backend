const axios = require("axios");
const client = axios.create({
  // include the trailing slash here
  baseURL: "https://www.eventbriteapi.com/v3/",
  headers: { Authorization: `Bearer ${process.env.EVENTBRITE_TOKEN}` },
});

async function fetchTorontoNextWeek(page = 1) {
  try {
    const now = new Date().toISOString();
    const weekOut = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    // drop the leading slash here
    const res = await client.get("events/search/", {
      params: {
        page,
        page_size: 50,
        "location.address": "Toronto",
        "start_date.range_start": now,
        "start_date.range_end": weekOut,
      },
    });

    return res.data; // { events, pagination, … }
  } catch (err) {
    console.error(
      "Eventbrite fetch error:",
      err.response?.status,
      err.response?.data
    );
    throw err;
  }
}

module.exports = { fetchTorontoNextWeek };
