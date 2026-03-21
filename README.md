# AI Planning Agent

A **multi-agent AI system** that transforms any complex problem statement into a board-ready strategic execution plan. Built with Next.js 15, powered by Anthropic Claude, and visualized with a real-time pipeline dashboard.

---

## What It Does

You type in a problem — for example, *"Build a creator marketplace connecting brands with micro-influencers"* — and the system dispatches **7 specialized AI agents** across a 3-stage pipeline. In under two minutes, you receive a fully structured strategic report with four sections:

- **Problem Breakdown** — root cause analysis, sub-problems ranked by complexity, core tension
- **Stakeholders** — mapped by relationship type, influence, and veto power
- **Solution Approach** — strategic options with trade-offs, recommended posture
- **Action Plan** — phased execution roadmap with milestones and success metrics

You can then **edit any section** using natural language instructions (e.g., *"Make this more conservative and add a 90-day quick-win phase"*), with the AI preserving context from other sections. Every version is tracked. The final report can be exported as a **.docx** or **PDF** file.

---

## Agent Pipeline Architecture

The system runs a **3-stage pipeline** designed to minimize total generation time through parallelism:

```
Stage 1 — Parallel Analysis (3 agents run simultaneously)
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Planner    │  │    Domain    │  │     Risk     │
│ Decomposes   │  │  Analyzes    │  │  Identifies  │
│ problem into │  │  industry,   │  │  risks with  │
│ sub-problems │  │  market,     │  │ probability, │
│ & constraints│  │  precedents  │  │  impact, mitigations
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       └──────────────────┴──────────────────┘
                          │
Stage 2 — Sequential Synthesis (needs all Stage 1 outputs)
                ┌─────────────────┐
                │  Synthesizer    │
                │  Combines all   │
                │  Stage 1 data   │
                │  into strategic │
                │  intelligence   │
                └────────┬────────┘
                         │
Stage 3 — Parallel Section Writing (4 agents run simultaneously)
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Problem     │  │ Stakeholders │  │  Solution    │  │  Action Plan │
│  Breakdown   │  │   Writer     │  │  Approach    │  │   Writer     │
│  Writer      │  │              │  │   Writer     │  │              │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

**Total runtime** = Stage 1 slowest agent + Stage 2 + Stage 3 slowest agent — NOT the sum of all 7 agents. This design is typically 2–3x faster than sequential execution.

---

## Features

| Feature | Details |
|---|---|
| **Real-time pipeline dashboard** | Live status for all 7 agents with timing shown as they complete |
| **Server-Sent Events (SSE)** | The backend streams agent progress to the frontend without polling |
| **AI section editor** | Edit any section with a natural language instruction; AI preserves cross-section context |
| **Version history** | Every AI edit is versioned; you can revert to any previous version |
| **Report caching** | Your last report is auto-saved to `localStorage`; revisiting the page won't re-run the pipeline |
| **Export to DOCX** | Downloads a formatted Word document named after your problem |
| **Export to PDF** | Downloads a print-ready PDF |
| **Example problems** | Five pre-written example problems to try immediately |
| **Dark, responsive UI** | Tailwind CSS with animated gradient backgrounds |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15.1 (App Router) |
| Language | TypeScript 5 |
| AI Model | Anthropic Claude (`claude-sonnet-4-20250514`) |
| Styling | Tailwind CSS 3 |
| Word Export | `docx` 8.5 |
| PDF Export | Custom PDF template (built-in) |
| Runtime | Node.js |

---

## Project Structure

```
ai-planning-agent/
├── app/
│   ├── page.tsx                  # Home page — problem input form
│   ├── layout.tsx                # Root layout, fonts, global styles
│   ├── globals.css               # Global CSS
│   ├── report/
│   │   └── page.tsx              # Report page — pipeline dashboard + results
│   └── api/
│       ├── agent/
│       │   ├── run/route.ts      # POST — runs the full pipeline via SSE
│       │   └── edit/route.ts     # POST — AI edits a single report section
│       └── export/
│           ├── docx/route.ts     # POST — generates and downloads .docx
│           └── pdf/route.ts      # POST — generates and downloads PDF
├── components/
│   ├── AgentPipeline.tsx         # Real-time pipeline visualizer
│   ├── ReportSections.tsx        # Renders all four report sections
│   ├── SectionEditor.tsx         # AI-powered inline section editor
│   └── ExportButtons.tsx         # DOCX / PDF export buttons
├── lib/
│   ├── orchestrator.ts           # Pipeline logic — stages, parallelism, logging
│   ├── agentCaller.ts            # Shared Anthropic API utility
│   ├── prompts.ts                # All agent system prompts
│   ├── docxBuilder.ts            # Word document builder
│   └── pdfTemplate.ts            # PDF layout
├── types/
│   └── index.ts                  # All TypeScript interfaces
├── .env.local.example            # Environment variable template
└── package.json
```

---

## Prerequisites

- **Node.js** v18 or higher — [Download](https://nodejs.org/)
- **npm** v9 or higher (comes with Node.js)
- **Anthropic API key** — [Get one here](https://console.anthropic.com/)

---

## Setup & Installation

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd ai-planning-agent
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example file:

```bash
cp .env.local
```

Open `.env.local` and add your Anthropic API key:

```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

> **Important:** Never commit `.env.local` to version control. It is already in `.gitignore`.

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Using the Application

### Step 1 — Enter your problem

On the home page, type a clear problem statement or initiative in the text area. It must be at least 10 characters. You can also click one of the five example problems to auto-fill the field.

**Good problem statements:**
- *"Design an AI-powered legal document review tool for small law firms"*
- *"Build a B2B SaaS platform for construction project management"*
- *"Launch a peer-to-peer skills exchange marketplace for professionals"*

Click **"Generate Execution Plan"** to start.

### Step 2 — Watch the pipeline run

The report page shows a live dashboard of all 7 agents. Agents in **Stage 1** and **Stage 3** run in parallel — you will see multiple agents turn green at roughly the same time. The **Stage 2 Synthesizer** runs after all Stage 1 agents finish.

Each agent card shows:
- Current status (running / complete / error)
- Time taken once complete

### Step 3 — Review the report

Once the pipeline finishes, the four-section report appears below the dashboard:

1. **Problem Breakdown** — how the AI decomposed your problem
2. **Stakeholders** — who is affected and how
3. **Solution Approach** — strategic options and recommended direction
4. **Action Plan** — phased roadmap with milestones

### Step 4 — Edit sections (optional)

Click the **Edit** button on any section. A panel slides in where you can:
- Type a natural language edit instruction (e.g., *"Add a budget risk column to the action plan table"*)
- Click **Apply Edit** — the AI rewrites only that section while keeping context from the others
- Use **Undo** to revert to any previous version

### Step 5 — Export

Click **Export DOCX** or **Export PDF** at the top of the report page. The file downloads automatically with a filename derived from your problem statement.

---

## API Reference

All routes require a `Content-Type: application/json` request header.

### `POST /api/agent/run`

Runs the full 7-agent pipeline. Returns a **Server-Sent Events** stream.

**Request body:**
```json
{
  "problem": "Your problem statement here"
}
```

**SSE events emitted:**
| Event | Payload |
|---|---|
| `status` | `{ message, stage }` — pipeline lifecycle updates |
| `agent_log` | `{ stage, agent, status, durationMs, timestamp }` — per-agent updates |
| `complete` | `{ report }` — the full `ReportJSON` object |
| `error` | `{ message }` — if the pipeline fails |

---

### `POST /api/agent/edit`

AI-edits a single section of the report.

**Request body:**
```json
{
  "sectionId": "actionPlan",
  "currentContent": { ... },
  "editInstruction": "Make the timeline more aggressive",
  "problem": "Original problem statement",
  "otherSections": { ... }
}
```

**Response:**
```json
{
  "updatedSection": { ... },
  "durationMs": 4230
}
```

---

### `POST /api/export/docx`

Generates a `.docx` file from the report.

**Request body:**
```json
{
  "report": { ... }
}
```

**Response:** Binary `.docx` file download.

---

### `POST /api/export/pdf`

Generates a PDF file from the report.

**Request body:**
```json
{
  "report": { ... }
}
```

**Response:** Binary PDF file download.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server at `http://localhost:3000` |
| `npm run build` | Create a production build |
| `npm run start` | Start the production server (run `build` first) |
| `npm run lint` | Run ESLint across the codebase |
| `npm run type-check` | Run TypeScript type checking without emitting files |

---

## Deployment

This project is configured for **Vercel** deployment out of the box. The `vercel.json` file includes a `maxDuration` of 180 seconds on the `/api/agent/run` route to accommodate the full pipeline.

### Deploy to Vercel

1. Push your repository to GitHub
2. Import the project at [vercel.com/new](https://vercel.com/new)
3. Add `ANTHROPIC_API_KEY` as an **Environment Variable** in the Vercel project settings
4. Deploy

> **Note:** The pipeline can take up to 60–90 seconds on first run. Make sure your hosting environment supports long-running API routes. Vercel's Hobby plan has a 60-second limit on the free tier; a Pro plan is needed for the 180-second limit configured in `vercel.json`.

---

## Troubleshooting

**The pipeline times out or never completes**
- Check that your `ANTHROPIC_API_KEY` is valid and has sufficient credits
- Anthropic API rate limits can cause failures on high-concurrency plans — retry after a moment
- Look at the browser console and the terminal running `npm run dev` for error messages

**The report page immediately redirects back to home**
- The app reads the problem from `localStorage`. Make sure you navigated from the home page, not by directly opening `/report`

**Export buttons do nothing**
- Ensure the pipeline has completed and a report is displayed before attempting an export
- Check the browser console for network errors

**TypeScript errors on `npm run type-check`**
- Run `npm install` to ensure all type packages are installed
- The project requires TypeScript 5+ and Node.js 18+

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key. Found at [console.anthropic.com](https://console.anthropic.com/) |

---

## License

This project is private. All rights reserved.
