import { useEffect, useState } from "react";

export async function api(path, { method = "GET", body } = {}) {
  const r = await fetch("/api" + path, {
    method, credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-Requested-With": "fetch" },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try { data = await r.json(); } catch { /* empty body */ }
  if (!r.ok) throw Object.assign(new Error(data.error || "Request failed"), { status: r.status });
  return data;
}

export function useApi(path) {
  const [s, setS] = useState({ data: null, loading: true, error: null });
  useEffect(() => {
    let on = true;
    setS({ data: null, loading: true, error: null });
    api(path).then((d) => on && setS({ data: d, loading: false, error: null }))
      .catch((e) => on && setS({ data: null, loading: false, error: e.message }));
    return () => { on = false; };
  }, [path]);
  return s;
}

export const fmt = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "");
