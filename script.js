/* ============================================================
   Free2Play Finder — script.js (CORS-FIXED + MULTI-TAG ROBUST)

   Fix in this version:
   - Multi-tag incompatible combos no longer crash.
   - If /filter returns object (status/message) or non-JSON,
     we show a clean "No results / incompatible tags" error and keep UI stable.

   ============================================================ */

/* ===================== CONFIG ===================== */
const API_BASE = "https://www.freetogame.com/api";
const PROXY_PREFIX = "https://corsproxy.io/?";

/* Tag list shown in official docs "Tags List" section. */
const TAGS = [
  "mmorpg","shooter","strategy","moba","racing","sports","social","sandbox","open-world","survival",
  "pvp","pve","pixel","voxel","zombie","turn-based","first-person","third-person","top-down","tank",
  "space","sailing","side-scroller","superhero","permadeath","card","battle-royale","mmo","mmofps",
  "mmotps","3d","2d","anime","fantasy","sci-fi","fighting","action-rpg","action","military",
  "martial-arts","flight","low-spec","tower-defense","horror","mmorts"
];

/* ===================== STATE ===================== */
const state = {
  platform: "all",
  tag: "",
  sortBy: "relevance",
  search: "",
  multiTagMode: false,
  multiTags: new Set(),
  favoritesOnly: false,

  allGames: [],
  viewGames: [],
  pageSize: 24,
  page: 1,
  loading: false,

  favorites: new Set()
};

/* ===================== DOM ===================== */
const searchInput = document.getElementById("searchInput");
const clearBtn = document.getElementById("clearBtn");
const suggestionsEl = document.getElementById("suggestions");

const platformChips = Array.from(document.querySelectorAll(".chip[data-platform]"));
const tagSelect = document.getElementById("tagSelect");
const sortSelect = document.getElementById("sortSelect");

const multiTagToggle = document.getElementById("multiTagToggle");
const multiTagBox = document.getElementById("multiTagBox");
const multiTagPills = document.getElementById("multiTagPills");

const favoritesOnlyToggle = document.getElementById("favoritesOnlyToggle");
const themeToggle = document.getElementById("themeToggle");

const refreshBtn = document.getElementById("refreshBtn");
const apiDocsBtn = document.getElementById("apiDocsBtn");
const loadMoreBtn = document.getElementById("loadMoreBtn");

const grid = document.getElementById("grid");
const errorBox = document.getElementById("errorBox");
const loadingBox = document.getElementById("loadingBox");
const statusLine = document.getElementById("statusLine");

const toast = document.getElementById("toast");

const detailsModal = document.getElementById("detailsModal");
const detailsBody = document.getElementById("detailsBody");
const docsModal = document.getElementById("docsModal");

/* ===================== UTILITIES ===================== */
function showToast(msg){
  toast.textContent = msg;
  toast.classList.add("show");
  window.clearTimeout(showToast._t);
  showToast._t = window.setTimeout(() => toast.classList.remove("show"), 1400);
}

function setLoading(isLoading, msg = "Loading…"){
  state.loading = isLoading;
  loadingBox.hidden = !isLoading;
  loadingBox.querySelector(".loading__text").textContent = msg;

  const disable = isLoading;
  refreshBtn.disabled = disable;
  loadMoreBtn.disabled = disable || state.viewGames.length <= visibleCount();
  searchInput.disabled = disable;
  tagSelect.disabled = disable;
  sortSelect.disabled = disable;
  clearBtn.disabled = disable;
  multiTagToggle.disabled = disable;
  favoritesOnlyToggle.disabled = disable;
  themeToggle.disabled = disable;
  platformChips.forEach(b => b.disabled = disable);

  statusLine.textContent = isLoading ? msg : statusLine.textContent;
}

function showError(message){
  errorBox.textContent = message;
  errorBox.hidden = false;
}

function clearError(){
  errorBox.hidden = true;
  errorBox.textContent = "";
}

function debounce(fn, ms){
  let t = null;
  return (...args) => {
    window.clearTimeout(t);
    t = window.setTimeout(() => fn(...args), ms);
  };
}

function validateSearch(raw){
  const value = (raw || "").trim();
  if (value.length === 0) return { ok: true, value: "" };

  const allowed = /^[a-zA-Z0-9\s\-:'".,!()&]+$/;
  if (!allowed.test(value)) {
    return { ok: false, value: "", error: "Invalid input: use letters/numbers/spaces only." };
  }
  return { ok: true, value };
}

async function copyToClipboard(text){
  try{
    await navigator.clipboard.writeText(text);
    return true;
  }catch(_){
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try{
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    }catch(e){
      document.body.removeChild(ta);
      return false;
    }
  }
}

function visibleCount(){
  return state.page * state.pageSize;
}

function escapeHtml(str){
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizePlatform(platformText){
  if (!platformText) return "Unknown";
  const p = platformText.toLowerCase();
  if (p.includes("windows") && p.includes("web browser")) return "PC + Browser";
  if (p.includes("web browser")) return "Browser";
  if (p.includes("windows")) return "PC";
  return platformText;
}

/* ===================== NETWORK (ROBUST) ===================== */

/**
 * Try to parse JSON. If response isn't JSON (proxy/network),
 * return text so we can show a meaningful error.
 */
async function parseJsonOrText(res){
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  if (ct.includes("application/json")) {
    return await res.json();
  }
  // Some proxies return text/html even when it's JSON-ish; try JSON parse
  const text = await res.text();
  try{
    return JSON.parse(text);
  }catch(_){
    return text; // raw text for debugging
  }
}

/**
 * Safe fetch:
 * 1) direct
 * 2) retry via proxy if CORS/network blocks direct
 */
async function safeFetchAny(url){
  if (location.protocol === "file:"){
    throw new Error("Open with Live Server (http://127.0.0.1:5500). file:// can block fetch.");
  }
  if (navigator && navigator.onLine === false){
    throw new Error("You appear offline. Check your internet connection.");
  }

  // direct
  try{
    const res = await fetch(url);
    if (!res.ok) {
      const body = await parseJsonOrText(res);
      throw new Error(extractApiMessage(body) || `API request failed (${res.status})`);
    }
    return await parseJsonOrText(res);
  }catch(err){
    const msg = String(err?.message || err);

    const retryable =
      msg.includes("Failed to fetch") ||
      msg.includes("NetworkError") ||
      msg.toLowerCase().includes("cors") ||
      msg.toLowerCase().includes("blocked");

    if (!retryable){
      throw err;
    }

    // proxy fallback
    const proxied = PROXY_PREFIX + encodeURIComponent(url);
    const res2 = await fetch(proxied);
    if (!res2.ok){
      const body2 = await parseJsonOrText(res2);
      throw new Error(extractApiMessage(body2) || `Proxy request failed (${res2.status})`);
    }
    return await parseJsonOrText(res2);
  }
}

/**
 * Extract readable message from API/proxy responses that are objects.
 * Many APIs return {status:0, message:"..."} for invalid filters.
 */
function extractApiMessage(payload){
  if (!payload) return "";
  if (typeof payload === "string") return "";
  if (typeof payload === "object"){
    if (payload.message && typeof payload.message === "string") return payload.message;
    if (payload.error && typeof payload.error === "string") return payload.error;
    if (payload.status && payload.status !== 1 && payload.status !== "success"){
      // if status indicates failure but message isn't present
      return "No results / incompatible filter combination.";
    }
  }
  return "";
}

/* ===================== API FUNCTIONS ===================== */
function buildGamesUrl(){
  const url = new URL(`${API_BASE}/games`);
  if (state.platform && state.platform !== "all") url.searchParams.set("platform", state.platform);
  if (!state.multiTagMode && state.tag) url.searchParams.set("category", state.tag);
  if (state.sortBy) url.searchParams.set("sort-by", state.sortBy);
  return url.toString();
}

function buildFilterUrl(){
  const url = new URL(`${API_BASE}/filter`);
  const tags = Array.from(state.multiTags).slice(0, 6);
  url.searchParams.set("tag", tags.join("."));
  if (state.platform && state.platform !== "all") url.searchParams.set("platform", state.platform);
  if (state.sortBy) url.searchParams.set("sort", state.sortBy);
  return url.toString();
}

async function fetchGames(){
  const endpoint = (state.multiTagMode && state.multiTags.size > 0)
    ? buildFilterUrl()
    : buildGamesUrl();

  // return ANY payload; we'll normalize it in refreshData
  return await safeFetchAny(endpoint);
}

async function fetchGameDetails(id){
  const url = new URL(`${API_BASE}/game`);
  url.searchParams.set("id", String(id));
  return await safeFetchAny(url.toString());
}

/* ===================== DOM RENDERING ===================== */
function initTagSelect(){
  TAGS.forEach(tag => {
    const opt = document.createElement("option");
    opt.value = tag;
    opt.textContent = tag;
    tagSelect.appendChild(opt);
  });
}

const refreshDataDebounced = debounce(() => refreshData(), 180);

function renderMultiTagPills(){
  multiTagPills.innerHTML = "";

  TAGS.forEach(tag => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pill" + (state.multiTags.has(tag) ? " pill--on" : "");
    btn.textContent = tag;

    btn.addEventListener("click", () => {
      if (state.multiTags.has(tag)) state.multiTags.delete(tag);
      else{
        if (state.multiTags.size >= 6){
          showToast("Max 6 tags.");
          return;
        }
        state.multiTags.add(tag);
      }

      renderMultiTagPills();

      if (state.multiTagMode){
        if (state.multiTags.size === 0){
          state.allGames = [];
          state.viewGames = [];
          state.page = 1;
          showError("Multi-tag mode is ON. Select at least 1 tag.");
          renderGrid();
          return;
        }
        refreshDataDebounced();
      }else{
        applyFiltersAndRender();
      }
    });

    multiTagPills.appendChild(btn);
  });
}

function renderGrid(){
  grid.innerHTML = "";

  const slice = state.viewGames.slice(0, visibleCount());
  if (slice.length === 0){
    showError("No results found. Try a different search/filter.");
    statusLine.textContent = "No results.";
    loadMoreBtn.disabled = true;
    return;
  }

  clearError();

  slice.forEach(game => {
    const card = document.createElement("article");
    card.className = "card";
    card.tabIndex = 0;

    const img = document.createElement("img");
    img.className = "card__img";
    img.src = game.thumbnail;
    img.alt = `${game.title} thumbnail`;
    img.loading = "lazy";

    const body = document.createElement("div");
    body.className = "card__body";

    const h = document.createElement("h3");
    h.className = "card__title";
    h.textContent = game.title;

    const p = document.createElement("p");
    p.className = "card__desc";
    p.textContent = game.short_description || "No description available.";

    const meta = document.createElement("div");
    meta.className = "metaRow";

    const genre = document.createElement("span");
    genre.className = "badge badge--good";
    genre.textContent = game.genre || "Unknown";

    const platform = document.createElement("span");
    platform.className = "badge badge--pink";
    platform.textContent = normalizePlatform(game.platform);

    meta.appendChild(genre);
    meta.appendChild(platform);

    const actions = document.createElement("div");
    actions.className = "card__actions";

    const favBtn = document.createElement("button");
    favBtn.type = "button";
    favBtn.className = "smallBtn";
    favBtn.textContent = state.favorites.has(String(game.id)) ? "★ Favorited" : "☆ Favorite";
    favBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorite(game.id);
      favBtn.textContent = state.favorites.has(String(game.id)) ? "★ Favorited" : "☆ Favorite";
      if (state.favoritesOnly) applyFiltersAndRender();
    });

    const detailsBtn = document.createElement("button");
    detailsBtn.type = "button";
    detailsBtn.className = "smallBtn";
    detailsBtn.textContent = "Details";
    detailsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openDetails(game.id);
    });

    actions.appendChild(favBtn);
    actions.appendChild(detailsBtn);

    body.appendChild(h);
    body.appendChild(p);
    body.appendChild(meta);
    body.appendChild(actions);

    card.appendChild(img);
    card.appendChild(body);

    card.addEventListener("click", async () => {
      const ok = await copyToClipboard(game.game_url);
      showToast(ok ? "Copied URL to clipboard." : "Copy failed.");
    });

    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter") card.click();
    });

    grid.appendChild(card);
  });

  const total = state.viewGames.length;
  const shown = Math.min(visibleCount(), total);
  statusLine.textContent = `Showing ${shown} of ${total} games.`;
  loadMoreBtn.disabled = shown >= total;
}

/* ===================== FAVORITES ===================== */
function loadFavorites(){
  try{
    const raw = localStorage.getItem("f2p_favorites");
    if (!raw) return;
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) state.favorites = new Set(arr.map(String));
  }catch(_){}
}

function saveFavorites(){
  try{
    localStorage.setItem("f2p_favorites", JSON.stringify(Array.from(state.favorites)));
  }catch(_){}
}

function toggleFavorite(id){
  const key = String(id);
  if (state.favorites.has(key)) state.favorites.delete(key);
  else state.favorites.add(key);
  saveFavorites();
}

/* ===================== FILTER + SEARCH ===================== */
function applyFiltersAndRender(){
  const { ok, value, error } = validateSearch(searchInput.value);
  if (!ok){
    showError(error);
    state.search = "";
    state.viewGames = [];
    renderGrid();
    return;
  }

  state.search = value;

  const q = state.search.toLowerCase();
  let list = Array.isArray(state.allGames) ? [...state.allGames] : [];

  if (state.favoritesOnly){
    list = list.filter(g => state.favorites.has(String(g.id)));
  }
  if (q){
    list = list.filter(g => (g.title || "").toLowerCase().includes(q));
  }

  state.viewGames = list;
  state.page = 1;
  renderGrid();
  renderSuggestions();
}

function renderSuggestions(){
  const { ok, value } = validateSearch(searchInput.value);
  suggestionsEl.innerHTML = "";
  if (!ok) return;

  const q = value.toLowerCase();
  if (!q || q.length < 2) return;

  const matches = (Array.isArray(state.allGames) ? state.allGames : [])
    .filter(g => (g.title || "").toLowerCase().includes(q))
    .slice(0, 6);

  matches.forEach(g => {
    const row = document.createElement("div");
    row.className = "suggestion";
    row.role = "option";
    row.innerHTML = `<span>${escapeHtml(g.title)}</span><small>${escapeHtml(g.genre || "")}</small>`;
    row.addEventListener("click", () => {
      searchInput.value = g.title;
      suggestionsEl.innerHTML = "";
      applyFiltersAndRender();
    });
    suggestionsEl.appendChild(row);
  });
}

/* ===================== MODALS ===================== */
function openModal(which){
  const el = which === "docs" ? docsModal : detailsModal;
  el.classList.add("open");
  el.setAttribute("aria-hidden", "false");
}

function closeModal(which){
  const el = which === "docs" ? docsModal : detailsModal;
  el.classList.remove("open");
  el.setAttribute("aria-hidden", "true");
}

function bindModalClose(){
  document.addEventListener("click", (e) => {
    const t = e.target;
    if (t && t.dataset && t.dataset.close === "docs") closeModal("docs");
    if (t && t.dataset && t.dataset.close === "details") closeModal("details");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape"){
      closeModal("docs");
      closeModal("details");
    }
  });
}

async function openDetails(id){
  try{
    clearError();
    setLoading(true, "Loading details…");
    const data = await fetchGameDetails(id);
    setLoading(false, "Ready.");

    // details endpoint should be object; if not, show clean message
    if (!data || typeof data !== "object" || Array.isArray(data)){
      throw new Error("Details not available for this game right now.");
    }

    detailsBody.innerHTML = buildDetailsHtml(data);
    openModal("details");
  }catch(err){
    setLoading(false, "Ready.");
    showError(`Failed API call: ${err.message}`);
  }
}

function buildDetailsHtml(d){
  const title = escapeHtml(d.title);
  const thumb = escapeHtml(d.thumbnail);
  const desc = escapeHtml(d.description || d.short_description || "No description.");
  const genre = escapeHtml(d.genre || "Unknown");
  const platform = escapeHtml(normalizePlatform(d.platform));
  const publisher = escapeHtml(d.publisher || "Unknown");
  const developer = escapeHtml(d.developer || "Unknown");
  const release = escapeHtml(d.release_date || "Unknown");
  const url = escapeHtml(d.game_url || "");

  return `
    <div style="display:flex; gap:12px; flex-wrap:wrap;">
      <img src="${thumb}" alt="${title}" style="width:240px; max-width:100%; border-radius:16px; border:1px solid rgba(255,255,255,0.10);" />
      <div style="flex:1; min-width:240px;">
        <h2 style="margin:0 0 8px 0;">${title}</h2>
        <p style="margin:0 0 10px 0; color: var(--muted); line-height:1.45;">${desc}</p>
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin:10px 0;">
          <span class="badge badge--good">${genre}</span>
          <span class="badge badge--pink">${platform}</span>
          <span class="badge">Release: ${release}</span>
        </div>
        <p style="margin:0; color: var(--muted);">
          <strong style="color: var(--ink);">Publisher:</strong> ${publisher}<br/>
          <strong style="color: var(--ink);">Developer:</strong> ${developer}
        </p>
        <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn btn--primary" type="button" id="copyDetailUrl">Copy URL</button>
          <a class="btn btn--ghost" href="${url}" target="_blank" rel="noreferrer">Open Official Page</a>
        </div>
      </div>
    </div>
  `;
}

function bindDetailsModalActions(){
  detailsModal.addEventListener("click", async (e) => {
    const t = e.target;
    if (t && t.id === "copyDetailUrl"){
      const a = detailsBody.querySelector("a.btn");
      if (!a) return;
      const ok = await copyToClipboard(a.href);
      showToast(ok ? "Copied URL to clipboard." : "Copy failed.");
    }
  });
}

/* ===================== EVENTS ===================== */
function setPlatform(platform){
  state.platform = platform;
  platformChips.forEach(b => b.classList.toggle("chip--active", b.dataset.platform === platform));
}

/**
 * Refresh data:
 * - If API returns array -> use it
 * - If API returns object/string -> treat as "no results / incompatible tags"
 */
async function refreshData(){
  clearError();

  if (state.multiTagMode && state.multiTags.size === 0){
    showError("Multi-tag mode is ON. Select at least 1 tag.");
    return;
  }

  try{
    setLoading(true, "Loading games…");
    const payload = await fetchGames();
    setLoading(false, "Ready.");

    // ✅ Normalize result:
    // - If array: good
    // - If object: show message + set empty list
    // - If string: show generic error + set empty list
    if (Array.isArray(payload)){
      state.allGames = payload;
      applyFiltersAndRender();
      return;
    }

    // object payload (status/message) -> treat as no results
    const msg = extractApiMessage(payload);
    state.allGames = [];
    state.viewGames = [];
    state.page = 1;

    showError(msg || "No results / incompatible tag combination. Try fewer tags.");
    renderGrid();
  }catch(err){
    setLoading(false, "Ready.");
    showError(`Failed API call: ${err.message}`);
  }
}

function bindEvents(){
  platformChips.forEach(btn => {
    btn.addEventListener("click", () => {
      setPlatform(btn.dataset.platform);
      refreshData();
    });
  });

  tagSelect.addEventListener("change", () => {
    state.tag = tagSelect.value;
    if (!state.multiTagMode) refreshData();
    else applyFiltersAndRender();
  });

  sortSelect.addEventListener("change", () => {
    state.sortBy = sortSelect.value;
    refreshData();
  });

  const onSearch = debounce(() => applyFiltersAndRender(), 120);
  searchInput.addEventListener("input", onSearch);

  clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    suggestionsEl.innerHTML = "";
    applyFiltersAndRender();
  });

  multiTagToggle.addEventListener("change", () => {
    state.multiTagMode = multiTagToggle.checked;
    multiTagBox.hidden = !state.multiTagMode;

    if (state.multiTagMode){
      renderMultiTagPills();
      if (state.multiTags.size > 0) refreshData();
      else{
        state.allGames = [];
        state.viewGames = [];
        state.page = 1;
        showError("Multi-tag mode is ON. Select at least 1 tag.");
        renderGrid();
      }
    }else{
      refreshData();
    }
  });

  favoritesOnlyToggle.addEventListener("change", () => {
    state.favoritesOnly = favoritesOnlyToggle.checked;
    applyFiltersAndRender();
  });

  themeToggle.addEventListener("change", () => {
    document.body.classList.toggle("light", themeToggle.checked);
  });

  refreshBtn.addEventListener("click", refreshData);
  apiDocsBtn.addEventListener("click", () => openModal("docs"));

  loadMoreBtn.addEventListener("click", () => {
    state.page += 1;
    renderGrid();
  });
}

/* ===================== INIT ===================== */
function init(){
  initTagSelect();
  renderMultiTagPills();
  bindEvents();
  bindModalClose();
  bindDetailsModalActions();
  loadFavorites();

  setPlatform("all");
  tagSelect.value = "";
  sortSelect.value = "relevance";
  multiTagToggle.checked = false;
  favoritesOnlyToggle.checked = false;

  refreshData();
}

init();
