import { useState, useMemo, useEffect } from "react";

const D = window.MAPLE_DATA || {
  meta: { items: 0, pairs: 0, custom: 0, iconBase: "" },
  mobs: {},
  items: [],
};

const iconUrl = (id) => `${D.meta.iconBase}${id}/icon`;
const mobName = (id) => D.mobs[String(id)] || `mob ${id}`;
const dispName = (it) =>
  it.name && it.name.trim() ? it.name : `(item ${it.id})`;

function fmtPct(c) {
  if (c == null) return "—";
  const p = c / 10000;
  const s = p >= 1 ? p.toFixed(2) : p >= 0.1 ? p.toFixed(3) : p.toFixed(4);
  return "≈" + s.replace(/\.?0+$/, "") + "%";
}
const oneIn = (c) =>
  c == null ? "—" : "~1/" + Math.max(1, Math.round(1e6 / c)).toLocaleString();

const CATS = ["All", "Custom", "Equip", "Use", "Etc", "Setup", "Cash"];

function Icon({ id, size, px }) {
  const [err, setErr] = useState(false);
  if (err)
    return (
      <div className="ph" style={{ width: size, height: size }}>
        ?
      </div>
    );
  return (
    <img
      src={iconUrl(id)}
      width={size}
      height={size}
      loading="lazy"
      alt=""
      onError={() => setErr(true)}
      style={{
        objectFit: "contain",
        imageRendering: px ? "pixelated" : "auto",
      }}
    />
  );
}

function Card({ it, onClick }) {
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

function Detail({ it, onBack }) {
  return (
    <div className="detail">
      <button className="back" onClick={onBack}>
        ← Back to list
      </button>
      <div className="dhead">
        <Icon id={it.id} size={72} px />
        <div>
          <h1>
            {dispName(it)}
            {it.cu ? <span className="badge">CUSTOM</span> : null}
          </h1>
          <div className="sub">
            ID {it.id} · {it.cat} · {it.d.length} drop source
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
              <th>Mob</th>
              <th>Mob ID</th>
              <th>Chance</th>
              <th>Rate</th>
              <th>Qty</th>
            </tr>
          </thead>
          <tbody>
            {it.d.map((d, i) => (
              <tr key={i}>
                <td>{mobName(d[0])}</td>
                <td className="mono">{d[0] < 0 ? "—" : d[0]}</td>
                <td className="mono">{fmtPct(d[1])}</td>
                <td className="mono dim">{oneIn(d[1])}</td>
                <td className="mono">{d[2] || "1"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {it.d.length > 0 && (
        <div className="legend">
          ≈ approximate rate (v83 baseline) · — drop confirmed by the Exodus
          book, rate unknown
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState(null);
  const PER = 60;

  const filtered = useMemo(() => {
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

  useEffect(() => setPage(0), [q, cat]);

  if (sel)
    return (
      <div className="wrap">
        <Detail it={sel} onBack={() => setSel(null)} />
      </div>
    );

  const pages = Math.max(1, Math.ceil(filtered.length / PER));
  const view = filtered.slice(page * PER, page * PER + PER);

  return (
    <div className="wrap">
      <header>
        <h2>🍁 Exodus — Item Drop Browser</h2>
        <input
          className="search"
          autoFocus
          placeholder="Search by item name or ID…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
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
        <div className="count">
          {filtered.length.toLocaleString()} items ·{" "}
          {D.meta.pairs.toLocaleString()} drops ·{" "}
          {(D.meta.custom || 0).toLocaleString()} custom · Exodus book + v83
          rates (approx.)
        </div>
      </header>

      {view.length === 0 ? (
        <div className="empty">No items found.</div>
      ) : (
        <div className="grid">
          {view.map((it) => (
            <Card
              key={it.id}
              it={it}
              onClick={() => {
                setSel(it);
                window.scrollTo(0, 0);
              }}
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
        Icons: maplestory.io (GMS v83) · Drops: Exodus client Monster Book ·
        rates approximated from drop_data (v83)
        <br />
        Built by <span className="footer-name">Maicon Lara - Pumpkin</span>
      </footer>
    </div>
  );
}
