import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {eyeUI} from "./SmallWinsEyeMovementScenario"
import {chooseTherapy, shown, SmallWinsLeafInteractor, textOf, waitFor} from "./SmallWinsLeafHelpers"

/** All four sets with their rests, then the check-in. Not great is met with kindness and a pointer to real help. */
@component
export class SmallWinsEyeMovementFullScenario extends Scenario {
  async run(): Promise<void> {
    const hand = new SmallWinsLeafInteractor()
    await sleep(1200)
    await chooseTherapy(hand, "TherapyEyes")
    await waitFor("the intro", () => shown("EyeIntro"), 3000)
    await sleep(800)
    await hand.tap("EyeStartButton")

    // A rest between sets: the dot steps away and the prompt says to breathe.
    await waitFor("the first rest", () => eyeUI().phase === "resting", 20000)
    expect(textOf("EyeHint").includes("breath")).toBe(true)
    expect(shown("EyeDot"), "EyeDot should be hidden").toBe(false)
    await waitFor("the second set", () => textOf("EyeSetLabel") === "Set 2 of 4", 10000)

    await waitFor("the check-in", () => shown("EyeCheckIn"), 70000)
    expect(eyeUI().set).toBe(4)
    await sleep(800)
    await hand.tap("EyeNotGreatButton")
    await waitFor("the reward", () => shown("EyeReward"), 3000)
    expect(textOf("EyeRewardMessage").includes("therapist")).toBe(true)
    expect(eyeUI().feeling).toBe("notGreat")
  }
}
