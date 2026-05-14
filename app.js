const itineraryVersion = "morocco-pdf-v2";
const clientIdKey = "moroccoCrewClientId";

const statusOptions = [
  { value: "not-ready", label: "Not ready" },
  { value: "dressing", label: "Dressing up" },
  { value: "ready", label: "Ready" },
  { value: "on-way", label: "On the way" },
  { value: "done", label: "Done" },
];

const sampleEvents = [
  {
    title: "Arrival in Marrakech",
    location: "Marrakech",
    startsAt: "2026-08-16T19:00",
    notes: "Arrival day. Eat out or find a supermarket to buy foodstuffs to cook dinner.",
    alarmOffset: 60,
  },
  {
    title: "Brunch",
    location: "Marrakech",
    startsAt: "2026-08-17T11:00",
    notes: "Start the first full day together before heading into the city.",
    alarmOffset: 45,
  },
  {
    title: "Pottery class and souks walk",
    location: "Marrakech city",
    startsAt: "2026-08-17T14:00",
    notes: "Pottery class. Since you might be in the city, you can also walk around the souks.",
    alarmOffset: 45,
  },
  {
    title: "Dinner at Safran by Koya",
    location: "Safran by Koya",
    startsAt: "2026-08-17T21:00",
    notes: "Reserved for 21:00. About 11-13 minutes by car.",
    alarmOffset: 60,
  },
  {
    title: "Quad riding and camel riding",
    location: "Marrakech",
    startsAt: "2026-08-18T10:00",
    notes: "Adventure morning with quad riding and camel riding.",
    alarmOffset: 60,
  },
  {
    title: "Pool day at home",
    location: "Apartment",
    startsAt: "2026-08-18T15:00",
    notes: "Relaxed pool time at home before dinner.",
    alarmOffset: 30,
  },
  {
    title: "Dinner at Buddah Bar",
    location: "Buddah Bar",
    startsAt: "2026-08-18T21:30",
    notes: "Dinner at 21:30. About 11-13 minutes by car from the apartment.",
    alarmOffset: 60,
  },
  {
    title: "Day trip to Casablanca",
    location: "Casablanca",
    startsAt: "2026-08-19T09:00",
    notes: "Day trip from Marrakech to Casablanca.",
    alarmOffset: 90,
  },
  {
    title: "Morocco Mall",
    location: "Casablanca",
    startsAt: "2026-08-19T13:00",
    notes: "Visit Morocco Mall, noted as the biggest mall in Africa.",
    alarmOffset: 45,
  },
  {
    title: "Go karting",
    location: "Casablanca",
    startsAt: "2026-08-19T17:00",
    notes: "Go karting after the mall stop.",
    alarmOffset: 45,
  },
  {
    title: "Medina and souk market",
    location: "Marrakech Medina",
    startsAt: "2026-08-20T11:00",
    notes: "Go to the Medina and souk market.",
    alarmOffset: 45,
  },
  {
    title: "Bracelet making",
    location: "Marrakech",
    startsAt: "2026-08-20T14:00",
    notes: "Bracelet making activity.",
    alarmOffset: 30,
  },
  {
    title: "Perfume making",
    location: "Marrakech",
    startsAt: "2026-08-20T16:00",
    notes: "Perfume making activity.",
    alarmOffset: 30,
  },
  {
    title: "Dinner at Nommos Marrakech",
    location: "Nommos Marrakech",
    startsAt: "2026-08-20T20:30",
    notes: "Could not reserve yet. About 18 minutes by car.",
    alarmOffset: 60,
  },
  {
    title: "Pool and game day",
    location: "Apartment",
    startsAt: "2026-08-21T13:00",
    notes: "Pool and game day at home.",
    alarmOffset: 30,
  },
  {
    title: "Club night",
    location: "Theatro or Club 555",
    startsAt: "2026-08-21T23:30",
    notes: "Club Theatro or Club 555.",
    alarmOffset: 90,
  },
  {
    title: "Chill day before leaving",
    location: "Apartment",
    startsAt: "2026-08-22T11:00",
    notes: "Chill day at home until leaving, if late checkout is possible.",
    alarmOffset: 60,
  },
];

const defaultPeople = [
  "Traveler 1",
  "Traveler 2",
  "Traveler 3",
  "Traveler 4",
  "Traveler 5",
  "Traveler 6",
  "Traveler 7",
].map((name) => ({ id: crypto.randomUUID(), name }));

let state = createDefaultState();
let editingEventId = null;
const clientId = getClientId();

const panels = {
  schedule: document.querySelector("#schedulePanel"),
  people: document.querySelector("#peoplePanel"),
  settings: document.querySelector("#settingsPanel"),
};

const eventList = document.querySelector("#eventList");
const peopleGrid = document.querySelector("#peopleGrid");
const dayFilter = document.querySelector("#dayFilter");
const toast = document.querySelector("#toast");
const form = document.querySelector("#eventForm");
const formTitle = document.querySelector("#formTitle");
const notifyButton = document.querySelector("#notifyButton");
const activeTraveler = document.querySelector("#activeTraveler");
const resetIdentityButton = document.querySelector("#resetIdentityButton");

function getClientId() {
  let saved = localStorage.getItem(clientIdKey);
  if (!saved) {
    saved = crypto.randomUUID();
    localStorage.setItem(clientIdKey, saved);
  }
  return saved;
}

function createDefaultState() {
  const people = defaultPeople;
  const events = sampleEvents.map((event) => ({
    ...event,
    id: crypto.randomUUID(),
    checkins: Object.fromEntries(people.map((person) => [person.id, "not-ready"])),
    alarmed: false,
  }));

  return { version: itineraryVersion, activePersonId: "", identityLocked: false, people, events, reservations: {} };
}

async function apiRequest(path, body) {
  const isGet = path === "/api/state" && body === undefined;
  const response = await fetch(path, {
    method: isGet ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Client-Id": clientId,
    },
    body: isGet ? undefined : JSON.stringify({ ...(body || {}), clientId }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }
  state = payload;
  syncPeopleToEvents();
  render();
  return payload;
}

async function refreshState({ quiet = false } = {}) {
  try {
    await apiRequest("/api/state");
  } catch (error) {
    if (!quiet) showToast("Shared trip server is not reachable.");
  }
}

async function pushStateUpdate() {
  await apiRequest("/api/update", {
    people: state.people,
    events: state.events,
  });
}

function formatDateTime(value) {
  const date = new Date(value);
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
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
  renderActiveTraveler();
  renderDayFilter();
  renderEvents();
  renderPeople();
  renderNextEvent();
}

function getActiveTravelerId() {
  if (state.activePersonId && !state.people.some((person) => person.id === state.activePersonId)) {
    state.activePersonId = "";
    state.identityLocked = false;
  }
  return state.activePersonId || "";
}

function getActiveTravelerName() {
  const activePerson = state.people.find((person) => person.id === getActiveTravelerId());
  return activePerson?.name || "your traveler";
}

function renderActiveTraveler() {
  const selected = getActiveTravelerId();
  activeTraveler.innerHTML = [
    `<option value="">Pick your traveler</option>`,
    ...state.people
    .map((person, index) => {
      const label = `${index + 1}. ${person.name}`;
      const owner = state.reservations?.[person.id];
      const takenBySomeoneElse = Boolean(owner && owner !== clientId);
      const takenText = takenBySomeoneElse ? " - taken" : "";
      return `<option value="${person.id}" ${person.id === selected ? "selected" : ""} ${takenBySomeoneElse ? "disabled" : ""}>${escapeHtml(label + takenText)}</option>`;
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

  if (!events.length) {
    eventList.innerHTML = `<div class="editor-panel">No events for this day yet.</div>`;
    return;
  }

  eventList.innerHTML = events.map(renderEventCard).join("");
}

function renderEventCard(event) {
  const readyCount = state.people.filter((person) => event.checkins[person.id] === "ready").length;
  const doneCount = state.people.filter((person) => event.checkins[person.id] === "done").length;
  const statusPills = state.people
    .map((person) => {
      const status = event.checkins[person.id] || "not-ready";
      const option = statusOptions.find((item) => item.value === status);
      const className = status === "ready" || status === "done" ? ` ${status}` : "";
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
        <label class="checkin-card${isActivePerson ? " active-traveler" : " locked-traveler"}">
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
        <div>${formatDay(event.startsAt)}</div>
        <div>${new Date(event.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div>
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
          <span class="status-pill ready">${readyCount}/${state.people.length} ready</span>
          <span class="status-pill done">${doneCount}/${state.people.length} done</span>
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
          <label>
            Traveler ${index + 1}
            <input value="${escapeAttribute(person.name)}" data-action="rename" data-person-id="${person.id}" />
          </label>
        </div>
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

function syncPeopleToEvents() {
  state.events = state.events.map((event) => {
    const checkins = { ...event.checkins };
    state.people.forEach((person) => {
      checkins[person.id] ||= "not-ready";
    });
    Object.keys(checkins).forEach((personId) => {
      if (!state.people.some((person) => person.id === personId)) {
        delete checkins[personId];
      }
    });
    return { ...event, checkins };
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
  let changed = false;
  state.events.forEach((event) => {
    const alarmAt = new Date(event.startsAt).getTime() - event.alarmOffset * 60000;
    const eventAt = new Date(event.startsAt).getTime();
    if (!event.alarmed && now >= alarmAt && now <= eventAt + 60000) {
      event.alarmed = true;
      changed = true;
      const message = `${event.title} starts in ${event.alarmOffset} minutes.`;
      showToast(message);
      playAlarmSound();
      if (Notification.permission === "granted") {
        new Notification("Morocco Crew alarm", { body: message });
      }
    }
  });
  if (changed) pushStateUpdate().catch((error) => showToast(error.message));
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
  if (!event.target.value) {
    return;
  }
  try {
    await apiRequest("/api/claim", { personId: event.target.value });
    showToast(`This device is locked to ${getActiveTravelerName()}.`);
  } catch (error) {
    await refreshState({ quiet: true });
    showToast(error.message);
  }
});

resetIdentityButton.addEventListener("click", async () => {
  try {
    await apiRequest("/api/release");
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
  showToast(permission === "granted" ? "Alarms enabled for this browser." : "Notifications were not enabled.");
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = {
    title: document.querySelector("#eventTitle").value.trim(),
    location: document.querySelector("#eventLocation").value.trim(),
    startsAt: document.querySelector("#eventDateTime").value,
    notes: document.querySelector("#eventNotes").value.trim(),
  };

  if (editingEventId) {
    state.events = state.events.map((item) =>
      item.id === editingEventId ? { ...item, ...data, alarmed: false } : item,
    );
    showToast("Event updated.");
  } else {
    state.events.push({
      id: crypto.randomUUID(),
      ...data,
      alarmOffset: 30,
      checkins: Object.fromEntries(state.people.map((person) => [person.id, "not-ready"])),
      alarmed: false,
    });
    showToast("Event added.");
  }

  clearForm();
  switchTab("schedule");
  pushStateUpdate().catch((error) => showToast(error.message));
});

document.querySelector("#resetButton").addEventListener("click", async () => {
  clearForm();
  try {
    await apiRequest("/api/reset");
    showToast("Sample itinerary restored.");
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
      await apiRequest("/api/checkin", {
        eventId: target.dataset.eventId,
        personId: target.dataset.personId,
        status: target.value,
      });
    } catch (error) {
      await refreshState({ quiet: true });
      showToast(error.message);
    }
  }
  if (action === "alarm") {
    const tripEvent = state.events.find((item) => item.id === target.dataset.eventId);
    tripEvent.alarmOffset = Number(target.value);
    tripEvent.alarmed = false;
    pushStateUpdate().catch((error) => showToast(error.message));
  }
  if (action === "rename") {
    state.people = state.people.map((person) =>
      person.id === target.dataset.personId ? { ...person, name: target.value.trim() || "Traveler" } : person,
    );
    syncPeopleToEvents();
    pushStateUpdate().catch((error) => showToast(error.message));
  }
});

document.body.addEventListener("click", (event) => {
  const target = event.target.closest("button");
  if (!target) return;
  const action = target.dataset.action;
  if (action === "edit") {
    editEvent(target.dataset.eventId);
  }
  if (action === "delete") {
    state.events = state.events.filter((item) => item.id !== target.dataset.eventId);
    pushStateUpdate()
      .then(() => showToast("Event deleted."))
      .catch((error) => showToast(error.message));
  }
});

syncPeopleToEvents();
refreshState();
window.setInterval(() => {
  refreshState({ quiet: true });
  renderNextEvent();
  checkAlarms();
}, 30000);
