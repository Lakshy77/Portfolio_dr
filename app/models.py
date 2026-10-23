import secrets
from datetime import datetime, timezone
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from .extensions import db, login_manager

def now(): return datetime.now(timezone.utc)

class Stamped:
    created_at = db.Column(db.DateTime(timezone=True), default=now, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=now, onupdate=now)

class AdminUser(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False, index=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime(timezone=True), default=now)
    last_login_at = db.Column(db.DateTime(timezone=True))
    @property
    def is_active(self): return self.active
    def set_password(self, pw): self.password_hash = generate_password_hash(pw)
    def check_password(self, pw): return check_password_hash(self.password_hash, pw)

@login_manager.user_loader
def load_user(uid): return db.session.get(AdminUser, int(uid))

class SiteSettings(Stamped, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    site_name = db.Column(db.String(120), default="Dr. Sweety Jain")
    professional_designation = db.Column(db.String(200), default="")
    tagline = db.Column(db.String(255), default="Empowering Movement. Improving Lives. Making Rehabilitation More Accessible.")
    biography = db.Column(db.Text, default="")
    profile_image = db.Column(db.String(255))
    phone = db.Column(db.String(40), default="")
    email = db.Column(db.String(255), default="")
    location = db.Column(db.String(255), default="")
    consultation_enabled = db.Column(db.Boolean, default=True)
    social_links = db.Column(db.JSON, default=dict)
    seo_title = db.Column(db.String(160))
    seo_description = db.Column(db.String(300))
    @classmethod
    def get(cls):
        s = cls.query.first()
        if not s:
            s = cls(); db.session.add(s); db.session.commit()
        return s

class CareerEntry(Stamped, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    employer = db.Column(db.String(160), nullable=False)
    designation = db.Column(db.String(160), nullable=False)
    location = db.Column(db.String(160))
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    is_current = db.Column(db.Boolean, default=False)
    description = db.Column(db.Text)
    responsibilities = db.Column(db.Text)
    achievements = db.Column(db.Text)
    clinical_focus = db.Column(db.Text)
    promotion_group = db.Column(db.String(120), index=True)
    display_order = db.Column(db.Integer, default=0)
    is_published = db.Column(db.Boolean, default=False)

class Credential(Stamped, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    credential_type = db.Column(db.String(60))
    category = db.Column(db.String(80), index=True)
    issuing_institution = db.Column(db.String(200))
    completion_date = db.Column(db.Date)
    description = db.Column(db.Text)
    certificate_file = db.Column(db.String(255))
    verification_status = db.Column(db.String(30), default="unverified")
    is_published = db.Column(db.Boolean, default=False)
    display_order = db.Column(db.Integer, default=0)

class Expertise(Stamped, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(160), nullable=False)
    slug = db.Column(db.String(180), unique=True, nullable=False, index=True)
    category = db.Column(db.String(80))
    short_description = db.Column(db.String(300))
    detailed_description = db.Column(db.Text)
    image = db.Column(db.String(255))
    is_published = db.Column(db.Boolean, default=False)
    display_order = db.Column(db.Integer, default=0)
    seo_title = db.Column(db.String(160))
    seo_description = db.Column(db.String(300))

class BlogCategory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    slug = db.Column(db.String(120), unique=True, nullable=False)
    description = db.Column(db.Text)

class BlogTag(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(60), unique=True, nullable=False)
    slug = db.Column(db.String(80), unique=True, nullable=False)

post_tags = db.Table("post_tags",
    db.Column("post_id", db.ForeignKey("blog_post.id"), primary_key=True),
    db.Column("tag_id", db.ForeignKey("blog_tag.id"), primary_key=True))

class BlogPost(Stamped, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    slug = db.Column(db.String(280), unique=True, nullable=False, index=True)
    excerpt = db.Column(db.String(400))
    content = db.Column(db.Text)  # sanitize before save/render
    featured_image = db.Column(db.String(255))
    category_id = db.Column(db.ForeignKey("blog_category.id"), index=True)
    category = db.relationship("BlogCategory", backref="posts")
    tags = db.relationship("BlogTag", secondary=post_tags, backref="posts")
    author = db.Column(db.String(120), default="Dr. Sweety Jain")
    status = db.Column(db.String(20), default="draft", index=True)
    published_at = db.Column(db.DateTime(timezone=True))
    seo_title = db.Column(db.String(160))
    seo_description = db.Column(db.String(300))
    reading_time = db.Column(db.Integer, default=1)

class HealthTip(Stamped, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    slug = db.Column(db.String(220), unique=True, nullable=False)
    description = db.Column(db.String(400))
    content = db.Column(db.Text)
    category = db.Column(db.String(80), index=True)
    image = db.Column(db.String(255))
    reference_url = db.Column(db.String(500))
    status = db.Column(db.String(20), default="draft")
    published_at = db.Column(db.DateTime(timezone=True))

class SocialInitiative(Stamped, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    slug = db.Column(db.String(220), unique=True, nullable=False)
    description = db.Column(db.Text)
    status = db.Column(db.String(20), default="planned")
    event_date = db.Column(db.Date)
    location = db.Column(db.String(200))
    partner_name = db.Column(db.String(200))
    image = db.Column(db.String(255))
    verified_impact_summary = db.Column(db.Text)
    is_published = db.Column(db.Boolean, default=False)

STATUSES = ["New", "Under Review", "Awaiting Response", "Scheduled", "Completed", "Cancelled", "Closed"]

class ConsultationEnquiry(Stamped, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    reference_code = db.Column(db.String(20), unique=True, nullable=False, index=True)
    full_name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(40), nullable=False)
    country_or_region = db.Column(db.String(80))
    preferred_contact_method = db.Column(db.String(30))
    preferred_date = db.Column(db.Date)
    preferred_time = db.Column(db.String(30))
    enquiry_summary = db.Column(db.Text, nullable=False)
    consent_record = db.Column(db.DateTime(timezone=True), default=now)
    status = db.Column(db.String(30), default="New", index=True)
    appointment_datetime = db.Column(db.DateTime(timezone=True))
    private_admin_notes = db.Column(db.Text)
    @staticmethod
    def new_ref(): return "SJ-" + secrets.token_hex(4).upper()

class ContactEnquiry(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), nullable=False)
    subject = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    consent_record = db.Column(db.DateTime(timezone=True), default=now)
    status = db.Column(db.String(30), default="New")
    created_at = db.Column(db.DateTime(timezone=True), default=now)

class MediaAsset(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    original_filename = db.Column(db.String(255))
    stored_filename = db.Column(db.String(255), unique=True)
    mime_type = db.Column(db.String(80))
    file_size = db.Column(db.Integer)
    alt_text = db.Column(db.String(255))
    uploaded_by = db.Column(db.ForeignKey("admin_user.id"))
    created_at = db.Column(db.DateTime(timezone=True), default=now)
