import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {SmallWinsBreathingUI} from "../Scripts/SmallWinsBreathingUI"
import {SmallWinsState, TASK_MINDFUL} from "../Scripts/SmallWinsState"
import {setViewerOverride} from "../Scripts/SmallWinsViewer"
import {shown, SmallWinsLeafInteractor, so, textOf, waitFor, worldPos} from "./SmallWinsLeafHelpers"
import {breathingUI, checkEarned} from "./SmallWinsBreathingScenario"

/** The full 64 seconds: four rounds at four seconds a side, ending by itself. */
@component
export class SmallWinsBreathingFullScenario extends Scenario {
  async run(): Promise<void> {
    const hand = new SmallWinsLeafInteractor()
    await hand.doBothChores()
    await hand.tap("YesButton")
    await waitFor("the prompt", () => shown("ComfortPrompt"), 3000)
    await hand.tap("ReadyButton")
    const ui = breathingUI()
    const rounds: {[label: string]: boolean} = {}
    let waited = 0
    while (ui.phase === "running") {
      rounds[ui.currentRoundLabel] = true
      await sleep(250)
      waited += 250
      if (waited > 70000) throw new Error("Breathing ran past 64 seconds")
    }
    expect(waited).toBeGreaterThan(60000)
    for (const r of ["Round 1 of 4", "Round 2 of 4", "Round 3 of 4", "Round 4 of 4"]) {
      expect(rounds[r], r + " should have shown").toBe(true)
    }
    await waitFor("the pebble sticker", () => ui.phase === "reward", 3000)
    checkEarned()
  }
}
