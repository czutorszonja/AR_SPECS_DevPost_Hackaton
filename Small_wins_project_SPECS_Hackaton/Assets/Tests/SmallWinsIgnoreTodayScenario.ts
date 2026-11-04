import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {setViewerOverride} from "../Scripts/SmallWinsViewer"
import {shown, SmallWinsLeafInteractor} from "./SmallWinsLeafHelpers"
import {room, doorCentre, standAt, acrossTheRoom, openTheDoor} from "./SmallWinsDoorScenario"

/** Ignore for today hides the card and the sign for the day. */
@component
export class SmallWinsIgnoreTodayScenario extends Scenario {
  async run(): Promise<void> {
    const hand = new SmallWinsLeafInteractor()
    await sleep(1200)
    await openTheDoor(hand)
    await hand.tap("IgnoreTodayButton")
    expect(room().questState).toBe("ignoredToday")
    await sleep(200)
    expect(shown("QuestCard")).toBe(false)
    standAt(acrossTheRoom(), doorCentre())
    await sleep(300)
    expect(shown("QuestHint")).toBe(false)
    setViewerOverride(null)
  }
}
