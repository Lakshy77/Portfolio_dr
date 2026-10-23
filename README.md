# Dr. Sweety Jain Website: 100% React frontend (public site + admin) + Flask JSON API

- `frontend/`: React (Vite) + CSS. All pages AND the admin dashboard are React (`/admin`).
- Flask: only a JSON API (database, login, HTML sanitization). No server-rendered pages.
Requires Python 3.10+ and Node.js 18+.

## 1. Backend (PowerShell, project root, Terminal 1)
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
copy .env.example .env
```
Edit `.env` and set `SECRET_KEY` to a long random string, then:
```powershell
flask --app run.py db init
flask --app run.py db migrate -m "initial"
flask --app run.py db upgrade
flask --app run.py seed
flask --app run.py create-admin
flask --app run.py run --debug
```
`seed` adds the 8 blog categories, 8 DRAFT article outlines, your 4 example tips and 9 clearly "planned" initiatives. It invents no career, qualification or contact data.

## 2. Frontend (a NEW PowerShell window, Terminal 2)
```powershell
cd frontend
npm install
npm run dev
```
- Website: http://localhost:5173
- Admin: http://localhost:5173/admin (log in with the account from `create-admin`)

## 3. Add real information (in the admin)
Website Settings (designation, phone, email, location) → Career Timeline → Education & Certifications → Clinical Expertise → Blogs (edit drafts, set Status to published) → Health Tips → Mission & Initiatives. Items appear publicly only when Published. Use the same "Promotion group" text on roles at one employer to group promotions.

## 4. Production
```powershell
cd frontend
npm run build
```
Flask automatically serves `frontend/dist` when it exists. On Linux run `gunicorn "run:app"` with `FLASK_ENV=production`, HTTPS, and a PostgreSQL `DATABASE_URL`.

## Not built yet
Media/certificate uploads, automated tests, email notifications, SEO (sitemap, meta per page), enquiry CSV export, drag-and-drop reordering (use the Display order number).
