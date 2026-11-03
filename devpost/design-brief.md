---
status: approved
---

# Design brief: Small Wins

<!-- Filled in by plan-lens from the learner's interview. Uses the learner's words. Values they didn't choose are marked (default). -->

## The one spatial moment
You've just closed the dishwasher. You lift your eyes back towards the counter, and in a small patch of empty space on the backsplash, a little plate sticker pops up with sparkles and a personal line: "A clear sink for tomorrow." It settles beside the sticker you earned for the laundry, and for a couple of seconds you can see that this is the second thing you've done for yourself today.

Who it's for: people who struggle with the tiniest things, and whose brain turns a small win into "look at me, the big loser." Only tasks you planned for yourself earn a sticker, so the rewards stay meaningful.

The demo runs in one open-plan (American-style) kitchen and living room: two chores, a reward of me-time on the sofa, then an invitation outside at the door. The demo ends at the door.

## Why it belongs on glasses
- Uses: draws in the world, leaves your body free.
- Why it's better than the phone or laptop version: your hands are full of laundry or dishes, so you don't stop to pull out a phone. The reward appears where you did the task, the breathing guide appears in front of you wherever you've sat down with your tea, and the invitation outside waits by the actual door.

## Product or overlay
- Type: overlay on real life. The virtual rewards respond to real chores in your own home.
- What the real version would sense: that the washing and the dishes are done, and later the real things found on a quest. Real rooms would be real, so none of the furniture would be drawn.
- Stand-in for the preview: a virtual room with demo props. You pinch and drag the laundry into the washing machine and the dishes into the dishwasher, and that drop counts as "task done." The notebook's "Raise hand" button and the breathing's "I'm ready" button stand in for the real hand signals. The view through the door is a simple backdrop, not a world to walk in.

## Where things live
Sizes and distances are real-world scale. The room is about 5 m x 4 m (default), with bright, warm surfaces so it reads on the additive display.

- Where the user is looking during the main task: down at the appliance and hands, then up and slightly to the right at the backsplash.
- Room layout (default): worktop along one wall with sink, dishwasher and washing machine; sofa and coffee table in the living area; door to the outside on another wall.
- Dirty dishes: piled up in the sink, as several grabbable items (default: 3).
- Laundry basket: in the corner, with a pile of clothes, near the washing machine (default: 1.5 m away).
- Sticker hint: a small sticker outline beside the dishes and beside the basket, showing you can earn a sticker there.
- Plate sticker and stars: anchored to the backsplash, slightly right of the dishwasher, just above the worktop. Plate about 10 cm wide, like a coaster propped against the wall. Stars stay within about a handspan (20 cm) of it.
- Message: one line directly below the sticker, in the same patch.
- Sticker strip: same patch, directly below the sticker. Max 5 stickers shown at a time.
- Laundry reward (default): same layout as the dishes reward, anchored just above the washing machine, with a little clothes-themed sticker.
- Me-time invitation: appears where the second reward just faded.
- "Find somewhere comfortable" prompt and I'm ready button: stay gently in front of you as you move, low in view and not stuck to your face (default), because you might sit anywhere, even in another room.
- Breathing square: not tied to any place or piece of furniture. It appears wherever you are when you say you're ready: upright, about a metre in front of where you're looking, just below eye level. About the size of a side plate (20 cm, default). Once it appears it stays put, so it doesn't move if you turn to put your tea down. In the demo, the sofa is simply where the learner sits. Mug of tea on the coffee table as a prop (default).
- Quest card: floats beside the door frame, leaving the view outside clear.
- Notebook: opens at a comfortable reading spot about 70 cm in front of you, a little below eye level (default), and stays where you opened it.
- Raise hand button: small, low in view, clearly a demo control.

## Hands and input
- Laundry: pinch and drag the pile of clothes from the basket into the washing machine, then release.
- Dishes: pinch and drag items from the piled-up sink into the dishwasher, then release. The last one, with the door closing, triggers the reward.
- Me-time: pinch Yes or No, then pinch "I'm ready" once you're sitting comfortably.
- Breathing: pinch Pause or Finish now, at any time.
- Door: walking closer opens it. No pinch is needed. Pinch Start, Ignore for today, or Ignore until 5 pm on the quest card.
- Notebook: pinch "Raise hand" (demo button). An animated hand raises with a page tab beside it, then pinch the tab to open. Inside: Today and Stickers tabs, tick off, add, edit or remove tasks, and a close button.
- Targets are big and highlight when aimed at.
- Voice: none.

## When things show
- Sticker hints: show from the start, hide once that task is done.
- Reward sequence: plays once when a task is done, about 1 second of pop and sparkle, one soft bounce, gold ring, six small stars. Then the message fades in and is held long enough to read. Then the sticker shrinks into its outline in the strip, held for about 2 seconds, and the strip fades. The rest of the room stays clear and still. The sticker is saved even if you look away.
- Reward messages: personal and short. "A clear sink for tomorrow." for dishes. Laundry (default): "Fresh clothes, well done, Szonja." The name is one editable value (default: Szonja).
- Me-time invitation: shows after both chores. It says well done for the dishes and the washing machine, and asks if you want to reward yourself with some me-time: make a tea, sit down, take a few minutes. "Are you ready for some conscious breathing?" Yes / No. Fades on either answer. No leaves the room quiet.
- "Find somewhere comfortable" prompt: shows on Yes, asking you to find somewhere comfortable to sit, in this room or another. It waits as long as you need. Hides when you pinch "I'm ready."
- Breathing square: shows when you pinch "I'm ready," in front of you, with "Follow the dot. Four counts on each side." Then the square stays still, a warm golden dot moves clockwise at a steady speed from the bottom-left corner: up the left edge "Breathe in," across the top "Hold," down the right edge "Breathe out," across the bottom "Rest." Four seconds a side, four rounds, 64 seconds. "Round 1 of 4" inside the square. Translucent teal fill and a thick mint edge. Other prompts fade while it runs.
- End of breathing, or Finish now: the dot comes home, the square fades, "Breathe normally. Take your time." appears with a sticker of three balanced pebbles and a couple of soft sparkles, saved to today's page. Finishing early earns the sticker too. Then it stays quiet.
- Quest hint: when you look at the door from across the room, a small sign shows it could be a quest or a sticker to earn.
- Door and quest card: when you come close (default: within 1.5 m), the door animates open to a view of the outside, and the card appears: "Find 3 yellow things," or "3 unique leaves" as another example. The card stays whenever you look at the door until the quest is finished or cancelled on purpose. Ignore for today hides it for the day. Ignore until 5 pm hides it until then, for someone working from home who doesn't need the invitation yet. In the demo it just hides, without waiting for a real clock.
- Notebook: shows only when you ask for it, hides when you close it. Today lists the tasks you planned: "Do the laundry," "Load the dishwasher," plus the mindfulness moment. Stickers shows the day's achievements.
- Reduced motion (default: one on/off setting): the message appears gently and the sticker fades into place, keeping the 2-second hold.
- If something needs attention out of view: none. The breathing comes to you, wherever you sit, and the door's quest waits until you look at it.

## Done criteria
Each one can be checked in Lens Studio's preview.
1. I can walk and look around an American-style kitchen and living room with a door to the outside, and see the dirty dishes and the laundry basket in the corner, each with a sign that I can earn a sticker.
2. Pinching the clothes into the washing machine, and the dishes into the dishwasher, each plays the pop, stars and personal message beside that appliance, and the second sticker settles next to the first in the strip.
3. After both tasks I'm asked if I want some me-time. Saying yes asks me to find somewhere comfortable to sit. Wherever I am, when I pinch "I'm ready" the box breathing appears in front of me, where the dot moves around the square with the changing words. I can end it whenever, and I earn the pebble sticker.
4. When I look at the door I can see there's a quest or sticker to earn. When I come closer, the door animates open to the outside, with the option to start "Find 3 yellow things," ignore for today, or ignore until 5 pm.
5. Pinching "Raise hand" shows an animated hand and the notebook tab. In the notebook I can see my to-do list, add, edit or remove a task, and see the stickers and achievements of the day.

## Out of scope
This version won't do the following. They're the bigger product, for later.
- Recognizing real things: colors, leaves, objects, a real messy flat, or real completed chores.
- The app looking around to suggest tasks (and if it's ever built, opt-in only, because it could feel invasive).
- Recognizing that someone is a new person you're talking to. "Talk to someone new" challenges would rely on you ticking them off yourself, with no identifying of other people.
- Skins and clothes other people can see through their glasses (needs two people and devices).
- Levels, buying skins, and the 5-small-stickers-make-a-bigger-one progression.
- Museum art styles that make the world look like a painting.
- Drawing guides and step or distance tracking.
- Setup questions and ability levels, 5-a-day suggestions, and morning, daytime and evening breathing routines.
- Remembering stickers or tasks between sessions. Each preview run starts fresh with the same sample day.
- Softening or blurring the real room. The display only adds light, so it can't blur what's really there.
- Walking outside, or doing the quest itself. The demo ends at the door.

## Risks and open questions
- Scope: three activities, a door and a furnished room are near the upper limit for one build. Learner kept this. If the build struggles, simplify the door first, then the room's furniture.
- Virtual room on an additive display: dark surfaces (like the green cabinets in the storyboard) will fade or look see-through. Keep the warm look, but lighten colors until it reads in the preview.
- Panels: the storyboard's dark green panels would look faint. Use brighter teal panels with light text, keeping the style as close as possible.
- Typing in the notebook: a keyboard may not work in the preview. If it doesn't, Add and Edit fall back to picking from a short preset list (default). Remove and tick off still work.
- Sitting down: the preview camera doesn't sit. Move to the sofa and lower the camera with Q. Seated comfort is "feel unproven."
- Raise hand and the "I'm ready" signal: real hand gestures can't be shown in the preview. A "Raise hand" button and an "I'm ready" button stand in, and the video should explain that on real glasses you'd signal with your hand.
- Demo video length: 64 seconds of breathing is too long for the 3-minute limit. The Lens keeps four rounds; show a quarter of a round at regular speed, then speed up or cut it.
- Wording: this is a supportive self-help idea, not medical treatment. Keep messages kind and never scolding, and describe it that way in the submission (default).

## Reference files
The learner's own designs, in `devpost/reference/`. Follow these for look and feel. Where they differ, this brief wins (for example, the brief uses laundry rather than tea, and finishing breathing early still earns a sticker).
- `small-wins-storyboard.webp`: first-person storyboard of the kitchen, reward, notebook and door.
- `small-wins-demo.html`: interactive demo of the reward, notebook and door, with sticker art embedded.
- `small-wins-box-breathing.html`: interactive demo of the breathing square.

## Build notes for CLAD
- Build for SPECS so it runs and can be demonstrated in Lens Studio's preview. No SPECS device is available.
- Use Spectacles Interaction Kit (SIK) and UI Kit for all interactions, so they work with the mouse in Interactive Preview and with LEAF.
- Build any stand-in exactly as described above, and keep it obvious in the scene.
- Use real-world scale in centimeters. Keep content inside the user's view during the main task.
- The display is additive: black renders as transparent. Don't rely on black or very dark content to be seen; keep text light and readable from where the user stands.
- Get the basic flow working first, then add detail.
- Write LEAF scenarios for each done criterion, run them in preview, and report which pass. Say which criteria have no test.
- Don't record, identify, or follow people.

## After the build: judge it
This part is for you, after CLAD finishes.

1. **Does it work?** Ask your agent which LEAF tests passed and which done criteria have no test.
2. **Walk around it.** Open the preview in Interactive Preview. Use WASD to move, Q and E to go down and up, and right-drag (or hold Shift) to look around. Clicking acts as a pinch. Stand where a user would and look at the task.
3. **Ask the three questions.**
   - Does it use what I'm looking at?
   - Does it put something in my space, where it belongs?
   - Does it free my hands or let me keep my eyes up?
   - Would it be just as good on a phone? If so, what would make it need the glasses?
4. **Check comfort.**
   - Everything I need is in view while I do the task. Nothing sits at the edges, behind me, or stuck to my face.
   - Every control is within reach of someone standing there.
   - Text reads easily from where I stand. No dark UI disappearing.
   - Things show when needed and get out of the way.
5. **Label what you know.** Write "logic proven" next to anything the tests and preview show working, and "feel unproven" next to anything only real glasses could tell you (comfort over time, real hand tracking, real recognition).
6. **Fix with design notes, not code.** Tell your agent what to change in design terms, for example: "Move the step card 15 cm lower and next to the pan. Make the Next button twice as big. Re-run the tests." If a fix takes under a minute, like nudging a panel, do it yourself in the scene.
7. **Submit.** Record a video under 3 minutes of your Lens in the preview, public on YouTube. Make your repo public with your Lens Studio project and this `devpost/` folder. Details are on the hackathon site: https://learn-specs.devpost.com/resources
