import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {SmallWinsRoomController} from "../Scripts/SmallWinsRoomController"
import {setViewerOverride} from "../Scripts/SmallWinsViewer"
import {shown, SmallWinsLeafInteractor, so, textOf, waitFor, worldPos} from "./SmallWinsLeafHelpers"
import {room, walkUpToTheDoor} from "./SmallWinsDoorScenario"

/** Ignore until 5 pm just hides it in the demo, without waiting for a real clock. */
@component
export class SmallWinsIgnoreUntil5Scenario extends Scenario {
  async run(): Promise<void> {
    const hand = new SmallWinsLeafInteractor()
    await sleep(1200)
    await walkUpToTheDoor()
    await hand.tap("IgnoreUntil5Button")
    expect(room().questState).toBe("ignoredUntil5")
    await sleep(200)
    expect(shown("QuestCard")).toBe(false)
    setViewerOverride(null)
  }
}
