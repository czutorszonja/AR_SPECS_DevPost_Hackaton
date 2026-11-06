import {findInteractablesByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {SmallWinsState, TASK_LAUNDRY, TASK_PLANTS, TASK_PRESETS} from "../Scripts/SmallWinsState"
import {viewerPose} from "../Scripts/SmallWinsViewer"
import {openNotebook, shown, SmallWinsLeafInteractor, so, textOf, waitFor, worldPos} from "./SmallWinsLeafHelpers"

// Changes rebuild the card a moment later. Pressing a button as it is replaced would never complete.
const PAGE_SETTLE_MS = 800

/**
 * Done criterion 5: Raise hand shows the hand and three choices (Me-time, Today's wins, To-do list).
 * Each opens one small card: the list to tick, add, swap and remove tasks, and the day's stickers.
 */
@component
export class SmallWinsNotebookScenario extends Scenario {
  async run(): Promise<void> {
    const hand = new SmallWinsLeafInteractor()
    const state = SmallWinsState.instance
    await sleep(1200)
    expect(shown("Notebook")).toBe(false)
    expect(shown("RaisedHandRoot")).toBe(false)

    // Raise hand: an animated hand rises, with the three choices, Me-time on the left and the list on the right.
    await hand.tap("RaiseHandButton")
    expect(shown("AnimatedHand")).toBe(true)
    for (const tab of ["MeTimeTab", "WinsTab", "TodoTab"]) expect(shown(tab), tab + " should show").toBe(true)
    await sleep(700)
    expect(so("AnimatedHand").getTransform().getLocalPosition().y).toBeCloseTo(0, 0)
    const left = worldPos("MeTimeTab")
    const right = worldPos("TodoTab")
    const side = viewerPose().forward.cross(vec3.up()).normalize()
    expect(right.sub(left).dot(side)).toBeGreaterThan(15)

    // The list opens on its own card at a reading spot about 70 cm away, a little below the eyes, and stays put.
    await hand.tap("TodoTab")
    await waitFor("the list", () => shown("Notebook"), 3000)
    expect(shown("HandMenu")).toBe(false)
    expect(textOf("NotebookTitle")).toBe("To-do list")
    const eye = viewerPose().position
    const card = worldPos("Notebook")
    expect(new vec3(card.x - eye.x, 0, card.z - eye.z).length).toBeCloseTo(70, 0)
    expect(card.y).toBeLessThan(eye.y)
    await sleep(500)
    expect(worldPos("Notebook").distance(card)).toBeLessThan(0.01)
    expect(textOf("TaskTitle0")).toBe("Do the laundry")
    expect(textOf("TaskTitle1")).toBe("Load the dishwasher")
    expect(textOf("TaskTitle2")).toBe("Mindfulness moment")

    // Add a job from the flat.
    await hand.tap("AddTaskButton")
    await sleep(PAGE_SETTLE_MS)
    expect(textOf("NotebookTitle")).toBe("Add a task")
    await hand.tap("PresetTask0")
    await sleep(PAGE_SETTLE_MS)
    expect(state.tasks.length).toBe(4)
    expect(textOf("TaskTitle3")).toBe(TASK_PRESETS[0].title)
    expect(!!state.getTask(TASK_PLANTS)).toBe(true)

    // A job that lives in the flat can only be on the list once, so it isn't offered again.
    await hand.tap("AddTaskButton")
    await sleep(PAGE_SETTLE_MS)
    expect(textOf("PresetTask0Label")).toBe(TASK_PRESETS[1].title)
    await hand.tap("PickerCancel")
    await sleep(PAGE_SETTLE_MS)
    expect(state.tasks.length).toBe(4)

    // Edit swaps it for another, in the same place.
    await hand.tap("TaskEdit3")
    await sleep(PAGE_SETTLE_MS)
    expect(textOf("NotebookTitle")).toBe("Change this task")
    await hand.tap("PresetTask4")
    await sleep(PAGE_SETTLE_MS)
    expect(textOf("TaskTitle3")).toBe(TASK_PRESETS[4].title)
    expect(state.tasks.length).toBe(4)

    // Edit also removes.
    await hand.tap("TaskEdit3")
    await sleep(PAGE_SETTLE_MS)
    await hand.tap("PickerRemove")
    await sleep(PAGE_SETTLE_MS)
    expect(state.tasks.length).toBe(3)
    expect(findInteractablesByName("TaskEdit3", undefined, true).length).toBe(0)

    // Ticking off puts the card away so the sticker can play out in the room.
    await hand.tap("TaskTick0")
    expect(state.getTask(TASK_LAUNDRY).done).toBe(true)
    expect(state.stickers.length).toBe(1)
    await waitFor("the card to close", () => !shown("Notebook"), 3000)
    await waitFor("the sticker", () => shown("RewardPlate"), 3000)
    await waitFor("the reward to end", () => !shown("RewardPlate") && !shown("RewardMessageRoot"), 12000)

    // Today's wins shows the day's stickers, with what each was for.
    await openNotebook(hand, "WinsTab")
    expect(textOf("NotebookTitle")).toBe("Today's wins")
    expect(shown("StickerArt0")).toBe(true)
    expect(textOf("StickerLabel0")).toBe("Do the laundry")

    // The one reduced motion setting lives with the wins it changes.
    await hand.tap("ReducedMotionButton")
    expect(state.reducedMotion).toBe(true)
    await sleep(PAGE_SETTLE_MS)
    expect(textOf("ReducedMotionButtonLabel")).toBe("Reduced motion: On")

    // Unticking takes the sticker back off the page, quietly.
    await hand.tap("NotebookClose")
    await sleep(500)
    await openNotebook(hand, "TodoTab")
    await hand.tap("TaskTick0")
    expect(state.stickers.length).toBe(0)
    await sleep(PAGE_SETTLE_MS)
    expect(shown("Notebook")).toBe(true)

    // Close puts it away and brings the demo button back.
    await hand.tap("NotebookClose")
    expect(shown("Notebook")).toBe(false)
    expect(shown("RaiseHandButton")).toBe(true)
  }
}
