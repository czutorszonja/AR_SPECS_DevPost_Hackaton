import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {shown, worldPos} from "./SmallWinsLeafHelpers"

/** Done criterion 1: the room, the door to the outside, the dishes and basket, each with a sticker sign. */
@component
export class SmallWinsRoomScenario extends Scenario {
  async run(): Promise<void> {
    await sleep(1200)

    for (const part of ["Floor", "WallKitchen", "Worktop", "SinkBasin", "DishwasherBody", "WasherBody", "SofaBase", "CoffeeTableTop", "TeaMug (prop)", "EntryDoorPanel", "DoorFrameTop", "OutsideView"]) {
      expect(shown(part), `${part} should be visible`).toBe(true)
    }

    // About 10 m x 9.6 m, open plan, so both chores fit in view at once from the middle of the room.
    expect(worldPos("WallRight").x - worldPos("WallDoorSideA").x).toBeCloseTo(996, 0)
    expect(worldPos("WallBehindSofa").z - worldPos("WallKitchen").z).toBeCloseTo(964, 0)

    // The kitchen and the sofa are both in the one room, with the door on another wall.
    const door = worldPos("EntryDoorHinge")
    expect(Math.abs(door.x - worldPos("WallDoorSideA").x)).toBeLessThan(5)

    // The door opens onto a backdrop behind the wall.
    expect(worldPos("OutsideView").x).toBeLessThan(door.x)

    // Dishes are piled in the sink.
    const sink = worldPos("SinkBasin")
    for (const dish of ["DishPlate", "DishBowl", "DishMug"]) {
      expect(shown(dish), `${dish} should be visible`).toBe(true)
      const p = worldPos(dish)
      expect(Math.abs(p.x - sink.x), `${dish} should be over the sink`).toBeLessThan(31)
      expect(Math.abs(p.z - sink.z), `${dish} should be over the sink`).toBeLessThan(22)
      expect(p.y).toBeGreaterThan(sink.y)
    }

    // The basket is in the corner, about 1.5 m from the washing machine, with clothes on top.
    const basket = worldPos("LaundryBasket")
    const washer = worldPos("WasherBody")
    const flat = new vec3(basket.x - washer.x, 0, basket.z - washer.z).length
    expect(flat).toBeGreaterThan(125)
    expect(flat).toBeLessThan(175)
    expect(worldPos("PantryCupboard").x - 40 - basket.x).toBeLessThan(45)
    expect(basket.z - worldPos("WallKitchen").z).toBeLessThan(45)
    expect(shown("ClothesPile")).toBe(true)
    expect(worldPos("ClothesPile").y).toBeGreaterThan(basket.y)

    // Each has a sign that a sticker can be earned there, close by.
    expect(shown("HintDishes")).toBe(true)
    expect(shown("HintLaundry")).toBe(true)
    expect(worldPos("HintDishes").distance(sink)).toBeLessThan(75)
    expect(worldPos("HintLaundry").distance(worldPos("ClothesPile"))).toBeLessThan(75)
  }
}
