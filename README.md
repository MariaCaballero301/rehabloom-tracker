# 🌱 Rehabloom

**Physical therapy works only if you keep doing it. Rehabloom helps you stick with your prescribed exercises, and brings your people in when you start slipping.**

🔗 **Try it:** https://rehabloom-progress-tracker.lovable.app · Built at **HackNC 2026**

---

## The problem

Most physical therapy happens at home, alone, between appointments, and that's where it falls apart. Studies on home exercise programs commonly report that **many patients don't fully follow them**. Nobody notices until the next appointment, when the recovery has already stalled.

## What Rehabloom does

### 🌿 Stay on track
- **Your plan, your way:** add the exercises your therapist prescribed (sets, reps, daily or weekly schedule, rest between sessions), or **import them from a photo/PDF of your plan** with Google Gemini. You review every exercise before it's saved, and the app never invents a frequency.
- **Daily check-in:** pain and motivation, plus honest options for *rest day* and *unable to complete*. They're never punished, and pain is never rewarded.
- **A plant that grows with you:** XP from completed exercises grows a plant through four stages (Seed → Sprout → Young plant → In bloom). XP arrives with a little swimming fish 🐠 and soft sounds (mutable).
- **Progress page:** weekly and monthly calendar, sessions together marked on their day, and **AI summaries (Gemini)** built only from anonymous numbers.

### 💚 Your support network
- **Family & friends** join with a private invite code or link; **buddies** are people doing similar rehab (matched by rehab area, language and availability); **mentors** are people who already finished their therapy.
- **Missed-session alerts:** if you skip your scheduled exercises for **more than 2 days**, your network gets an in-app alert, with no health details, just "Ana could use a little support 💚". From there they can **send encouragement** or **plan a session together**.
- **Inbox:** one-to-one messages and encouragement, live.

### 🤝 Sessions together
- Propose a **video call** or an **in-person** session; the other person accepts or declines.
- **Reschedule** (the other person confirms the new time), **add to calendar (.ics)**, a reminder 15 minutes before, and **"Mark as done"**, which gives both people +15 XP.

### 🌸 Mentor mode
When you finish your therapy, the app changes with you. Alerts stop, your plant stays in bloom, Progress tells your **recovery story** and your **mentor impact**, and Support becomes the place to help others. If you need rehab again, there's a button to go back.

---

## How it's built

| Layer | Tech |
|---|---|
| Frontend | React 19, TanStack Start + Router, Tailwind CSS, shadcn/ui, Frutiger Aero-inspired glass UI |
| Backend | Lovable Cloud (Supabase): Postgres, Auth, Realtime, Storage, server functions |
| Security | Row-Level Security on every table; all relationship actions (connect, invite, block, sessions) go through `SECURITY DEFINER` functions that check `auth.uid()` |
| Scheduling | Daily job (`/api/cron/missed-sessions`) that detects missed-session streaks and notifies the network |
| AI | Google Gemini: plan import + monthly/weekly/recovery summaries (anonymous numbers only, API key kept server-side) |
| Audio | Web Audio API, synthesized in the browser (no audio files) |
| Tests | Vitest (unit + UI) and SQL scenario tests on an embedded Postgres |

### Privacy & safety by design
- **Not a medical tool:** Rehabloom never changes or invents prescribed exercises.
- Alerts never include health details, only that someone could use support.
- People control who joins their network, and can disconnect or block at any time (blocked users can't see or contact them).
- Profile photos live in private storage and are only visible to connected people.

---

## Run it locally

```sh
git clone https://github.com/MariaCaballero301/rehabloom-tracker.git
cd rehabloom-tracker
npm install
npm run dev      # start the app
npm test         # run the tests
```

The app expects a Lovable Cloud / Supabase project (env vars in `.env`). Optional secrets: `GEMINI_API_KEY` for AI features, and `TWILIO_*` for real SMS. Without Twilio, SMS is simulated and in-app alerts are used.

## What's next
- Therapist view: share a progress report with your physical therapist.
- Real SMS / push notifications for supporters who don't use the app.
- A shared live "session room" with reactions while exercising together.

## Team
Built with 💙 at HackNC by:
- Jaiden Oey ([@jaidenoey](https://github.com/jaidenoey))
- María Caballero ([@MariaCaballero301](https://github.com/MariaCaballero301))
- Ines Perez Calderon

*Rehabloom supports adherence to your therapist's plan. It does not give medical advice. If pain increases, stop and contact your physical therapist.*
