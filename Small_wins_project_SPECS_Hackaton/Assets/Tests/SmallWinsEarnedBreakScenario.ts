import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {openNotebook, shown, SmallWinsLeafInteractor, textOf, waitFor} from "./SmallWinsLeafHelpers"

const PAGE_SETTLE_MS = 800

async function rewardEnds(): Promise<void> {
  await waitFor("the reward to end", () => !shown("RewardPlate") && !shown("RewardMessageRoot"), 14000)
}

/** Plans a job from the flat and ticks it off the list, then waits for its sticker to come and go. */
async function planAndTick(hand: SmallWinsLeafInteractor, row: number): Promise<void> {
  await openNotebook(hand, "TodoTab")
  await hand.tap("AddTaskButton")
  await sleep(PAGE_SETTLE_MS)
  await hand.tap("PresetTask0")
  await sleep(PAGE_SETTLE_MS)
  await hand.tap("TaskTick" + row)
  await waitFor("its sticker", () => shown("RewardPlate"), 10000)
  await rewardEnds()
}

/**
 * The break is earned, not tied to two particular chores: it comes once what you've done adds up
 * (a big chore counts double), names what you did, and starts counting again after you answer.
 */
@component
export class SmallWinsEarnedBreakScenario extends Scenario {
  async run(): Promise<void> {
    const hand = new SmallWinsLeafInteractor()
    await sleep(1200)

    // One big chore is not enough yet.
    await hand.loadDishes()
    await waitFor("the dishes reward", () => shown("RewardPlate"), 8000)
    await rewardEnds()
    await sleep(1500)
    expect(shown("MeTimeInvitation"), "no invitation after the dishes alone").toBe(false)

    // Nor is one small job on top.
    await planAndTick(hand, 3)
    await sleep(1500)
    expect(shown("MeTimeInvitation"), "no invitation after the dishes and the plants").toBe(false)

    // A second small job tips it over: the invitation thanks you for all three.
    await planAndTick(hand, 4)
    await waitFor("the me-time invitation", () => shown("MeTimeInvitation"), 4000)
    const line = textOf("InviteLine")
    expect(line.includes("the dishes"), line).toBe(true)
    expect(line.includes("watering the plants"), line).toBe(true)
    expect(line.includes("feeding the cat"), line).toBe(true)
    expect(line.includes("washing machine"), line).toBe(false)

    // No thanks, and it doesn't nag: one more big chore alone doesn't bring it straight back.
    await hand.tap("NoButton")
    await waitFor("the invitation to fade", () => !shown("MeTimeInvitation"), 3000)
    await hand.loadLaundry()
    await waitFor("the laundry reward", () => shown("RewardPlate"), 10000)
    await rewardEnds()
    await sleep(1500)
    expect(shown("MeTimeInvitation"), "no second invitation straight after saying no").toBe(false)
  }
}
