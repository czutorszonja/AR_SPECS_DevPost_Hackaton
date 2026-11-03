import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {SmallWinsState, TASK_MINDFUL} from "../Scripts/SmallWinsState"
import {shown, SmallWinsLeafInteractor, waitFor} from "./SmallWinsLeafHelpers"

/** Saying No fades the invitation and leaves the room quiet. */
@component
export class SmallWinsNoThanksScenario extends Scenario {
  async run(): Promise<void> {
    const hand = new SmallWinsLeafInteractor()
    await hand.doBothChores()
    await hand.tap("NoButton")
    await waitFor("the invitation to fade", () => !shown("MeTimeInvitation"), 3000)
    await sleep(800)
    expect(shown("ComfortPrompt")).toBe(false)
    expect(shown("BreathingSquare")).toBe(false)
    expect(shown("RaiseHandButton")).toBe(true)
    expect(SmallWinsState.instance.getTask(TASK_MINDFUL).done).toBe(false)
  }
}
