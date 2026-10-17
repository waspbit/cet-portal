
/* CET Connect – vanilla JS. Data comes from Google Sheets (Apps Script JSON or published CSV). */
"use strict";

/* ===================== CONFIGURATION ===================== */
const API_URL = "https://script.google.com/macros/s/AKfycbx5D5Z6S7fMsXoS7sn6emaHhgSA_wOhieB92G-Kbr0JAJNkVYiGrdbEcXzzXH3FPm3I/exec"; // preferred
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSg000pvywCq-Q8CH5CAHKq_qs0x4GvVcDyU91SoJKnfCIpL7IOYdoM-IZjWhe4TeVuKSRFx-Ob9Acm/pubhtml?gid=638415639&single=true";                              // alternative: published-to-web CSV link
const CONFIG = {
  cetLogoUrl: "assets/cet_logo.png",
  universityLogoUrl: "assets/tau_logo.png",
  studentOrgs: [          
    { name: "College of Engineering and Technology - Student Council", logoUrl: "assets/cet_sc.png", facebookUrl: "https://www.facebook.com/TAUCollegeOfEngineeringAndTechnology" },
    { name: "Association of Geodetic Engineering Students", logoUrl: "assets/ages.png", facebookUrl: "https://www.facebook.com/agestauc" },
    { name: "Phil. Society of Agricultural and Biosystems Engineers Pre-Professional Group", logoUrl: "assets/psabe.png", facebookUrl: "https://www.facebook.com/psabeppgtauc" },
    { name: "Students Society on Information Technology Education", logoUrl: "assets/ssite.png", facebookUrl: "https://www.facebook.com/TAUBSIT" }
  ],
  contact: { email: "", phone: "", address: "" }, // leave blank if not provided
  newDays: 30              // "New" tag shows this many days after DateAdded
};


/* ===================== STATE & HELPERS ===================== */
// Returns a detached dummy element if an id is missing, so one missing element can never crash the portal.
const $ = (id) => document.getElementById(id) || document.createElement("div");
const state = { items: [], query: "", category: "All" };

function el(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") n.className = v;
    else if (k === "text") n.textContent = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  kids.flat().forEach((c) => c != null && n.append(c));
  return n;
}

function safeUrl(value) {
  try {
    const u = new URL(String(value || "").trim());
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : "";
  } catch { return ""; }
}

function formatStamp(d) {
  const date = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).replace(/\s/g, "");
  return date + "  " + time; // e.g. October 17, 2026  8:41AM
}

function toTime(v) { const t = Date.parse(v); return Number.isNaN(t) ? 0 : t; }

function normalize(raw, index) {
  const r = {};
  Object.keys(raw || {}).forEach((k) => (r[k.trim().toLowerCase()] = raw[k]));
  const s = (k) => String(r[k] ?? "").trim();
  const title = s("title"), url = safeUrl(r.url);
  if (!title || !url) return null;                         // required fields
  if (s("status").toLowerCase() !== "active") return null; // only Active
  const time = toTime(r.dateadded);
  return {
    id: s("id") || "row-" + index,
    title, url,
    description: s("description"),
    category: s("category") || "Other Resources",
    iconUrl: safeUrl(r.iconurl),
    tags: s("tags").split(",").map((t) => t.trim()).filter(Boolean),
    isNew: s("badge").toLowerCase() === "new" ||
      (time > 0 && Date.now() - time <= CONFIG.newDays * 86400000)
  };
}

/* ===================== DATA LOADING ===================== */
function parseCSV(text) {
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.some((c) => c.trim()));
  if (!head) return [];
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
}

async function fetchRecords() {
  const usingApi = API_URL && !API_URL.startsWith("YOUR_");
  if (!usingApi && !SHEET_CSV_URL) {
    throw new Error("The data source is not configured yet. Set API_URL (or SHEET_CSV_URL) at the top of script.js.");
  }
  let res;
  try { res = await fetch(usingApi ? API_URL : SHEET_CSV_URL, { cache: "no-store" }); }
  catch { throw new Error("Could not reach the data source. Open the URL in a private window: it should show JSON, not a Google sign-in page. Redeploy the Apps Script with access set to 'Anyone'."); }
  if (!res.ok) throw new Error("The data source responded with status " + res.status + ".");
  if (usingApi) {
    let data;
    try { data = await res.json(); }
    catch { throw new Error("The response was not valid JSON. Check that the Apps Script is deployed for 'Anyone'."); }
    if (data && data.error) throw new Error("Apps Script error: " + data.error);
    const list = Array.isArray(data) ? data : data.resources;
    if (!Array.isArray(list)) throw new Error("Unexpected JSON format: 'resources' array not found.");
    return list;
  }
  return parseCSV(await res.text());
}

async function loadData() {
  const box = $("status");
  box.className = "state loading";
  $("grid").replaceChildren(...Array.from({ length: 4 }, () => el("div", { class: "skeleton" })));
  try {
    state.items = (await fetchRecords()).map(normalize).filter(Boolean);
    box.className = "state"; box.replaceChildren();
    $("updated").textContent = "Last refreshed: " + formatStamp(new Date());
    renderChips(); renderResults();
  } catch (err) {
    state.items = [];
    renderChips(); renderResults();
    box.className = "state error";
    box.replaceChildren(
      el("strong", { text: "Could not load resources." }),
      el("p", { text: err.message || "Unknown error." }),
      el("button", { class: "btn", type: "button", text: "Try again", onclick: loadData })
    );
  }
}

/* ===================== FILTER / RENDER ===================== */
function visibleItems() {
  const q = state.query.trim().toLowerCase();
  return state.items
    .filter((i) => {
      if (state.category !== "All" && i.category !== state.category) return false;
      if (!q) return true;
      return [i.title, i.description, i.category, i.tags.join(" ")].join(" ").toLowerCase().includes(q);
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

function makeCard(item) {
  const thumb = el("div", { class: "thumb", "aria-hidden": "true" });
  const fallback = () => thumb.replaceChildren(document.createTextNode(item.title.charAt(0).toUpperCase()));
  if (item.iconUrl) {
    const img = el("img", { src: item.iconUrl, alt: "", loading: "lazy", referrerpolicy: "no-referrer" });
    img.addEventListener("error", fallback);
    thumb.append(img);
  } else fallback();

  const meta = el("div", { class: "meta" }, el("span", { class: "badge", text: item.category }));
  if (item.isNew) meta.append(el("span", { class: "badge new", text: "New" }));

  return el("article", { class: "card" },
    el("div", { class: "card-top" }, thumb, el("h3", { text: item.title })),
    meta,
    el("p", { text: item.description || "No description provided." }),
    el("a", { class: "btn", href: item.url, target: "_blank", rel: "noopener noreferrer",
      "aria-label": "Visit " + item.title + " (opens in a new tab)", text: "Visit Website" })
  );
}

function renderChips() {
  const cats = [...new Set(state.items.map((i) => i.category))].sort();
  if (state.category !== "All" && !cats.includes(state.category)) state.category = "All";
  const mk = (name) => el("button", {
    class: "chip", type: "button", text: name,
    "aria-pressed": String(state.category === name),
    onclick: () => { state.category = name; renderChips(); renderResults(); }
  });
  $("categoryChips").replaceChildren(...(cats.length > 1 ? [mk("All"), ...cats.map(mk)] : []));
}

function renderResults() {
  const list = visibleItems();
  $("grid").replaceChildren(...list.map(makeCard));
  $("empty").hidden = list.length > 0 || state.items.length === 0;
  $("resultCount").textContent = state.items.length
    ? list.length + " of " + state.items.length + " resources" : "";
}

/* ===================== UI ===================== */
function setQuery(v) {
  state.query = v;
  $("searchInput").value = v;
  $("clearSearch").hidden = !v;
  renderResults();
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $("themeBtn").setAttribute("aria-label", "Switch to " + (theme === "dark" ? "light" : "dark") + " theme");
}

/* Run a setup step; a missing optional element must never stop the portal from loading. */
function safely(label, fn) {
  try { fn(); } catch (e) { console.warn("CET Connect: skipped '" + label + "' (" + e.message + ")"); }
}
const on = (id, evt, fn) => { const n = $(id); if (n) n.addEventListener(evt, fn); };

function init() {
  safely("theme", () => {
    let theme = "light";
    try { theme = localStorage.getItem("cet-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"); } catch {}
    applyTheme(theme);
    on("themeBtn", "click", () => {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      applyTheme(next);
      try { localStorage.setItem("cet-theme", next); } catch {}
    });
  });

  safely("search", () => {
    on("searchInput", "input", (e) => setQuery(e.target.value));
    on("clearSearch", "click", () => { setQuery(""); $("searchInput").focus(); });
    on("resetBtn", "click", () => { state.category = "All"; setQuery(""); renderChips(); });
    on("refreshBtn", "click", loadData);
  });

  safely("year", () => { $("year").textContent = new Date().getFullYear(); });

  safely("logos", () => {
    [["cetLogo", CONFIG.cetLogoUrl], ["tauLogo", CONFIG.universityLogoUrl]].forEach(([id, url]) => {
      const img = $(id);
      if (!img || !url) return;
      img.src = url; img.hidden = false;
      img.addEventListener("error", () => { img.hidden = true; });
    });
  });


  safely("student orgs", () => {
    const orgs = (CONFIG.studentOrgs || []).filter((o) => o.name && safeUrl(o.facebookUrl));
    $("orgList").replaceChildren(...orgs.map((o) => {
      const link = el("a", { class: "btn-foot org-link", href: safeUrl(o.facebookUrl), target: "_blank", rel: "noopener noreferrer",
        "aria-label": o.name + " on Facebook (opens in a new tab)" });
      if (o.logoUrl) {
        const img = el("img", { class: "org-logo", src: o.logoUrl, alt: "" });
        img.addEventListener("error", () => img.remove());
        link.append(img);
      }
      link.append(el("strong", { text: o.name }));
      return link;
    }));
    $("orgs").hidden = !orgs.length;
  });

  safely("contact", () => {
    const c = CONFIG.contact || {};
    $("contactInfo").textContent = [c.address, c.email, c.phone].filter(Boolean).join(" | ");
  });

  loadData(); // always runs
}

document.addEventListener("DOMContentLoaded", init);
