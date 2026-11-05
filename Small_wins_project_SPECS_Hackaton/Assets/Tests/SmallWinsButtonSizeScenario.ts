import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {chooseTherapy, openNotebook, shown, SmallWinsLeafInteractor, visibleButtonSizes, waitFor} from "./SmallWinsLeafHelpers"

// Spectacles guidance: targets of at least 2 degrees, about 3 is best. Everything here aims for best.
const BEST_DEGREES = 2.9
const TILE_DEGREES = 3.9

function checkAll(where: string): void {
  const buttons = visibleButtonSizes()
  expect(buttons.length, `buttons on screen at ${where}`).toBeGreaterThan(0)
  for (const b of buttons) expect(b.degrees, `${b.name} at ${where} is ${b.degrees.toFixed(1)} degrees`).toBeGreaterThan(BEST_DEGREES)
}

/** Every button on screen is easy to aim a hand at, in each place you'd use one. */
@component
export class SmallWinsButtonSizeScenario extends Scenario {
  async run(): Promise<void> {
    const hand = new SmallWinsLeafInteractor()
    await sleep(1500)
    checkAll("the start")

    await hand.tap("RaiseHandButton")
    await waitFor("the notebook tab", () => shown("NotebookTab"), 3000)
    checkAll("the raised hand")
    await hand.tap("RaiseHandButton")
    await sleep(500)

    await openNotebook(hand)
    checkAll("the notebook's Today page")
    const tiles = visibleButtonSizes().filter((b) => b.name.endsWith("Tab"))
    expect(tiles.length).toBe(3)
    for (const t of tiles) expect(t.degrees, `${t.name} is a main tile`).toBeGreaterThan(TILE_DEGREES)

    await hand.tap("StickersTab")
    await sleep(800)
    checkAll("the Stickers page")
    await hand.tap("TodayTab")
    await sleep(800)
    await hand.tap("AddTaskButton")
    await sleep(800)
    checkAll("the task picker")
    await hand.tap("PickerCancel")
    await sleep(800)
    await hand.tap("MeTimeTab")
    await sleep(800)
    checkAll("the Me-time page")
    for (const t of visibleButtonSizes().filter((b) => b.name.startsWith("Therapy"))) {
      expect(t.degrees, `${t.name} is a main tile`).toBeGreaterThan(TILE_DEGREES)
    }
    await hand.tap("NotebookClose")
    await sleep(500)

    await chooseTherapy(hand, "TherapyEyes")
    await waitFor("the eye intro", () => shown("EyeIntro"), 3000)
    checkAll("the eye movement intro")
    await sleep(500)
    await hand.tap("EyeStartButton")
    checkAll("the eye movement sets")
    await hand.tap("EyeStopButton")
    await sleep(8000)

    await chooseTherapy(hand, "TherapyDrawing")
    await waitFor("the drawing intro", () => shown("DrawIntro"), 3000)
    checkAll("the drawing intro")
    await sleep(500)
    await hand.tap("DrawStartButton")
    checkAll("the drawing sheet")
  }
}
