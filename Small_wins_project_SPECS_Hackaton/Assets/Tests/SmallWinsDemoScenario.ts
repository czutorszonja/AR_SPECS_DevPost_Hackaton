import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {findSceneObjectByName, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {SmallWinsDemoNavigation} from "../Scripts/SmallWinsDemoNavigation"
import {doorCentre} from "./SmallWinsDoorScenario"
import {openNotebook, shown, SmallWinsLeafInteractor, so, waitFor, worldPos} from "./SmallWinsLeafHelpers"

// A breath between actions, so there is room to talk over the video.
const BEAT_MS = 1800
const HOLD_MS = 3000
// The planner rebuilds a moment after each press; the next press waits for it.
const PAGE_MS = 1000
// A calm camera: an unhurried turn and a gentle walking pace.
const TURN_DEGREES_PER_SECOND = 40
const WALK_CM_PER_SECOND = 95
// Standing eye height in the demo room, as at the start spot.
const EYE_Y = 0
const START = new vec3(76, EYE_Y, 430)

/**
 * Not a test: plays the demo video's shot list hands-free, at a pace to talk over, in under three minutes.
 * The day planned the night before (with a look back at yesterday and on to tomorrow), the dishes, the laundry
 * and an earned break with box breathing on the sofa, the me-time choices, two more jobs added with their sticker
 * holders appearing in the flat, watering the plants, today's wins, and the quest waiting at the door.
 */
@component
export class SmallWinsDemoScenario extends Scenario {
  private nav: SmallWinsDemoNavigation
  private startedAt = -1

  async run(): Promise<void> {
    this.startedAt = getTime()
    const hand = new SmallWinsLeafInteractor()
    this.nav = so("ViewerRig (preview navigation)").getComponent(SmallWinsDemoNavigation.getTypeName()) as SmallWinsDemoNavigation
    // Always open on the same shot, whichever preview environment is chosen: mid-room, facing the kitchen.
    this.nav.cancelCameraTurn = true
    this.nav.maxTurnSpeed = Infinity
    this.nav.maxMoveSpeed = Infinity
    this.nav.standLooking(START, new vec3(START.x, EYE_Y - 30, START.z - 300))
    await this.settle()
    this.nav.maxTurnSpeed = TURN_DEGREES_PER_SECOND
    this.nav.maxMoveSpeed = WALK_CM_PER_SECOND
    // The test tool's own status line would show in the recording.
    await sleep(100)
    this.hideTestBanner()
    await sleep(3000)

    // 1. The flat, facing the kitchen with the sticker holders for today's chores.
    this.mark("start")
    await sleep(BEAT_MS)

    // 2. The day, planned the night before: today with the concert, a look back at yesterday, and on to tomorrow.
    this.mark("plan")
    await hand.tap("RaiseHandButton")
    await sleep(2200)
    await hand.tap("TodoTab")
    await sleep(HOLD_MS)
    await hand.tap("DayPrev")
    await sleep(2500)
    await hand.tap("DayNext")
    await sleep(PAGE_MS)
    await hand.tap("DayNext")
    await sleep(2500)
    await hand.tap("DayPrev")
    await sleep(PAGE_MS)
    await hand.tap("NotebookClose")
    await sleep(800)

    // 3. Walk up to the sink and load the dishes; the sticker pops right there.
    this.mark("dishes")
    const sink = worldPos("DishMug")
    const dishwasher = worldPos("DishwasherDropZone")
    const dishes = new vec3((sink.x + dishwasher.x) / 2, sink.y - 5, (sink.z + dishwasher.z) / 2)
    await this.walkTo(new vec3(dishes.x + 10, EYE_Y, dishes.z + 135), dishes)
    await sleep(1000)
    await hand.loadDishes()
    await waitFor("the dishes reward", () => shown("RewardPlate"), 8000)
    await waitFor("the dishes reward to end", () => !shown("RewardPlate") && !shown("RewardMessageRoot"), 14000)
    await sleep(600)

    // 4. Step back to take in the washer and the basket, load the clothes: that's enough for an earned break.
    this.mark("laundry")
    const washer = worldPos("WasherDropZone")
    const basket = worldPos("ClothesPile")
    const laundry = new vec3((washer.x + basket.x) / 2, washer.y + 30, (washer.z + basket.z) / 2)
    await this.walkTo(new vec3(laundry.x - 20, EYE_Y, laundry.z + 240), laundry)
    await sleep(1000)
    await hand.loadLaundry()
    await waitFor("the me-time invitation", () => shown("MeTimeInvitation"), 18000)
    this.mark("invitation")
    await sleep(HOLD_MS)
    await hand.tap("YesButton")
    await sleep(1200)

    // 5. Across the room to the sofa, sit, and a little box breathing.
    this.mark("sofa")
    const sofaSign = worldPos("SitOnSofaButton")
    await this.walkTo(new vec3(sofaSign.x - 40, EYE_Y, sofaSign.z - 230), sofaSign.add(new vec3(0, 20, 0)))
    await sleep(800)
    await hand.tap("SitOnSofaButton")
    await this.settle()
    await sleep(1200)
    await hand.tap("ReadyButton")
    await sleep(7000)
    await hand.tap("FinishNowButton")
    await waitFor("the pebbles sticker", () => shown("BreathingReward"), 4000)
    await waitFor("the pebbles sticker to go", () => !shown("BreathingReward"), 9000)
    await sleep(300)

    // 6. Still on the sofa: the other me-time choices, left open to talk about.
    this.mark("metime")
    await openNotebook(hand, "MeTimeTab")
    await sleep(5500)
    await hand.tap("NotebookClose")
    await sleep(600)
    await hand.tap("StandUpButton")
    await this.settle()

    // 7. Back in the middle of the room, add two more jobs: their sticker holders appear around the flat.
    this.mark("add")
    await this.walkTo(START, new vec3(76, -20, 150))
    this.mark("add-walked")
    await openNotebook(hand, "TodoTab")
    this.mark("add-list-open")
    await hand.tap("AddTaskButton")
    await sleep(PAGE_MS)
    await hand.tap("PresetTask2")
    this.mark("add-first-added")
    await sleep(PAGE_MS)
    await hand.tap("AddTaskButton")
    await sleep(PAGE_MS)
    await hand.tap("PresetTask0")
    await sleep(1500)
    await hand.tap("NotebookClose")
    this.mark("holders")
    this.nav.lookToward(worldPos("TaskHint_table"))
    await this.settle()
    await sleep(1800)

    // 8. Over to the palm, and water it by hand: its sticker pops where the holder was.
    this.mark("plants")
    const pour = worldPos("PlantPourPoint")
    await this.walkTo(new vec3(pour.x - 150, EYE_Y, pour.z + 170), pour.add(new vec3(0, -10, 0)))
    await sleep(800)
    await hand.dragTo("WateringCan", worldPos("PlantPourPoint"))
    // On a slow machine the can can trail the hand and miss; carry it over again rather than stop the recording.
    if (!(await this.within(() => shown("RewardPlate") || this.canPouring(), 2500))) {
      await hand.dragTo("WateringCan", worldPos("PlantPourPoint"))
    }
    await waitFor("the plant sticker", () => shown("RewardPlate"), 9000)
    await waitFor("the plant reward to end", () => !shown("RewardPlate") && !shown("RewardMessageRoot"), 14000)

    // 9. Today's wins, all in one place.
    this.mark("wins")
    this.nav.lookToward(new vec3(pour.x - 150, EYE_Y - 10, pour.z - 100))
    await this.settle()
    await openNotebook(hand, "WinsTab")
    await sleep(4500)
    await hand.tap("NotebookClose")
    await sleep(800)

    // 10. The door from across the room, where its sign invites you out; then up to it, open it, and leave the quest for later.
    this.mark("door")
    const door = doorCentre()
    await this.walkTo(new vec3(door.x + 420, EYE_Y, door.z - 20), door.add(new vec3(0, 40, 0)))
    await sleep(3000)
    await this.walkTo(new vec3(door.x + 230, EYE_Y, door.z), door.add(new vec3(0, 10, 0)))
    await sleep(800)
    await hand.tap("EntryDoorTapTarget")
    await waitFor("the quest card", () => shown("QuestCard"), 4000)
    await sleep(4000)
    await hand.tap("IgnoreUntil5Button")
    await sleep(1500)

    // A last slow look back across the flat.
    this.mark("closing")
    this.nav.lookToward(new vec3(300, -20, 600))
    await this.settle()
    // Long enough for the closing words and what comes next.
    await sleep(11000)
    this.mark("end")
  }

  /** Waits until something is true, for up to a while, and says whether it happened. */
  private async within(condition: () => boolean, ms: number): Promise<boolean> {
    for (let waited = 0; waited < ms; waited += 100) {
      if (condition()) return true
      await sleep(100)
    }
    return condition()
  }

  /** The can has landed by the plant when it is no longer back at home. */
  private canPouring(): boolean {
    return worldPos("WateringCan").distance(worldPos("PlantPourPoint")) < 40
  }

  /** Prints how far into the video each beat starts, for timing the voiceover. */
  private mark(beat: string): void {
    print("DEMO beat " + beat + " at " + (getTime() - this.startedAt).toFixed(1) + " s")
  }

  /** Walks over at an easy pace and turns to face something, then waits until the view is still. */
  private async walkTo(eye: vec3, target: vec3): Promise<void> {
    this.nav.standLooking(eye, target)
    await this.settle()
  }

  private async settle(): Promise<void> {
    // Never let a slow camera stop the recording: wait for stillness, but carry on after a while regardless.
    let waited = 0
    while (!this.nav.isSettled && waited < 15000) {
      await sleep(100)
      waited += 100
    }
    if (!this.nav.isSettled) print("DEMO camera did not settle: " + this.nav.debugState)
    await sleep(400)
  }

  /**
   * The test tool's status line and the see-through hands it animates to press buttons would both show in the
   * recording. The presses still work without the hands (but not without the cursors, which drive the drags).
   */
  private hideTestBanner(): void {
    for (const name of ["LeafDebugUICamera", "HandVisuals"]) {
      const so = findSceneObjectByName(name)
      if (so) so.enabled = false
    }
  }
}
