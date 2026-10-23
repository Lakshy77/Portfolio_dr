import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Form from "./Form.jsx";
import { useApi, fmt } from "./api.js";

function Sec({ title, children, narrow }) {
  useEffect(() => { document.title = `${title} | Dr. Sweety Jain`; }, [title]);
  return <section className={narrow ? "formwrap" : ""}><h1>{title}</h1>{children}</section>;
}
function Load({ s, empty = "Nothing published yet.", children }) {
  if (s.loading) return <p>Loading…</p>;
  if (s.error) return <p className="flash error" role="alert">{s.error}</p>;
  if (!s.data || (Array.isArray(s.data) && !s.data.length)) return <p>{empty}</p>;
  return children(s.data);
}

export function Home() {
  const posts = useApi("/blog"), tips = useApi("/tips");
  return (
    <>
      <section className="hero">
        <h1>Empowering Movement. Improving Lives. Making Rehabilitation More Accessible.</h1>
        <p>Dr. Sweety Jain's professional profile brings together experience in physiotherapy, rehabilitation, continued clinical learning, and patient-focused health education. Explore her career journey, professional training, clinical interests, and vision for making rehabilitation knowledge more accessible.</p>
        <Link className="btn" to="/consultation">Book a Consultation</Link>{" "}
        <Link className="btn alt" to="/experience">Explore My Journey</Link>
      </section>
      {posts.data?.length > 0 && <section><h2>Latest Articles</h2><div className="grid">
        {posts.data.slice(0, 3).map((p) => <article className="card" key={p.id}><small>{p.category_name}</small><h3>{p.title}</h3><p>{p.excerpt}</p><Link to={`/blog/${p.slug}`}>Read Article</Link></article>)}</div></section>}
      {tips.data?.length > 0 && <section><h2>Latest Health Tips</h2><div className="grid">
        {tips.data.slice(0, 3).map((t) => <article className="card" key={t.id}><small>{t.category}</small><h3>{t.title}</h3><p>{t.description}</p></article>)}</div></section>}
      <section className="cta"><h2>Take the First Step Towards Understanding Your Recovery</h2>
        <p>Submit an enquiry; availability is confirmed separately.</p>
        <Link className="btn" to="/consultation">Request an Online Consultation</Link>{" "}<Link className="btn alt" to="/contact">Contact Me</Link></section>
    </>
  );
}

export function About() {
  const s = useApi("/settings");
  return <Sec title="About Dr. Sweety Jain">
    <p>Dr. Sweety Jain's professional journey reflects a commitment to physiotherapy, rehabilitation, patient education, and continuous professional learning. Her approach emphasizes understanding individual needs, supporting appropriate recovery, and helping people make informed decisions about their health.</p>
    {s.data?.biography && <p className="pre">{s.data.biography}</p>}
    <h2>Professional Philosophy</h2>
    <p>Every individual has a different story, lifestyle, and recovery journey. I believe that care should be thoughtful, evidence-informed, and responsive to the person's needs. Helping people understand their bodies and participate actively in recovery is an important part of effective health education.</p>
    <h2>My Approach to Care</h2>
    <p>Understanding individual concerns, appropriate assessment, individualized care planning, rehabilitation and movement education, patient participation, and referral when required. No recovery or outcome is guaranteed.</p>
  </Sec>;
}

export function Experience() {
  const s = useApi("/career");
  const groups = new Map();
  (s.data || []).forEach((e) => { const k = e.promotion_group || e.employer; groups.set(k, [...(groups.get(k) || []), e]); });
  return <Sec title="Career & Experience"><Load s={s} empty="Career timeline will be published once employment details are verified.">
    {() => <div className="timeline">{[...groups].map(([name, roles]) => (
      <article className="card" key={name}><h3>{name}</h3>
        {roles.map((r) => <details key={r.id}>
          <summary><strong>{r.designation}</strong> · {fmt(r.start_date)}{r.start_date ? " – " : ""}{r.is_current ? "Present (current position)" : fmt(r.end_date)}</summary>
          {r.employer !== name && <p>{r.employer}</p>}
          {r.location && <p>{r.location}</p>}
          {["description", "responsibilities", "achievements", "clinical_focus"].map((f) => r[f] && <p className="pre" key={f}>{r[f]}</p>)}
        </details>)}</article>))}</div>}
  </Load></Sec>;
}

export function Expertise() {
  const s = useApi("/expertise"); const [q, setQ] = useState("");
  return <Sec title="Clinical Expertise">
    <label htmlFor="q">Search</label><input id="q" value={q} onChange={(e) => setQ(e.target.value)} />
    <Load s={s} empty="Areas of practice will be published once qualifications and scope of practice are verified.">
      {(d) => <div className="grid">{d.filter((x) => x.title.toLowerCase().includes(q.toLowerCase())).map((x) =>
        <article className="card" key={x.id}><small>{x.category}</small><h3>{x.title}</h3><p>{x.short_description}</p><Link to={`/expertise/${x.slug}`}>Learn more</Link></article>)}</div>}
    </Load></Sec>;
}
export function ExpertiseDetail() {
  const { slug } = useParams(); const s = useApi(`/expertise/${slug}`);
  return <Sec title={s.data?.title || "Expertise"}><Load s={s}>{(d) => <><p className="pre">{d.detailed_description || d.short_description}</p>
    <p className="notice">General educational information only. Suitability depends on individual professional assessment.</p></>}</Load></Sec>;
}

export function Credentials() {
  const s = useApi("/credentials"); const [q, setQ] = useState(""); const [cat, setCat] = useState("");
  const cats = [...new Set((s.data || []).map((c) => c.category).filter(Boolean))];
  return <Sec title="Education & Certifications">
    <div className="row"><div><label htmlFor="q">Search</label><input id="q" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div><label htmlFor="c">Category</label><select id="c" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All</option>{cats.map((c) => <option key={c}>{c}</option>)}</select></div></div>
    <Load s={s} empty="Credentials will be published once certificates are verified.">
      {(d) => <div className="grid">{d.filter((c) => (!cat || c.category === cat) && (c.title + (c.issuing_institution || "")).toLowerCase().includes(q.toLowerCase())).map((c) =>
        <article className="card" key={c.id}><small>{c.category}</small><h3>{c.title}</h3><p>{c.issuing_institution} {c.completion_date && `· ${fmt(c.completion_date)}`}</p><p>{c.description}</p></article>)}</div>}
    </Load></Sec>;
}

const PER = 6;
export function Blog() {
  const s = useApi("/blog"); const [q, setQ] = useState(""); const [cat, setCat] = useState(""); const [pg, setPg] = useState(1);
  const all = (s.data || []).filter((p) => (!cat || p.category_name === cat) && (p.title + (p.excerpt || "")).toLowerCase().includes(q.toLowerCase()));
  const cats = [...new Set((s.data || []).map((p) => p.category_name).filter(Boolean))];
  const pages = Math.max(1, Math.ceil(all.length / PER));
  return <Sec title="Blogs & Articles">
    <div className="row"><div><label htmlFor="q">Search</label><input id="q" value={q} onChange={(e) => { setQ(e.target.value); setPg(1); }} /></div>
      <div><label htmlFor="c">Category</label><select id="c" value={cat} onChange={(e) => { setCat(e.target.value); setPg(1); }}><option value="">All</option>{cats.map((c) => <option key={c}>{c}</option>)}</select></div></div>
    <Load s={s} empty="No articles have been published yet.">{() => <>
      <div className="grid">{all.slice((pg - 1) * PER, pg * PER).map((p) => <article className="card" key={p.id}><small>{p.category_name} · {p.reading_time} min read</small><h3>{p.title}</h3><p>{p.excerpt}</p><Link to={`/blog/${p.slug}`}>Read Article</Link></article>)}</div>
      {all.length === 0 && <p>No matching articles.</p>}
      <p className="pager"><button className="btn alt" disabled={pg <= 1} onClick={() => setPg(pg - 1)}>Previous</button> Page {pg} of {pages} <button className="btn alt" disabled={pg >= pages} onClick={() => setPg(pg + 1)}>Next</button></p></>}
    </Load></Sec>;
}
export function BlogDetail() {
  const { slug } = useParams(); const s = useApi(`/blog/${slug}`);
  return <Sec title={s.data?.title || "Article"}><Load s={s} empty="Article not found.">{(p) => <>
    <p><small>{p.author} · {p.published_at && new Date(p.published_at).toLocaleDateString("en-IN")} · {p.reading_time} min read</small></p>
    <div className="article" dangerouslySetInnerHTML={{ __html: p.content }} />
    <p className="notice">General educational content only; not a substitute for individualized medical advice. <Link to="/disclaimer">Medical Disclaimer</Link></p>
    <Link to="/blog">← All articles</Link></>}</Load></Sec>;
}

export function Tips() {
  const s = useApi("/tips"); const [cat, setCat] = useState("");
  const cats = [...new Set((s.data || []).map((t) => t.category).filter(Boolean))];
  return <Sec title="Health Tips">
    <div className="tags">{["", ...cats].map((c) => <button key={c} className={`btn alt ${cat === c ? "on" : ""}`} onClick={() => setCat(c)}>{c || "All"}</button>)}</div>
    <Load s={s} empty="No tips published yet.">{(d) => <div className="grid">{d.filter((t) => !cat || t.category === cat).map((t) =>
      <article className="card" key={t.id}><small>{t.category}</small><h3>{t.title}</h3><p>{t.description}</p>{t.content && <p className="pre">{t.content}</p>}</article>)}</div>}</Load></Sec>;
}

export function Mission() {
  const s = useApi("/initiatives");
  return <Sec title="A Healthier Community Begins with Awareness">
    <p>I aspire to make reliable health education and rehabilitation knowledge easier to understand and more accessible to people from all walks of life. Through public education, practical health awareness, and community initiatives, my vision is to help individuals make informed choices about movement, recovery, and long-term wellbeing.</p>
    <h2>Vision</h2><p>To contribute to a future in which people have better access to understandable health information, rehabilitation awareness, and practical knowledge that helps them participate in their own wellbeing.</p>
    <h2>Values</h2><p>Accessibility · Education · Compassion · Evidence-informed practice · Inclusivity · Continuous learning · Community engagement</p>
    <h2>Initiatives</h2>
    <Load s={s}>{(d) => <div className="grid">{d.map((i) => <article className="card" key={i.id}>
      <small>{i.status === "completed" ? "Completed" : "Planned (future aspiration)"}</small><h3>{i.title}</h3><p>{i.description}</p>
      {i.status === "completed" && i.verified_impact_summary && <p>{i.verified_impact_summary}</p>}</article>)}</div>}</Load>
    <p><Link className="btn" to="/contact">Collaborate With Me</Link></p></Sec>;
}

const LEGAL = {
  privacy: ["Privacy Policy", "Enquiry details you submit are stored securely, used only to respond to you, and visible only to the site administrator. Please do not submit detailed medical records. Contact us to request access to or deletion of your data."],
  disclaimer: ["Medical Disclaimer", "Website content is for general educational purposes and does not replace individualized assessment or professional advice. Online consultation has limitations; seek in-person care when necessary. In an emergency, seek urgent local medical assistance."],
  terms: ["Terms of Use", "Content is educational and provided without guarantees of any treatment outcome. Use of this website is subject to these terms."],
};
export function Legal({ id }) { return <Sec title={LEGAL[id][0]}><p>{LEGAL[id][1]}</p></Sec>; }

const contactFields = [{ name: "name", label: "Name" }, { name: "email", label: "Email", type: "email" }, { name: "subject", label: "Subject" },
  { name: "message", label: "Message", type: "textarea" }, { name: "consent", label: "I agree to my details being used to respond to this message.", type: "checkbox" }];
const consultFields = [{ name: "full_name", label: "Full name" }, { name: "email", label: "Email", type: "email" }, { name: "phone", label: "Phone" },
  { name: "country_or_region", label: "Country or region (optional)" },
  { name: "preferred_contact_method", label: "Preferred contact method", type: "select", options: ["email", "phone", "whatsapp"] },
  { name: "preferred_time", label: "Preferred time (optional)" }, { name: "enquiry_summary", label: "Brief reason for enquiry", type: "textarea" },
  { name: "consent", label: "I consent to being contacted about this enquiry.", type: "checkbox" }, { name: "privacy", label: "I have read the Privacy Policy.", type: "checkbox" }];

export function Contact() {
  const s = useApi("/settings");
  return <Sec title="Contact" narrow>
    {s.data && (s.data.phone || s.data.email || s.data.location) && <p>{[s.data.phone, s.data.email, s.data.location].filter(Boolean).join(" · ")}</p>}
    <Form endpoint="/api/contact" fields={contactFields} notice="Please do not send detailed medical records through this form." /></Sec>;
}
export function Consultation() {
  return <Sec title="Online Consultation Enquiry" narrow>
    <Form endpoint="/api/consultation" fields={consultFields} notice="This is an enquiry, not a confirmed booking. Do not submit medical records. In an emergency, seek urgent local medical help." /></Sec>;
}
