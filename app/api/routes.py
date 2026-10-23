import re
import bleach
from datetime import date, datetime, timezone
from functools import wraps
from flask import Blueprint, request, jsonify, abort
from flask_login import login_user, logout_user, current_user
from email_validator import validate_email, EmailNotValidError
from sqlalchemy import Date, Boolean, Integer
from sqlalchemy.exc import IntegrityError
from ..extensions import db, limiter
from ..models import (AdminUser, SiteSettings, CareerEntry, Credential, Expertise, BlogCategory, BlogPost,
                      HealthTip, SocialInitiative, ConsultationEnquiry, ContactEnquiry, STATUSES, now)

bp = Blueprint("api", __name__)
TAGS = ["p", "h2", "h3", "h4", "ul", "ol", "li", "strong", "em", "a", "blockquote", "br"]
PUB, DRAFT = ("is_published", True), ("status", "published")
R = {  # whitelist of writable fields per resource (prevents mass assignment)
 "career": dict(model=CareerEntry, pub=PUB, order=["display_order", "id"], fields=["employer", "designation", "location", "start_date", "end_date", "is_current", "description", "responsibilities", "achievements", "clinical_focus", "promotion_group", "display_order", "is_published"]),
 "credentials": dict(model=Credential, pub=PUB, order=["display_order", "id"], hide=("certificate_file",), fields=["title", "credential_type", "category", "issuing_institution", "completion_date", "description", "verification_status", "display_order", "is_published"]),
 "expertise": dict(model=Expertise, pub=PUB, order=["display_order", "id"], fields=["title", "slug", "category", "short_description", "detailed_description", "display_order", "is_published", "seo_title", "seo_description"]),
 "blog": dict(model=BlogPost, pub=DRAFT, order=["-published_at", "-id"], statuses=("draft", "published"), fields=["title", "slug", "excerpt", "content", "category_id", "author", "status", "seo_title", "seo_description"]),
 "blog-categories": dict(model=BlogCategory, pub=None, order=["name"], fields=["name", "slug", "description"]),
 "tips": dict(model=HealthTip, pub=DRAFT, order=["-published_at", "-id"], statuses=("draft", "published"), fields=["title", "slug", "description", "content", "category", "reference_url", "status"]),
 "initiatives": dict(model=SocialInitiative, pub=PUB, order=["id"], statuses=("planned", "completed"), fields=["title", "slug", "description", "status", "event_date", "location", "partner_name", "verified_impact_summary", "is_published"]),
}
SETTINGS_FIELDS = ["site_name", "professional_designation", "tagline", "biography", "phone", "email", "location", "consultation_enabled", "seo_title", "seo_description"]

def slugify(s): return re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")[:120]
def err(msg, code=400): return jsonify(error=msg), code
def cfg(res):
    c = R.get(res)
    if not c: abort(404)
    return c

def admin_required(f):
    @wraps(f)
    def w(*a, **k):
        if not current_user.is_authenticated: return err("Login required", 401)
        return f(*a, **k)
    return w

@bp.before_request
def csrf_guard():  # custom header cannot be sent cross-site without CORS; blocks CSRF
    if request.method not in ("GET", "HEAD", "OPTIONS") and request.path.startswith(("/api/admin", "/api/auth")):
        if request.headers.get("X-Requested-With") != "fetch": abort(403)

def ser(o, c=None):
    c = c or {}
    d = {}
    for col in o.__table__.columns:
        if col.name in c.get("hide", ()): continue
        v = getattr(o, col.name)
        d[col.name] = v.isoformat() if isinstance(v, (date, datetime)) else v
    if isinstance(o, BlogPost): d["category_name"] = o.category.name if o.category else None
    return d

def ordering(c):
    m = c["model"]
    return [getattr(m, k.lstrip("-")).desc() if k.startswith("-") else getattr(m, k) for k in c["order"]]

def apply(o, data, c):
    for f in c["fields"]:
        if f not in data: continue
        col, v = o.__table__.columns[f], data[f]
        if isinstance(col.type, Boolean): v = bool(v)
        elif isinstance(col.type, Date):
            try: v = date.fromisoformat(v) if v else None
            except (TypeError, ValueError): raise ValueError(f"{f} must be a date (YYYY-MM-DD)")
        elif isinstance(col.type, Integer):
            try: v = int(v) if v not in (None, "") else None
            except (TypeError, ValueError): raise ValueError(f"{f} must be a number")
        else:
            v = (str(v).strip() if v is not None else "") or None
            ln = getattr(col.type, "length", None)
            if v and ln and len(v) > ln: raise ValueError(f"{f} is too long")
        setattr(o, f, v)

def finalize(o, c):
    M = type(o)
    if hasattr(o, "slug"):
        base = slugify(o.slug or getattr(o, "title", None) or getattr(o, "name", None))
        if not base: raise ValueError("A title is required")
        s, n = base, 2
        while M.query.filter(M.slug == s, M.id != (o.id or 0)).first(): s, n = f"{base}-{n}", n + 1
        o.slug = s
    if "statuses" in c and o.status not in c["statuses"]: raise ValueError("Invalid status")
    if isinstance(o, BlogPost):
        if o.category_id and not db.session.get(BlogCategory, o.category_id): raise ValueError("Unknown category")
        o.content = bleach.clean(o.content or "", tags=TAGS, attributes={"a": ["href", "title"]}, protocols=["http", "https", "mailto"], strip=True)
        o.reading_time = max(1, len(re.sub(r"<[^>]+>", " ", o.content).split()) // 200)
    if isinstance(o, (BlogPost, HealthTip)) and o.status == "published" and not o.published_at: o.published_at = now()
    for f in c["fields"]:
        col = o.__table__.columns[f]
        if not col.nullable and col.default is None and getattr(o, f) in (None, ""): raise ValueError(f"{f} is required")

def save(o, data, c):
    try:
        apply(o, data, c); finalize(o, c)
        db.session.add(o); db.session.commit()
    except ValueError as ex: db.session.rollback(); return err(str(ex))
    except IntegrityError: db.session.rollback(); return err("That name or slug already exists")
    return jsonify(ser(o, c))

# ---------- public ----------
@bp.get("/settings")
def settings():
    s = SiteSettings.get(); return jsonify({f: getattr(s, f) for f in SETTINGS_FIELDS})

@bp.get("/<res>")
def pub_list(res):
    c = cfg(res); q = c["model"].query
    if c["pub"]: q = q.filter(getattr(c["model"], c["pub"][0]) == c["pub"][1])
    return jsonify([ser(o, c) for o in q.order_by(*ordering(c)).all()])

@bp.get("/<res>/<slug>")
def pub_detail(res, slug):
    c = cfg(res)
    if not hasattr(c["model"], "slug"): abort(404)
    q = c["model"].query.filter_by(slug=slug)
    if c["pub"]: q = q.filter(getattr(c["model"], c["pub"][0]) == c["pub"][1])
    o = q.first()
    return jsonify(ser(o, c)) if o else err("Not found", 404)

def text(d, key, maxlen, required=True):
    v = (d.get(key) or "").strip()
    if required and not v: raise ValueError(f"{key} is required")
    if len(v) > maxlen: raise ValueError(f"{key} is too long")
    return v
def mail(v):
    try: return validate_email(v, check_deliverability=False).normalized
    except EmailNotValidError: raise ValueError("Enter a valid email address")

@bp.post("/contact")
@limiter.limit("5/hour")
def contact():
    d = request.get_json(silent=True) or {}
    if d.get("website"): return jsonify(ok=True)  # honeypot
    try:
        if not d.get("consent"): raise ValueError("Consent is required")
        e = ContactEnquiry(name=text(d, "name", 120), email=mail(text(d, "email", 255)), subject=text(d, "subject", 200), message=text(d, "message", 3000))
    except ValueError as ex: return err(str(ex))
    db.session.add(e); db.session.commit()
    return jsonify(ok=True, message="Thank you. Your message has been received.")

@bp.post("/consultation")
@limiter.limit("5/hour")
def consultation():
    d = request.get_json(silent=True) or {}
    if d.get("website"): return jsonify(ok=True)
    try:
        if not (d.get("consent") and d.get("privacy")): raise ValueError("Consent and privacy acknowledgement are required")
        e = ConsultationEnquiry(reference_code=ConsultationEnquiry.new_ref(), full_name=text(d, "full_name", 120), email=mail(text(d, "email", 255)),
            phone=text(d, "phone", 40), country_or_region=text(d, "country_or_region", 80, False), preferred_contact_method=text(d, "preferred_contact_method", 30, False),
            preferred_time=text(d, "preferred_time", 30, False), enquiry_summary=text(d, "enquiry_summary", 1500))
    except ValueError as ex: return err(str(ex))
    db.session.add(e); db.session.commit()
    return jsonify(ok=True, message=f"Enquiry received (reference {e.reference_code}). This is not a confirmed appointment; you will be contacted to arrange one.")

# ---------- auth ----------
@bp.post("/auth/login")
@limiter.limit("10/hour")
def login():
    d = request.get_json(silent=True) or {}
    u = AdminUser.query.filter_by(username=d.get("username", "")).first()
    if u and u.is_active and u.check_password(d.get("password", "")):
        login_user(u); u.last_login_at = now(); db.session.commit()
        return jsonify(username=u.username)
    return err("Invalid username or password", 401)

@bp.post("/auth/logout")
def logout(): logout_user(); return jsonify(ok=True)

@bp.get("/auth/me")
def me():
    return jsonify(username=current_user.username) if current_user.is_authenticated else err("Not logged in", 401)

# ---------- admin ----------
@bp.get("/admin/stats")
@admin_required
def stats():
    return jsonify({"Published articles": BlogPost.query.filter_by(status="published").count(), "Draft articles": BlogPost.query.filter_by(status="draft").count(),
        "Health tips": HealthTip.query.count(), "Career entries": CareerEntry.query.count(), "Credentials": Credential.query.count(),
        "New consultation enquiries": ConsultationEnquiry.query.filter_by(status="New").count(), "Contact enquiries": ContactEnquiry.query.count()})

@bp.put("/admin/settings")
@admin_required
def settings_update():
    s, d = SiteSettings.get(), request.get_json(silent=True) or {}
    for f in SETTINGS_FIELDS:
        if f in d: setattr(s, f, bool(d[f]) if f == "consultation_enabled" else (str(d[f]).strip()[:2000] if d[f] is not None else ""))
    db.session.commit(); return settings()

@bp.get("/admin/consultations")
@admin_required
def consults(): return jsonify([ser(e) for e in ConsultationEnquiry.query.order_by(ConsultationEnquiry.created_at.desc()).all()])

@bp.put("/admin/consultations/<int:id>")
@admin_required
def consult_update(id):
    e, d = db.get_or_404(ConsultationEnquiry, id), request.get_json(silent=True) or {}
    if d.get("status") not in STATUSES: return err("Invalid status")
    e.status = d["status"]; e.private_admin_notes = (d.get("private_admin_notes") or "")[:3000]
    db.session.commit(); return jsonify(ser(e))

@bp.delete("/admin/consultations/<int:id>")
@admin_required
def consult_delete(id): db.session.delete(db.get_or_404(ConsultationEnquiry, id)); db.session.commit(); return jsonify(ok=True)

@bp.get("/admin/contacts")
@admin_required
def contacts(): return jsonify([ser(e) for e in ContactEnquiry.query.order_by(ContactEnquiry.created_at.desc()).all()])

@bp.delete("/admin/contacts/<int:id>")
@admin_required
def contact_delete(id): db.session.delete(db.get_or_404(ContactEnquiry, id)); db.session.commit(); return jsonify(ok=True)

@bp.get("/admin/<res>")
@admin_required
def a_list(res):
    c = cfg(res); return jsonify([ser(o, c) for o in c["model"].query.order_by(*ordering(c)).all()])

@bp.post("/admin/<res>")
@admin_required
def a_create(res):
    c = cfg(res); return save(c["model"](), request.get_json(silent=True) or {}, c)

@bp.put("/admin/<res>/<int:id>")
@admin_required
def a_update(res, id):
    c = cfg(res); return save(db.get_or_404(c["model"], id), request.get_json(silent=True) or {}, c)

@bp.delete("/admin/<res>/<int:id>")
@admin_required
def a_delete(res, id):
    c = cfg(res); db.session.delete(db.get_or_404(c["model"], id)); db.session.commit(); return jsonify(ok=True)
