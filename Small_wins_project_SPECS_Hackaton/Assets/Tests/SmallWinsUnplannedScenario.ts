import {createIKInteractor} from "Leaf.lspkg/Interactors/interactor/ik/visualizer/BitmojiAvatar"
import {findInteractablesByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {SmallWinsState, TASK_LAUNDRY, TASK_PRESETS} from "../Scripts/SmallWinsState"
import {viewerPose} from "../Scripts/SmallWinsViewer"
import {shown, SmallWinsLeafInteractor, so, textOf, waitFor, worldPos} from "./SmallWinsLeafHelpers"

/** A chore removed from the notebook earns nothing: only tasks you planned earn a sticker. */
@component
export class SmallWinsUnplannedScenario extends Scenario {
  async run(): Promise<void> {
    const hand = new SmallWinsLeafInteractor()
    const state = SmallWinsState.instance
    await sleep(1200)
    state.removeTask(TASK_LAUNDRY)
    await hand.loadLaundry()
    await sleep(1500)
    expect(state.stickers.length).toBe(0)
    expect(shown("RewardPlate")).toBe(false)
  }
}
