import { useState, useMemo, useEffect, useRef } from "react";

import { D } from "./data.js";

const MOB_ICON_BASE = (D.meta.iconBase || "").replace("/item/", "/mob/");
const iconUrl = (id, kind) =>
  `${kind === "mob" ? MOB_ICON_BASE : D.meta.iconBase}${id}/icon`;
const mobName = (id) => D.mobs[String(id)] || `mob ${id}`;
const dispName = (it) =>
  it.name && it.name.trim() ? it.name : `(item ${it.id})`;

function fmtPct(c) {
  if (c == null) return "?";
  const p = c / 10000;
  const s = p >= 1 ? p.toFixed(2) : p >= 0.1 ? p.toFixed(3) : p.toFixed(4);
  return "≈" + s.replace(/\.?0+$/, "") + "%";
}
const oneIn = (c) =>
  c == null ? "?" : "~1/" + Math.max(1, Math.round(1e6 / c)).toLocaleString();

function fmtDate(iso) {
  const [y, m, d] = String(iso || "").split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const CATS = ["All", "Custom", "Equip", "Use", "Etc", "Setup", "Cash"];

// ---- Mob combat stats + elemental effectiveness (from D.mobStats) ----
// Magic elements in canonical display order. Letters match the Exodus/Cosmic
// `elemAttr` codes (server Element.getFromChar): S=Poison F=Fire I=Ice L=Lightning H=Holy.
const MAGIC_ELEMS = [
  ["S", "Poison"],
  ["F", "Fire"],
  ["I", "Ice"],
  ["L", "Lightning"],
  ["H", "Holy"],
];
// Effectiveness digit (server ElementalEffectiveness.getByNumber): 1=Immune 2=Strong 3=Weak.
const EFF_BY_NUM = { 1: "Immune", 2: "Strong", 3: "Weak" };

// Parse an elemAttr string like "I2F3" + the undead flag into the 4 buckets.
function magicEffectiveness(el, undead) {
  const present = {};
  const s = String(el || "").toUpperCase();
  for (let i = 0; i + 1 < s.length; i += 2) {
    const n = Number(s[i + 1]);
    if (n >= 1 && n <= 3) present[s[i]] = n;
  }
  const buckets = { Weak: [], Normal: [], Strong: [], Immune: [] };
  for (const [ch, label] of MAGIC_ELEMS) {
    const n = present[ch];
    buckets[n ? EFF_BY_NUM[n] : "Normal"].push(label);
  }
  // Heal damages undead mobs -> undead are Weak to Heal; otherwise it has no effect (Normal).
  buckets[undead ? "Weak" : "Normal"].push("Heal");
  return buckets;
}

const num = (n) => (n == null ? "—" : Number(n).toLocaleString("en-US"));

const STAT_PRIMARY = [["lv", "Level"], ["hp", "HP"], ["exp", "EXP"]];
const STAT_SECONDARY = [
  ["mp", "MP"],
  ["pad", "Weapon Atk"],
  ["mad", "Magic Atk"],
  ["acc", "Accuracy"],
  ["eva", "Avoidability"],
  ["spd", "Speed"],
];

// ---- Mob list filters ----
// Weakness filter options [value, label]: letters are elemAttr codes; "Heal" uses the undead flag.
const WEAK_FILTERS = [...MAGIC_ELEMS, ["Heal", "Heal"]];
// Mob list sort keys [value, label].
const MOB_SORTS = [
  ["lv", "Level"],
  ["exp", "EXP"],
  ["hp", "HP"],
];
// True if a mob (raw elemAttr `el` + undead `ud`) is WEAK (digit 3) to the given filter value.
function mobWeakTo(el, ud, key) {
  if (key === "Heal") return !!ud;
  const s = String(el || "").toUpperCase();
  for (let i = 0; i + 1 < s.length; i += 2)
    if (s[i] === key && s[i + 1] === "3") return true;
  return false;
}

// Level filter buckets: 0–10, 11–20 … 141–150 (steps of 10), then one 151–200 bucket.
// Mobs above level 200 (a few joke mobs) are intentionally not bucketed — they show under "All levels".
const LV_RANGES = [[0, 10]];
for (let s = 11; s <= 150; s += 10) LV_RANGES.push([s, s + 9]);
LV_RANGES.push([151, 200]);

function Icon({ id, size, px, kind }) {
  const [err, setErr] = useState(false);
  if (err)
    return (
      <div className="ph" style={{ width: size, height: size }}>
        ?
      </div>
    );
  return (
    <img
      src={iconUrl(id, kind)}
      width={size}
      height={size}
      loading="lazy"
      alt=""
      onError={() => setErr(true)}
      style={{ objectFit: "contain", imageRendering: px ? "pixelated" : "auto" }}
    />
  );
}

function ItemCard({ it, onClick }) {
  return (
    <button className="card" onClick={onClick}>
      <Icon id={it.id} size={36} />
      <div className="cardbody">
        <div className="nm" title={dispName(it)}>
          {dispName(it)}
        </div>
        <div className="meta">
          {it.cat} · {it.d.length} mob{it.d.length !== 1 ? "s" : ""}
          {it.cu ? <span className="badge">CUSTOM</span> : null}
        </div>
      </div>
    </button>
  );
}

function MobCard({ mob, onClick }) {
  return (
    <button className="card" onClick={onClick}>
      <Icon id={mob.id} size={36} kind="mob" />
      <div className="cardbody">
        <div className="nm" title={mob.name}>
          {mob.name}
        </div>
        <div className="meta">
          Lvl. {mob.lv} · {mob.n} drop{mob.n !== 1 ? "s" : ""}
        </div>
      </div>
    </button>
  );
}

const LEGEND =
  "≈ approximate rate (v83 baseline) · ? drop confirmed by the monster book, rate unknown";

function ItemDetail({ it, onBack, onMob }) {
  return (
    <div className="detail">
      <button className="back" onClick={onBack}>
        ← Back
      </button>
      <div className="dhead">
        <Icon id={it.id} size={72} px />
        <div>
          <h1>
            {dispName(it)}
            {it.cu ? <span className="badge">CUSTOM</span> : null}
          </h1>
          <div className="sub">
            ID {it.id} · {it.cat} · dropped by {it.d.length} mob
            {it.d.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>
      {it.d.length === 0 ? (
        <div className="empty">No drop data.</div>
      ) : (
        <table className="droptbl">
          <thead>
            <tr>
              <th colSpan={2}>Mob</th>
              <th>Mob ID</th>
              <th>Chance</th>
              <th>Rate</th>
              <th>Qty</th>
            </tr>
          </thead>
          <tbody>
            {it.d.map((d, i) => (
              <tr key={i}>
                <td className="ic">
                  <Icon id={d[0]} size={28} kind="mob" />
                </td>
                <td>
                  <span className="lnk" onClick={() => onMob(d[0])}>
                    {mobName(d[0])}
                  </span>
                </td>
                <td className="mono">{d[0]}</td>
                <td className="mono">{fmtPct(d[1])}</td>
                <td className="mono dim">{oneIn(d[1])}</td>
                <td className="mono">{d[2] || "1"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {it.d.length > 0 && (
        <div className="legend">{LEGEND} · click a mob to see all its drops</div>
      )}
    </div>
  );
}

function MagicTable({ st }) {
  const b = magicEffectiveness(st.el, st.ud);
  const ROWS = [
    ["Weak", "Weak against (Magic)", "weak"],
    ["Normal", "Normal against (Magic)", "normal"],
    ["Strong", "Strong against (Magic)", "strong"],
    ["Immune", "Immune to (Magic)", "immune"],
  ];
  return (
    <div className="elembox">
      {ROWS.map(([key, label, cls]) => (
        <div className={"elemrow" + (b[key].length ? " " + cls : "")} key={key}>
          <span className="elemk">{label}</span>
          <span className={"elemv" + (b[key].length ? "" : " none")}>
            {b[key].length ? b[key].join(", ") : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

function MobStats({ st }) {
  const secondary = STAT_SECONDARY.filter(([k]) => st[k] != null);
  return (
    <div className="mobstats">
      <div className="statgrid primary">
        {STAT_PRIMARY.map(([k, label]) => (
          <div className="stat" key={k}>
            <div className="statk">{label}</div>
            <div className="statv mono">{num(st[k])}</div>
          </div>
        ))}
      </div>
      {secondary.length > 0 && (
        <div className="statgrid">
          {secondary.map(([k, label]) => (
            <div className="stat" key={k}>
              <div className="statk">{label}</div>
              <div className="statv mono">{num(st[k])}</div>
            </div>
          ))}
        </div>
      )}
      <div className="elemhd">Elemental effectiveness</div>
      <MagicTable st={st} />
    </div>
  );
}

function MobDetail({ id, drops, onBack, onItem }) {
  const st = D.mobStats ? D.mobStats[String(id)] : null;
  return (
    <div className="detail">
      <button className="back" onClick={onBack}>
        ← Back
      </button>
      <div className="dhead">
        <Icon id={id} size={72} kind="mob" />
        <div>
          <h1>
            {mobName(id)}
            {st?.boss ? <span className="badge">BOSS</span> : null}
            {st?.ud ? <span className="badge alt">UNDEAD</span> : null}
          </h1>
          <div className="sub">
            Mob ID {id} · drops {drops.length} item
            {drops.length !== 1 ? "s" : ""}
            {st ? " · Exodus stats" : ""}
          </div>
        </div>
      </div>
      {st ? <MobStats st={st} /> : null}
      {drops.length === 0 ? (
        <div className="empty">
          We couldn't find any drops for this monster.
        </div>
      ) : (
        <table className="droptbl">
          <thead>
            <tr>
              <th colSpan={2}>Item</th>
              <th>Item ID</th>
              <th>Chance</th>
              <th>Rate</th>
              <th>Qty</th>
            </tr>
          </thead>
          <tbody>
            {drops.map((it, i) => (
              <tr key={i}>
                <td className="ic">
                  <Icon id={it.id} size={28} />
                </td>
                <td>
                  <span className="lnk" onClick={() => onItem(it.id)}>
                    {dispName(it)}
                  </span>
                  {it.cu ? <span className="badge">CUSTOM</span> : null}
                </td>
                <td className="mono">{it.id}</td>
                <td className="mono">{fmtPct(it.c)}</td>
                <td className="mono dim">{oneIn(it.c)}</td>
                <td className="mono">{it.q || "1"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {drops.length > 0 && (
        <div className="legend">
          {LEGEND} · click an item to see all its sources
        </div>
      )}
    </div>
  );
}

function NotFound({ what, onBack }) {
  return (
    <div className="detail">
      <button className="back" onClick={onBack}>
        ← Back
      </button>
      <div className="empty">Couldn't find {what}.</div>
    </div>
  );
}

// Read the current location hash into a route: #/item/<id>, #/mob/<id>, else home.
function parseHash() {
  const m = (window.location.hash || "").match(/^#\/(item|mob)\/(\d+)/);
  return m ? { kind: m[1], id: Number(m[2]) } : { kind: "home" };
}

export default function App() {
  const [mode, setMode] = useState("items");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [page, setPage] = useState(0);
  const [mobType, setMobType] = useState("all"); // all | monster | boss
  const [lvRange, setLvRange] = useState("all"); // "all" | index into LV_RANGES
  const [weak, setWeak] = useState("all"); // "all" | element letter | "Heal"
  const [sortKey, setSortKey] = useState("lv"); // name | lv | exp | hp (mobs default to level)
  const [sortDir, setSortDir] = useState("asc"); // asc | desc
  const [route, setRoute] = useState(parseHash);
  const searchRef = useRef(null);
  const navedRef = useRef(false); // navigated within the app vs. landed on a deep link?
  const PER = 60;

  // Hash routing: every item/mob gets a shareable URL (#/item/<id>, #/mob/<id>).
  useEffect(() => {
    const onHash = () => {
      const r = parseHash();
      setRoute(r);
      if (r.kind !== "home") window.scrollTo(0, 0); // keep list scroll when going back
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const goItem = (id) => {
    navedRef.current = true;
    window.location.hash = `#/item/${id}`;
  };
  const goMob = (id) => {
    navedRef.current = true;
    window.location.hash = `#/mob/${id}`;
  };
  const goHome = () => {
    window.location.hash = "#/";
  };
  // Back = normal browser-history navigation; only fall back to the list when the page was
  // opened directly as a shared deep link (so Back never dumps you off the site).
  const goBack = () => {
    if (navedRef.current) window.history.back();
    else goHome();
  };

  const itemById = useMemo(() => new Map(D.items.map((it) => [it.id, it])), []);

  // Invert items -> per-mob drop list (built once, in the browser)
  const mobIndex = useMemo(() => {
    const idx = {};
    for (const it of D.items) {
      for (const d of it.d) {
        (idx[d[0]] ||= []).push({
          id: it.id,
          name: it.name,
          cat: it.cat,
          cu: it.cu,
          c: d[1],
          q: d[2],
        });
      }
    }
    for (const k in idx) {
      idx[k].sort(
        (a, b) =>
          (a.c == null) - (b.c == null) ||
          (b.c || 0) - (a.c || 0) ||
          dispName(a).localeCompare(dispName(b)),
      );
    }
    return idx;
  }, []);

  // Every mob in the client (droppers + the ones with no book drops), with stats for filters.
  const mobList = useMemo(
    () =>
      Object.keys(D.mobs).map((mid) => {
        const st = (D.mobStats && D.mobStats[mid]) || {};
        return {
          id: Number(mid),
          name: mobName(mid),
          n: (mobIndex[mid] || []).length,
          lv: st.lv ?? 0,
          exp: st.exp ?? 0,
          hp: st.hp ?? 0,
          el: st.el || "",
          ud: st.ud ? 1 : 0,
          boss: st.boss ? 1 : 0,
        };
      }),
    [mobIndex],
  );

  const filteredItems = useMemo(() => {
    const s = q.trim().toLowerCase();
    return D.items.filter((it) => {
      if (cat === "Custom") {
        if (!it.cu) return false;
      } else if (cat !== "All" && it.cat !== cat) return false;
      if (!s) return true;
      return (
        dispName(it).toLowerCase().includes(s) || String(it.id).includes(s)
      );
    });
  }, [q, cat]);

  const filteredMobs = useMemo(() => {
    const s = q.trim().toLowerCase();
    const out = mobList.filter((m) => {
      if (s && !(m.name.toLowerCase().includes(s) || String(m.id).includes(s)))
        return false;
      if (mobType === "boss" && !m.boss) return false;
      if (mobType === "monster" && m.boss) return false;
      if (lvRange !== "all") {
        const [lo, hi] = LV_RANGES[Number(lvRange)] || [0, Infinity];
        if (m.lv < lo || m.lv > hi) return false;
      }
      if (weak !== "all" && !mobWeakTo(m.el, m.ud, weak)) return false;
      return true;
    });
    const dir = sortDir === "asc" ? 1 : -1;
    out.sort((a, b) => {
      const r =
        sortKey === "name"
          ? a.name.localeCompare(b.name)
          : (a[sortKey] || 0) - (b[sortKey] || 0);
      return r * dir || a.name.localeCompare(b.name);
    });
    return out;
  }, [q, mobList, mobType, lvRange, weak, sortKey, sortDir]);

  useEffect(
    () => setPage(0),
    [q, cat, mode, mobType, lvRange, weak, sortKey, sortDir],
  );

  const switchMode = (m) => {
    setMode(m);
    setQ("");
    setCat("All");
    setPage(0);
    setMobType("all");
    setLvRange("all");
    setWeak("all");
    setSortKey("lv");
    setSortDir("asc");
  };

  // Keep the tab title in sync with the current page (nicer shared links / history).
  useEffect(() => {
    let t = "Exodus | Community Database";
    if (route.kind === "item") {
      const it = itemById.get(route.id);
      if (it) t = `${dispName(it)} | Exodus`;
    } else if (route.kind === "mob") {
      t = `${mobName(route.id)} | Exodus`;
    }
    document.title = t;
  }, [route, itemById]);

  // Detail views are driven by the URL hash; Back always returns to the initial list route.
  if (route.kind === "item") {
    const it = itemById.get(route.id);
    return (
      <div className="wrap">
        {it ? (
          <ItemDetail it={it} onBack={goBack} onMob={goMob} />
        ) : (
          <NotFound what={`item #${route.id}`} onBack={goBack} />
        )}
      </div>
    );
  }
  if (route.kind === "mob") {
    const known = D.mobs[String(route.id)] || D.mobStats?.[String(route.id)];
    return (
      <div className="wrap">
        {known ? (
          <MobDetail
            id={route.id}
            drops={mobIndex[route.id] || []}
            onBack={goBack}
            onItem={goItem}
          />
        ) : (
          <NotFound what={`mob #${route.id}`} onBack={goBack} />
        )}
      </div>
    );
  }

  const list = mode === "items" ? filteredItems : filteredMobs;
  const pages = Math.max(1, Math.ceil(list.length / PER));
  const view = list.slice(page * PER, page * PER + PER);

  return (
    <div className="wrap">
      <header>
        <div className="topbar">
          <h2>
            Exodus — Community Database
            {D.meta.updated ? (
              <span className="updated">Updated {fmtDate(D.meta.updated)}</span>
            ) : null}
          </h2>
          <a
            className="vote"
            href="https://exodusms.com/vote"
            target="_blank"
            rel="noopener noreferrer"
          >
            Vote for Exodus
          </a>
        </div>
        <div className="modes">
          <button
            className={"mode" + (mode === "items" ? " on" : "")}
            onClick={() => switchMode("items")}
          >
            Items
          </button>
          <button
            className={"mode" + (mode === "mobs" ? " on" : "")}
            onClick={() => switchMode("mobs")}
          >
            Mobs
          </button>
        </div>
        <div className="searchwrap">
          <input
            ref={searchRef}
            className="search"
            autoFocus
            placeholder={
              mode === "items"
                ? "Search by item name or ID…"
                : "Search by mob name or ID…"
            }
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && (
            <button
              className="clearbtn"
              aria-label="Clear search"
              title="Clear search"
              onClick={() => {
                setQ("");
                searchRef.current?.focus();
              }}
            >
              ✕
            </button>
          )}
        </div>
        {mode === "items" && (
          <div className="chips">
            {CATS.map((c) => (
              <button
                key={c}
                className={"chip" + (c === cat ? " on" : "")}
                onClick={() => setCat(c)}
              >
                {c}
              </button>
            ))}
          </div>
        )}
        {mode === "mobs" && (
          <div className="mobfilters">
            <select
              className="filt"
              value={mobType}
              onChange={(e) => setMobType(e.target.value)}
            >
              <option value="all">All types</option>
              <option value="monster">Monsters</option>
              <option value="boss">Bosses</option>
            </select>
            <select
              className="filt"
              value={lvRange}
              onChange={(e) => setLvRange(e.target.value)}
            >
              <option value="all">All levels</option>
              {LV_RANGES.map((r, i) => (
                <option key={i} value={i}>
                  Lv {r[0]}–{r[1]}
                </option>
              ))}
            </select>
            <select
              className="filt"
              value={weak}
              onChange={(e) => setWeak(e.target.value)}
            >
              <option value="all">Any weakness</option>
              {WEAK_FILTERS.map(([val, label]) => (
                <option key={val} value={val}>
                  Weak: {label}
                </option>
              ))}
            </select>
            <select
              className="filt"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
            >
              {MOB_SORTS.map(([val, label]) => (
                <option key={val} value={val}>
                  Sort: {label}
                </option>
              ))}
            </select>
            <button
              className="dirbtn"
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              title={sortDir === "asc" ? "Ascending" : "Descending"}
              aria-label="Toggle sort direction"
            >
              {sortDir === "asc" ? "↑" : "↓"}
            </button>
          </div>
        )}
        <div className="count">
          {mode === "items"
            ? `${filteredItems.length.toLocaleString()} items · ${D.meta.pairs.toLocaleString()} drops · ${(D.meta.custom || 0).toLocaleString()} custom`
            : `${filteredMobs.length.toLocaleString()} mobs · ${D.meta.pairs.toLocaleString()} drops`}{" "}
          · Exodus book + v83 rates (approx.)
        </div>
      </header>

      {view.length === 0 ? (
        <div className="empty">
          {mode === "items" ? "No items found." : "No mobs found."}
        </div>
      ) : (
        <div className="grid">
          {mode === "items"
            ? view.map((it) => (
                <ItemCard key={it.id} it={it} onClick={() => goItem(it.id)} />
              ))
            : view.map((m) => (
                <MobCard key={m.id} mob={m} onClick={() => goMob(m.id)} />
              ))}
        </div>
      )}

      {pages > 1 && (
        <div className="pager">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            ‹ Prev
          </button>
          <span>
            Page {page + 1} / {pages}
          </span>
          <button
            disabled={page >= pages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Next ›
          </button>
        </div>
      )}

      <footer>
        Icons: maplestory.io (GMS v83) · Drops: Monster Book ·
        rates approximated from drop_data (v83)
        <br />
        Built by <span className="footer-name">Maicon Lara - Pumpkin</span>
      </footer>
    </div>
  );
}
