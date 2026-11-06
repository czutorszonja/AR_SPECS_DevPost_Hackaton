import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {findSceneObjectByName, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {SmallWinsDemoNavigation} from "../Scripts/SmallWinsDemoNavigation"
import {doorCentre} from "./SmallWinsDoorScenario"
import {chooseTherapy, openNotebook, shown, SmallWinsLeafInteractor, so, waitFor, worldPos} from "./SmallWinsLeafHelpers"

// A breath between actions, so there is room to talk over the video.
const BEAT_MS = 1800
const HOLD_MS = 3000
// A calm camera: an unhurried turn and a gentle walking pace.
const TURN_DEGREES_PER_SECOND = 40
const WALK_CM_PER_SECOND = 95
// Standing eye height in the demo room, as at the start spot.
const EYE_Y = 0
const START = new vec3(76, EYE_Y, 430)

/**
 * Not a test: plays the demo video's shot list hands-free, at a pace to talk over.
 * A slow look round the flat, plan the day, dishes, laundry and breathing on the sofa, text a friend,
 * guided drawing, eye movement calm, feed the cat and today's wins, and the quest waiting at the door.
 */
@component
export class SmallWinsDemoScenario extends Scenario {
  private nav: SmallWinsDemoNavigation

  async run(): Promise<void> {
    const hand = new SmallWinsLeafInteractor()
    this.nav = so("ViewerRig (preview navigation)").getComponent(SmallWinsDemoNavigation.getTypeName()) as SmallWinsDemoNavigation
    this.nav.maxTurnSpeed = TURN_DEGREES_PER_SECOND
    this.nav.maxMoveSpeed = WALK_CM_PER_SECOND
    // The test tool's own status line would show in the recording.
    await sleep(100)
    this.hideTestBanner()
    await sleep(3000)

    // 1. The flat, facing the kitchen with its sticker hints.
    await sleep(BEAT_MS)

    // 2. Plan the day: raise your hand, open the list, add texting a friend.
    await hand.tap("RaiseHandButton")
    await sleep(HOLD_MS)
    await hand.tap("TodoTab")
    await sleep(BEAT_MS)
    await hand.tap("AddTaskButton")
    await sleep(BEAT_MS)
    await hand.tap("PresetTask3")
    await sleep(BEAT_MS)
    await hand.tap("NotebookClose")
    await sleep(BEAT_MS)

    // 3. Walk up to the sink and load the dishes; the sticker pops on the backsplash right there.
    const sink = worldPos("DishMug")
    const dishwasher = worldPos("DishwasherDropZone")
    const dishes = new vec3((sink.x + dishwasher.x) / 2, sink.y - 5, (sink.z + dishwasher.z) / 2)
    await this.walkTo(new vec3(dishes.x + 10, EYE_Y, dishes.z + 135), dishes)
    await sleep(1500)
    await hand.loadDishes()
    await waitFor("the dishes reward", () => shown("RewardPlate"), 8000)
    await waitFor("the dishes reward to end", () => !shown("RewardPlate") && !shown("RewardMessageRoot"), 14000)
    await sleep(1000)

    // 4. Step back to take in the washer and the basket, load the clothes, then the me-time invitation.
    const washer = worldPos("WasherDropZone")
    const basket = worldPos("ClothesPile")
    const laundry = new vec3((washer.x + basket.x) / 2, washer.y + 30, (washer.z + basket.z) / 2)
    await this.walkTo(new vec3(laundry.x - 20, EYE_Y, laundry.z + 240), laundry)
    await sleep(1500)
    await hand.loadLaundry()
    await waitFor("the me-time invitation", () => shown("MeTimeInvitation"), 18000)
    await sleep(HOLD_MS)
    await hand.tap("YesButton")
    await sleep(BEAT_MS)

    // Across the room to the sofa, sit, and a little box breathing.
    const sofaSign = worldPos("SitOnSofaButton")
    await this.walkTo(new vec3(sofaSign.x - 40, EYE_Y, sofaSign.z - 230), sofaSign.add(new vec3(0, 20, 0)))
    await sleep(1000)
    await hand.tap("SitOnSofaButton")
    await this.settle()
    await sleep(1500)
    await hand.tap("ReadyButton")
    await sleep(7000)
    await hand.tap("FinishNowButton")
    await sleep(5000)

    // 5. Still on the sofa: a glance down at the phone, and a message to a friend.
    this.nav.lookToward(worldPos("Phone").add(new vec3(0, 30, 0)))
    await this.settle()
    await sleep(1000)
    await hand.tap("Phone")
    await waitFor("the phone sticker", () => shown("RewardPlate"), 6000)
    await waitFor("the phone reward to end", () => !shown("RewardPlate") && !shown("RewardMessageRoot"), 14000)
    await hand.tap("StandUpButton")
    await this.settle()

    // Back to the middle of the room for some time to yourself.
    await this.walkTo(START, new vec3(-150, -20, 150))
    await sleep(1000)

    // 6. Guided drawing, through to the watercolour finish.
    await chooseTherapy(hand, "TherapyDrawing")
    await sleep(HOLD_MS)
    await hand.tap("DrawStartButton")
    for (let step = 0; step < 4; step++) {
      await sleep(3200)
      await hand.tap("DrawNextButton")
    }
    await sleep(5500)
    await waitFor("the drawing to finish", () => !shown("DrawSheet"), 6000)
    await sleep(1000)

    // 7. Eye movement calm: the safety line, a few passes, then Stop.
    await chooseTherapy(hand, "TherapyEyes")
    await sleep(HOLD_MS)
    await hand.tap("EyeStartButton")
    await sleep(5000)
    await hand.tap("EyeStopButton")
    await sleep(5000)
    await waitFor("the eye exercise to finish", () => !shown("EyeReward"), 8000)
    await sleep(1000)

    // 8. Over to the cat by the fridge, feed it from the list, then today's wins.
    const cat = worldPos("Cat")
    const bowl = worldPos("CatBowl")
    const catCorner = new vec3((cat.x + bowl.x) / 2, cat.y + 50, (cat.z + bowl.z) / 2)
    const catSpot = new vec3(catCorner.x + 80, EYE_Y, catCorner.z + 200)
    await this.walkTo(catSpot, catCorner)
    await sleep(1500)
    // Look up from the floor before raising your hand, so the list opens in view.
    const levelOverCat = new vec3(catCorner.x, EYE_Y - 10, catCorner.z)
    this.nav.lookToward(levelOverCat)
    await this.settle()
    await openNotebook(hand, "TodoTab")
    await hand.tap("AddTaskButton")
    await sleep(BEAT_MS)
    await hand.tap("PresetTask1")
    await sleep(BEAT_MS)
    await hand.tap("TaskTick4")
    // Down to watch the bowl fill and the cat's happy bounce, then the sticker above it.
    this.nav.lookToward(catCorner)
    await waitFor("the cat sticker", () => shown("RewardPlate"), 8000)
    await waitFor("the cat reward to end", () => !shown("RewardPlate") && !shown("RewardMessageRoot"), 14000)
    this.nav.lookToward(levelOverCat)
    await this.settle()
    await openNotebook(hand, "WinsTab")
    await sleep(4000)
    await hand.tap("NotebookClose")
    await sleep(1500)

    // 9. The door from across the room, where its sign invites you out; then up to it, open it, and leave the quest for later.
    const door = doorCentre()
    await this.walkTo(new vec3(door.x + 420, EYE_Y, door.z - 20), door.add(new vec3(0, 40, 0)))
    await sleep(4000)
    await this.walkTo(new vec3(door.x + 230, EYE_Y, door.z), door.add(new vec3(0, 10, 0)))
    await sleep(1000)
    await hand.tap("EntryDoorTapTarget")
    await waitFor("the quest card", () => shown("QuestCard"), 4000)
    await sleep(4500)
    await hand.tap("IgnoreUntil5Button")
    await sleep(2000)

    // A last slow look back across the flat.
    this.nav.lookToward(new vec3(300, -20, 600))
    await this.settle()
    await sleep(3000)
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

  private hideTestBanner(): void {
    const banner = findSceneObjectByName("LeafDebugUICamera")
    if (banner) banner.enabled = false
  }
}
