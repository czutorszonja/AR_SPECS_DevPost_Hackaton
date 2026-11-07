import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {SmallWinsState} from "../Scripts/SmallWinsState"
import {openNotebook, shown, SmallWinsLeafInteractor, textOf} from "./SmallWinsLeafHelpers"

const PAGE_SETTLE_MS = 800

/**
 * The to-do list is a small day planner: today with what else is on, yesterday's wins to look back on,
 * and tomorrow to plan ahead, the night before or in the morning.
 */
@component
export class SmallWinsDayPlannerScenario extends Scenario {
  async run(): Promise<void> {
    const hand = new SmallWinsLeafInteractor()
    const state = SmallWinsState.instance
    await sleep(1200)

    // Today, with the date and the rest of life alongside the small wins.
    await openNotebook(hand, "TodoTab")
    expect(textOf("NotebookTitle").startsWith("Today")).toBe(true)
    expect(textOf("DayNote").includes("Concert")).toBe(true)
    expect(shown("DayPrev") && shown("DayNext")).toBe(true)
    expect(textOf("TaskTitle0")).toBe("Do the laundry")

    // Yesterday: only what you did, each with its sticker.
    await hand.tap("DayPrev")
    await sleep(PAGE_SETTLE_MS)
    expect(textOf("NotebookTitle").startsWith("Yesterday")).toBe(true)
    expect(textOf("PastTitle0")).toBe("Load the dishwasher")
    expect(textOf("DayNote").includes(state.yesterday.length + " small wins")).toBe(true)
    expect(shown("DayPrev")).toBe(false)
    expect(shown("AddTaskButton")).toBe(false)

    // On to tomorrow: Mum's birthday, and what's planned so far.
    await hand.tap("DayNext")
    await sleep(PAGE_SETTLE_MS)
    expect(textOf("NotebookTitle").startsWith("Today")).toBe(true)
    await hand.tap("DayNext")
    await sleep(PAGE_SETTLE_MS)
    expect(textOf("NotebookTitle").startsWith("Tomorrow")).toBe(true)
    expect(textOf("DayNote").includes("Mum's birthday")).toBe(true)
    expect(textOf("PlanTitle0")).toBe("Call Mum")
    expect(shown("DayNext")).toBe(false)

    // Plan ahead: adding goes on tomorrow's list and leaves today alone.
    const today = state.tasks.length
    const tomorrow = state.tomorrow.length
    await hand.tap("AddTaskButton")
    await sleep(PAGE_SETTLE_MS)
    expect(textOf("PickerHeading").includes("tomorrow")).toBe(true)
    // The plants are already planned for tomorrow, so the cat comes first.
    expect(textOf("PresetTask0Label")).toBe("Feed the cat")
    await hand.tap("PresetTask0")
    await sleep(PAGE_SETTLE_MS)
    expect(textOf("NotebookTitle").startsWith("Tomorrow")).toBe(true)
    expect(state.tomorrow.length).toBe(tomorrow + 1)
    expect(state.tasks.length).toBe(today)
    expect(textOf("PlanTitle" + tomorrow)).toBe("Feed the cat")
    expect(shown("TaskHint_cat")).toBe(false)

    // And can come off again.
    await hand.tap("PlanEdit" + tomorrow)
    await sleep(PAGE_SETTLE_MS)
    await hand.tap("PickerRemove")
    await sleep(PAGE_SETTLE_MS)
    expect(state.tomorrow.length).toBe(tomorrow)

    // Opening the list again always starts on today.
    await hand.tap("NotebookClose")
    await sleep(500)
    await openNotebook(hand, "TodoTab")
    expect(textOf("NotebookTitle").startsWith("Today")).toBe(true)
  }
}
