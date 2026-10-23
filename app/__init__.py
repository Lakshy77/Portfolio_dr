import os
from flask import Flask, send_from_directory, abort
from config import Config
from .extensions import db, login_manager, migrate, limiter

def create_app(config=Config):
    app = Flask(__name__)
    app.config.from_object(config)
    db.init_app(app); migrate.init_app(app, db); limiter.init_app(app); login_manager.init_app(app)
    from . import models
    from .api.routes import bp as api_bp
    app.register_blueprint(api_bp, url_prefix="/api")
    from .commands import register
    register(app)

    @app.after_request
    def headers(r):
        r.headers["X-Content-Type-Options"] = "nosniff"
        r.headers["X-Frame-Options"] = "DENY"
        r.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return r

    dist = os.path.abspath(os.path.join(app.root_path, "..", "frontend", "dist"))
    if os.path.isdir(dist):  # production: serve the built React app
        @app.route("/", defaults={"p": ""})
        @app.route("/<path:p>")
        def spa(p):
            if p.startswith("api/"): abort(404)
            full = os.path.join(dist, p)
            if p and os.path.isfile(full): return send_from_directory(dist, p)
            return send_from_directory(dist, "index.html")
    return app
