import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {SmallWinsState, TASK_READ} from "../Scripts/SmallWinsState"
import {openNotebook, shown, SmallWinsLeafInteractor, textOf, waitFor, worldPos} from "./SmallWinsLeafHelpers"

const PAGE_SETTLE_MS = 800

/** Reading ten pages has a place too: its sticker holder waits by the books on the coffee table, and tapping them counts. */
@component
export class SmallWinsReadingScenario extends Scenario {
  async run(): Promise<void> {
    const hand = new SmallWinsLeafInteractor()
    const state = SmallWinsState.instance
    await sleep(1200)
    expect(shown("TaskHint_read")).toBe(false)

    await openNotebook(hand, "TodoTab")
    await hand.tap("AddTaskButton")
    await sleep(PAGE_SETTLE_MS)
    expect(textOf("PresetTask5Label")).toBe("Read ten pages")
    await hand.tap("PresetTask5")
    await sleep(PAGE_SETTLE_MS)
    await hand.tap("NotebookClose")
    await sleep(500)

    // The holder floats just above the books, clear of the phone's spot.
    expect(shown("TaskHint_read")).toBe(true)
    const books = worldPos("BookTapTarget")
    expect(worldPos("TaskHint_read").distance(books)).toBeLessThan(70)
    expect(worldPos("BookRewardAnchor").distance(worldPos("PhoneRewardAnchor"))).toBeGreaterThan(40)

    await hand.tap("BookTapTarget")
    await waitFor("the book sticker", () => shown("RewardPlate"), 6000)
    expect(state.getTask(TASK_READ).done).toBe(true)
    expect(state.stickers.some((s) => s.art === "book")).toBe(true)
    expect(shown("TaskHint_read")).toBe(false)
  }
}
