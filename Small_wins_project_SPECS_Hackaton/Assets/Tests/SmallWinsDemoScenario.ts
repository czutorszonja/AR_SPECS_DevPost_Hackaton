import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {findSceneObjectByName, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {SmallWinsDemoNavigation} from "../Scripts/SmallWinsDemoNavigation"
import {doorCentre} from "./SmallWinsDoorScenario"
import {chooseTherapy, openNotebook, shown, SmallWinsLeafInteractor, so, waitFor, worldPos} from "./SmallWinsLeafHelpers"

// A breath between actions, so there is room to talk over the video.
const BEAT_MS = 2500
const HOLD_MS = 4000
// Standing eye height in the demo room, as at the start spot.
const EYE_Y = 0

/**
 * Not a test: plays the demo video's shot list hands-free, at a pace to talk over.
 * Shots: the flat, plan the day, dishes, laundry and breathing, text a friend, guided drawing,
 * eye movement calm, feed the cat and today's wins, the quest at the door.
 */
@component
export class SmallWinsDemoScenario extends Scenario {
  private nav: SmallWinsDemoNavigation

  async run(): Promise<void> {
    const hand = new SmallWinsLeafInteractor()
    this.nav = so("ViewerRig (preview navigation)").getComponent(SmallWinsDemoNavigation.getTypeName()) as SmallWinsDemoNavigation
    // The test tool's own status line would show in the recording.
    await sleep(100)
    this.hideTestBanner()
    await sleep(3000)

    // 1. The flat: a slow look round the kitchen and back.
    const kitchen = new vec3(76, -30, 0)
    this.nav.lookToward(new vec3(-300, -40, 200))
    await sleep(2500)
    this.nav.lookToward(new vec3(500, -40, 150))
    await sleep(2500)
    this.nav.lookToward(kitchen)
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

    // 3. Walk up to the sink, then load the dishes; the sticker pops on the backsplash right there.
    const sink = worldPos("DishMug")
    const dishwasher = worldPos("DishwasherDropZone")
    const dishes = new vec3((sink.x + dishwasher.x) / 2, sink.y - 15, (sink.z + dishwasher.z) / 2)
    await this.walkTo(new vec3(dishes.x + 10, EYE_Y, dishes.z + 105), dishes)
    await hand.loadDishes()
    await waitFor("the dishes reward", () => shown("RewardPlate"), 8000)
    await waitFor("the dishes reward to end", () => !shown("RewardPlate") && !shown("RewardMessageRoot"), 14000)
    await sleep(1000)

    // 4. Over to the basket and the washer, then the me-time invitation, the sofa and a little box breathing.
    const washer = worldPos("WasherDropZone")
    const basket = worldPos("ClothesPile")
    const laundry = new vec3((washer.x + basket.x) / 2, washer.y, (washer.z + basket.z) / 2)
    await this.walkTo(new vec3(laundry.x - 10, EYE_Y, laundry.z + 120), laundry)
    await hand.loadLaundry()
    await waitFor("the me-time invitation", () => shown("MeTimeInvitation"), 18000)
    await sleep(HOLD_MS)
    await hand.tap("YesButton")
    await sleep(BEAT_MS)
    const sofaSign = worldPos("SitOnSofaButton")
    await this.walkTo(new vec3(sofaSign.x, EYE_Y, sofaSign.z - 190), sofaSign)
    await hand.tap("SitOnSofaButton")
    await sleep(3000)
    await hand.tap("ReadyButton")
    await sleep(8000)
    await hand.tap("FinishNowButton")
    await sleep(6000)

    // 5. Still on the sofa: text a friend.
    this.nav.lookToward(worldPos("Phone"))
    await sleep(BEAT_MS)
    await hand.tap("Phone")
    await waitFor("the phone sticker", () => shown("RewardPlate"), 6000)
    await waitFor("the phone reward to end", () => !shown("RewardPlate") && !shown("RewardMessageRoot"), 14000)
    await hand.tap("StandUpButton")
    await sleep(2500)
    this.nav.lookToward(kitchen)
    await sleep(BEAT_MS)

    // 6. Guided drawing, through to the watercolour finish.
    await chooseTherapy(hand, "TherapyDrawing")
    await sleep(HOLD_MS)
    await hand.tap("DrawStartButton")
    for (let step = 0; step < 4; step++) {
      await sleep(3600)
      await hand.tap("DrawNextButton")
    }
    await sleep(8000)
    await waitFor("the drawing to finish", () => !shown("DrawSheet"), 6000)
    await sleep(1000)

    // 7. Eye movement calm: the safety line, a few passes, then Stop.
    await chooseTherapy(hand, "TherapyEyes")
    await sleep(HOLD_MS)
    await hand.tap("EyeStartButton")
    await sleep(7000)
    await hand.tap("EyeStopButton")
    await sleep(5000)
    await waitFor("the eye exercise to finish", () => !shown("EyeReward"), 8000)
    await sleep(1000)

    // 8. Feed the cat from the list, then today's wins.
    const cat = worldPos("Cat")
    const bowl = worldPos("CatBowl")
    const catCorner = new vec3((cat.x + bowl.x) / 2, cat.y + 15, (cat.z + bowl.z) / 2)
    await this.walkTo(new vec3(catCorner.x + 55, EYE_Y, catCorner.z + 125), catCorner)
    await openNotebook(hand, "TodoTab")
    await hand.tap("AddTaskButton")
    await sleep(BEAT_MS)
    await hand.tap("PresetTask1")
    await sleep(BEAT_MS)
    await hand.tap("TaskTick4")
    await waitFor("the cat sticker", () => shown("RewardPlate"), 8000)
    await waitFor("the cat reward to end", () => !shown("RewardPlate") && !shown("RewardMessageRoot"), 14000)
    await sleep(1000)
    await openNotebook(hand, "WinsTab")
    await sleep(5000)
    await hand.tap("NotebookClose")
    await sleep(BEAT_MS)

    // 9. The quest at the door, left for later.
    const door = doorCentre()
    await this.walkTo(new vec3(door.x + 190, EYE_Y, door.z), door)
    await sleep(BEAT_MS)
    await hand.tap("EntryDoorTapTarget")
    await waitFor("the quest card", () => shown("QuestCard"), 4000)
    await sleep(6000)
    await hand.tap("IgnoreUntil5Button")
    await sleep(4000)
  }

  /** Walks over and turns to face something, then lets the view settle. */
  private async walkTo(eye: vec3, target: vec3): Promise<void> {
    this.nav.standLooking(eye, target)
    await sleep(2200)
  }

  private hideTestBanner(): void {
    const banner = findSceneObjectByName("LeafDebugUICamera")
    if (banner) banner.enabled = false
  }
}
