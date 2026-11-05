import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {SmallWinsDrawingUI} from "../Scripts/SmallWinsDrawingUI"
import {SmallWinsState, TASK_MINDFUL} from "../Scripts/SmallWinsState"
import {chooseTherapy, shown, SmallWinsLeafInteractor, so, textOf, viewAngle, waitFor, worldPos} from "./SmallWinsLeafHelpers"

function drawingUI(): SmallWinsDrawingUI {
  return so("DrawingUI").getComponent(SmallWinsDrawingUI.getTypeName()) as SmallWinsDrawingUI
}

/** Me-time: guided drawing, a leaf built up one line at a time as the pen dot traces each one. */
@component
export class SmallWinsDrawingScenario extends Scenario {
  async run(): Promise<void> {
    const hand = new SmallWinsLeafInteractor()
    const state = SmallWinsState.instance
    await sleep(1200)
    await chooseTherapy(hand, "TherapyDrawing")
    await waitFor("the intro", () => shown("DrawIntro"), 3000)
    expect(textOf("DrawIntroBody").includes("leaf")).toBe(true)
    await sleep(800)
    await hand.tap("DrawStartButton")

    // The sheet is in view, the guide shows the whole leaf, and the pen inks the first line as it moves.
    expect(shown("DrawSheet")).toBe(true)
    expect(viewAngle(worldPos("DrawPaper"))).toBeLessThan(10)
    expect(textOf("DrawStepLabel").startsWith("Line 1 of 4")).toBe(true)
    await sleep(1200)
    const partWay = drawingUI().inkShown
    expect(partWay).toBeGreaterThan(0)
    await sleep(2500)
    expect(drawingUI().inkShown).toBeGreaterThan(partWay)

    // Next line moves on, keeping what's drawn; the last line offers to finish.
    for (let line = 2; line <= drawingUI().strokeCount; line++) {
      const before = drawingUI().inkShown
      await hand.tap("DrawNextButton")
      await sleep(400)
      expect(textOf("DrawStepLabel").startsWith("Line " + line + " of 4")).toBe(true)
      expect(drawingUI().inkShown).toBeGreaterThan(before - 1)
    }
    expect(textOf("DrawNextButtonLabel")).toBe("I'm done")
    await hand.tap("DrawNextButton")

    await waitFor("the reward", () => shown("DrawReward"), 3000)
    expect(shown("DrawingSticker")).toBe(true)
    expect(state.getTask(TASK_MINDFUL).done).toBe(true)
    expect(state.stickers.some((s) => s.art === "drawing")).toBe(true)
  }
}
