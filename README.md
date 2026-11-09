# Small Wins

A wellbeing app for smart glasses, designed with neurodivergent people in mind first, to keep you motivated and help you accomplish your goals step by step, with visual rewards as you live your life.

Built as a Lens for SPECS for the [Learn AR with SPECS](https://learn-specs.devpost.com/) hackathon.

**[Watch the demo video](https://www.youtube.com/watch?v=LoUa37ri7Uc)**

## What it does

You plan a few tasks for your day, and when you finish one, a sticker and a small well done pop up right where you did it.

- **Plan your day:** look back at yesterday, plan tomorrow, and edit, remove or add tasks as things change.
- **Rewards where it happened:** an empty sticker holder floats near each task you planned. Only tasks you set for yourself earn a sticker, so getting a reward stays meaningful.
- **Breaks based on effort:** bigger chores count for more. When you've done enough, the app suggests a little me-time break. It's always your choice.
- **Me-time:** box breathing, guided drawing and an EMDR-inspired eye-movement calming exercise.
- **Today's wins:** all your stickers in one place.
- **Outside quests:** a playful daily invitation to go outside, like find 3 yellow things. You can take it, ignore it for the day, or ignore it until a certain time.

Small Wins is self-help and not a replacement for therapy. The eye-movement exercise is a calming exercise, not trauma therapy.

## Try it

The demo runs in the Lens Studio preview, so no glasses are needed. It's a simulated flat with sample chores, and each preview run starts fresh with the same sample day. On the glasses, you'd see your own home and your own chores.

1. Get the project with `git clone` (the 3D models use [Git LFS](https://git-lfs.com/)), or with **Code > Download ZIP** on GitHub.
2. Open `Small_wins_project_SPECS_Hackaton/Small_wins_project_SPECS_Hackaton.esproj` in Lens Studio. It was built with version 5.23.2.
3. Use the mouse in the Preview panel, where a click stands in for a pinch:
   - Drag the clothes into the washing machine and the dishes into the dishwasher to earn stickers.
   - Click **Raise hand** at the bottom left to open the To-do list, Me-time and Today's wins.
   - Click the door to see the day's outside quest.

To watch the whole demo play by itself, open the LEAF panel in Lens Studio and run the `demo-recording` scenario.

"Raise hand", "Sit on the sofa" and "Stand up" are demo buttons, standing in for what you'd really do with the glasses on.

## How it's built

- Planned with the Devpost Learn skill pack, and built with an AI coding agent using the CLAD plugin, Lens Studio and the Lens Studio MCP
- TypeScript, with the Spectacles Interaction Kit and Spectacles UI Kit
- 23 automated test scenarios using LEAF

| Where | What |
|---|---|
| [`Small_wins_project_SPECS_Hackaton`](Small_wins_project_SPECS_Hackaton) | The Lens Studio project |
| [`Small_wins_project_SPECS_Hackaton/Assets/Scripts`](Small_wins_project_SPECS_Hackaton/Assets/Scripts) | The app's code |
| [`Small_wins_project_SPECS_Hackaton/Assets/Tests`](Small_wins_project_SPECS_Hackaton/Assets/Tests) | The automated tests |
| [`devpost/design-brief.md`](devpost/design-brief.md) | The design brief |

## Copyright

Copyright (c) 2026 Szonja Czutor. All rights reserved.

This project is **not open source**. The repository is public so that it can be judged in the hackathon. Please do not copy it, build on it, or release something that closely imitates it, even if renamed or changed in minor ways, without written permission. See [`LICENSE`](LICENSE) for the full terms, including the permissions for the hackathon's judges and the third-party material this does not cover.
