import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {SmallWinsState} from "../Scripts/SmallWinsState"
import {TEX} from "../Scripts/SmallWinsUIKit"
import {setViewerOverride} from "../Scripts/SmallWinsViewer"
import {faceAnchor, imageAlpha, imageTexture, shown, SmallWinsLeafInteractor, so, textOf, waitFor, worldPos} from "./SmallWinsLeafHelpers"

/** Done criterion 2: each chore plays the pop, stars and message beside its appliance, and stickers settle side by side. */
@component
export class SmallWinsChoresScenario extends Scenario {
  async run(): Promise<void> {
    const hand = new SmallWinsLeafInteractor()
    const state = SmallWinsState.instance
    await sleep(1200)
    expect(state.stickers.length).toBe(0)
    faceAnchor("DishRewardAnchor")

    // A drop anywhere else counts for nothing: the plate goes back to the sink.
    const home = worldPos("DishPlate")
    await hand.dragTo("DishPlate", home.add(new vec3(-90, 90, 60)))
    await sleep(500)
    expect(state.stickers.length).toBe(0)
    expect(worldPos("DishPlate").distance(home)).toBeLessThan(2)

    // The hint stays until the last dish is in. The reward waits for the door to close.
    const zone = worldPos("DishwasherDropZone")
    await hand.dragTo("DishPlate", zone)
    await hand.dragTo("DishBowl", zone)
    expect(shown("DishPlate"), "DishPlate should be hidden").toBe(false)
    expect(state.stickers.length).toBe(0)
    expect(shown("HintDishes")).toBe(true)
    await hand.dragTo("DishMug", zone)
    expect(shown("HintDishes"), "HintDishes should be hidden").toBe(false)

    await waitFor("the dishes sticker", () => state.stickers.length === 1)
    expect(so("DishwasherDoorHinge").getTransform().getLocalRotation().toEulerAngles().length).toBeLessThan(0.05)
    expect(state.getTask("dishes").done).toBe(true)
    expect(state.stickers[0].art).toBe("plate")

    // The pop: plate, gold ring and a burst of stars, beside the dishwasher. The demo button steps aside.
    expect(shown("RaiseHandButton"), "RaiseHandButton should be hidden").toBe(false)
    const anchor = worldPos("DishRewardAnchor")
    await waitFor("the pop", () => shown("RewardPlate") && so("RewardPlate").getTransform().getWorldScale().x > 3)
    expect(worldPos("RewardPlate").distance(anchor)).toBeLessThan(3)
    expect(new vec3(anchor.x - worldPos("DishwasherBody").x, 0, 0).length).toBeLessThan(60)
    expect(anchor.x).toBeGreaterThan(worldPos("DishwasherBody").x)
    expect(imageTexture("RewardPlate")).toBe(TEX.plate)
    await sleep(200)
    // About 16 cm wide: bigger than the brief's 10 cm, because 10 cm was hard to see in the preview.
    await waitFor("the plate to settle at full size", () => Math.abs(so("RewardPlate").getTransform().getWorldScale().x - 16) < 0.3, 2000)
    expect(shown("RewardRing")).toBe(true)
    expect(imageAlpha("RewardRing")).toBeGreaterThan(0)
    for (let i = 0; i < 14; i++) {
      expect(shown("RewardStar" + i)).toBe(true)
      expect(imageAlpha("RewardStar" + i)).toBeGreaterThan(0)
      expect(worldPos("RewardStar" + i).distance(worldPos("RewardPlate"))).toBeLessThan(34)
    }

    // The personal line fades in below the sticker, and the sticker shrinks into its place in the strip.
    await waitFor("the dishes message", () => shown("RewardMessage") && (so("RewardMessage").getComponent("Component.Text") as Text).textFill.color.a > 0.9)
    expect(textOf("RewardMessage")).toBe("A clear sink for tomorrow.")
    expect(worldPos("RewardMessage").y).toBeLessThan(worldPos("RewardPlate").y)
    expect(imageAlpha("RewardStar0")).toBeGreaterThan(0)
    expect(shown("StripSlot0")).toBe(true)
    expect(shown("StripSlot1"), "StripSlot1 should be hidden").toBe(false)
    await waitFor("the sticker to settle", () => imageTexture("StripSlot0") === TEX.plate, 7000)

    // The strip is held for about 2 seconds, then the room goes clear and still.
    await sleep(1500)
    expect(shown("RewardMessageRoot")).toBe(true)
    await waitFor("the reward to end", () => !shown("RewardMessageRoot"), 3000)
    expect(shown("RewardRing"), "RewardRing should be hidden").toBe(false)

    // The washing machine.
    expect(shown("RaiseHandButton")).toBe(true)
    expect(shown("HintLaundry")).toBe(true)
    faceAnchor("LaundryRewardAnchor")
    await hand.loadLaundry()
    expect(shown("HintLaundry"), "HintLaundry should be hidden").toBe(false)
    await waitFor("the laundry sticker", () => state.stickers.length === 2)
    expect(state.stickers[1].art).toBe("clothes")
    const laundryAnchor = worldPos("LaundryRewardAnchor")
    await waitFor("the laundry pop", () => shown("RewardPlate"))
    expect(worldPos("RewardPlate").distance(laundryAnchor)).toBeLessThan(3)
    expect(Math.abs(laundryAnchor.x - worldPos("WasherBody").x)).toBeLessThan(10)
    expect(laundryAnchor.y).toBeGreaterThan(worldPos("WasherBody").y)
    expect(imageTexture("RewardPlate")).toBe(TEX.clothes)

    // The second sticker settles next to the first.
    await waitFor("the laundry message", () => shown("RewardMessage") && (so("RewardMessage").getComponent("Component.Text") as Text).textFill.color.a > 0.9)
    expect(textOf("RewardMessage")).toBe("Fresh clothes, well done, Szonja.")
    expect(shown("StripSlot1")).toBe(true)
    expect(shown("StripSlot2"), "StripSlot2 should be hidden").toBe(false)
    expect(imageTexture("StripSlot0")).toBe(TEX.plate)
    await waitFor("the second sticker to settle", () => imageTexture("StripSlot1") === TEX.clothes, 7000)
    const gap = worldPos("StripSlot1").x - worldPos("StripSlot0").x
    expect(gap).toBeGreaterThan(7)
    expect(gap).toBeLessThan(9)
    setViewerOverride(null)
  }
}
