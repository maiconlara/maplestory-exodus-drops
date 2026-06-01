import { useState, useMemo, useEffect } from "react";

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

const CATS = ["All", "Custom", "Equip", "Use", "Etc", "Setup", "Cash"];

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
          #{it.id} · {it.cat} · {it.d.length} mob{it.d.length !== 1 ? "s" : ""}
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
          #{mob.id} · {mob.n} drop{mob.n !== 1 ? "s" : ""}
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

function MobDetail({ id, drops, onBack, onItem }) {
  return (
    <div className="detail">
      <button className="back" onClick={onBack}>
        ← Back
      </button>
      <div className="dhead">
        <Icon id={id} size={72} kind="mob" />
        <div>
          <h1>{mobName(id)}</h1>
          <div className="sub">
            Mob ID {id} · drops {drops.length} item
            {drops.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>
      {drops.length === 0 ? (
        <div className="empty">No drop data.</div>
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

export default function App() {
  const [mode, setMode] = useState("items");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [page, setPage] = useState(0);
  const [stack, setStack] = useState([]);
  const PER = 60;

  const itemById = useMemo(
    () => new Map(D.items.map((it) => [it.id, it])),
    [],
  );

  // Invert items -> per-mob drop list (built once, in the browser)
  const { mobIndex, mobList } = useMemo(() => {
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
    const list = Object.keys(idx)
      .map((mid) => ({ id: Number(mid), name: mobName(mid), n: idx[mid].length }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return { mobIndex: idx, mobList: list };
  }, []);

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
    if (!s) return mobList;
    return mobList.filter(
      (m) => m.name.toLowerCase().includes(s) || String(m.id).includes(s),
    );
  }, [q, mobList]);

  useEffect(() => setPage(0), [q, cat, mode]);

  const switchMode = (m) => {
    setMode(m);
    setStack([]);
    setQ("");
    setCat("All");
    setPage(0);
  };
  const push = (sel) => {
    setStack((s) => [...s, sel]);
    window.scrollTo(0, 0);
  };
  const back = () => setStack((s) => s.slice(0, -1));
  const openItemById = (itemId) => {
    const full = itemById.get(itemId);
    if (full) push({ kind: "item", it: full });
  };

  const cur = stack[stack.length - 1] || null;

  if (cur?.kind === "item")
    return (
      <div className="wrap">
        <ItemDetail
          it={cur.it}
          onBack={back}
          onMob={(mid) => push({ kind: "mob", id: mid })}
        />
      </div>
    );
  if (cur?.kind === "mob")
    return (
      <div className="wrap">
        <MobDetail
          id={cur.id}
          drops={mobIndex[cur.id] || []}
          onBack={back}
          onItem={openItemById}
        />
      </div>
    );

  const list = mode === "items" ? filteredItems : filteredMobs;
  const pages = Math.max(1, Math.ceil(list.length / PER));
  const view = list.slice(page * PER, page * PER + PER);

  return (
    <div className="wrap">
      <header>
        <h2>🍁 Exodus — Item Drop Browser</h2>
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
        <input
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
                <ItemCard
                  key={it.id}
                  it={it}
                  onClick={() => push({ kind: "item", it })}
                />
              ))
            : view.map((m) => (
                <MobCard
                  key={m.id}
                  mob={m}
                  onClick={() => push({ kind: "mob", id: m.id })}
                />
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
