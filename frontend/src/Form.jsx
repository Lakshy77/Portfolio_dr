import { useState } from "react";

export default function Form({ endpoint, fields, notice }) {
  const [values, setValues] = useState({ website: "" });
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (n, v) => setValues((s) => ({ ...s, [n]: v }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setStatus(null);
    try {
      const r = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok) { setStatus({ type: "success", text: data.message || "Received." }); setValues({ website: "" }); }
      else setStatus({ type: "error", text: data.error || "Something went wrong. Please try again." });
    } catch { setStatus({ type: "error", text: "Could not reach the server." }); }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} noValidate>
      {notice && <p className="notice">{notice}</p>}
      {status && <p className={`flash ${status.type}`} role="status">{status.text}</p>}
      {fields.map((f) => (
        <div className="field" key={f.name}>
          {f.type === "checkbox" ? (
            <label><input type="checkbox" checked={!!values[f.name]} onChange={(e) => set(f.name, e.target.checked)} /> {f.label}</label>
          ) : (
            <>
              <label htmlFor={f.name}>{f.label}</label>
              {f.type === "textarea"
                ? <textarea id={f.name} rows="5" value={values[f.name] || ""} onChange={(e) => set(f.name, e.target.value)} />
                : f.type === "select"
                ? <select id={f.name} value={values[f.name] || f.options[0]} onChange={(e) => set(f.name, e.target.value)}>
                    {f.options.map((o) => <option key={o}>{o}</option>)}
                  </select>
                : <input id={f.name} type={f.type || "text"} value={values[f.name] || ""} onChange={(e) => set(f.name, e.target.value)} />}
            </>
          )}
        </div>
      ))}
      <div className="hp" aria-hidden="true">
        <input tabIndex="-1" autoComplete="off" value={values.website} onChange={(e) => set("website", e.target.value)} />
      </div>
      <button className="btn" disabled={busy}>{busy ? "Sending…" : "Submit"}</button>
    </form>
  );
}
