import { useState } from "react";
import { Link, NavLink, Outlet, Route, Routes } from "react-router-dom";
import AdminApp from "./admin.jsx";
import * as P from "./pages.jsx";

const NAV = [["/about", "About"], ["/experience", "Experience"], ["/expertise", "Expertise"], ["/credentials", "Credentials"], ["/blog", "Articles"], ["/tips", "Health Tips"], ["/mission", "Social Impact"], ["/contact", "Contact"]];

function Layout() {
  const [open, setOpen] = useState(false);
  return (<>
    <a className="skip" href="#main">Skip to content</a>
    <header className="nav"><Link className="brand" to="/">Dr. Sweety Jain</Link>
      <button className="menu" aria-expanded={open} aria-label="Toggle menu" onClick={() => setOpen(!open)}>☰</button>
      <nav aria-label="Main" className={open ? "open" : ""} onClick={() => setOpen(false)}>
        {NAV.map(([to, l]) => <NavLink key={to} to={to}>{l}</NavLink>)}
        <Link className="btn" to="/consultation">Book Online Consultation</Link></nav></header>
    <main id="main"><Outlet /></main>
    <footer><p>© {new Date().getFullYear()} Dr. Sweety Jain. Educational content only; not a substitute for individual medical advice.</p>
      <p><Link to="/privacy">Privacy Policy</Link> · <Link to="/disclaimer">Medical Disclaimer</Link> · <Link to="/terms">Terms of Use</Link></p></footer></>);
}

export default function App() {
  return (<Routes>
    <Route path="/admin/*" element={<main className="adminwrap"><AdminApp /></main>} />
    <Route element={<Layout />}>
      <Route path="/" element={<P.Home />} />
      <Route path="/about" element={<P.About />} />
      <Route path="/experience" element={<P.Experience />} />
      <Route path="/expertise" element={<P.Expertise />} />
      <Route path="/expertise/:slug" element={<P.ExpertiseDetail />} />
      <Route path="/credentials" element={<P.Credentials />} />
      <Route path="/blog" element={<P.Blog />} />
      <Route path="/blog/:slug" element={<P.BlogDetail />} />
      <Route path="/tips" element={<P.Tips />} />
      <Route path="/mission" element={<P.Mission />} />
      <Route path="/contact" element={<P.Contact />} />
      <Route path="/consultation" element={<P.Consultation />} />
      {["privacy", "disclaimer", "terms"].map((id) => <Route key={id} path={`/${id}`} element={<P.Legal id={id} />} />)}
      <Route path="*" element={<section><h1>Page not found</h1><Link to="/">Return home</Link></section>} />
    </Route></Routes>);
}
