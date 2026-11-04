import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {setViewerOverride} from "../Scripts/SmallWinsViewer"
import {shown, SmallWinsLeafInteractor, so, viewAngle, waitFor, worldPos} from "./SmallWinsLeafHelpers"

const IN_VIEW_DEGREES = 15
const MIDDLE_OF_ROOM = new vec3(-80, 0, 100)

function messageIsSolid(): boolean {
  return shown("RewardMessage") && (so("RewardMessage").getComponent("Component.Text") as Text).textFill.color.a > 0.9
}

/**
 * The display is only about 36 degrees across, so existing isn't enough: each message has to reach
 * someone who isn't looking at the wall, which is how the first version went unseen.
 */
@component
export class SmallWinsInViewScenario extends Scenario {
  async run(): Promise<void> {
    const hand = new SmallWinsLeafInteractor()
    await sleep(1200)

    // Standing in the middle of the room, facing away from the kitchen.
    setViewerOverride({position: MIDDLE_OF_ROOM, forward: new vec3(0, 0, 1)})
    await hand.loadDishes()

    await waitFor("the dishes pop", () => shown("RewardPlate") && so("RewardPlate").getTransform().getWorldScale().x > 3)
    expect(viewAngle(worldPos("RewardPlate"))).toBeLessThan(IN_VIEW_DEGREES)
    await waitFor("the dishes message", messageIsSolid)
    expect(viewAngle(worldPos("RewardMessage"))).toBeLessThan(IN_VIEW_DEGREES)
    expect(worldPos("RewardMessage").distance(MIDDLE_OF_ROOM)).toBeLessThan(130)

    // Turning away, the message eases after you rather than staying behind.
    setViewerOverride({position: MIDDLE_OF_ROOM, forward: new vec3(1, 0, 0)})
    await sleep(1800)
    expect(viewAngle(worldPos("RewardMessage"))).toBeLessThan(IN_VIEW_DEGREES)
    await waitFor("the dishes reward to end", () => !shown("RewardMessageRoot"), 12000)

    // The same for the second chore, which ends in the me-time invitation.
    setViewerOverride({position: MIDDLE_OF_ROOM, forward: new vec3(-1, 0, 0)})
    await hand.loadLaundry()
    await waitFor("the laundry message", messageIsSolid)
    expect(viewAngle(worldPos("RewardMessage"))).toBeLessThan(IN_VIEW_DEGREES)
    await waitFor("the me-time invitation", () => shown("MeTimeInvitation"), 14000)
    expect(viewAngle(worldPos("MeTimeInvitation"))).toBeLessThan(IN_VIEW_DEGREES)
    expect(shown("YesButton")).toBe(true)
    expect(shown("NoButton")).toBe(true)

    // Looking elsewhere, the question comes too, because it needs an answer.
    setViewerOverride({position: MIDDLE_OF_ROOM, forward: new vec3(0, 0, 1)})
    await sleep(1800)
    expect(viewAngle(worldPos("MeTimeInvitation"))).toBeLessThan(IN_VIEW_DEGREES)
    setViewerOverride(null)
  }
}
