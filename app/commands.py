import re, click
from .extensions import db
from .models import AdminUser

def register(app):
    @app.cli.command("create-admin")
    @click.option("--username", prompt=True)
    @click.option("--email", prompt=True)
    @click.password_option()
    def create_admin(username, email, password):
        """Create the first administrator (no public registration exists)."""
        if len(password) < 12 or not re.search(r"\d", password) or not re.search(r"[A-Za-z]", password):
            raise click.ClickException("Password needs 12+ characters with letters and digits.")
        u = AdminUser(username=username, email=email); u.set_password(password)
        db.session.add(u); db.session.commit()
        click.echo("Admin created.")

    @app.cli.command("seed")
    def seed():
        """Create categories, draft article outlines, example tips and planned initiatives (no invented facts)."""
        from .models import BlogCategory, BlogPost, HealthTip, SocialInitiative, SiteSettings
        from .api.routes import slugify
        SiteSettings.get()
        for n in ["Physiotherapy Explained", "Sports Injury and Recovery", "Back, Neck, and Joint Health", "Rehabilitation and Mobility", "Ergonomics and Posture", "Taping and Needling Education", "Recovery Myths and Facts", "Healthy Ageing and Movement"]:
            if not BlogCategory.query.filter_by(name=n).first(): db.session.add(BlogCategory(name=n, slug=slugify(n)))
        posts = ["What Does a Physiotherapist Do, and When Should You Consult One?", "Understanding Sports Injury Rehabilitation: From Injury to Return to Activity", "Everyday Habits That May Contribute to Neck and Back Discomfort", "Workplace Ergonomics: Practical Ways to Improve Your Workstation", "What Is Dry Needling? Uses, Considerations, and Common Questions", "Sports Taping Explained: What It Can and Cannot Do", "What to Expect During a Physiotherapy Assessment", "Rehabilitation Myths: Separating Common Beliefs from Evidence"]
        for t in posts:
            if not BlogPost.query.filter_by(slug=slugify(t)).first():
                db.session.add(BlogPost(title=t, slug=slugify(t), excerpt="Draft outline. To be written and reviewed before publication.", content="<p>Draft: to be written and reviewed.</p>", status="draft"))
        tips = [("Make Your Workstation Work for You", "Adjust your workstation to suit your body, change positions regularly, and take comfortable movement breaks.", "Posture and Ergonomics"),
                ("Build Exercise Intensity Gradually", "Increase activity progressively, warm up appropriately, and pay attention to unusual or worsening symptoms.", "Sports and Exercise"),
                ("Keep Moving Within Your Ability", "Choose regular movement that suits your ability and current health rather than trying to maintain one ideal posture all day.", "Daily Movement"),
                ("Know When to Seek Advice", "Seek professional guidance when symptoms persist, worsen, or interfere with daily activities.", "General Wellness")]
        from .models import now
        for t, d, c in tips:
            if not HealthTip.query.filter_by(slug=slugify(t)).first():
                db.session.add(HealthTip(title=t, slug=slugify(t), description=d, category=c, status="published", published_at=now()))
        for t in ["Free health education articles", "Educational videos", "Community health-awareness sessions", "Workplace ergonomics workshops", "Sports injury awareness", "School and senior-community education", "Educational content in Indian languages", "Partnerships with community organizations", "Outreach programs for underserved communities"]:
            if not SocialInitiative.query.filter_by(slug=slugify(t)).first():
                db.session.add(SocialInitiative(title=t, slug=slugify(t), status="planned", is_published=True, description="A possible future initiative. Not yet undertaken."))
        db.session.commit(); click.echo("Seeded.")
