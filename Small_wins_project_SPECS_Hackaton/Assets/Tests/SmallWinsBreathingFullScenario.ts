import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {shown, SmallWinsLeafInteractor, waitFor} from "./SmallWinsLeafHelpers"
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
    const started = getTime()
    while (ui.phase === "running") {
      rounds[ui.currentRoundLabel] = true
      await sleep(250)
      if (getTime() - started > 70) throw new Error("Breathing ran past 64 seconds")
    }
    const seconds = getTime() - started
    expect(seconds, `ran for ${seconds} s`).toBeGreaterThan(62)
    expect(seconds, `ran for ${seconds} s`).toBeLessThan(66)
    for (const r of ["Round 1 of 4", "Round 2 of 4", "Round 3 of 4", "Round 4 of 4"]) {
      expect(rounds[r], r + " should have shown").toBe(true)
    }
    await waitFor("the pebble sticker", () => ui.phase === "reward", 3000)
    checkEarned()
  }
}
