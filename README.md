<div align="center">

# GitHub Profile Builder

Polish how your GitHub profile looks: edit your details, build your profile
README from templates, check the preview, and apply only after you review it.

**English** · [Português](README.pt-BR.md)

![Next.js](https://img.shields.io/badge/Next.js_16-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?logo=tailwindcss&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

</div>

> [!IMPORTANT]
> Nothing changes on GitHub until you explicitly confirm it on the review screen.

## Contents

- [Features](#features)
- [How it works](#how-it-works)
- [Tech stack](#tech-stack)
- [Running locally](#running-locally)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [Deploying to Vercel](#deploying-to-vercel)
- [GitHub API limits](#github-api-limits)
- [License and credits](#license-and-credits)

## Features

### Drafts
- Create drafts from your current GitHub profile (up to 50 per account).
- Rename, duplicate and delete them, one at a time or several at once.
- If your profile README was published by this app, a new draft starts with the same settings.

### Profile
- Edit your name, bio, company, location, website, X username, public email (from your verified emails), availability for hire and social links.
- Live profile card preview while you edit, with character counters on limited fields.

### Profile README
- Three templates: **Classic** (icons), **Minimal** (text only) and **Compact** (smaller icons, projects in a table).
- README language independent of the interface language: English or Portuguese.
- Sections you can turn on, turn off and reorder: greeting, introduction, technologies, projects and contact.
- Optional titles on every section, with a recommended title you can change or remove.
- Introduction written in Markdown.
- Technologies from a 200-item catalog, in a single list or grouped by category.
- Up to 6 of your public repositories as projects, with name, description and language read from GitHub.
- Contact links as a list, as one line of links or as icons, with icons for 25 networks recognized by their address.
- Up to 5 custom sections (such as “Learning” or “Skills”) with a title, text and technologies.
- Preview rendered by GitHub's own Markdown API, or the raw Markdown.

### Applying to GitHub
- A review screen shows what changes in each part: profile, social links and README.
- You choose which parts to apply; the current and the new README are shown side by side.
- The app creates the `username/username` repository when it does not exist yet, warning that it is public.
- After applying, the app reads GitHub again and only reports success when the change shows up there.

### Interface
- English and Brazilian Portuguese, with light and dark themes that follow your system.

## How it works

1. **Sign in with GitHub (OAuth).** Requested scopes: `user`, to edit the profile and read verified emails, and `public_repo`, to create and update the public profile README repository.
2. **Drafts.** Stored in PostgreSQL and linked to your GitHub account ID. The access token lives only in the encrypted session cookie, never in the database.
3. **Preview.** A single function generates the README, the same one used to publish it, so the preview is exactly what goes to GitHub.
4. **Apply.** Each part is sent to the GitHub API separately and checked right after. If something fails, the screen shows what was applied and what was not.

## Tech stack

| Area | Technology |
| --- | --- |
| Framework | [Next.js 16](https://nextjs.org) (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Languages | [next-intl](https://next-intl.dev) (language kept in a cookie) |
| Database | PostgreSQL ([Neon](https://neon.tech)) with [Drizzle ORM](https://orm.drizzle.team) |
| Authentication | GitHub OAuth App and [iron-session](https://github.com/vvo/iron-session) |
| API | GitHub REST and GraphQL |
| Tests | [Vitest](https://vitest.dev) |
| Hosting | [Vercel](https://vercel.com) (`gru1` region, São Paulo) |

## Running locally

Requirements: Node.js 22 or newer, a PostgreSQL database (for example on Neon) and a development GitHub OAuth App.

1. Install the dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in the values (see [Environment variables](#environment-variables)).

3. Create the database tables:

   ```bash
   npm run db:migrate
   ```

4. Start the server:

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

### Development OAuth App

At https://github.com/settings/developers, open **OAuth Apps → New OAuth App** and fill in:

- Homepage URL: `http://localhost:3000`
- Authorization callback URL: `http://localhost:3000/api/auth/callback`

## Environment variables

| Variable | Description |
| --- | --- |
| `APP_URL` | Public URL of the app, used to build the OAuth callback URL (e.g. `http://localhost:3000`). |
| `GITHUB_CLIENT_ID` | Client ID of the GitHub OAuth App. |
| `GITHUB_CLIENT_SECRET` | Client secret of the GitHub OAuth App. |
| `SESSION_SECRET` | Session secret, at least 32 characters. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`. |
| `DATABASE_URL` | PostgreSQL connection string. |

> [!WARNING]
> Never commit `.env.local`. Use different credentials for development and production.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server. |
| `npm run build` / `npm start` | Production build and server. |
| `npm run lint` | ESLint. |
| `npm test` | Tests (Vitest). |
| `npm run db:generate` | Generates a SQL migration from `lib/db/schema.ts`. |
| `npm run db:migrate` | Applies the migrations to the `DATABASE_URL` database. |

To test the whole flow by hand, follow the checklist in [`docs/checklist-teste.md`](docs/checklist-teste.md) (in Portuguese).

## Project structure

```
app/            Pages and routes (sign-in, drafts, editor, apply)
components/     Interface components
lib/github/     GitHub API client (read and write)
lib/readme/     README generator, templates, technology catalog
lib/apply/      Plan and execution of the changes on GitHub
lib/drafts/     Draft content and storage
lib/db/         Database schema (Drizzle)
messages/       Interface texts (en and pt-BR)
drizzle/        SQL migrations
```

## Deploying to Vercel

1. Push the code to GitHub.
2. On Vercel, click **Add New → Project** and import the repository. Next.js is detected automatically, and the functions region comes from `vercel.json`.
3. Note the project domain (e.g. `https://your-project.vercel.app`).
4. Create a **production OAuth App**, separate from the development one:
   - Homepage URL: the domain from step 3
   - Authorization callback URL: `<domain>/api/auth/callback`
5. Use separate databases for production and development. On Neon, for example: the main branch for production and a `development` branch for `.env.local`.
6. In **Settings → Environment Variables** (*Production* environment), add `APP_URL` (the domain), `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, a new `SESSION_SECRET` and the production `DATABASE_URL`.
7. Run the migrations on the production database once, from your machine, with the production `DATABASE_URL`:

   ```bash
   npm run db:migrate
   ```

8. Redeploy (**Deployments → Redeploy**) so the variables take effect.

## GitHub API limits

- The profile picture and pinned repositories cannot be changed. The app shows your pinned repositories and explains how to change them on GitHub.
- With the `public_repo` scope, a private `username/username` repository cannot be read: it shows up as “not found”, and the app explains how to make it public.
- A handwritten README is not imported into the draft. Applying the README replaces it; the previous version stays in the repository's commit history.

## License and credits

Code released under the [MIT License](LICENSE).

- Technology icons: [Devicon](https://devicon.dev) (MIT), pinned version in `lib/readme/technologies.ts`. The LinkedIn icon also comes from Devicon.
- Social network icons and light versions of some icons for the dark theme: [Simple Icons](https://simpleicons.org) (CC0-1.0).
- Website, email and link icons: [Material Design Icons](https://pictogrammers.com/library/mdi/) (Apache 2.0), served by the [Iconify](https://iconify.design) API.
- GitHub logo on the sign-in button: [Octicons](https://primer.style/octicons) (MIT).

All trademarks belong to their owners.
