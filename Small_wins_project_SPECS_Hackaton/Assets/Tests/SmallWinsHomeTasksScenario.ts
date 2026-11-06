import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {SmallWinsState, TASK_CAT, TASK_PHONE, TASK_PLANTS, TASK_TABLE} from "../Scripts/SmallWinsState"
import {openNotebook, shown, SmallWinsLeafInteractor, textOf, waitFor, worldPos} from "./SmallWinsLeafHelpers"

const PAGE_SETTLE_MS = 800

function hasSticker(art: string): boolean {
  return SmallWinsState.instance.stickers.some((s) => s.art === art)
}

async function rewardEnds(): Promise<void> {
  await waitFor("the reward to end", () => !shown("RewardPlate") && !shown("RewardMessageRoot"), 14000)
}

/**
 * Done criterion 7: jobs around the flat. Add one to the list and its sticker spot appears in the room.
 * Do it there (water the plants, text a friend) or tick it off the list, and its sticker pops up where it lives.
 */
@component
export class SmallWinsHomeTasksScenario extends Scenario {
  async run(): Promise<void> {
    const hand = new SmallWinsLeafInteractor()
    const state = SmallWinsState.instance
    await sleep(1200)
    expect(shown("TaskHint_plants"), "no hint before the job is planned").toBe(false)

    // Plan two jobs from the flat.
    await openNotebook(hand, "TodoTab")
    await hand.tap("AddTaskButton")
    await sleep(PAGE_SETTLE_MS)
    await hand.tap("PresetTask0")
    await sleep(PAGE_SETTLE_MS)
    await hand.tap("AddTaskButton")
    await sleep(PAGE_SETTLE_MS)
    expect(textOf("PresetTask2Label")).toBe("Text a friend")
    await hand.tap("PresetTask2")
    await sleep(PAGE_SETTLE_MS)
    expect(!!state.getTask(TASK_PLANTS) && !!state.getTask(TASK_PHONE)).toBe(true)
    await hand.tap("NotebookClose")
    await sleep(500)
    expect(shown("TaskHint_plants")).toBe(true)
    expect(shown("TaskHint_phone")).toBe(true)

    // Water the plants by hand: carry the can to the palm, it pours, and the plant's sticker pops up.
    await hand.dragTo("WateringCan", worldPos("PlantPourPoint"))
    await waitFor("the plant sticker", () => shown("RewardPlate"), 8000)
    expect(state.getTask(TASK_PLANTS).done).toBe(true)
    expect(hasSticker("plant")).toBe(true)
    expect(shown("TaskHint_plants")).toBe(false)
    await rewardEnds()

    // Text a friend: tap the phone, it lights up with the message you sent.
    await hand.tap("Phone")
    expect(shown("PhoneMessage")).toBe(true)
    await waitFor("the phone sticker", () => shown("RewardPlate"), 6000)
    expect(hasSticker("phone")).toBe(true)
    await rewardEnds()

    // Feeding the cat without planning it still fills the bowl, but only planned jobs earn a sticker.
    await hand.dragTo("CatFood", worldPos("CatBowlDropZone"))
    await waitFor("the bowl to fill", () => shown("CatBowlFull"), 6000)
    expect(shown("CatBowl")).toBe(false)
    await sleep(2500)
    expect(hasSticker("cat")).toBe(false)
    expect(state.getTask(TASK_CAT)).toBe(undefined)

    // Swap the texting for clearing the table, then tick it off: the dishes go to the counter by themselves.
    await openNotebook(hand, "TodoTab")
    await hand.tap("TaskEdit4")
    await sleep(PAGE_SETTLE_MS)
    expect(textOf("PresetTask1Label")).toBe("Clear the table")
    await hand.tap("PresetTask1")
    await sleep(PAGE_SETTLE_MS)
    expect(textOf("TaskTitle4")).toBe("Clear the table")
    expect(shown("TaskHint_table")).toBe(true)
    await hand.tap("TaskTick4")
    await waitFor("the card to close", () => !shown("Notebook"), 3000)
    const counter = worldPos("CounterDropZone")
    await waitFor("the dishes on the counter", () => ["TableMug", "TablePlate", "TableBowl"].every((n) => worldPos(n).distance(counter) < 35), 6000)
    expect(["TableMug", "TablePlate", "TableBowl"].every((n) => shown(n))).toBe(true)
    await waitFor("the table sticker", () => shown("RewardPlate"), 6000)
    expect(state.getTask(TASK_TABLE).done).toBe(true)
    expect(hasSticker("table")).toBe(true)
  }
}
