const clientIdKey = "moroccoCrewClientId";
const readyNotificationKey = "moroccoReadyNotifications";
const photoBucket = "trip-photos";

const statusOptions = [
  { value: "not-ready", label: "Not ready" },
  { value: "dressing", label: "Dressing up" },
  { value: "ready", label: "Ready" },
  { value: "on-way", label: "On the way" },
  { value: "done", label: "Done" },
];

const defaultPeople = [
  { id: "traveler-1", name: "Traveler 1", sort_order: 1 },
  { id: "traveler-2", name: "Traveler 2", sort_order: 2 },
  { id: "traveler-3", name: "Traveler 3", sort_order: 3 },
  { id: "traveler-4", name: "Traveler 4", sort_order: 4 },
  { id: "traveler-5", name: "Traveler 5", sort_order: 5 },
  { id: "traveler-6", name: "Traveler 6", sort_order: 6 },
  { id: "traveler-7", name: "Traveler 7", sort_order: 7 },
];

const defaultEvents = [
  ["arrival-marrakech", "Arrival in Marrakech", "Marrakech", "2026-08-16T19:00", "Arrival day. Eat out or find a supermarket to buy foodstuffs to cook dinner.", 60],
  ["brunch", "Brunch", "Marrakech", "2026-08-17T11:00", "Start the first full day together before heading into the city.", 45],
  ["pottery-souks", "Pottery class and souks walk", "Marrakech city", "2026-08-17T14:00", "Pottery class. Since you might be in the city, you can also walk around the souks.", 45],
  ["safran-koya", "Dinner at Safran by Koya", "Safran by Koya", "2026-08-17T21:00", "Reserved for 21:00. About 11-13 minutes by car.", 60],
  ["quad-camel", "Quad riding and camel riding", "Marrakech", "2026-08-18T10:00", "Adventure morning with quad riding and camel riding.", 60],
  ["pool-day", "Pool day at home", "Apartment", "2026-08-18T15:00", "Relaxed pool time at home before dinner.", 30],
  ["buddah-bar", "Dinner at Buddah Bar", "Buddah Bar", "2026-08-18T21:30", "Dinner at 21:30. About 11-13 minutes by car from the apartment.", 60],
  ["casablanca-trip", "Day trip to Casablanca", "Casablanca", "2026-08-19T09:00", "Day trip from Marrakech to Casablanca.", 90],
  ["morocco-mall", "Morocco Mall", "Casablanca", "2026-08-19T13:00", "Visit Morocco Mall, noted as the biggest mall in Africa.", 45],
  ["go-karting", "Go karting", "Casablanca", "2026-08-19T17:00", "Go karting after the mall stop.", 45],
  ["medina-souk", "Medina and souk market", "Marrakech Medina", "2026-08-20T11:00", "Go to the Medina and souk market.", 45],
  ["bracelet-making", "Bracelet making", "Marrakech", "2026-08-20T14:00", "Bracelet making activity.", 30],
  ["perfume-making", "Perfume making", "Marrakech", "2026-08-20T16:00", "Perfume making activity.", 30],
  ["nommos", "Dinner at Nommos Marrakech", "Nommos Marrakech", "2026-08-20T20:30", "Could not reserve yet. About 18 minutes by car.", 60],
  ["pool-games", "Pool and game day", "Apartment", "2026-08-21T13:00", "Pool and game day at home.", 30],
  ["club-night", "Club night", "Theatro or Club 555", "2026-08-21T23:30", "Club Theatro or Club 555.", 90],
  ["chill-day", "Chill day before leaving", "Apartment", "2026-08-22T11:00", "Chill day at home until leaving, if late checkout is possible.", 60],
].map(([id, title, location, startsAt, notes, alarmOffset]) => ({
  id,
  title,
  location,
  startsAt,
  notes,
  alarmOffset,
  alarmed: false,
  checkins: Object.fromEntries(defaultPeople.map((person) => [person.id, "not-ready"])),
}));

const config = window.TRIP_CONFIG || {};
const hasSupabase = Boolean(config.supabaseUrl && config.supabaseAnonKey);
const realtimeClient =
  hasSupabase && window.supabase?.createClient
    ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey)
    : null;
const clientId = getClientId();
let state = createDefaultState();
let editingEventId = null;
let realtimeChannel = null;
let realtimeReconnectTimer = null;
let deletePhotoName = "";
let pendingPhotoDeleteName = "";

const panels = {
  schedule: document.querySelector("#schedulePanel"),
  people: document.querySelector("#peoplePanel"),
  photos: document.querySelector("#photosPanel"),
  settings: document.querySelector("#settingsPanel"),
};

const eventList = document.querySelector("#eventList");
const peopleGrid = document.querySelector("#peopleGrid");
const photoGrid = document.querySelector("#photoGrid");
const photoUpload = document.querySelector("#photoUpload");
const dayFilter = document.querySelector("#dayFilter");
const toast = document.querySelector("#toast");
const form = document.querySelector("#eventForm");
const formTitle = document.querySelector("#formTitle");
const notifyButton = document.querySelector("#notifyButton");
const activeTraveler = document.querySelector("#activeTraveler");
const resetIdentityButton = document.querySelector("#resetIdentityButton");
const photoConfirmBackdrop = document.querySelector("#photoConfirmBackdrop");
const cancelPhotoDeleteButton = document.querySelector("#cancelPhotoDeleteButton");
const confirmPhotoDeleteButton = document.querySelector("#confirmPhotoDeleteButton");

function getClientId() {
  let saved = localStorage.getItem(clientIdKey);
  if (!saved) {
    saved = crypto.randomUUID();
    localStorage.setItem(clientIdKey, saved);
  }
  return saved;
}

function createDefaultState() {
  return {
    version: "supabase-ready-v1",
    activePersonId: "",
    identityLocked: false,
    people: defaultPeople.map(({ id, name }) => ({ id, name })),
    events: defaultEvents.map((event) => ({ ...event, checkins: { ...event.checkins } })),
    reservations: {},
    photos: [],
  };
}

function supabaseHeaders(prefer) {
  return {
    apikey: config.supabaseAnonKey,
    Authorization: `Bearer ${config.supabaseAnonKey}`,
    "Content-Type": "application/json",
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

async function supabaseFetch(path, options = {}) {
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      ...supabaseHeaders(options.prefer),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Supabase request failed.");
  }

  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function storageFetch(path, options = {}) {
  const headers = {
    apikey: config.supabaseAnonKey,
    Authorization: `Bearer ${config.supabaseAnonKey}`,
    ...(options.headers || {}),
  };
  const response = await fetch(`${config.supabaseUrl}/storage/v1/${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Storage request failed.");
  }

  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function refreshState({ quiet = false } = {}) {
  if (!hasSupabase) {
    if (!quiet) showToast("Add Supabase config to enable shared mode.");
    render();
    return;
  }

  try {
    const [people, events, checkins, reservations] = await Promise.all([
      supabaseFetch("people?select=*&order=sort_order.asc"),
      supabaseFetch("events?select=*&order=starts_at.asc"),
      supabaseFetch("checkins?select=*"),
      supabaseFetch("reservations?select=*"),
    ]);

    const checkinMap = {};
    checkins.forEach((row) => {
      checkinMap[row.event_id] ||= {};
      checkinMap[row.event_id][row.person_id] = row.status;
    });

    state.people = people.map((person) => ({ id: person.id, name: person.name }));
    state.events = events.map((event) => ({
      id: event.id,
      title: event.title,
      location: event.location,
      startsAt: event.starts_at,
      notes: event.notes,
      alarmOffset: event.alarm_offset,
      alarmed: event.alarmed,
      checkins: {
        ...Object.fromEntries(state.people.map((person) => [person.id, "not-ready"])),
        ...(checkinMap[event.id] || {}),
      },
    }));
    state.reservations = Object.fromEntries(reservations.map((row) => [row.person_id, row.client_id]));
    state.activePersonId = Object.entries(state.reservations).find(([, owner]) => owner === clientId)?.[0] || "";
    state.identityLocked = Boolean(state.activePersonId);
    renderTripState();
    checkReadyNotifications();
  } catch (error) {
    if (!quiet) showToast("Shared database is not reachable.");
  }
}

async function refreshPhotos({ quiet = false } = {}) {
  if (!hasSupabase) {
    state.photos = [];
    renderPhotos();
    return;
  }

  try {
    const photos = await storageFetch(`object/list/${photoBucket}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prefix: "",
        limit: 100,
        offset: 0,
        sortBy: { column: "created_at", order: "desc" },
      }),
    });

    state.photos = photos
      .filter((photo) => photo.name && !photo.name.endsWith("/"))
      .map((photo) => ({
        name: photo.name,
        createdAt: photo.created_at,
        url: `${config.supabaseUrl}/storage/v1/object/public/${photoBucket}/${encodeURIComponent(photo.name)}`,
      }));
    renderPhotos();
  } catch (error) {
    if (!quiet) showToast("Photo cloud is not reachable.");
  }
}

function sanitizeFileName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-80);
}

function isSafePhotoName(name) {
  return (
    typeof name === "string" &&
    Boolean(name.trim()) &&
    !name.includes("/") &&
    !name.includes("\\") &&
    !name.includes("..") &&
    state.photos.some((photo) => photo.name === name)
  );
}

async function uploadPhotos(files) {
  if (!hasSupabase) {
    showToast("Photo cloud needs Supabase config.");
    return;
  }

  const imageFiles = [...files].filter((file) => file.type.startsWith("image/"));
  if (!imageFiles.length) return;

  showToast(`Uploading ${imageFiles.length} photo${imageFiles.length === 1 ? "" : "s"}...`);
  for (const file of imageFiles) {
    const fileName = `${Date.now()}-${clientId.slice(0, 8)}-${sanitizeFileName(file.name) || "photo.jpg"}`;
    await storageFetch(`object/${photoBucket}/${encodeURIComponent(fileName)}`, {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "x-upsert": "false",
      },
      body: file,
    });
  }
  await refreshPhotos({ quiet: true });
  showToast("Photos uploaded.");
}

async function deletePhoto(photoName) {
  if (!hasSupabase) {
    throw new Error("Photo cloud needs Supabase config.");
  }
  if (!isSafePhotoName(photoName)) {
    throw new Error("That photo could not be deleted safely.");
  }

  await storageFetch(`object/${photoBucket}/${encodeURIComponent(photoName)}`, {
    method: "DELETE",
  });
  state.photos = state.photos.filter((photo) => photo.name !== photoName);
  renderPhotos();
}

async function downloadPhoto(photoName) {
  const photo = state.photos.find((item) => item.name === photoName);
  if (!photo || !isSafePhotoName(photoName)) {
    throw new Error("That photo could not be downloaded safely.");
  }

  if (isIosDevice()) {
    const opened = window.open(photo.url, "_blank", "noopener,noreferrer");
    if (!opened) {
      window.location.href = photo.url;
    }
    return "Image opened. Long press to save to Photos.";
  }

  const response = await fetch(photo.url);
  if (!response.ok) {
    throw new Error("Could not prepare that photo for download.");
  }

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = photo.name;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
  return "Photo download started.";
}

function isIosDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

async function claimTraveler(personId) {
  if (!hasSupabase) {
    state.activePersonId = personId;
    state.identityLocked = true;
    render();
    return;
  }

  try {
    await supabaseFetch("reservations", {
      method: "POST",
      prefer: "return=minimal",
      body: JSON.stringify({ person_id: personId, client_id: clientId }),
    });
  } catch {
    throw new Error(`${state.people.find((person) => person.id === personId)?.name || "That traveler"} is already taken.`);
  }

  await refreshState({ quiet: true });
}

async function releaseTraveler() {
  if (!hasSupabase) {
    state.activePersonId = "";
    state.identityLocked = false;
    render();
    return;
  }

  await supabaseFetch(`reservations?client_id=eq.${encodeURIComponent(clientId)}`, {
    method: "DELETE",
    prefer: "return=minimal",
  });
  await refreshState({ quiet: true });
}

async function updateCheckin(eventId, personId, status) {
  if (!hasSupabase) {
    const event = state.events.find((item) => item.id === eventId);
    event.checkins[personId] = status;
    render();
    return;
  }

  await supabaseFetch("checkins", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: JSON.stringify({ event_id: eventId, person_id: personId, status }),
  });
  await refreshState({ quiet: true });
}

async function pushEvent(event) {
  if (!hasSupabase) {
    render();
    return;
  }

  await supabaseFetch("events", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: JSON.stringify({
      id: event.id,
      title: event.title,
      location: event.location,
      starts_at: event.startsAt,
      notes: event.notes,
      alarm_offset: event.alarmOffset,
      alarmed: event.alarmed,
    }),
  });

  await supabaseFetch("checkins", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: JSON.stringify(
      state.people.map((person) => ({
        event_id: event.id,
        person_id: person.id,
        status: event.checkins[person.id] || "not-ready",
      })),
    ),
  });
  await refreshState({ quiet: true });
}

async function deleteEvent(eventId) {
  if (!hasSupabase) {
    state.events = state.events.filter((event) => event.id !== eventId);
    render();
    return;
  }

  await supabaseFetch(`events?id=eq.${encodeURIComponent(eventId)}`, {
    method: "DELETE",
    prefer: "return=minimal",
  });
  await refreshState({ quiet: true });
}

async function resetTripData() {
  if (!hasSupabase) {
    state = createDefaultState();
    render();
    return;
  }

  await Promise.all([
    supabaseFetch("reservations?person_id=neq.__none__", { method: "DELETE", prefer: "return=minimal" }),
    supabaseFetch("checkins?event_id=neq.__none__", { method: "DELETE", prefer: "return=minimal" }),
    supabaseFetch("events?id=neq.__none__", { method: "DELETE", prefer: "return=minimal" }),
  ]);
  await supabaseFetch("events", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: JSON.stringify(
      defaultEvents.map((event) => ({
        id: event.id,
        title: event.title,
        location: event.location,
        starts_at: event.startsAt,
        notes: event.notes,
        alarm_offset: event.alarmOffset,
        alarmed: event.alarmed,
      })),
    ),
  });
  await supabaseFetch("checkins", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: JSON.stringify(
      defaultEvents.flatMap((event) =>
        defaultPeople.map((person) => ({
          event_id: event.id,
          person_id: person.id,
          status: "not-ready",
        })),
      ),
    ),
  });
  await refreshState({ quiet: true });
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDay(value) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function sortedEvents() {
  return [...state.events].sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
}

function render() {
  renderTripState();
  renderPhotos();
}

function renderTripState() {
  renderActiveTraveler();
  renderDayFilter();
  renderEvents();
  renderPeople();
  renderNextEvent();
}

function getActiveTravelerId() {
  return state.people.some((person) => person.id === state.activePersonId) ? state.activePersonId : "";
}

function getActiveTravelerName() {
  const activePerson = state.people.find((person) => person.id === getActiveTravelerId());
  return activePerson?.name || "your traveler";
}

function renderActiveTraveler() {
  const selected = getActiveTravelerId();
  activeTraveler.innerHTML = [
    `<option value="">Pick your traveler</option>`,
    ...state.people.map((person, index) => {
      const owner = state.reservations?.[person.id];
      const takenBySomeoneElse = Boolean(owner && owner !== clientId);
      const label = `${index + 1}. ${person.name}${takenBySomeoneElse ? " - taken" : ""}`;
      return `<option value="${person.id}" ${person.id === selected ? "selected" : ""} ${takenBySomeoneElse ? "disabled" : ""}>${escapeHtml(label)}</option>`;
    }),
  ].join("");
  activeTraveler.value = selected;
  activeTraveler.disabled = Boolean(state.identityLocked && selected);
  resetIdentityButton.hidden = !state.identityLocked;
}

function renderDayFilter() {
  const selected = dayFilter.value || "all";
  const days = [...new Set(sortedEvents().map((event) => event.startsAt.slice(0, 10)))];
  dayFilter.innerHTML = [
    `<option value="all">All days</option>`,
    ...days.map((day) => `<option value="${day}">${formatDay(`${day}T12:00`)}</option>`),
  ].join("");
  dayFilter.value = days.includes(selected) ? selected : "all";
}

function renderEvents() {
  const selectedDay = dayFilter.value;
  const events = sortedEvents().filter(
    (event) => selectedDay === "all" || event.startsAt.startsWith(selectedDay),
  );

  eventList.innerHTML = events.length
    ? events.map(renderEventCard).join("")
    : `<div class="empty-state"><span aria-hidden="true">Plan</span><h4>No events for this day yet.</h4><p>Add a plan when the crew has something locked in.</p></div>`;
}

function renderEventCard(event) {
  const readyCount = state.people.filter((person) => event.checkins[person.id] === "ready").length;
  const doneCount = state.people.filter((person) => event.checkins[person.id] === "done").length;
  const statusPills = state.people
    .map((person) => {
      const status = event.checkins[person.id] || "not-ready";
      const option = statusOptions.find((item) => item.value === status);
      const className = ` status-${status}`;
      return `<span class="status-pill${className}">${escapeHtml(person.name)}: ${option.label}</span>`;
    })
    .join("");

  const checkins = state.people
    .map((person) => {
      const isActivePerson = Boolean(state.identityLocked && person.id === getActiveTravelerId());
      const options = statusOptions
        .map((option) => {
          const selected = (event.checkins[person.id] || "not-ready") === option.value ? "selected" : "";
          return `<option value="${option.value}" ${selected}>${option.label}</option>`;
        })
        .join("");

      return `
        <label class="checkin-card status-${event.checkins[person.id] || "not-ready"}${isActivePerson ? " active-traveler" : " locked-traveler"}">
          <strong>${escapeHtml(person.name)}</strong>
          <select data-action="checkin" data-event-id="${event.id}" data-person-id="${person.id}" ${isActivePerson ? "" : "disabled"}>
            ${options}
          </select>
          ${isActivePerson ? `<span class="checkin-note">Your status</span>` : `<span class="checkin-note">${state.identityLocked ? "Locked on this device" : "Pick your traveler first"}</span>`}
        </label>
      `;
    })
    .join("");

  return `
    <article class="event-card">
      <div class="event-time">
        <span class="event-day">${formatDay(event.startsAt)}</span>
        <strong>${new Date(event.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</strong>
        <label>
          Alarm
          <select data-action="alarm" data-event-id="${event.id}">
            ${[15, 30, 45, 60, 90, 120]
              .map((minutes) => `<option value="${minutes}" ${event.alarmOffset === minutes ? "selected" : ""}>${minutes} min before</option>`)
              .join("")}
          </select>
        </label>
      </div>
      <div>
        <div class="event-title-row">
          <div>
            <h4>${escapeHtml(event.title)}</h4>
            <p class="event-meta">${escapeHtml(event.location || "Location not set")}</p>
          </div>
          <div class="event-actions">
            <button class="icon-button" type="button" data-action="edit" data-event-id="${event.id}">Edit</button>
            <button class="icon-button" type="button" data-action="delete" data-event-id="${event.id}">Delete</button>
          </div>
        </div>
        <p>${escapeHtml(event.notes || "No notes yet.")}</p>
        <div class="ready-summary" aria-label="Readiness summary">
          <span class="status-pill status-ready">${readyCount}/${state.people.length} ready</span>
          <span class="status-pill status-done">${doneCount}/${state.people.length} done</span>
          ${statusPills}
        </div>
        <div class="checkin-grid">${checkins}</div>
      </div>
    </article>
  `;
}

function renderPeople() {
  peopleGrid.innerHTML = state.people
    .map(
      (person, index) => `
        <div class="person-card">
          <p class="eyebrow">Traveler ${index + 1}</p>
          <strong>${escapeHtml(person.name)}</strong>
          <span class="${state.reservations?.[person.id] ? "claimed" : "open"}">${state.reservations?.[person.id] ? "Claimed" : "Open"}</span>
        </div>
      `,
    )
    .join("");
}

function renderPhotos() {
  if (!photoGrid) return;
  if (!hasSupabase) {
    photoGrid.innerHTML = `<div class="empty-state"><span aria-hidden="true">Cloud</span><h4>Photo cloud is waiting.</h4><p>Connect Supabase to share trip photos here.</p></div>`;
    return;
  }
  if (!state.photos?.length) {
    photoGrid.innerHTML = `<div class="empty-state"><span aria-hidden="true">Gallery</span><h4>No trip photos yet.</h4><p>Upload the first memory and everyone can save it.</p></div>`;
    return;
  }

  photoGrid.innerHTML = state.photos
    .map(
      (photo) => `
        <article class="photo-card">
          <a class="photo-link" href="${photo.url}" target="_blank" rel="noreferrer" aria-label="Open ${escapeAttribute(photo.name)}">
            <img src="${photo.url}" alt="Trip photo" loading="lazy" />
          </a>
          <span>${escapeHtml(photo.name)}</span>
          <div class="photo-actions">
            <button class="secondary-button photo-action" type="button" data-action="download-photo" data-photo-name="${escapeAttribute(photo.name)}">Download</button>
            <button class="danger-button photo-action" type="button" data-action="delete-photo" data-photo-name="${escapeAttribute(photo.name)}" ${deletePhotoName === photo.name ? "disabled" : ""}>
              ${deletePhotoName === photo.name ? "Deleting..." : "Delete"}
            </button>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderNextEvent() {
  const now = Date.now();
  const next = sortedEvents().find((event) => new Date(event.startsAt).getTime() >= now);
  document.querySelector("#nextEventTitle").textContent = next?.title || "Trip complete";
  document.querySelector("#nextEventTime").textContent = next ? formatDateTime(next.startsAt) : "No upcoming plans";
  document.querySelector("#nextCountdown").textContent = next ? getCountdown(next.startsAt) : "Done";
}

function getCountdown(value) {
  const diff = new Date(value).getTime() - Date.now();
  if (diff <= 0) return "Now";
  const minutes = Math.floor(diff / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function openPhotoDeleteConfirm(photoName) {
  pendingPhotoDeleteName = photoName;
  photoConfirmBackdrop.hidden = false;
  requestAnimationFrame(() => photoConfirmBackdrop.classList.add("show"));
  confirmPhotoDeleteButton.focus();
}

function closePhotoDeleteConfirm() {
  pendingPhotoDeleteName = "";
  photoConfirmBackdrop.classList.remove("show");
  window.setTimeout(() => {
    if (!photoConfirmBackdrop.classList.contains("show")) {
      photoConfirmBackdrop.hidden = true;
    }
  }, 180);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function switchTab(tab) {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tab);
  });
  Object.entries(panels).forEach(([key, panel]) => {
    panel.classList.toggle("active", key === tab);
  });
}

function editEvent(eventId) {
  const event = state.events.find((item) => item.id === eventId);
  if (!event) return;
  editingEventId = eventId;
  formTitle.textContent = "Edit Event";
  document.querySelector("#eventTitle").value = event.title;
  document.querySelector("#eventLocation").value = event.location;
  document.querySelector("#eventDateTime").value = event.startsAt;
  document.querySelector("#eventNotes").value = event.notes;
  switchTab("settings");
}

function clearForm() {
  editingEventId = null;
  formTitle.textContent = "Add Event";
  form.reset();
}

function playAlarmSound() {
  const audioContext = new AudioContext();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(660, audioContext.currentTime);
  oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.18);
  gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.2, audioContext.currentTime + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.75);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.8);
}

function checkAlarms() {
  const now = Date.now();
  state.events.forEach((event) => {
    const alarmAt = new Date(event.startsAt).getTime() - event.alarmOffset * 60000;
    const eventAt = new Date(event.startsAt).getTime();
    if (!event.alarmed && now >= alarmAt && now <= eventAt + 60000) {
      event.alarmed = true;
      const message = `${event.title} starts in ${event.alarmOffset} minutes.`;
      showToast(message);
      playAlarmSound();
      if (Notification.permission === "granted") {
        new Notification("Morocco Crew alarm", { body: message });
      }
    }
  });
}

function getReadyNotifications() {
  try {
    return JSON.parse(localStorage.getItem(readyNotificationKey)) || [];
  } catch {
    return [];
  }
}

function saveReadyNotifications(ids) {
  localStorage.setItem(readyNotificationKey, JSON.stringify([...new Set(ids)]));
}

function checkReadyNotifications() {
  const notified = getReadyNotifications();
  let changed = false;
  state.events.forEach((event) => {
    const everyoneReady =
      state.people.length > 0 && state.people.every((person) => event.checkins[person.id] === "ready");
    if (everyoneReady && !notified.includes(event.id)) {
      const message = `Everybody is ready for ${event.title}.`;
      showToast(message);
      if (Notification.permission === "granted") {
        new Notification("Morocco Crew", { body: message });
      }
      notified.push(event.id);
      changed = true;
    }
  });
  if (changed) saveReadyNotifications(notified);
}

document.querySelectorAll(".tab-button").forEach((button) => {
  button.addEventListener("click", () => switchTab(button.dataset.tab));
});

document.querySelector("#addEventButton").addEventListener("click", () => {
  clearForm();
  switchTab("settings");
  document.querySelector("#eventTitle").focus();
});

document.querySelector("#cancelEditButton").addEventListener("click", clearForm);

dayFilter.addEventListener("change", renderEvents);

activeTraveler.addEventListener("change", async (event) => {
  if (!event.target.value) return;
  try {
    await claimTraveler(event.target.value);
    showToast(`This device is locked to ${getActiveTravelerName()}.`);
  } catch (error) {
    await refreshState({ quiet: true });
    showToast(error.message);
  }
});

resetIdentityButton.addEventListener("click", async () => {
  try {
    await releaseTraveler();
    showToast("Pick the correct traveler for this device.");
  } catch (error) {
    showToast(error.message);
  }
});

notifyButton.addEventListener("click", async () => {
  if (!("Notification" in window)) {
    showToast("This browser does not support notifications.");
    return;
  }
  const permission = await Notification.requestPermission();
  showToast(permission === "granted" ? "Notifications enabled for this browser." : "Notifications were not enabled.");
});

photoUpload.addEventListener("change", async (event) => {
  try {
    await uploadPhotos(event.target.files);
  } catch (error) {
    showToast(error.message);
  } finally {
    photoUpload.value = "";
  }
});

cancelPhotoDeleteButton.addEventListener("click", closePhotoDeleteConfirm);

photoConfirmBackdrop.addEventListener("click", (event) => {
  if (event.target === photoConfirmBackdrop) closePhotoDeleteConfirm();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !photoConfirmBackdrop.hidden) {
    closePhotoDeleteConfirm();
  }
});

confirmPhotoDeleteButton.addEventListener("click", async () => {
  const photoName = pendingPhotoDeleteName;
  if (!photoName) return;
  try {
    deletePhotoName = photoName;
    confirmPhotoDeleteButton.disabled = true;
    confirmPhotoDeleteButton.textContent = "Deleting...";
    closePhotoDeleteConfirm();
    renderPhotos();
    await deletePhoto(photoName);
    showToast("Photo deleted.");
    await refreshPhotos({ quiet: true });
  } catch (error) {
    showToast(error.message);
  } finally {
    deletePhotoName = "";
    confirmPhotoDeleteButton.disabled = false;
    confirmPhotoDeleteButton.textContent = "Delete photo";
    renderPhotos();
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const eventData = {
    id: editingEventId || crypto.randomUUID(),
    title: document.querySelector("#eventTitle").value.trim(),
    location: document.querySelector("#eventLocation").value.trim(),
    startsAt: document.querySelector("#eventDateTime").value,
    notes: document.querySelector("#eventNotes").value.trim(),
    alarmOffset: editingEventId
      ? state.events.find((item) => item.id === editingEventId)?.alarmOffset || 30
      : 30,
    alarmed: false,
    checkins: editingEventId
      ? state.events.find((item) => item.id === editingEventId)?.checkins || {}
      : Object.fromEntries(state.people.map((person) => [person.id, "not-ready"])),
  };

  state.events = editingEventId
    ? state.events.map((item) => (item.id === editingEventId ? eventData : item))
    : [...state.events, eventData];

  clearForm();
  switchTab("schedule");
  try {
    await pushEvent(eventData);
    showToast(editingEventId ? "Event updated." : "Event added.");
  } catch (error) {
    showToast(error.message);
  }
});

document.querySelector("#resetButton").addEventListener("click", async () => {
  clearForm();
  try {
    await resetTripData();
    showToast("Trip data restored.");
  } catch (error) {
    showToast(error.message);
  }
});

document.body.addEventListener("change", async (event) => {
  const target = event.target;
  const action = target.dataset.action;
  if (action === "checkin") {
    if (!state.identityLocked || target.dataset.personId !== getActiveTravelerId()) {
      render();
      showToast(state.identityLocked ? `This device is locked to ${getActiveTravelerName()}.` : "Pick your traveler first.");
      return;
    }
    try {
      await updateCheckin(target.dataset.eventId, target.dataset.personId, target.value);
    } catch (error) {
      await refreshState({ quiet: true });
      showToast(error.message);
    }
  }
  if (action === "alarm") {
    const tripEvent = state.events.find((item) => item.id === target.dataset.eventId);
    tripEvent.alarmOffset = Number(target.value);
    tripEvent.alarmed = false;
    await pushEvent(tripEvent).catch((error) => showToast(error.message));
  }
});

document.body.addEventListener("click", async (event) => {
  const target = event.target.closest("button");
  if (!target) return;
  const action = target.dataset.action;
  if (action === "edit") {
    editEvent(target.dataset.eventId);
  }
  if (action === "delete") {
    try {
      await deleteEvent(target.dataset.eventId);
      showToast("Event deleted.");
    } catch (error) {
      showToast(error.message);
    }
  }
  if (action === "download-photo") {
    const photoName = target.dataset.photoName || "";
    const originalText = target.textContent;
    try {
      target.disabled = true;
      target.textContent = "Preparing...";
      const message = await downloadPhoto(photoName);
      showToast(message);
    } catch (error) {
      showToast(error.message);
    } finally {
      target.disabled = false;
      target.textContent = originalText;
    }
  }
  if (action === "delete-photo") {
    const photoName = target.dataset.photoName || "";
    openPhotoDeleteConfirm(photoName);
  }
});

function scheduleRealtimeReconnect() {
  if (realtimeReconnectTimer || !realtimeClient) return;
  realtimeReconnectTimer = window.setTimeout(() => {
    realtimeReconnectTimer = null;
    setupRealtime();
  }, 5000);
}

function setupRealtime() {
  if (!realtimeClient) return;

  if (realtimeChannel) {
    realtimeClient.removeChannel(realtimeChannel);
  }

  const refreshFromRealtime = () => refreshState({ quiet: true });
  const refreshPhotosFromRealtime = () => refreshPhotos({ quiet: true });
  realtimeChannel = realtimeClient
    .channel("morocco-trip-live-state")
    .on("postgres_changes", { event: "*", schema: "public", table: "checkins" }, refreshFromRealtime)
    .on("postgres_changes", { event: "*", schema: "public", table: "reservations" }, refreshFromRealtime)
    .on("postgres_changes", { event: "*", schema: "public", table: "events" }, refreshFromRealtime)
    .on("postgres_changes", { event: "*", schema: "public", table: "people" }, refreshFromRealtime)
    .on(
      "postgres_changes",
      { event: "*", schema: "storage", table: "objects", filter: `bucket_id=eq.${photoBucket}` },
      refreshPhotosFromRealtime,
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") return;
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        showToast("Live updates paused. Backup refresh is still running.");
        scheduleRealtimeReconnect();
      }
    });
}

render();
setupRealtime();
refreshState();
refreshPhotos();
window.setInterval(() => {
  refreshState({ quiet: true });
  refreshPhotos({ quiet: true });
  renderNextEvent();
  checkAlarms();
}, 30000);
