import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {viewerPose} from "../Scripts/SmallWinsViewer"
import {shown, SmallWinsLeafInteractor, waitFor, worldPos} from "./SmallWinsLeafHelpers"

const STANDING_EYE_ABOVE = -5
const SITTING_EYE_BELOW = -35

/** The demo stand-in for sitting: on the sofa you're lower and facing the kitchen, then you can stand and walk. */
@component
export class SmallWinsSeatScenario extends Scenario {
  async run(): Promise<void> {
    const hand = new SmallWinsLeafInteractor()
    await sleep(1200)
    expect(shown("SitOnSofaButton")).toBe(true)
    expect(shown("StandUpButton"), "StandUpButton should be hidden").toBe(false)

    // The button sits you down, lower and facing the kitchen wall.
    await hand.tap("SitOnSofaButton")
    await waitFor("sitting down", () => viewerPose().position.y < SITTING_EYE_BELOW, 3000)
    await sleep(800)
    const seated = viewerPose()
    expect(seated.forward.z).toBeLessThan(-0.95)
    expect(seated.position.z).toBeGreaterThan(worldPos("CoffeeTableTop").z)
    expect(shown("StandUpButton")).toBe(true)
    expect(shown("SitOnSofaButton"), "SitOnSofaButton should be hidden").toBe(false)

    // Standing up gives the walk back.
    await hand.tap("StandUpButton")
    await waitFor("standing up", () => viewerPose().position.y > STANDING_EYE_ABOVE, 3000)
    expect(shown("SitOnSofaButton")).toBe(true)
    expect(shown("StandUpButton"), "StandUpButton should be hidden").toBe(false)

    // Tapping the sofa itself works too.
    await hand.tap("SofaTapTarget")
    await waitFor("sitting down again", () => viewerPose().position.y < SITTING_EYE_BELOW, 3000)
    await hand.tap("StandUpButton")
    await waitFor("standing up again", () => viewerPose().position.y > STANDING_EYE_ABOVE, 3000)
  }
}
