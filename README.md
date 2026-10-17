# PrepareNote
A structured note-taking and knowledge-sharing platform for exam and certification preparation.

## How notes are organized

Every note lives inside a clear study hierarchy:

```
Exam  >  Section  >  Topic  >  Note
```

- An **exam** (for example, "AWS Solutions Architect") has many **sections**.
- A **section** (for example, "Networking") has many **topics**.
- A **topic** (for example, "VPC Peering") has many **notes**.

Notes can be private or public, so students can keep their own study notes or share them with others.

## Tech stack

| Part | Technology | Folder |
|------|------------|--------|
| Backend / REST API | Django + Django REST Framework | `backend/` |
| Database | PostgreSQL | — |
| Frontend | React | `frontend/` |
| CI | GitHub Actions | `.github/workflows/` |

## Running the backend locally

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Required environment variables (never commit real values)
export DJANGO_SECRET="any-long-random-string"
export DATABASE_PASSWORD="ask-the-team"

python manage.py migrate
python manage.py runserver
```

Run the backend tests with `python manage.py test`.

## Team workflow

- Work is planned in Scrum sprints and tracked as GitHub issues.
- Create a branch for each issue, then open a pull request into `main`.
- Every pull request runs the CI checks and needs a review before it is merged.
