import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {SmallWinsBreathingUI} from "../Scripts/SmallWinsBreathingUI"
import {SmallWinsState, TASK_MINDFUL} from "../Scripts/SmallWinsState"
import {setViewerOverride} from "../Scripts/SmallWinsViewer"
import {shown, SmallWinsLeafInteractor, so, textOf, waitFor, worldPos} from "./SmallWinsLeafHelpers"

const TRACK = 9
const SOFA_POSE = {position: new vec3(120, -60, 150), forward: new vec3(0, 0, -1)}

export function breathingUI(): SmallWinsBreathingUI {
  return so("BreathingUI").getComponent(SmallWinsBreathingUI.getTypeName()) as SmallWinsBreathingUI
}

export function checkEarned(): void {
  const state = SmallWinsState.instance
  expect(state.getTask(TASK_MINDFUL).done).toBe(true)
  expect(state.stickers.some((s) => s.art === "pebbles")).toBe(true)
  expect(shown("BreathingSquare")).toBe(false)
  expect(shown("BreathingReward")).toBe(true)
  expect(shown("PebbleSticker")).toBe(true)
  expect(shown("PebbleSparkleA")).toBe(true)
  expect(textOf("BreathingRewardMessage")).toBe("Breathe normally. Take your time.")
}

/** Done criterion 3: me-time, somewhere comfortable, the box breathing in front of you, end it whenever, earn the pebbles. */
@component
export class SmallWinsBreathingScenario extends Scenario {
  async run(): Promise<void> {
    const hand = new SmallWinsLeafInteractor()
    await hand.doBothChores()
    expect(textOf("InviteLine").includes("dishes")).toBe(true)
    expect(textOf("InviteLine").includes("washing machine")).toBe(true)
    expect(textOf("QuestionLine")).toBe("Are you ready for some conscious breathing?")

    // The invitation appears where the second reward faded.
    expect(worldPos("MeTimeInvitation").distance(worldPos("LaundryRewardAnchor"))).toBeLessThan(10)

    await hand.tap("YesButton")
    await waitFor("the comfortable-seat prompt", () => shown("ComfortPrompt"), 3000)
    expect(shown("MeTimeInvitation")).toBe(false)
    expect(textOf("PromptLine").includes("somewhere comfortable")).toBe(true)

    // It waits, and eases after you when you move to the sofa.
    setViewerOverride(SOFA_POSE)
    await sleep(2500)
    const toPrompt = worldPos("ComfortPrompt").sub(SOFA_POSE.position)
    expect(toPrompt.length).toBeGreaterThan(60)
    expect(toPrompt.length).toBeLessThan(110)
    expect(toPrompt.z).toBeLessThan(0)
    expect(toPrompt.y).toBeLessThan(0)
    expect(shown("ComfortPrompt")).toBe(true)

    await hand.tap("ReadyButton")
    expect(shown("ComfortPrompt")).toBe(false)
    expect(shown("BreathingSquare")).toBe(true)
    expect(shown("RaiseHandButton")).toBe(false)

    // In front of you wherever you are: about a metre ahead, just below eye level.
    const placed = worldPos("BreathingSquare")
    expect(new vec3(placed.x - SOFA_POSE.position.x, 0, placed.z - SOFA_POSE.position.z).length).toBeCloseTo(100, 0)
    expect(placed.z).toBeLessThan(SOFA_POSE.position.z)
    expect(placed.y).toBeLessThan(SOFA_POSE.position.y)
    expect(SOFA_POSE.position.y - placed.y).toBeLessThan(25)
    expect(textOf("BreathingIntro")).toBe("Follow the dot. Four counts on each side.")

    const ui = breathingUI()
    expect(ui.currentRoundLabel).toBe("Round 1 of 4")
    expect(ui.currentWord).toBe("Breathe in")
    expect(ui.dotPosition.x).toBeCloseTo(-TRACK, 0)

    // Clockwise from the bottom-left: up the left edge first.
    await sleep(2000)
    expect(ui.currentWord).toBe("Breathe in")
    expect(ui.dotPosition.x).toBeCloseTo(-TRACK, 0)
    expect(ui.dotPosition.y).toBeGreaterThan(-TRACK + 2)

    // Once it appears it stays put, even if you turn to put your tea down.
    setViewerOverride({position: SOFA_POSE.position, forward: new vec3(1, 0, 0)})
    await sleep(300)
    expect(worldPos("BreathingSquare").distance(placed)).toBeLessThan(0.01)
    setViewerOverride(SOFA_POSE)

    await waitFor("Hold, across the top", () => ui.currentWord === "Hold", 3000)
    await sleep(600)
    expect(ui.dotPosition.y).toBeCloseTo(TRACK, 0)
    expect(ui.dotPosition.x).toBeGreaterThan(-TRACK)

    await waitFor("Breathe out, down the right", () => ui.currentWord === "Breathe out", 4500)
    await sleep(600)
    expect(ui.dotPosition.x).toBeCloseTo(TRACK, 0)
    expect(ui.dotPosition.y).toBeLessThan(TRACK)

    await waitFor("Rest, along the bottom", () => ui.currentWord === "Rest", 4500)
    await sleep(600)
    expect(ui.dotPosition.y).toBeCloseTo(-TRACK, 0)

    await waitFor("round 2", () => ui.currentRoundLabel === "Round 2 of 4", 4500)

    // Pause holds the dot, Resume carries on.
    await hand.tap("PauseButton")
    const held = ui.dotPosition
    await sleep(800)
    expect(ui.dotPosition.distance(held)).toBeLessThan(0.01)
    expect(ui.phase).toBe("paused")
    await hand.tap("PauseButton")
    await sleep(500)
    expect(ui.phase).toBe("running")
    expect(ui.dotPosition.distance(held)).toBeGreaterThan(0.1)

    // End it whenever: the dot comes home, and it still earns the pebbles.
    await hand.tap("FinishNowButton")
    expect(SmallWinsState.instance.getTask(TASK_MINDFUL).done).toBe(false)
    await waitFor("the pebble sticker", () => ui.phase === "reward", 3000)
    checkEarned()
    setViewerOverride(null)
  }
}
