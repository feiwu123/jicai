# Repository Guidelines

## Project Structure & Module Organization

- `app.py`: Application entrypoint. Runs the batch purchasing system web server.
- `backcode/`: Python backend (standard-library `http.server` + SQLite).
  - `backcode/server.py`: API routes under `/api/wholesales/*` and static file hosting from `frontcode/`.
  - `backcode/data.sqlite3`: Local SQLite database (auto-created on first run).
- `frontcode/`: Frontend assets served by the backend.
  - `frontcode/yuanxing/`: Prototype HTML/CSS/JS (used as the actual UI pages).
  - `frontcode/static/`: Shared JS helpers and prototype “glue” scripts (e.g., `proto_*.js`).
- `yuanxing/`: Source prototype modules (copied into `frontcode/yuanxing/`).
- `apidoc/`: API documentation (`api.docx`) and extracted text (`api.extracted.txt`).

## Build, Test, and Development Commands

- Run locally: `python app.py`
  - Opens on `http://127.0.0.1:8000/` (homepage is the “批采列表” prototype page).
- Quick health check: `Invoke-WebRequest http://127.0.0.1:8000/health -UseBasicParsing`
- API smoke test (PowerShell):
  - `Invoke-RestMethod 'http://127.0.0.1:8000/api/wholesales/users.php?action=login' -Method Post -ContentType 'application/x-www-form-urlencoded' -Body 'user=topm%40qq.com&pass=112233'`

## Coding Style & Naming Conventions

- Python: 4-space indentation, prefer small pure functions, no external dependencies unless justified.
- JavaScript: keep scripts small and page-scoped; prefer `proto_*.js` for prototype UI wiring and `api.js` for shared helpers.
- Files: new frontend pages should live under `frontcode/yuanxing/<模块>/` when they must match prototype styling.

## Testing Guidelines

- No automated test framework is currently configured. Add lightweight smoke tests only if necessary.
- When changing API contracts, verify login → goods list → cart → order flow end-to-end.

## Commit & Pull Request Guidelines

- Git history currently has no established convention. Use clear, imperative commit messages (recommended: Conventional Commits like `feat: ...`, `fix: ...`).
- PRs should include: summary, manual test steps, and screenshots/gifs for UI changes (especially prototype pages).

## Security & Configuration Tips

- Do not commit real credentials or tokens. Local sessions are stored in browser `localStorage`.
- SQLite is local-only by default; treat `backcode/data.sqlite3` as generated state.
