# Rehabloom Tracker

Build a responsive physical therapy accountability web app called Rehabloom. Its purpose is to help people stick to exercise routines prescribed by their physical therapist.

Use a clean, accessible Frutiger Aero-inspired aesthetic with soft blue gradients, glossy translucent cards, green accents, and rounded buttons. Prioritize usability over visual complexity.

Create a dashboard with:

1. Today's prescribed exercises, showing exercise name, repetitions, and a checkbox to mark each as completed.

2. Ability to add, edit, remove, and schedule exercises.

3. A simple pain and motivation check-in, with an option to mark unable to complete or rest.

4. XP rewards for completed tasks, without rewarding or encouraging increased pain.

5. A small digital plant graphic with four predefined growth stages determined by total XP. Use lightweight SVG graphics, not generated images on every interaction.

6. A settings area to enter an accountability partner's email, choose a reminder time, and enable or pause reminders.

7. A seven-day completion history.

Use Lovable Cloud to save user accounts, exercises, progress, and preferences securely. Keep each user's information private.

Initially, make notification sending a simulation: display a sample email and a Test Reminder button. Do not send real emails or integrate external APIs yet.

Do not generate medical treatment plans or change prescribed exercise instructions. This is an adherence tool, not a medical advice tool.

Make the core experience fully interactive and usable on mobile and desktop. Implement the essential functionality before adding decorative features.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8f51e723-4321-4f15-9801-8a280732d9a9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
