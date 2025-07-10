const { fetchTorontoNextWeek } = require("../services/eventbrite");
const Event = require("../models/event");

async function fetchAndStore() {
  let page = 1;
  let totalPages;

  do {
    const { events, pagination } = await fetchTorontoNextWeek(page);
    totalPages = pagination.page_count;

    for (const e of events) {
      const doc = {
        eventbriteId: e.id,
        name: e.name.text,
        description: e.description?.text,
        category: e.category_id,
        startTime: new Date(e.start.utc),
        endTime: new Date(e.end.utc),
        url: e.url,
        image: e.logo?.url,
        location: {
          latitude: parseFloat(e.venue?.latitude),
          longitude: parseFloat(e.venue?.longitude),
        },
        fetchedAt: new Date(),
      };

      // update if exists, insert if not
      await Event.updateOne(
        { eventbriteId: doc.eventbriteId },
        { $set: doc },
        { upsert: true }
      );
    }

    page++;
  } while (page <= totalPages);

  console.log("sync complete at", new Date().toLocaleString());
}

module.exports = { fetchAndStore };
