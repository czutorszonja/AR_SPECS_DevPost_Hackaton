import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {SmallWinsState} from "../Scripts/SmallWinsState"
import {TEX} from "../Scripts/SmallWinsUIKit"
import {imageAlpha, imageTexture, shown, SmallWinsLeafInteractor, waitFor} from "./SmallWinsLeafHelpers"

/** Reduced motion: no pop or stars, the message appears gently, the sticker fades into place, the hold stays. */
@component
export class SmallWinsReducedMotionScenario extends Scenario {
  async run(): Promise<void> {
    const hand = new SmallWinsLeafInteractor()
    const state = SmallWinsState.instance
    await sleep(1200)
    state.setReducedMotion(true)
    await hand.loadDishes()
    await waitFor("the dishes sticker", () => state.stickers.length === 1)
    await waitFor("the message", () => shown("RewardMessage"))
    await sleep(300)
    expect(imageAlpha("RewardRing")).toBe(0)
    for (let i = 0; i < 6; i++) expect(imageAlpha("RewardStar" + i)).toBe(0)
    await waitFor("the sticker to fade into place", () => imageTexture("StripSlot0") === TEX.plate, 5000)
    await sleep(1500)
    expect(shown("RewardMessageRoot")).toBe(true)
    await waitFor("the reward to end", () => !shown("RewardMessageRoot"), 3000)
  }
}
