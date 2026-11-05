import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {SmallWinsRoomController} from "../Scripts/SmallWinsRoomController"
import {setViewerOverride} from "../Scripts/SmallWinsViewer"
import {shown, SmallWinsLeafInteractor, so, textOf, viewAngle, waitFor, worldPos} from "./SmallWinsLeafHelpers"

export function room(): SmallWinsRoomController {
  return so("Room (virtual stand-in for a real home)").getComponent(SmallWinsRoomController.getTypeName()) as SmallWinsRoomController
}

export function doorCentre(): vec3 {
  return worldPos("EntryDoorHinge").add(new vec3(0, 0, 44))
}

/** LEAF can't walk the preview camera, so these stand the viewer at a point looking at another point. */
export function standAt(position: vec3, lookAt: vec3): void {
  setViewerOverride({position, forward: lookAt.sub(position).normalize()})
}

export function acrossTheRoom(): vec3 {
  return doorCentre().add(new vec3(350, 55, 0))
}

export function closeToDoor(): vec3 {
  return doorCentre().add(new vec3(120, 55, 0))
}

export function doorAngle(): number {
  // The swing from closed, read from where the door faces. Euler angles fold back past 90 degrees.
  const facing = so("EntryDoorHinge").getTransform().getLocalRotation().multiplyVec3(vec3.forward())
  return Math.acos(Math.max(-1, Math.min(1, facing.dot(vec3.forward()))))
}

export async function openTheDoor(hand: SmallWinsLeafInteractor): Promise<void> {
  standAt(closeToDoor(), doorCentre())
  await sleep(200)
  await hand.tap("EntryDoorTapTarget")
  await waitFor("the card", () => shown("QuestCard"), 2000)
  await sleep(1300)
}

/** Done criterion 4: a sign when you look at the door, then it opens when tapped, with the quest and its options. */
@component
export class SmallWinsDoorScenario extends Scenario {
  async run(): Promise<void> {
    const hand = new SmallWinsLeafInteractor()
    await sleep(1200)

    // From across the room: the sign shows only when you look at the door, and the door stays shut.
    standAt(acrossTheRoom(), doorCentre())
    await sleep(200)
    expect(shown("QuestHint")).toBe(true)
    expect(shown("QuestCard")).toBe(false)
    expect(doorAngle()).toBeLessThan(0.05)
    standAt(acrossTheRoom(), acrossTheRoom().add(new vec3(100, 0, 0)))
    await sleep(200)
    expect(shown("QuestHint")).toBe(false)

    // Walking up doesn't open it: the sign says to tap it, and that animates the door open, part way first.
    standAt(closeToDoor(), doorCentre())
    await sleep(600)
    expect(doorAngle()).toBeLessThan(0.05)
    expect(shown("QuestHint")).toBe(true)
    expect(textOf("QuestHintText").includes("Tap the door")).toBe(true)
    await hand.tap("EntryDoorTapTarget")
    await sleep(100)
    const partWay = doorAngle()
    expect(partWay).toBeGreaterThan(0.05)
    await sleep(1100)
    // A slow preview frame can carry it most of the way at once, so "further" allows for already being there.
    expect(doorAngle()).toBeGreaterThan(partWay - 0.01)
    expect(doorAngle() * (180 / Math.PI)).toBeGreaterThan(80)
    expect(shown("OutsideView")).toBe(true)

    // The sign reads as an invitation from across the room.
    expect(textOf("QuestHintText").includes("quest")).toBe(true)

    // The card offers the quest and both ways of leaving it, in view and low enough to see out over it.
    expect(shown("QuestCard")).toBe(true)
    expect(shown("QuestHint")).toBe(false)
    expect(shown("RaiseHandButton"), "the demo button should step aside for the card").toBe(false)
    expect(textOf("QuestTitle")).toBe("Find 3 yellow things")
    expect(shown("QuestStartButton")).toBe(true)
    expect(shown("IgnoreTodayButton")).toBe(true)
    expect(shown("IgnoreUntil5Button")).toBe(true)
    await waitFor("the card to come into view", () => viewAngle(worldPos("QuestCard")) < 15, 3000)
    const card = worldPos("QuestCard")
    const eye = closeToDoor()
    const gazeAtCard = eye.add(doorCentre().sub(eye).normalize().uniformScale(card.distance(eye)))
    expect(card.y).toBeLessThan(gazeAtCard.y)

    // It stays whenever you look at the door.
    standAt(closeToDoor(), closeToDoor().add(new vec3(100, 0, 0)))
    await sleep(200)
    expect(shown("QuestCard")).toBe(false)
    standAt(closeToDoor(), doorCentre())
    await sleep(200)
    expect(shown("QuestCard")).toBe(true)

    // Start, then cancel on purpose. The demo ends here: there is nothing to walk into.
    await hand.tap("QuestStartButton")
    expect(room().questState).toBe("started")
    expect(shown("QuestStartedTitle")).toBe(true)
    expect(shown("QuestStartButton")).toBe(false)
    standAt(closeToDoor(), closeToDoor().add(new vec3(100, 0, 0)))
    await sleep(200)
    standAt(closeToDoor(), doorCentre())
    await sleep(200)
    expect(shown("QuestStartedTitle")).toBe(true)
    await hand.tap("QuestCancelButton")
    expect(room().questState).toBe("cancelled")
    await sleep(200)
    expect(shown("QuestCard")).toBe(false)

    // Cancelling closes the door again, and the sign doesn't come back. A tap still opens it.
    standAt(acrossTheRoom(), doorCentre())
    await sleep(1400)
    expect(doorAngle()).toBeLessThan(0.05)
    expect(shown("QuestHint")).toBe(false)
    await hand.tap("EntryDoorTapTarget")
    await sleep(1300)
    expect(doorAngle() * (180 / Math.PI)).toBeGreaterThan(80)
    expect(shown("QuestCard")).toBe(false)
    setViewerOverride(null)
  }
}
