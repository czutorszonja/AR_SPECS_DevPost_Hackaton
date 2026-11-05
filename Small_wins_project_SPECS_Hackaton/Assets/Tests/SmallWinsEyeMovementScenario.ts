import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {SmallWinsEyeMovementUI} from "../Scripts/SmallWinsEyeMovementUI"
import {SmallWinsState, TASK_MINDFUL} from "../Scripts/SmallWinsState"
import {chooseTherapy, shown, SmallWinsLeafInteractor, so, textOf, viewAngle, waitFor, worldPos} from "./SmallWinsLeafHelpers"

export function eyeUI(): SmallWinsEyeMovementUI {
  return so("EyeMovementUI").getComponent(SmallWinsEyeMovementUI.getTypeName()) as SmallWinsEyeMovementUI
}

/** Me-time: the EMDR-inspired eye movement exercise, chosen from the notebook, with Stop always to hand. */
@component
export class SmallWinsEyeMovementScenario extends Scenario {
  async run(): Promise<void> {
    const hand = new SmallWinsLeafInteractor()
    const state = SmallWinsState.instance
    await sleep(1200)
    await chooseTherapy(hand, "TherapyEyes")

    // It opens in front of you, says what it is and isn't, and the notebook gets out of the way.
    await waitFor("the intro", () => shown("EyeIntro"), 3000)
    expect(shown("Notebook"), "Notebook should be hidden").toBe(false)
    expect(textOf("EyeIntroSafety").includes("not trauma therapy")).toBe(true)
    expect(viewAngle(worldPos("EyeIntro"))).toBeLessThan(12)
    await sleep(800)

    // Not now leaves without a sticker.
    await hand.tap("EyeNotNowButton")
    await sleep(500)
    expect(shown("EyeIntro"), "EyeIntro should be hidden").toBe(false)
    expect(state.getTask(TASK_MINDFUL).done).toBe(false)

    // Start: the dot sweeps right across and back, staying inside the narrow display.
    await chooseTherapy(hand, "TherapyEyes")
    await waitFor("the intro", () => shown("EyeIntro"), 3000)
    await sleep(800)
    await hand.tap("EyeStartButton")
    expect(textOf("EyeSetLabel")).toBe("Set 1 of 4")
    expect(textOf("EyeHint").includes("calm")).toBe(true)
    let left = 0
    let right = 0
    let widest = 0
    for (let i = 0; i < 30; i++) {
      left = Math.min(left, eyeUI().dotX)
      right = Math.max(right, eyeUI().dotX)
      widest = Math.max(widest, viewAngle(worldPos("EyeDot")))
      await sleep(100)
    }
    expect(left).toBeLessThan(-15)
    expect(right).toBeGreaterThan(15)
    expect(widest).toBeLessThan(16)

    // Pause holds the dot still.
    await hand.tap("EyePauseButton")
    const held = eyeUI().dotX
    await sleep(700)
    expect(Math.abs(eyeUI().dotX - held)).toBeLessThan(0.01)
    await hand.tap("EyePauseButton")
    await sleep(600)
    expect(Math.abs(eyeUI().dotX - held)).toBeGreaterThan(0.1)

    // Stop works at any time, ends kindly, and still earns the calm sticker.
    await hand.tap("EyeStopButton")
    await waitFor("the reward", () => shown("EyeReward"), 3000)
    expect(shown("CalmSticker")).toBe(true)
    expect(textOf("EyeRewardMessage").length).toBeGreaterThan(10)
    expect(state.getTask(TASK_MINDFUL).done).toBe(true)
    expect(state.stickers.some((s) => s.art === "calm")).toBe(true)
  }
}
