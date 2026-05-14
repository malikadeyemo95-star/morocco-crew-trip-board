const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

const port = Number(process.env.PORT || 4200);
const host = process.env.HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");
const root = __dirname;
const dataFile = process.env.DATA_FILE || path.join(root, "trip-state.json");

const people = [
  "Traveler 1",
  "Traveler 2",
  "Traveler 3",
  "Traveler 4",
  "Traveler 5",
  "Traveler 6",
  "Traveler 7",
].map((name) => ({ id: randomUUID(), name }));

const events = [
  ["Arrival in Marrakech", "Marrakech", "2026-08-16T19:00", "Arrival day. Eat out or find a supermarket to buy foodstuffs to cook dinner.", 60],
  ["Brunch", "Marrakech", "2026-08-17T11:00", "Start the first full day together before heading into the city.", 45],
  ["Pottery class and souks walk", "Marrakech city", "2026-08-17T14:00", "Pottery class. Since you might be in the city, you can also walk around the souks.", 45],
  ["Dinner at Safran by Koya", "Safran by Koya", "2026-08-17T21:00", "Reserved for 21:00. About 11-13 minutes by car.", 60],
  ["Quad riding and camel riding", "Marrakech", "2026-08-18T10:00", "Adventure morning with quad riding and camel riding.", 60],
  ["Pool day at home", "Apartment", "2026-08-18T15:00", "Relaxed pool time at home before dinner.", 30],
  ["Dinner at Buddah Bar", "Buddah Bar", "2026-08-18T21:30", "Dinner at 21:30. About 11-13 minutes by car from the apartment.", 60],
  ["Day trip to Casablanca", "Casablanca", "2026-08-19T09:00", "Day trip from Marrakech to Casablanca.", 90],
  ["Morocco Mall", "Casablanca", "2026-08-19T13:00", "Visit Morocco Mall, noted as the biggest mall in Africa.", 45],
  ["Go karting", "Casablanca", "2026-08-19T17:00", "Go karting after the mall stop.", 45],
  ["Medina and souk market", "Marrakech Medina", "2026-08-20T11:00", "Go to the Medina and souk market.", 45],
  ["Bracelet making", "Marrakech", "2026-08-20T14:00", "Bracelet making activity.", 30],
  ["Perfume making", "Marrakech", "2026-08-20T16:00", "Perfume making activity.", 30],
  ["Dinner at Nommos Marrakech", "Nommos Marrakech", "2026-08-20T20:30", "Could not reserve yet. About 18 minutes by car.", 60],
  ["Pool and game day", "Apartment", "2026-08-21T13:00", "Pool and game day at home.", 30],
  ["Club night", "Theatro or Club 555", "2026-08-21T23:30", "Club Theatro or Club 555.", 90],
  ["Chill day before leaving", "Apartment", "2026-08-22T11:00", "Chill day at home until leaving, if late checkout is possible.", 60],
].map(([title, location, startsAt, notes, alarmOffset]) => ({
  id: randomUUID(),
  title,
  location,
  startsAt,
  notes,
  alarmOffset,
  checkins: Object.fromEntries(people.map((person) => [person.id, "not-ready"])),
  alarmed: false,
}));

function createState() {
  return {
    version: "shared-v1",
    people,
    events,
    reservations: {},
  };
}

function loadState() {
  if (!fs.existsSync(dataFile)) {
    return createState();
  }

  try {
    return JSON.parse(fs.readFileSync(dataFile, "utf8"));
  } catch {
    return createState();
  }
}

let state = loadState();

function saveState() {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  fs.writeFileSync(dataFile, JSON.stringify(state, null, 2));
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(payload));
}

function parseBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Body too large"));
      }
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

function publicState(clientId) {
  return {
    ...state,
    activePersonId: Object.entries(state.reservations).find(([, owner]) => owner === clientId)?.[0] || "",
    identityLocked: Object.values(state.reservations).includes(clientId),
  };
}

function serveFile(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const pathname = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(root, pathname));

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    const ext = path.extname(filePath);
    const types = {
      ".html": "text/html",
      ".css": "text/css",
      ".js": "text/javascript",
      ".json": "application/json",
    };
    response.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    response.end(data);
  });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const clientId = request.headers["x-client-id"] || "";

  try {
    if (url.pathname === "/api/state" && request.method === "GET") {
      sendJson(response, 200, publicState(clientId));
      return;
    }

    if (url.pathname === "/api/claim" && request.method === "POST") {
      const body = await parseBody(request);
      const person = state.people.find((item) => item.id === body.personId);
      if (!person) {
        sendJson(response, 404, { error: "Traveler not found." });
        return;
      }

      const existingOwner = state.reservations[body.personId];
      if (existingOwner && existingOwner !== body.clientId) {
        sendJson(response, 409, { error: `${person.name} is already taken.` });
        return;
      }

      Object.entries(state.reservations).forEach(([personId, owner]) => {
        if (owner === body.clientId) {
          delete state.reservations[personId];
        }
      });
      state.reservations[body.personId] = body.clientId;
      saveState();
      sendJson(response, 200, publicState(body.clientId));
      return;
    }

    if (url.pathname === "/api/release" && request.method === "POST") {
      const body = await parseBody(request);
      Object.entries(state.reservations).forEach(([personId, owner]) => {
        if (owner === body.clientId) {
          delete state.reservations[personId];
        }
      });
      saveState();
      sendJson(response, 200, publicState(body.clientId));
      return;
    }

    if (url.pathname === "/api/checkin" && request.method === "POST") {
      const body = await parseBody(request);
      if (state.reservations[body.personId] !== body.clientId) {
        sendJson(response, 403, { error: "This traveler is not claimed by your device." });
        return;
      }

      const tripEvent = state.events.find((item) => item.id === body.eventId);
      if (!tripEvent) {
        sendJson(response, 404, { error: "Event not found." });
        return;
      }

      tripEvent.checkins[body.personId] = body.status;
      saveState();
      sendJson(response, 200, publicState(body.clientId));
      return;
    }

    if (url.pathname === "/api/update" && request.method === "POST") {
      const body = await parseBody(request);
      if (Array.isArray(body.people)) state.people = body.people;
      if (Array.isArray(body.events)) state.events = body.events;
      saveState();
      sendJson(response, 200, publicState(body.clientId));
      return;
    }

    if (url.pathname === "/api/reset" && request.method === "POST") {
      state = createState();
      saveState();
      sendJson(response, 200, publicState(clientId));
      return;
    }
  } catch (error) {
    sendJson(response, 500, { error: error.message });
    return;
  }

  serveFile(request, response);
});

server.listen(port, host, () => {
  console.log(`Morocco Crew app running at http://${host}:${port}`);
});
