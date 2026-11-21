# PrepareNote

PrepareNote is a note app for studying for exams and certifications. You write notes, sort them by exam, and share the ones you want other students to see.

## How notes are organized

A note can go under a topic:

```
Exam  >  Section  >  Topic  >  Note
```

- An exam (like "AWS Solutions Architect") has sections.
- A section (like "Networking") has topics.
- A topic (like "VPC Peering") has notes.

A note does not need a topic. Exams, sections, and topics are added in the Django admin at `/admin/`.

## What works now

These features are done and merged into `main`:

- Sign up, log in, and log out (#4)
- A Moderator label in the navbar for moderators (#5)
- Add, view, edit, and delete your own notes (#6)
- Put a note under an exam, section, and topic (#7)
- Make a note public or private (#8). New notes start private.
- See other students' public notes on the Public Notes page (#20)
- Report a public note and give a reason (#22)
- Mark a note as Learning, Reviewing, or Confident (#27)
- Backend and frontend tests run in GitHub Actions on every pull request into `main` (#9, #10, #30)

## What is planned

These are not done yet:

- Add a source to a note (#18). Pull request #45 is open.
- Manage your user profile (#19)
- Search and filter notes (#21)
- Let moderators review and remove reported notes (#23). The work is on a branch.
- Link related notes (#24)
- Bookmark public notes (#25)
- Save favorite contributors and see their public notes (#26)

## Project layout

```
backend/                 Django and Django REST Framework API
  preparenote/
    quickstart/          users and notes
    exams/               exams, sections, and topics
    reports/             reports on public notes
frontend/                React app (Vite and Bootstrap)
  src/components/        sign up, log in, and navbar
  src/pages/             My Notes and Public Notes pages
.github/workflows/       CI
```

## Run the backend

You need Python 3.12 or newer.

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

The backend reads two values from environment variables. Never put the real values in a commit.

```bash
export DJANGO_SECRET="any-long-random-string"
export DATABASE_PASSWORD="ask-the-team"
```

The database is a shared PostgreSQL database on Supabase. The host and user are in `backend/preparenote/settings.py`. Ask a teammate for the password. The server will not start without it.

```bash
python manage.py migrate
python manage.py runserver
```

The API runs at http://localhost:8000. To use the admin page, make an admin user with `python manage.py createsuperuser`.

## Run the frontend

You need Node.js. CI uses Node 22.

```bash
cd frontend
npm install
npm run dev
```

Open the link it prints (usually http://localhost:5173). The frontend sends its API calls to the backend on port 8000, so start the backend first.

## Run the tests

The backend tests use a SQLite test database, so they do not need the Supabase password.

```bash
cd backend
python manage.py test
```

Frontend tests:

```bash
cd frontend
npm test -- --run
```

Leave off `-- --run` to keep the tests running while you edit. Check the frontend code style with `npm run lint`.

## Team workflow

- Work is planned in Scrum sprints and tracked as GitHub issues.
- Make a branch for each issue, then open a pull request into `main`.
- Every pull request runs the CI checks and needs a review before it is merged.
