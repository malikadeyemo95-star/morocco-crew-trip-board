const clientIdKey = "moroccoCrewClientId";
const tripMemberIdKey = "moroccoTripMemberId";
const readyNotificationKey = "moroccoReadyNotifications";
const smartReminderKey = "moroccoSmartReminders";
const localExpensesKey = "moroccoCrewExpenses";
const photoBucket = "trip-photos";
const defaultTripId = "morocco-crew-2026";

const statusOptions = [
  { value: "not-ready", label: "Not ready" },
  { value: "ready", label: "Ready" },
];

const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

const defaultPeople = [
  { id: "traveler-1", name: "Malik", sort_order: 1 },
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
let realtimeBannerTimer = null;
let realtimeGeneration = 0;
let deletePhotoName = "";
let pendingPhotoDeleteName = "";
let selectedDay = "";
let expensesShared = true;
let realtimeStatus = "connecting";
let pendingInvite = null;
let lastTripRenderSignature = "";
const htmlRenderCache = new WeakMap();

const panels = {
  today: document.querySelector("#todayPanel"),
  schedule: document.querySelector("#schedulePanel"),
  people: document.querySelector("#peoplePanel"),
  photos: document.querySelector("#photosPanel"),
  settings: document.querySelector("#settingsPanel"),
};

const eventList = document.querySelector("#eventList");
const todayEyebrow = document.querySelector("#todayEyebrow");
const todayNextCard = document.querySelector("#todayNextCard");
const todayActionCard = document.querySelector("#todayActionCard");
const todayPlansEyebrow = document.querySelector("#todayPlansEyebrow");
const todayPlansTitle = document.querySelector("#todayPlansTitle");
const todayTimeline = document.querySelector("#todayTimeline");
const peopleGrid = document.querySelector("#peopleGrid");
const photoGrid = document.querySelector("#photoGrid");
const photoUpload = document.querySelector("#photoUpload");
const daySwitcher = document.querySelector("#daySwitcher");
const toast = document.querySelector("#toast");
const form = document.querySelector("#eventForm");
const formTitle = document.querySelector("#formTitle");
const notifyButton = document.querySelector("#notifyButton");
const identityCard = document.querySelector("#identityCard");
const activeTravelerProfile = document.querySelector("#activeTravelerProfile");
const crewHeaderEyebrow = document.querySelector("#crewHeaderEyebrow");
const organiserPanel = document.querySelector("#organiserPanel");
const inviteLink = document.querySelector("#inviteLink");
const copyInviteButton = document.querySelector("#copyInviteButton");
const joinGate = document.querySelector("#joinGate");
const joinGateTitle = document.querySelector("#joinGateTitle");
const joinGateCopy = document.querySelector("#joinGateCopy");
const joinGateStatus = document.querySelector("#joinGateStatus");
const joinForm = document.querySelector("#joinForm");
const joinName = document.querySelector("#joinName");
const photoConfirmBackdrop = document.querySelector("#photoConfirmBackdrop");
const cancelPhotoDeleteButton = document.querySelector("#cancelPhotoDeleteButton");
const confirmPhotoDeleteButton = document.querySelector("#confirmPhotoDeleteButton");
const expenseOverview = document.querySelector("#expenseOverview");
const expenseForm = document.querySelector("#expenseForm");
const expenseDescription = document.querySelector("#expenseDescription");
const expenseAmount = document.querySelector("#expenseAmount");
const expensePaidBy = document.querySelector("#expensePaidBy");
const expenseDate = document.querySelector("#expenseDate");
const expenseSplitOptions = document.querySelector("#expenseSplitOptions");
const settlementList = document.querySelector("#settlementList");
const expenseList = document.querySelector("#expenseList");
const expenseSyncNotice = document.querySelector("#expenseSyncNotice");
const tripSetupDetails = document.querySelector("#tripSetupDetails");
const liveSyncBanner = document.querySelector("#liveSyncBanner");

function getClientId() {
  let saved = localStorage.getItem(clientIdKey);
  if (!saved) {
    saved = crypto.randomUUID();
    localStorage.setItem(clientIdKey, saved);
  }
  return saved;
}

function getStoredTripMemberId() {
  return localStorage.getItem(tripMemberIdKey) || "";
}

function setStoredTripMemberId(memberId) {
  if (memberId) {
    localStorage.setItem(tripMemberIdKey, memberId);
    return;
  }
  localStorage.removeItem(tripMemberIdKey);
}

function createDefaultState() {
  return {
    version: "supabase-ready-v1",
    trip: null,
    activePersonId: "",
    identityLocked: false,
    people: defaultPeople.map(({ id, name }) => ({ id, name })),
    currentMember: null,
    invite: null,
    events: defaultEvents.map((event) => ({ ...event, checkins: { ...event.checkins } })),
    reservations: {},
    photos: [],
    expenses: getLocalExpenses(),
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
    const [trips, members, events, checkins] = await Promise.all([
      supabaseFetch(`trips?id=eq.${encodeURIComponent(defaultTripId)}&select=*`),
      supabaseFetch(`trip_members?trip_id=eq.${encodeURIComponent(defaultTripId)}&select=*&order=sort_order.asc,created_at.asc`),
      supabaseFetch("events?select=*&order=starts_at.asc"),
      supabaseFetch("checkins?select=*"),
    ]);

    const checkinMap = {};
    checkins.forEach((row) => {
      checkinMap[row.event_id] ||= {};
      checkinMap[row.event_id][row.person_id] = normalizeReadinessStatus(row.status);
    });

    const storedMemberId = getStoredTripMemberId();
    const currentMember =
      members.find((member) => member.id === storedMemberId && member.device_client_id === clientId) ||
      members.find((member) => member.device_client_id === clientId) ||
      null;

    if (currentMember?.id && currentMember.id !== storedMemberId) {
      setStoredTripMemberId(currentMember.id);
    } else if (!currentMember && storedMemberId) {
      setStoredTripMemberId("");
    }

    state.trip = trips[0] || null;
    state.people = members.map((member) => ({
      id: member.id,
      name: member.display_name,
      role: member.role,
      sortOrder: member.sort_order,
      deviceClientId: member.device_client_id,
    }));
    state.currentMember = currentMember
      ? {
          id: currentMember.id,
          name: currentMember.display_name,
          role: currentMember.role,
        }
      : null;
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
    state.reservations = {};
    state.activePersonId = currentMember?.id || "";
    state.identityLocked = Boolean(state.activePersonId);
    const nextRenderSignature = getTripRenderSignature();
    if (nextRenderSignature !== lastTripRenderSignature) {
      renderTripState();
      lastTripRenderSignature = nextRenderSignature;
    }
    renderJoinGate();
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

function getLocalExpenses() {
  try {
    return JSON.parse(localStorage.getItem(localExpensesKey)) || [];
  } catch {
    return [];
  }
}

function saveLocalExpenses() {
  localStorage.setItem(localExpensesKey, JSON.stringify(state.expenses || []));
}

async function refreshExpenses({ quiet = false } = {}) {
  if (!hasSupabase) {
    state.expenses = getLocalExpenses();
    expensesShared = false;
    renderExpenses();
    return;
  }

  try {
    const rows = await supabaseFetch("expenses?select=*&order=spent_at.desc");
    state.expenses = rows.map((row) => ({
      id: row.id,
      description: row.description,
      amount: Number(row.amount) || 0,
      paidBy: row.paid_by,
      splitBetween: Array.isArray(row.split_between) ? row.split_between : [],
      paidPeople: Array.isArray(row.paid_people) ? row.paid_people : [],
      spentAt: row.spent_at,
    }));
    expensesShared = true;
    renderExpenses();
  } catch (error) {
    state.expenses = getLocalExpenses();
    expensesShared = false;
    renderExpenses();
    if (!quiet) showToast("Expense sharing needs the Supabase expenses table. Local mode is on for now.");
  }
}

async function addExpense(expense) {
  if (!expense.description.trim()) throw new Error("Add a short description.");
  if (!Number.isFinite(expense.amount) || expense.amount <= 0) throw new Error("Enter a valid amount.");
  if (!state.people.some((person) => person.id === expense.paidBy)) throw new Error("Choose who paid.");
  if (!isOrganizerMember() && expense.paidBy !== getActiveTravelerId()) {
    throw new Error("You can only add expenses you paid.");
  }
  if (!expense.splitBetween.length) throw new Error("Choose who to split with.");

  const nextExpense = {
    id: crypto.randomUUID(),
    description: expense.description.trim(),
    amount: Math.round(expense.amount * 100) / 100,
    paidBy: expense.paidBy,
    splitBetween: expense.splitBetween,
    paidPeople: expense.paidPeople || [expense.paidBy],
    spentAt: expense.spentAt || new Date().toISOString().slice(0, 10),
  };

  if (!hasSupabase || !expensesShared) {
    if (hasSupabase && !expensesShared) {
      showToast("Shared wallet is not connected. Saving locally for this device.");
    }
    state.expenses = [nextExpense, ...(state.expenses || [])];
    saveLocalExpenses();
    renderExpenses();
    return;
  }

  await supabaseFetch("expenses", {
    method: "POST",
    prefer: "return=minimal",
    body: JSON.stringify({
      id: nextExpense.id,
      description: nextExpense.description,
      amount: nextExpense.amount,
      paid_by: nextExpense.paidBy,
      split_between: nextExpense.splitBetween,
      paid_people: nextExpense.paidPeople,
      spent_at: nextExpense.spentAt,
    }),
  });
  await refreshExpenses({ quiet: true });
}

async function importLocalExpenses() {
  if (!hasSupabase || !expensesShared) {
    throw new Error("Connect the shared wallet before importing local expenses.");
  }

  const localExpenses = getLocalExpenses();
  const existingIds = new Set((state.expenses || []).map((expense) => expense.id));
  const expensesToImport = localExpenses.filter((expense) => expense.id && !existingIds.has(expense.id));
  if (!expensesToImport.length) {
    showToast("No new local expenses to import.");
    return;
  }

  await supabaseFetch("expenses", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: JSON.stringify(
      expensesToImport.map((expense) => ({
        id: expense.id,
        description: expense.description,
        amount: Number(expense.amount) || 0,
        paid_by: expense.paidBy,
        split_between: Array.isArray(expense.splitBetween) ? expense.splitBetween : [],
        paid_people: Array.isArray(expense.paidPeople) ? expense.paidPeople : expense.paidBy ? [expense.paidBy] : [],
        spent_at: expense.spentAt || new Date().toISOString().slice(0, 10),
      })),
    ),
  });
  await refreshExpenses({ quiet: true });
  showToast(`${expensesToImport.length} local expense${expensesToImport.length === 1 ? "" : "s"} imported to shared wallet.`);
}

async function deleteExpense(expenseId) {
  if (!expenseId) return;
  const expense = (state.expenses || []).find((item) => item.id === expenseId);
  if (expense && !isOrganizerMember() && expense.paidBy !== getActiveTravelerId()) {
    throw new Error("You can only delete expenses you paid.");
  }
  if (!hasSupabase || !expensesShared) {
    state.expenses = (state.expenses || []).filter((expense) => expense.id !== expenseId);
    saveLocalExpenses();
    renderExpenses();
    return;
  }

  await supabaseFetch(`expenses?id=eq.${encodeURIComponent(expenseId)}`, {
    method: "DELETE",
    prefer: "return=minimal",
  });
  await refreshExpenses({ quiet: true });
}

async function toggleExpensePaidPerson(expenseId, personId) {
  const expense = (state.expenses || []).find((item) => item.id === expenseId);
  if (!expense || !expense.splitBetween.includes(personId)) return;
  if (!canManageMemberAction(personId)) {
    throw new Error("You can only update your own payment status.");
  }
  if (personId === expense.paidBy) return;

  const paidPeople = getExpensePaidPeople(expense);
  if (paidPeople.has(personId)) {
    paidPeople.delete(personId);
  } else {
    paidPeople.add(personId);
  }
  expense.paidPeople = [...paidPeople];
  renderExpenses();

  if (!hasSupabase || !expensesShared) {
    saveLocalExpenses();
    renderExpenses();
    return;
  }

  await supabaseFetch(`expenses?id=eq.${encodeURIComponent(expenseId)}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: JSON.stringify({ paid_people: expense.paidPeople }),
  });
  await refreshExpenses({ quiet: true });
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

function getInviteTokenFromUrl() {
  return new URLSearchParams(window.location.search).get("invite") || "";
}

async function loadPendingInvite() {
  const inviteToken = getInviteTokenFromUrl();
  if (!hasSupabase || !inviteToken) {
    pendingInvite = null;
    return;
  }

  const invites = await supabaseFetch(
    `trip_invites?token=eq.${encodeURIComponent(inviteToken)}&active=eq.true&select=*`,
  );
  const invite = invites[0];
  const expired = invite?.expires_at && new Date(invite.expires_at).getTime() <= Date.now();
  pendingInvite = invite && !expired ? invite : null;
}

async function joinTripFromInvite(displayName) {
  if (!pendingInvite || pendingInvite.trip_id !== defaultTripId) {
    throw new Error("This invite link is no longer valid.");
  }

  const cleanName = displayName.trim();
  if (!cleanName) throw new Error("Enter your name to join.");

  const nextSortOrder = Math.max(0, ...state.people.map((person) => person.sortOrder || 0)) + 1;
  const memberId = crypto.randomUUID();
  await supabaseFetch("trip_members", {
    method: "POST",
    prefer: "return=minimal",
    body: JSON.stringify({
      id: memberId,
      trip_id: defaultTripId,
      display_name: cleanName,
      role: "traveler",
      device_client_id: clientId,
      sort_order: nextSortOrder,
    }),
  });
  setStoredTripMemberId(memberId);
  window.history.replaceState({}, "", window.location.pathname);
  pendingInvite = null;
  await refreshState({ quiet: true });
}

async function ensureInviteLink() {
  if (!isOrganizerMember()) throw new Error("Only the organiser can create invite links.");

  const invites = await supabaseFetch(
    `trip_invites?trip_id=eq.${encodeURIComponent(defaultTripId)}&active=eq.true&select=*&order=created_at.desc&limit=1`,
  );
  let invite = invites[0];

  if (!invite) {
    invite = {
      token: crypto.randomUUID().replaceAll("-", ""),
      trip_id: defaultTripId,
      created_by: getActiveTravelerId(),
      active: true,
    };
    await supabaseFetch("trip_invites", {
      method: "POST",
      prefer: "return=minimal",
      body: JSON.stringify(invite),
    });
  }

  state.invite = invite;
  return `${window.location.origin}${window.location.pathname}?invite=${invite.token}`;
}

async function updateCheckin(eventId, personId, status) {
  const nextStatus = normalizeReadinessStatus(status);
  if (!hasSupabase) {
    const event = state.events.find((item) => item.id === eventId);
    event.checkins[personId] = nextStatus;
    render();
    return;
  }

  await supabaseFetch("checkins", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: JSON.stringify({ event_id: eventId, person_id: personId, status: nextStatus }),
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

async function deleteTraveler(personId) {
  if (!isOrganizerMember()) throw new Error("Only the organiser can delete travelers.");
  const traveler = state.people.find((person) => person.id === personId);
  if (!traveler) throw new Error("Traveler not found.");
  if (traveler.role === "organiser") throw new Error("The organiser cannot be deleted.");

  await supabaseFetch(`trip_members?id=eq.${encodeURIComponent(personId)}`, {
    method: "DELETE",
    prefer: "return=minimal",
  });
  await refreshState({ quiet: true });
}

async function renameTraveler(personId, displayName) {
  if (!isOrganizerMember()) throw new Error("Only the organiser can rename travelers.");
  const traveler = state.people.find((person) => person.id === personId);
  if (!traveler) throw new Error("Traveler not found.");
  if (traveler.role === "organiser") throw new Error("The organiser name is managed separately.");
  const cleanName = displayName.trim();
  if (!cleanName) throw new Error("Enter a traveler name.");

  await supabaseFetch(`trip_members?id=eq.${encodeURIComponent(personId)}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: JSON.stringify({ display_name: cleanName }),
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
        state.people.map((person) => ({
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

function formatTime(value) {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function sortedEvents() {
  return [...state.events].sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
}

function setStableHtml(element, html) {
  if (!element || htmlRenderCache.get(element) === html) return;
  element.innerHTML = html;
  htmlRenderCache.set(element, html);
}

function render() {
  renderTripState();
  lastTripRenderSignature = getTripRenderSignature();
  renderPhotos();
  renderExpenses();
}

function renderTripState() {
  renderActiveTraveler();
  renderToday();
  renderExpenseControls();
  renderDaySwitcher();
  renderEvents();
  renderPeople();
  renderNextEvent();
}

function getTripRenderSignature() {
  return JSON.stringify({
    currentMember: state.currentMember,
    people: state.people,
    events: state.events,
    selectedDay,
  });
}

function getNextEvent() {
  const now = Date.now();
  return sortedEvents().find((event) => new Date(event.startsAt).getTime() >= now) || null;
}

function getFocusDay() {
  const days = getItineraryDays();
  if (!days.length) return "";
  const today = getTodayKey();
  if (days.includes(today)) return today;
  const next = getNextEvent();
  return next?.startsAt.slice(0, 10) || days[0];
}

function renderToday() {
  if (!todayNextCard || !todayTimeline) return;
  const next = getNextEvent();
  const focusDay = getFocusDay();
  const realToday = focusDay === getTodayKey();
  const focusEvents = sortedEvents().filter((event) => event.startsAt.startsWith(focusDay));
  const focusDate = focusDay ? new Date(`${focusDay}T12:00`) : null;
  const focusLabel = focusDate
    ? new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric" }).format(focusDate)
    : "No plans";

  if (todayEyebrow) todayEyebrow.textContent = realToday ? "Today" : "Next trip day";
  if (todayPlansEyebrow) todayPlansEyebrow.textContent = realToday ? "Today's plans" : "Next trip day";
  if (todayPlansTitle) todayPlansTitle.textContent = focusLabel;

  if (!next) {
    todayNextCard.dataset.eventId = "";
    setStableHtml(todayNextCard, `
      <p class="eyebrow">Up next</p>
      <h3>Trip complete</h3>
      <p>No upcoming plans remain.</p>
    `);
    setStableHtml(todayActionCard, `
      <p class="eyebrow">Quick actions</p>
      <h3>All plans complete</h3>
      <button class="secondary-button" type="button" data-action="today-add-expense">Add expense</button>
    `);
  } else {
    const readyCount = state.people.filter((person) => next.checkins[person.id] === "ready").length;
    const activePersonId = getActiveTravelerId();
    const activePerson = state.people.find((person) => person.id === activePersonId);
    const activeStatus = activePerson ? normalizeReadinessStatus(next.checkins[activePerson.id]) : "not-ready";
    const reminder = getSmartReminder(next);
    const reminderStatus = getReminderStatus(next);

    todayNextCard.dataset.eventId = next.id;
    setStableHtml(todayNextCard, `
      <div class="today-card-head">
        <p class="eyebrow">Up next</p>
        <span class="today-countdown">${getCountdown(next.startsAt)}</span>
      </div>
      <h3>${escapeHtml(next.title)}</h3>
      <p>${escapeHtml(next.location || "Location not set")} · ${formatDateTime(next.startsAt)}</p>
      <div class="today-metrics">
        <span class="status-pill status-ready">${readyCount} of ${state.people.length} ready</span>
        <span class="today-reminder ${reminderStatus.tone}">${reminderStatus.label} · ${formatReminderLead(reminder.minutes)}</span>
      </div>
    `);
    setStableHtml(todayActionCard, `
      <p class="eyebrow">Quick actions</p>
      <h3>${activePerson ? escapeHtml(getDisplayName(activePerson.name)) : "Join the trip"}</h3>
      <div class="today-actions">
        ${
          activePerson
            ? `<button class="primary-button" type="button" data-action="today-ready" data-event-id="${next.id}" data-person-id="${activePerson.id}" data-status="${activeStatus === "ready" ? "not-ready" : "ready"}">${activeStatus === "ready" ? "Ready" : "Mark ready"}</button>`
            : `<button class="primary-button" type="button" disabled>Join to mark ready</button>`
        }
        <button class="secondary-button" type="button" data-action="today-add-expense">Add expense</button>
      </div>
    `);
  }

  setStableHtml(todayTimeline, focusEvents.length
    ? focusEvents
        .map(
          (event) => `
            <article class="today-timeline-item">
              <strong>${formatTime(event.startsAt)}</strong>
              <div>
                <h4>${escapeHtml(event.title)}</h4>
                <p>${escapeHtml(event.location || "Location not set")}</p>
              </div>
            </article>
          `,
        )
        .join("")
    : `<div class="empty-state compact"><span aria-hidden="true">Plan</span><h4>No plans for this day.</h4><p>The itinerary is clear for now.</p></div>`);
}

function refreshTodayClock() {
  if (!todayNextCard) return;
  const next = getNextEvent();
  if ((next?.id || "") !== todayNextCard.dataset.eventId) {
    renderToday();
    return;
  }
  if (!next) return;
  const countdown = todayNextCard.querySelector(".today-countdown");
  const reminderLabel = todayNextCard.querySelector(".today-reminder");
  const reminder = getSmartReminder(next);
  const reminderStatus = getReminderStatus(next);
  if (countdown) countdown.textContent = getCountdown(next.startsAt);
  if (reminderLabel) {
    reminderLabel.className = `today-reminder ${reminderStatus.tone}`;
    reminderLabel.textContent = `${reminderStatus.label} · ${formatReminderLead(reminder.minutes)}`;
  }
}

function renderJoinGate() {
  if (!joinGate) return;

  const joined = Boolean(state.currentMember);
  joinGate.hidden = joined;

  if (joined) return;

  if (!hasSupabase) {
    joinGateTitle.textContent = "Shared mode is required to join this trip.";
    joinGateCopy.textContent = "Connect Supabase before inviting travelers.";
    joinForm.hidden = true;
    joinGateStatus.textContent = "";
    return;
  }

  if (!pendingInvite) {
    joinGateTitle.textContent = "You need an invite to join Morocco Crew Trip.";
    joinGateCopy.textContent = "Ask the organiser to send you the invite link.";
    joinForm.hidden = true;
    joinGateStatus.textContent = "";
    return;
  }

  joinGateTitle.textContent = "You've been invited to Morocco Crew Trip.";
  joinGateCopy.textContent = "Enter your name to join.";
  joinForm.hidden = false;
  joinGateStatus.textContent = "";
}

function renderOrganiserPanel() {
  if (!organiserPanel) return;
  organiserPanel.hidden = !isOrganizerMember();
}

function getActiveTravelerId() {
  return state.people.some((person) => person.id === state.activePersonId) ? state.activePersonId : "";
}

function getActiveTravelerName() {
  const activePerson = state.people.find((person) => person.id === getActiveTravelerId());
  return activePerson?.name || "your traveler";
}

function isOrganizerMember() {
  return state.currentMember?.role === "organiser";
}

function canManageMemberAction(personId) {
  return Boolean(getActiveTravelerId() && (isOrganizerMember() || personId === getActiveTravelerId()));
}

function renderActiveTraveler() {
  const currentMember = state.currentMember;
  if (activeTravelerProfile) {
    activeTravelerProfile.textContent = currentMember ? currentMember.name : "Not joined yet";
  }
  if (identityCard) {
    identityCard.dataset.role = currentMember?.role || "";
  }
  document.body.dataset.admin = isOrganizerMember() ? "true" : "false";
  const addEventButton = document.querySelector("#addEventButton");
  if (addEventButton) addEventButton.hidden = !isOrganizerMember();
  if (tripSetupDetails) tripSetupDetails.hidden = !isOrganizerMember();
}

function getItineraryDays() {
  return [...new Set(sortedEvents().map((event) => event.startsAt.slice(0, 10)))];
}

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function ensureSelectedDay() {
  const days = getItineraryDays();
  if (!days.length) {
    selectedDay = "";
    return "";
  }
  if (selectedDay && days.includes(selectedDay)) return selectedDay;
  const today = getTodayKey();
  selectedDay = days.includes(today) ? today : days[0];
  return selectedDay;
}

function renderDaySwitcher() {
  if (!daySwitcher) return;
  const days = getItineraryDays();
  const selected = ensureSelectedDay();
  daySwitcher.innerHTML = days
    .map((day) => {
      const dayEvents = state.events.filter((event) => event.startsAt.startsWith(day));
      const isSelected = selected === day;
      const date = new Date(`${day}T12:00`);
      const weekday = new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(date);
      const shortDate = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
      return `
        <button class="day-chip${isSelected ? " active" : ""}" type="button" role="tab" aria-selected="${isSelected}" data-action="select-day" data-day="${day}">
          <strong>${weekday}</strong>
          <span>${shortDate} · ${dayEvents.length} plan${dayEvents.length === 1 ? "" : "s"}</span>
        </button>
      `;
    })
    .join("");
}

function renderEvents() {
  const day = ensureSelectedDay();
  const events = sortedEvents().filter((event) => event.startsAt.startsWith(day));
  const dayLabel = day ? new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(new Date(`${day}T12:00`)) : "this day";
  const openStatusEventIds = new Set(
    [...eventList.querySelectorAll(".group-status-details[open]")].map((details) => details.dataset.eventId),
  );

  eventList.innerHTML = events.length
    ? events.map(renderEventCard).join("")
    : `<div class="empty-state"><span aria-hidden="true">Plan</span><h4>No activities planned for ${dayLabel} yet.</h4><p>Add a plan when the crew has something locked in.</p></div>`;

  openStatusEventIds.forEach((eventId) => {
    eventList.querySelector(`.group-status-details[data-event-id="${CSS.escape(eventId)}"]`)?.setAttribute("open", "");
  });
}

function getStatusOption(status) {
  return statusOptions.find((item) => item.value === status) || statusOptions[0];
}

function normalizeReadinessStatus(status) {
  return status === "ready" ? "ready" : "not-ready";
}

function getStatusSummary(event) {
  return statusOptions
    .map((option) => {
      const people = state.people.filter((person) => (event.checkins[person.id] || "not-ready") === option.value);
      return { ...option, count: people.length, people };
    })
    .filter((item) => item.count > 0);
}

function getInitials(name) {
  return getDisplayName(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getDisplayName(name) {
  const clean = String(name || "").trim();
  return clean || "Unnamed traveler";
}

function getAvatarLabel(person) {
  const name = getDisplayName(person?.name);
  const compact = name.replace(/[^a-z0-9]/gi, "").toUpperCase() || "UT";
  const otherNames = state.people
    .filter((item) => item.id !== person?.id)
    .map((item) => getDisplayName(item.name).replace(/[^a-z0-9]/gi, "").toUpperCase());
  for (let length = 1; length <= Math.min(3, compact.length); length += 1) {
    const prefix = compact.slice(0, length);
    if (!otherNames.some((otherName) => otherName.startsWith(prefix))) {
      return prefix;
    }
  }
  return compact.slice(0, Math.min(3, compact.length));
}

function renderEventCard(event) {
  const readyCount = state.people.filter((person) => event.checkins[person.id] === "ready").length;
  const activePersonId = getActiveTravelerId();
  const activePerson = state.people.find((person) => person.id === activePersonId);
  const activeStatus = activePerson ? normalizeReadinessStatus(event.checkins[activePerson.id]) : "";
  const reminder = getSmartReminder(event);
  const reminderStatus = getReminderStatus(event);

  const myStatus = activePerson
    ? `
      <section class="my-status-card status-${activeStatus}" aria-label="Update my status">
        <div>
          <p class="eyebrow">My status</p>
          <h5>${escapeHtml(getDisplayName(activePerson.name))}</h5>
        </div>
        <button class="ready-toggle status-${activeStatus}" type="button" data-action="checkin-choice" data-event-id="${event.id}" data-person-id="${activePerson.id}" data-status="${activeStatus === "ready" ? "not-ready" : "ready"}" aria-pressed="${activeStatus === "ready"}">
          ${activeStatus === "ready" ? "Ready" : "Mark ready"}
        </button>
      </section>
    `
    : `
      <section class="my-status-card pick-traveler" aria-label="Join trip first">
        <p class="eyebrow">My status</p>
        <h5>Join the trip first</h5>
        <p>Open a valid invite link to update your status for this plan.</p>
      </section>
    `;

  const notReadyCount = Math.max(0, state.people.length - readyCount);
  const groupStatuses = state.people
    .map((person) => {
      const status = normalizeReadinessStatus(event.checkins[person.id]);
      const option = getStatusOption(status);
      const adminControl =
        isOrganizerMember() && person.id !== activePersonId
          ? `
            <select class="status-admin-select" data-action="admin-checkin" data-event-id="${event.id}" data-person-id="${person.id}" aria-label="Update ${escapeAttribute(getDisplayName(person.name))} readiness">
              ${statusOptions
                .map(
                  (statusOption) =>
                    `<option value="${statusOption.value}" ${statusOption.value === status ? "selected" : ""}>${statusOption.label}</option>`,
                )
                .join("")}
            </select>
          `
          : `<span class="status-pill status-${status}">${option.label}</span>`;

      return `
        <div class="group-status-row status-${status}">
          <strong class="group-status-name">${escapeHtml(getDisplayName(person.name))}</strong>
          ${adminControl}
        </div>
      `;
    })
    .join("");

  return `
    <article class="event-card">
      <div class="event-time">
        <span class="event-day">${formatDay(event.startsAt)}</span>
        <strong>${formatTime(event.startsAt)}</strong>
        <div class="smart-reminder-card ${reminderStatus.tone}">
          <span>Smart reminder</span>
          <strong>${reminderStatus.label}</strong>
          <small>${formatReminderLead(reminder.minutes)}</small>
        </div>
      </div>
      <div>
        <div class="event-title-row">
          <div>
            <h4>${escapeHtml(event.title)}</h4>
            <p class="event-meta">${escapeHtml(event.location || "Location not set")}</p>
          </div>
          ${
            isOrganizerMember()
              ? `
                <div class="event-actions">
                  <button class="icon-button" type="button" data-action="edit" data-event-id="${event.id}">Edit</button>
                  <button class="icon-button" type="button" data-action="delete" data-event-id="${event.id}">Delete</button>
                </div>
              `
              : ""
          }
        </div>
        <p>${escapeHtml(event.notes || "No notes yet.")}</p>
        <div class="ready-summary" aria-label="Readiness summary">
          <span class="status-pill status-ready">${readyCount} of ${state.people.length} ready</span>
        </div>
        <div class="status-board">
          ${myStatus}
          <section class="group-status-card" aria-label="Group status">
            <div class="status-section-title">
              <p class="eyebrow">Group status</p>
              <span>${readyCount} of ${state.people.length} ready</span>
            </div>
            <div class="status-summary-chips">
              <span class="status-summary-chip status-ready"><strong>${readyCount}</strong> Ready</span>
              <span class="status-summary-chip status-not-ready"><strong>${notReadyCount}</strong> Not ready</span>
            </div>
            <details class="group-status-details" data-event-id="${event.id}">
              <summary>View all travelers</summary>
              <div class="group-status-list">${groupStatuses}</div>
            </details>
          </section>
        </div>
      </div>
    </article>
  `;
}

function renderPeople() {
  if (crewHeaderEyebrow) {
    const label = state.people.length === 1 ? "traveler" : "travelers";
    crewHeaderEyebrow.textContent = `Crew dashboard · ${state.people.length} ${label}`;
  }
  renderOrganiserPanel();
  setStableHtml(peopleGrid, state.people
    .map((person, index) => {
      const isCurrentMember = person.id === getActiveTravelerId();
      const isAdmin = person.role === "organiser";
      return `
        <div class="person-card">
          <div class="person-avatar">${escapeHtml(getAvatarLabel(person))}</div>
          <div class="person-copy">
            <p class="eyebrow">Traveler ${index + 1}</p>
            <strong>${escapeHtml(getDisplayName(person.name))}</strong>
          </div>
          <div class="person-actions">
            ${isAdmin ? `<span class="admin-badge">Admin</span>` : ""}
            ${isCurrentMember ? `<span class="claimed">You</span>` : ""}
            ${
              isOrganizerMember() && !isAdmin
                ? `
                  <button class="person-edit-button" type="button" data-action="rename-traveler" data-person-id="${person.id}" data-person-name="${escapeAttribute(getDisplayName(person.name))}">Rename</button>
                  <button class="person-delete-button" type="button" data-action="delete-traveler" data-person-id="${person.id}" data-person-name="${escapeAttribute(getDisplayName(person.name))}">Delete</button>
                `
                : ""
            }
          </div>
        </div>
      `;
    })
    .join(""));
}

function renderPhotos() {
  if (!photoGrid) return;
  if (!hasSupabase) {
    setStableHtml(photoGrid, `<div class="empty-state"><span aria-hidden="true">Cloud</span><h4>Photo cloud is waiting.</h4><p>Connect Supabase to share trip photos here.</p></div>`);
    return;
  }
  if (!state.photos?.length) {
    setStableHtml(photoGrid, `<div class="empty-state"><span aria-hidden="true">Gallery</span><h4>No trip photos yet.</h4><p>Upload the first memory and everyone can save it.</p></div>`);
    return;
  }

  setStableHtml(photoGrid, state.photos
    .map(
      (photo) => `
        <article class="photo-card">
          <a class="photo-link" href="${photo.url}" target="_blank" rel="noreferrer" aria-label="Open ${escapeAttribute(photo.name)}">
            <img src="${photo.url}" alt="Trip photo" loading="lazy" />
          </a>
          <span class="photo-name">${escapeHtml(photo.name)}</span>
          <div class="photo-actions">
            <button class="secondary-button photo-action" type="button" data-action="download-photo" data-photo-name="${escapeAttribute(photo.name)}">
              <span aria-hidden="true">${downloadIcon()}</span>
              Download
            </button>
            <button class="danger-button photo-action" type="button" data-action="delete-photo" data-photo-name="${escapeAttribute(photo.name)}" ${deletePhotoName === photo.name ? "disabled" : ""}>
              <span aria-hidden="true">${trashIcon()}</span>
              ${deletePhotoName === photo.name ? "Deleting..." : "Delete"}
            </button>
          </div>
        </article>
      `,
    )
    .join(""));
}

function renderExpenseControls() {
  if (!expensePaidBy || !expenseSplitOptions) return;
  const selectedPayer = expensePaidBy.value || getActiveTravelerId();
  const checkedValues = [...expenseSplitOptions.querySelectorAll("input:checked")].map((input) => input.value);
  const hasExistingChoices = expenseSplitOptions.querySelectorAll("input").length > 0;
  const payerOptions = isOrganizerMember()
    ? state.people
    : state.people.filter((person) => person.id === getActiveTravelerId());
  expensePaidBy.innerHTML = [
    `<option value="">Who paid?</option>`,
    ...payerOptions.map((person) => `<option value="${person.id}">${escapeHtml(person.name)}</option>`),
  ].join("");
  expensePaidBy.value = state.people.some((person) => person.id === selectedPayer) ? selectedPayer : "";
  expensePaidBy.disabled = Boolean(getActiveTravelerId() && !isOrganizerMember());

  expenseSplitOptions.innerHTML = state.people
    .map(
      (person) => `
        <label class="split-option">
          <input type="checkbox" value="${person.id}" ${!hasExistingChoices || checkedValues.includes(person.id) ? "checked" : ""} />
          <span>${escapeHtml(person.name)}</span>
        </label>
      `,
    )
    .join("");
}

function renderExpenses() {
  if (!expenseOverview || !settlementList || !expenseList) return;
  const expenses = state.expenses || [];
  const localExpenses = getLocalExpenses();
  const activePersonId = getActiveTravelerId();
  const totals = getExpenseTotals(expenses);
  const myPaid = activePersonId ? expenses.filter((expense) => expense.paidBy === activePersonId).reduce((sum, expense) => sum + expense.amount, 0) : 0;
  const myBalance = activePersonId ? totals.balances[activePersonId] || 0 : 0;
  const myBalanceText = !activePersonId
    ? "Join the trip"
    : Math.abs(myBalance) < 0.01
      ? "All settled"
      : myBalance > 0
        ? `You are owed ${formatMoney(myBalance)}`
        : `You owe ${formatMoney(Math.abs(myBalance))}`;

  setStableHtml(expenseOverview, `
    <article class="expense-stat-card">
      <span>Total spent</span>
      <strong>${formatMoney(totals.total)}</strong>
    </article>
    <article class="expense-stat-card">
      <span>You paid</span>
      <strong>${activePersonId ? formatMoney(myPaid) : "--"}</strong>
    </article>
    <article class="expense-stat-card ${myBalance > 0 ? "positive" : myBalance < 0 ? "negative" : ""}">
      <span>Your balance</span>
      <strong>${myBalanceText}</strong>
    </article>
    <article class="expense-stat-card subtle">
      <span>Mode</span>
      <strong>${expensesShared ? "Shared wallet" : hasSupabase ? "Local backup" : "Local only"}</strong>
    </article>
  `);

  if (expenseSyncNotice) {
    const importableCount = expensesShared
      ? localExpenses.filter((expense) => expense.id && !expenses.some((sharedExpense) => sharedExpense.id === expense.id)).length
      : 0;
    if (!hasSupabase) {
      expenseSyncNotice.hidden = false;
      expenseSyncNotice.className = "expense-sync-notice warning";
      setStableHtml(expenseSyncNotice, `<strong>Local-only wallet.</strong><span>Add Supabase config to share expenses across phones.</span>`);
    } else if (!expensesShared) {
      expenseSyncNotice.hidden = false;
      expenseSyncNotice.className = "expense-sync-notice warning";
      setStableHtml(expenseSyncNotice, `<strong>Shared wallet not connected.</strong><span>The app is using this device's backup expenses until Supabase is reachable.</span>`);
    } else if (importableCount > 0) {
      expenseSyncNotice.hidden = false;
      expenseSyncNotice.className = "expense-sync-notice";
      setStableHtml(expenseSyncNotice, `
        <strong>${importableCount} local expense${importableCount === 1 ? "" : "s"} found.</strong>
        <span>Move them into the shared wallet so everyone can see them.</span>
        <button class="secondary-button" type="button" data-action="import-local-expenses">Import local expenses</button>
      `);
    } else {
      expenseSyncNotice.hidden = false;
      expenseSyncNotice.className = "expense-sync-notice success";
      setStableHtml(expenseSyncNotice, `<strong>Shared wallet connected.</strong><span>Expenses load from Supabase and sync across devices.</span>`);
    }
  }

  const settlements = getSettlements(totals.balances);
  setStableHtml(settlementList, settlements.length
    ? settlements
        .map(
          (settlement) => `
            <div class="settlement-row">
              <span>${escapeHtml(getPersonName(settlement.from))}</span>
              <strong>${formatMoney(settlement.amount)}</strong>
              <span>${escapeHtml(getPersonName(settlement.to))}</span>
            </div>
          `,
        )
        .join("")
    : `<div class="empty-state compact"><span aria-hidden="true">Settle</span><h4>All settled.</h4><p>No one owes anything yet.</p></div>`);

  setStableHtml(expenseList, expenses.length
    ? expenses.map(renderExpenseCard).join("")
    : `<div class="empty-state compact"><span aria-hidden="true">Split</span><h4>No expenses added yet.</h4><p>Add your first shared cost.</p></div>`);
}

function renderExpenseCard(expense) {
  const splitCount = expense.splitBetween.length || 1;
  const eachOwes = expense.amount / splitCount;
  const splitNames = expense.splitBetween.map(getPersonName).join(", ");
  const paidPeople = getExpensePaidPeople(expense);
  const paidCount = expense.splitBetween.filter((personId) => paidPeople.has(personId)).length;
  const paidChips = expense.splitBetween
    .map((personId) => {
      const paid = paidPeople.has(personId);
      const isPayer = personId === expense.paidBy;
      const statusLabel = isPayer ? "Settled" : paid ? "Paid" : "Needs to pay";
      return `
        <button class="paid-person-chip${paid ? " paid" : ""}${isPayer ? " settled" : ""}" type="button" data-action="toggle-paid-person" data-expense-id="${escapeAttribute(expense.id)}" data-person-id="${escapeAttribute(personId)}" aria-pressed="${paid}" ${isPayer ? "disabled" : ""}>
          <span>${paid ? "✓" : ""}</span>
          <b>${escapeHtml(getPersonName(personId))}</b>
          <small>${statusLabel}</small>
        </button>
      `;
    })
    .join("");
  return `
    <article class="expense-item">
      <div>
        <p class="eyebrow">${formatExpenseDate(expense.spentAt)}</p>
        <h5>${escapeHtml(expense.description)}</h5>
        <p>${escapeHtml(getPersonName(expense.paidBy))} paid ${formatMoney(expense.amount)}</p>
        <span>Split between ${escapeHtml(splitNames || "the crew")} · ${formatMoney(eachOwes)} each</span>
        <div class="paid-people-block">
          <small>${paidCount}/${splitCount} marked paid</small>
          <div class="paid-people-chips">${paidChips}</div>
        </div>
      </div>
      <div class="expense-item-side">
        <strong>${formatMoney(expense.amount)}</strong>
        <button class="icon-button" type="button" data-action="delete-expense" data-expense-id="${escapeAttribute(expense.id)}">Delete</button>
      </div>
    </article>
  `;
}

function getExpenseTotals(expenses) {
  const balances = Object.fromEntries(state.people.map((person) => [person.id, 0]));
  let total = 0;
  expenses.forEach((expense) => {
    const amount = Number(expense.amount) || 0;
    const splitBetween = expense.splitBetween?.length ? expense.splitBetween : state.people.map((person) => person.id);
    const share = amount / splitBetween.length;
    const paidPeople = getExpensePaidPeople(expense);
    total += amount;
    splitBetween.forEach((personId) => {
      if (paidPeople.has(personId)) return;
      balances[expense.paidBy] = (balances[expense.paidBy] || 0) + share;
      balances[personId] = (balances[personId] || 0) - share;
    });
  });
  return { total, balances };
}

function getExpensePaidPeople(expense) {
  return new Set([expense.paidBy, ...(expense.paidPeople || [])].filter(Boolean));
}

function getSettlements(balances) {
  const debtors = Object.entries(balances)
    .filter(([, amount]) => amount < -0.01)
    .map(([personId, amount]) => ({ personId, amount: Math.abs(amount) }))
    .sort((a, b) => b.amount - a.amount);
  const creditors = Object.entries(balances)
    .filter(([, amount]) => amount > 0.01)
    .map(([personId, amount]) => ({ personId, amount }))
    .sort((a, b) => b.amount - a.amount);
  const settlements = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = Math.min(debtor.amount, creditor.amount);
    if (amount > 0.01) {
      settlements.push({ from: debtor.personId, to: creditor.personId, amount });
    }
    debtor.amount -= amount;
    creditor.amount -= amount;
    if (debtor.amount <= 0.01) debtorIndex += 1;
    if (creditor.amount <= 0.01) creditorIndex += 1;
  }

  return settlements;
}

function getPersonName(personId) {
  return getDisplayName(state.people.find((person) => person.id === personId)?.name);
}

function formatMoney(amount) {
  return currencyFormatter.format(Number(amount) || 0);
}

function formatReminderLead(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return "No reminder";
  if (minutes === 60) return "1 hour before";
  if (minutes % 60 === 0) return `${minutes / 60} hours before`;
  return `${minutes} minutes before`;
}

function downloadIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/></svg>`;
}

function trashIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="m9 7 1-3h4l1 3"/><path d="M6 7l1 14h10l1-14"/></svg>`;
}

function formatExpenseDate(value) {
  if (!value) return "Today";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(`${value}T12:00`));
}

function renderNextEvent() {
  const next = getNextEvent();
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
  document.body.dataset.tab = tab;
  if (tab === "settings") {
    refreshExpenses({ quiet: true });
  }
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
  if (tripSetupDetails) tripSetupDetails.open = true;
  switchTab("settings");
}

function clearForm() {
  editingEventId = null;
  formTitle.textContent = "Add Event";
  form.reset();
}

function getSmartReminder(event) {
  const text = `${event.title} ${event.location || ""} ${event.notes || ""}`.toLowerCase();
  if (text.includes("casablanca") || text.includes("day trip")) {
    return { minutes: 90, kind: "leave", label: "Leave soon" };
  }
  if (
    text.includes("arrival") ||
    text.includes("quad") ||
    text.includes("camel") ||
    text.includes("kart") ||
    text.includes("medina") ||
    text.includes("souk") ||
    text.includes("club") ||
    text.includes("dinner") ||
    text.includes("reservation") ||
    text.includes("reserved")
  ) {
    return { minutes: 60, kind: "ready", label: "Get ready soon" };
  }
  if (text.includes("pool") || text.includes("home") || text.includes("chill")) {
    return { minutes: 30, kind: "ready", label: "Get ready soon" };
  }
  return { minutes: 30, kind: "ready", label: "Smart reminder" };
}

function getReminderStatus(event) {
  const reminder = getSmartReminder(event);
  const now = Date.now();
  const eventAt = new Date(event.startsAt).getTime();
  const reminderAt = eventAt - reminder.minutes * 60000;
  if (now > eventAt) return { label: "Activity time passed", tone: "past" };
  if (now >= reminderAt) return { label: reminder.label, tone: "soon" };
  return { label: "Smart reminder on", tone: "on" };
}

function getSmartReminderLog() {
  try {
    return JSON.parse(localStorage.getItem(smartReminderKey)) || [];
  } catch {
    return [];
  }
}

function saveSmartReminderLog(ids) {
  localStorage.setItem(smartReminderKey, JSON.stringify([...new Set(ids)]));
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
  const fired = getSmartReminderLog();
  let changed = false;
  state.events.forEach((event) => {
    const reminder = getSmartReminder(event);
    const alarmAt = new Date(event.startsAt).getTime() - reminder.minutes * 60000;
    const eventAt = new Date(event.startsAt).getTime();
    const reminderId = `${event.id}:${event.startsAt}:${reminder.minutes}`;
    if (!fired.includes(reminderId) && now >= alarmAt && now <= eventAt) {
      const message = `${reminder.label}: ${event.title} at ${formatTime(event.startsAt)}.`;
      showToast(message);
      try {
        playAlarmSound();
      } catch {
        // Some mobile browsers block audio until the user interacts; the toast remains the fallback.
      }
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Morocco Crew reminder", { body: message });
      }
      fired.push(reminderId);
      changed = true;
    }
  });
  if (changed) saveSmartReminderLog(fired);
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
  if (!isOrganizerMember()) {
    showToast("Only the organiser can change trip plans.");
    return;
  }
  clearForm();
  if (tripSetupDetails) tripSetupDetails.open = true;
  switchTab("settings");
  document.querySelector("#eventTitle").focus();
});

document.querySelector("#cancelEditButton").addEventListener("click", clearForm);

joinForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    joinGateStatus.textContent = "Joining trip...";
    await joinTripFromInvite(joinName.value);
    showToast(`Welcome, ${getActiveTravelerName()}.`);
  } catch (error) {
    joinGateStatus.textContent = error.message;
  }
});

copyInviteButton?.addEventListener("click", async () => {
  try {
    const url = await ensureInviteLink();
    inviteLink.value = url;
    await navigator.clipboard.writeText(url);
    showToast("Invite link copied.");
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
  if (!isOrganizerMember()) {
    showToast("Only the organiser can change trip plans.");
    return;
  }
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
  if (!isOrganizerMember()) {
    showToast("Only the organiser can reset the trip.");
    return;
  }
  clearForm();
  try {
    await resetTripData();
    showToast("Trip data restored.");
  } catch (error) {
    showToast(error.message);
  }
});

expenseForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const splitBetween = [...expenseSplitOptions.querySelectorAll("input:checked")].map((input) => input.value);
  try {
    await addExpense({
      description: expenseDescription.value,
      amount: Number(expenseAmount.value.replace(",", ".")),
      paidBy: expensePaidBy.value,
      splitBetween,
      spentAt: expenseDate.value || new Date().toISOString().slice(0, 10),
    });
    expenseForm.reset();
    renderExpenseControls();
    showToast("Expense added.");
  } catch (error) {
    showToast(error.message);
  }
});

document.body.addEventListener("change", async (event) => {
  const target = event.target;
  const action = target.dataset.action;
  if (action === "checkin") {
    if (!canManageMemberAction(target.dataset.personId)) {
      render();
      showToast(state.identityLocked ? "You can only update your own status." : "Join the trip first.");
      return;
    }
    try {
      await updateCheckin(target.dataset.eventId, target.dataset.personId, target.value);
    } catch (error) {
      await refreshState({ quiet: true });
      showToast(error.message);
    }
  }
  if (action === "admin-checkin") {
    if (!isOrganizerMember()) {
      renderTripState();
      showToast("Only the organiser can update another traveler.");
      return;
    }
    try {
      await updateCheckin(target.dataset.eventId, target.dataset.personId, target.value);
    } catch (error) {
      await refreshState({ quiet: true });
      showToast(error.message);
    }
  }
});

document.body.addEventListener("click", async (event) => {
  const target = event.target.closest("button");
  if (!target) return;
  const action = target.dataset.action;
  if (action === "edit") {
    if (!isOrganizerMember()) {
      showToast("Only the organiser can change trip plans.");
      return;
    }
    editEvent(target.dataset.eventId);
  }
  if (action === "delete") {
    if (!isOrganizerMember()) {
      showToast("Only the organiser can change trip plans.");
      return;
    }
    try {
      await deleteEvent(target.dataset.eventId);
      showToast("Event deleted.");
    } catch (error) {
      showToast(error.message);
    }
  }
  if (action === "delete-traveler") {
    if (!isOrganizerMember()) {
      showToast("Only the organiser can delete travelers.");
      return;
    }
    const travelerName = target.dataset.personName || "this traveler";
    if (!window.confirm(`Delete ${travelerName} from the crew?`)) return;
    try {
      await deleteTraveler(target.dataset.personId);
      showToast(`${travelerName} deleted.`);
    } catch (error) {
      showToast(error.message.includes("foreign key") ? "This traveler has trip activity and cannot be deleted yet." : error.message);
    }
  }
  if (action === "rename-traveler") {
    if (!isOrganizerMember()) {
      showToast("Only the organiser can rename travelers.");
      return;
    }
    const currentName = target.dataset.personName || "";
    const nextName = window.prompt("Rename traveler", currentName);
    if (nextName === null || nextName.trim() === currentName) return;
    try {
      await renameTraveler(target.dataset.personId, nextName);
      showToast("Traveler renamed.");
    } catch (error) {
      showToast(error.message);
    }
  }
  if (action === "open-plans") {
    switchTab("schedule");
  }
  if (action === "today-add-expense") {
    switchTab("settings");
    document.querySelector("#expenseDescription")?.focus();
  }
  if (action === "today-ready") {
    if (!canManageMemberAction(target.dataset.personId)) {
      showToast(state.identityLocked ? "You can only update your own status." : "Join the trip first.");
      return;
    }
    try {
      await updateCheckin(target.dataset.eventId, target.dataset.personId, target.dataset.status);
    } catch (error) {
      await refreshState({ quiet: true });
      showToast(error.message);
    }
  }
  if (action === "select-day") {
    selectedDay = target.dataset.day || selectedDay;
    renderDaySwitcher();
    renderEvents();
    lastTripRenderSignature = getTripRenderSignature();
  }
  if (action === "checkin-choice") {
    if (!canManageMemberAction(target.dataset.personId)) {
      renderTripState();
      showToast(state.identityLocked ? "You can only update your own status." : "Join the trip first.");
      return;
    }
    try {
      await updateCheckin(target.dataset.eventId, target.dataset.personId, target.dataset.status);
    } catch (error) {
      await refreshState({ quiet: true });
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
  if (action === "delete-expense") {
    try {
      await deleteExpense(target.dataset.expenseId || "");
      showToast("Expense deleted.");
    } catch (error) {
      showToast(error.message);
    }
  }
  if (action === "toggle-paid-person") {
    try {
      await toggleExpensePaidPerson(target.dataset.expenseId || "", target.dataset.personId || "");
    } catch (error) {
      await refreshExpenses({ quiet: true });
      showToast(error.message);
    }
  }
  if (action === "import-local-expenses") {
    try {
      target.disabled = true;
      target.textContent = "Importing...";
      await importLocalExpenses();
    } catch (error) {
      showToast(error.message);
    } finally {
      target.disabled = false;
      target.textContent = "Import local expenses";
    }
  }
});

function scheduleRealtimeReconnect() {
  if (realtimeReconnectTimer || !realtimeClient) return;
  realtimeReconnectTimer = window.setTimeout(() => {
    realtimeReconnectTimer = null;
    setupRealtime();
  }, 5000);
}

function renderRealtimeStatus() {
  if (!liveSyncBanner) return;
  if (realtimeStatus === "connected") {
    if (realtimeBannerTimer) {
      window.clearTimeout(realtimeBannerTimer);
      realtimeBannerTimer = null;
    }
    liveSyncBanner.hidden = true;
    liveSyncBanner.textContent = "";
    return;
  }
  if (realtimeBannerTimer) return;
  realtimeBannerTimer = window.setTimeout(() => {
    realtimeBannerTimer = null;
    if (realtimeStatus === "connected") return;
    liveSyncBanner.hidden = false;
    liveSyncBanner.className = "live-sync-banner warning";
    liveSyncBanner.innerHTML = `<strong>Live sync reconnecting.</strong><span>Backup refresh is keeping trip data current.</span>`;
  }, 10000);
}

function setupRealtime() {
  if (!realtimeClient) return;
  const generation = ++realtimeGeneration;

  if (realtimeChannel) {
    realtimeClient.removeChannel(realtimeChannel);
  }

  const refreshFromRealtime = () => refreshState({ quiet: true });
  const refreshPhotosFromRealtime = () => refreshPhotos({ quiet: true });
  realtimeChannel = realtimeClient
    .channel("morocco-trip-live-state")
    .on("postgres_changes", { event: "*", schema: "public", table: "checkins" }, refreshFromRealtime)
    .on("postgres_changes", { event: "*", schema: "public", table: "events" }, refreshFromRealtime)
    .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, () => refreshExpenses({ quiet: true }))
    .on("postgres_changes", { event: "*", schema: "public", table: "trip_members" }, refreshFromRealtime)
    .on(
      "postgres_changes",
      { event: "*", schema: "storage", table: "objects", filter: `bucket_id=eq.${photoBucket}` },
      refreshPhotosFromRealtime,
    )
    .subscribe((status) => {
      if (generation !== realtimeGeneration) return;
      if (status === "SUBSCRIBED") {
        realtimeStatus = "connected";
        renderRealtimeStatus();
        return;
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        realtimeStatus = "reconnecting";
        renderRealtimeStatus();
        scheduleRealtimeReconnect();
      }
    });
}

document.body.dataset.tab = "today";
render();
renderJoinGate();
setupRealtime();
initializeApp();
window.setInterval(() => {
  refreshState({ quiet: true });
  refreshPhotos({ quiet: true });
  refreshExpenses({ quiet: true });
  refreshTodayClock();
  renderNextEvent();
  checkAlarms();
}, 30000);

async function initializeApp() {
  try {
    await loadPendingInvite();
  } catch {
    pendingInvite = null;
  }
  renderJoinGate();
  refreshState();
  refreshPhotos();
  refreshExpenses({ quiet: true });
}
