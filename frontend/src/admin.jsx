import { useCallback, useEffect, useState } from "react";
import { NavLink, Route, Routes, useParams } from "react-router-dom";
import { api } from "./api.js";

const T = (name, label, type = "text", extra = {}) => ({ name, label, type, ...extra });
const PUB = T("is_published", "Published", "bool");
const ST = T("status", "Status", "select", { options: ["draft", "published"] });
const RES = {
  career: { title: "Career Timeline", cols: ["employer", "designation", "is_published"], fields: [T("employer", "Employer"), T("designation", "Designation"), T("location", "Location"), T("start_date", "Start date", "date"), T("end_date", "End date", "date"), T("is_current", "Current position", "bool"), T("promotion_group", "Promotion group (same text on every role at one employer)"), T("description", "Description", "textarea"), T("responsibilities", "Responsibilities", "textarea"), T("achievements", "Verified achievements", "textarea"), T("clinical_focus", "Clinical focus", "textarea"), T("display_order", "Display order", "number"), PUB] },
  expertise: { title: "Clinical Expertise", cols: ["title", "category", "is_published"], fields: [T("title", "Title"), T("slug", "Slug (optional)"), T("category", "Category"), T("short_description", "Short summary", "textarea"), T("detailed_description", "Detailed description", "textarea"), T("seo_title", "SEO title"), T("seo_description", "SEO description"), T("display_order", "Display order", "number"), PUB] },
  credentials: { title: "Education & Certifications", cols: ["title", "category", "verification_status", "is_published"], fields: [T("title", "Exact title as printed on certificate"), T("credential_type", "Type (degree / certificate / registration)"), T("category", "Category"), T("issuing_institution", "Issuing institution"), T("completion_date", "Completion date", "date"), T("description", "Description", "textarea"), T("verification_status", "Verification status", "select", { options: ["unverified", "verified"] }), T("display_order", "Display order", "number"), PUB] },
  blog: { title: "Blog Posts", cols: ["title", "status", "published_at"], fields: [T("title", "Title"), T("slug", "Slug (optional)"), T("excerpt", "Excerpt", "textarea"), T("content", "Content (HTML: p, h2-h4, ul, ol, li, strong, em, a, blockquote; sanitized on save)", "textarea", { rows: 14 }), T("category_id", "Category", "ref"), T("author", "Author"), ST, T("seo_title", "SEO title"), T("seo_description", "SEO description")] },
  "blog-categories": { title: "Categories", cols: ["name", "slug"], fields: [T("name", "Name"), T("slug", "Slug (optional)"), T("description", "Description", "textarea")] },
  tips: { title: "Health Tips", cols: ["title", "category", "status"], fields: [T("title", "Title"), T("description", "Short description", "textarea"), T("content", "Details (optional)", "textarea"), T("category", "Category"), T("reference_url", "Reference URL (optional)"), ST] },
  initiatives: { title: "Mission & Initiatives", cols: ["title", "status", "is_published"], fields: [T("title", "Title"), T("description", "Description", "textarea"), T("status", "Status", "select", { options: ["planned", "completed"] }), T("event_date", "Date", "date"), T("location", "Location"), T("partner_name", "Partner organization"), T("verified_impact_summary", "Verified impact summary (only if verified)", "textarea"), PUB] },
};

function Field({ f, v, set, cats }) {
  const id = "f_" + f.name;
  if (f.type === "bool") return <div className="field"><label><input type="checkbox" checked={!!v} onChange={(e) => set(f.name, e.target.checked)} /> {f.label}</label></div>;
  return <div className="field"><label htmlFor={id}>{f.label}</label>
    {f.type === "textarea" ? <textarea id={id} rows={f.rows || 4} value={v ?? ""} onChange={(e) => set(f.name, e.target.value)} />
      : f.type === "select" ? <select id={id} value={v ?? f.options[0]} onChange={(e) => set(f.name, e.target.value)}>{f.options.map((o) => <option key={o}>{o}</option>)}</select>
      : f.type === "ref" ? <select id={id} value={v ?? ""} onChange={(e) => set(f.name, e.target.value)}><option value="">None</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      : <input id={id} type={f.type} value={v ?? ""} onChange={(e) => set(f.name, e.target.value)} />}</div>;
}

function Msg({ m }) { return m ? <p className={`flash ${m.t}`} role="status">{m.x}</p> : null; }

function Resource() {
  const { res } = useParams(); const cfg = RES[res];
  const [items, setItems] = useState([]), [edit, setEdit] = useState(null), [msg, setMsg] = useState(null), [cats, setCats] = useState([]);
  const load = useCallback(() => api(`/admin/${res}`).then(setItems).catch((e) => setMsg({ t: "error", x: e.message })), [res]);
  useEffect(() => { setEdit(null); setMsg(null); if (cfg) { load(); if (cfg.fields.some((f) => f.type === "ref")) api("/admin/blog-categories").then(setCats); } }, [res]);
  if (!cfg) return <p>Unknown section.</p>;
  const blank = () => Object.fromEntries(cfg.fields.map((f) => [f.name, f.type === "bool" ? false : f.type === "select" ? f.options[0] : ""]));
  const set = (n, v) => setEdit((s) => ({ ...s, [n]: v }));
  async function save(e) {
    e.preventDefault();
    try {
      await api(edit.id ? `/admin/${res}/${edit.id}` : `/admin/${res}`, { method: edit.id ? "PUT" : "POST", body: edit });
      setMsg({ t: "success", x: "Saved." }); setEdit(null); load();
    } catch (er) { setMsg({ t: "error", x: er.message }); }
  }
  async function del(i) {
    if (!window.confirm("Delete this item permanently?")) return;
    try { await api(`/admin/${res}/${i.id}`, { method: "DELETE" }); setMsg({ t: "success", x: "Deleted." }); load(); } catch (er) { setMsg({ t: "error", x: er.message }); }
  }
  return <div><h1>{cfg.title}</h1><Msg m={msg} />
    {edit ? <form onSubmit={save}>{cfg.fields.map((f) => <Field key={f.name} f={f} v={edit[f.name]} set={set} cats={cats} />)}
      <button className="btn">Save</button> <button type="button" className="btn alt" onClick={() => setEdit(null)}>Cancel</button></form>
    : <><button className="btn" onClick={() => setEdit(blank())}>Add new</button>
      <div className="tablewrap"><table><thead><tr>{cfg.cols.map((c) => <th key={c}>{c}</th>)}<th>Actions</th></tr></thead>
        <tbody>{items.map((i) => <tr key={i.id}>{cfg.cols.map((c) => <td key={c}>{String(i[c] ?? "")}</td>)}
          <td><button className="btn alt" onClick={() => setEdit({ ...blank(), ...Object.fromEntries(Object.entries(i).map(([k, v]) => [k, v ?? ""])) })}>Edit</button> <button className="btn alt" onClick={() => del(i)}>Delete</button></td></tr>)}
          {items.length === 0 && <tr><td colSpan={cfg.cols.length + 1}>Nothing here yet.</td></tr>}</tbody></table></div></>}</div>;
}

function Dashboard() {
  const [s, setS] = useState({});
  useEffect(() => { api("/admin/stats").then(setS).catch(() => {}); }, []);
  return <div><h1>Dashboard</h1><div className="grid">{Object.entries(s).map(([k, v]) => <div className="card" key={k}><h3>{v}</h3><p>{k}</p></div>)}</div></div>;
}

function Settings() {
  const [v, setV] = useState(null), [msg, setMsg] = useState(null);
  useEffect(() => { api("/settings").then(setV); }, []);
  if (!v) return <p>Loading…</p>;
  const F = [["site_name", "Site name"], ["professional_designation", "Professional designation (verify before publishing)"], ["tagline", "Tagline"], ["biography", "Biography", "textarea"], ["phone", "Phone"], ["email", "Email"], ["location", "Location (no home address)"]];
  async function save(e) { e.preventDefault(); try { setV(await api("/admin/settings", { method: "PUT", body: v })); setMsg({ t: "success", x: "Saved." }); } catch (er) { setMsg({ t: "error", x: er.message }); } }
  return <form onSubmit={save}><h1>Website Settings</h1><Msg m={msg} />
    {F.map(([n, l, t]) => <Field key={n} f={T(n, l, t || "text")} v={v[n]} set={(k, x) => setV({ ...v, [k]: x })} />)}
    <Field f={T("consultation_enabled", "Consultation enquiries enabled", "bool")} v={v.consultation_enabled} set={(k, x) => setV({ ...v, [k]: x })} />
    <button className="btn">Save</button></form>;
}

const STATUSES = ["New", "Under Review", "Awaiting Response", "Scheduled", "Completed", "Cancelled", "Closed"];
function Consultations() {
  const [items, setItems] = useState([]), [msg, setMsg] = useState(null), [q, setQ] = useState("");
  const load = () => api("/admin/consultations").then(setItems);
  useEffect(() => { load(); }, []);
  const upd = (id, k, v) => setItems(items.map((i) => (i.id === id ? { ...i, [k]: v } : i)));
  async function save(i) { try { await api(`/admin/consultations/${i.id}`, { method: "PUT", body: i }); setMsg({ t: "success", x: "Updated." }); } catch (e) { setMsg({ t: "error", x: e.message }); } }
  async function del(i) { if (window.confirm("Delete this enquiry permanently?")) { await api(`/admin/consultations/${i.id}`, { method: "DELETE" }); load(); } }
  return <div><h1>Consultation Enquiries</h1><Msg m={msg} />
    <label htmlFor="s">Search</label><input id="s" value={q} onChange={(e) => setQ(e.target.value)} />
    {items.filter((i) => (i.full_name + i.email + i.reference_code).toLowerCase().includes(q.toLowerCase())).map((i) => <div className="card" key={i.id}>
      <h3>{i.reference_code} · {i.full_name}</h3><p>{i.email} · {i.phone} · prefers {i.preferred_contact_method} · {new Date(i.created_at).toLocaleString("en-IN")}</p><p className="pre">{i.enquiry_summary}</p>
      <label>Status <select value={i.status} onChange={(e) => upd(i.id, "status", e.target.value)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
      <label>Private notes <textarea value={i.private_admin_notes || ""} onChange={(e) => upd(i.id, "private_admin_notes", e.target.value)} /></label>
      <button className="btn" onClick={() => save(i)}>Save</button> <button className="btn alt" onClick={() => del(i)}>Delete</button></div>)}
    {items.length === 0 && <p>No enquiries yet.</p>}</div>;
}

function Contacts() {
  const [items, setItems] = useState([]);
  const load = () => api("/admin/contacts").then(setItems);
  useEffect(() => { load(); }, []);
  return <div><h1>Contact Enquiries</h1>{items.map((c) => <div className="card" key={c.id}><h3>{c.subject}</h3><p>{c.name} · {c.email}</p><p className="pre">{c.message}</p>
    <button className="btn alt" onClick={async () => { if (window.confirm("Delete?")) { await api(`/admin/contacts/${c.id}`, { method: "DELETE" }); load(); } }}>Delete</button></div>)}
    {items.length === 0 && <p>No messages yet.</p>}</div>;
}

function Login({ onLogin }) {
  const [u, setU] = useState(""), [p, setP] = useState(""), [msg, setMsg] = useState(null);
  async function go(e) { e.preventDefault(); try { onLogin((await api("/auth/login", { method: "POST", body: { username: u, password: p } })).username); } catch (er) { setMsg({ t: "error", x: er.message }); } }
  return <section className="formwrap"><h1>Admin login</h1><Msg m={msg} /><form onSubmit={go}>
    <div className="field"><label htmlFor="u">Username</label><input id="u" value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" /></div>
    <div className="field"><label htmlFor="p">Password</label><input id="p" type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" /></div>
    <button className="btn">Log in</button></form></section>;
}

export default function AdminApp() {
  const [user, setUser] = useState(undefined);
  useEffect(() => { api("/auth/me").then((d) => setUser(d.username)).catch(() => setUser(null)); }, []);
  if (user === undefined) return <p>Loading…</p>;
  if (!user) return <Login onLogin={setUser} />;
  const links = [["", "Dashboard"], ["settings", "Website Settings"], ["career", "Career Timeline"], ["expertise", "Clinical Expertise"], ["credentials", "Education & Certifications"], ["blog", "Blogs"], ["blog-categories", "Categories"], ["tips", "Health Tips"], ["initiatives", "Mission & Initiatives"], ["consultations", "Consultation Enquiries"], ["contacts", "Contact Enquiries"]];
  return <div className="admin"><aside className="side" aria-label="Admin"><p>Signed in as {user}</p>
    {links.map(([to, l]) => <NavLink key={to} end={to === ""} to={`/admin/${to}`}>{l}</NavLink>)}
    <button className="btn alt" onClick={async () => { await api("/auth/logout", { method: "POST" }); setUser(null); }}>Logout</button></aside>
    <div><Routes><Route index element={<Dashboard />} /><Route path="settings" element={<Settings />} /><Route path="consultations" element={<Consultations />} />
      <Route path="contacts" element={<Contacts />} /><Route path=":res" element={<Resource />} /></Routes></div></div>;
}
