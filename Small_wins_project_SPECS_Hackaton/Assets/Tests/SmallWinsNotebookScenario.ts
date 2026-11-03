import {createIKInteractor} from "Leaf.lspkg/Interactors/interactor/ik/visualizer/BitmojiAvatar"
import {findInteractablesByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {SmallWinsState, TASK_LAUNDRY, TASK_PRESETS} from "../Scripts/SmallWinsState"
import {viewerPose} from "../Scripts/SmallWinsViewer"
import {shown, SmallWinsLeafInteractor, so, textOf, waitFor, worldPos} from "./SmallWinsLeafHelpers"

/** Done criterion 5: Raise hand shows the hand and tab, and the notebook lists, adds, edits, removes and shows stickers. */
@component
export class SmallWinsNotebookScenario extends Scenario {
  async run(): Promise<void> {
    const hand = new SmallWinsLeafInteractor()
    const state = SmallWinsState.instance
    await sleep(1200)
    expect(shown("Notebook")).toBe(false)
    expect(shown("RaisedHandRoot")).toBe(false)

    // Raise hand: an animated hand rises, with the tab beside it.
    await hand.tap("RaiseHandButton")
    expect(shown("AnimatedHand")).toBe(true)
    expect(shown("NotebookTab")).toBe(true)
    await sleep(700)
    const raised = so("AnimatedHand").getTransform().getLocalPosition().y
    expect(raised).toBeCloseTo(0, 0)

    // Pinch the tab: it opens at a reading spot about 70 cm away, a little below the eyes, and stays there.
    await hand.tap("NotebookTab")
    expect(shown("Notebook")).toBe(true)
    expect(shown("RaisedHandRoot")).toBe(false)
    const eye = viewerPose().position
    const book = worldPos("Notebook")
    expect(new vec3(book.x - eye.x, 0, book.z - eye.z).length).toBeCloseTo(70, 0)
    expect(book.y).toBeLessThan(eye.y)
    await sleep(500)
    expect(worldPos("Notebook").distance(book)).toBeLessThan(0.01)

    // Today lists the tasks you planned.
    expect(textOf("TaskTitle0")).toBe("Do the laundry")
    expect(textOf("TaskTitle1")).toBe("Load the dishwasher")
    expect(textOf("TaskTitle2")).toBe("Mindfulness moment")

    // Nothing earned yet.
    await hand.tap("StickersTab")
    expect(shown("StickersEmpty")).toBe(true)
    await hand.tap("TodayTab")
    await sleep(200)

    // Tick off.
    await hand.tap("TaskTick0")
    expect(state.getTask(TASK_LAUNDRY).done).toBe(true)
    expect(state.stickers.length).toBe(1)
    await sleep(200)

    // Add.
    await hand.tap("AddTaskButton")
    expect(shown("PresetTask0")).toBe(true)
    await hand.tap("PresetTask0")
    await sleep(200)
    expect(state.tasks.length).toBe(4)
    expect(textOf("TaskTitle3")).toBe(TASK_PRESETS[0])

    // Edit.
    await hand.tap("TaskEdit3")
    await hand.tap("PresetTask1")
    await sleep(200)
    expect(textOf("TaskTitle3")).toBe(TASK_PRESETS[1])
    expect(state.tasks.length).toBe(4)

    // Cancelling an edit changes nothing.
    await hand.tap("TaskEdit3")
    await hand.tap("PickerCancel")
    await sleep(200)
    expect(textOf("TaskTitle3")).toBe(TASK_PRESETS[1])

    // Remove.
    await hand.tap("TaskRemove3")
    await sleep(200)
    expect(state.tasks.length).toBe(3)
    expect(findInteractablesByName("TaskRemove3", undefined, true).length).toBe(0)

    // Stickers shows the day's achievements.
    await hand.tap("StickersTab")
    expect(shown("StickerArt0")).toBe(true)
    expect(textOf("StickerLabel0")).toBe("Do the laundry")

    // Unticking takes the sticker back off the page.
    await hand.tap("TodayTab")
    await sleep(200)
    await hand.tap("TaskTick0")
    expect(state.stickers.length).toBe(0)
    await sleep(200)

    // The one reduced motion setting.
    await hand.tap("ReducedMotionButton")
    expect(state.reducedMotion).toBe(true)
    await sleep(200)
    expect(textOf("ReducedMotionButtonLabel")).toBe("Reduced motion: On")

    // Close puts it away and brings the demo button back.
    await hand.tap("NotebookClose")
    expect(shown("Notebook")).toBe(false)
    expect(shown("RaiseHandButton")).toBe(true)
  }
}
