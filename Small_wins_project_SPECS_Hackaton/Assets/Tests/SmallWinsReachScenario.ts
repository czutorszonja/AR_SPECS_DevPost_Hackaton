import {createIKInteractor} from "Leaf.lspkg/Interactors/interactor/ik/visualizer/BitmojiAvatar"
import {findInteractablesByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {SmallWinsState, TASK_LAUNDRY, TASK_PRESETS} from "../Scripts/SmallWinsState"
import {viewerPose} from "../Scripts/SmallWinsViewer"
import {shown, SmallWinsLeafInteractor, so, textOf, waitFor, worldPos} from "./SmallWinsLeafHelpers"

/** Reach check: a simulated arm and head reaching for the controls, as a person standing there would. */
@component
export class SmallWinsReachScenario extends Scenario {
  private readonly body = createIKInteractor()

  async run(): Promise<void> {
    await sleep(1500)
    const raise = findInteractablesByName("RaiseHandButton", undefined, true)[0]
    await this.body.trigger(raise)
    await waitFor("the hand", () => shown("NotebookTab"), 3000)
    await this.body.trigger(findInteractablesByName("NotebookTab", undefined, true)[0])
    await waitFor("the notebook", () => shown("Notebook"), 3000)
    await sleep(300)
    await this.body.trigger(findInteractablesByName("AddTaskButton", undefined, true)[0])
    await waitFor("the preset list", () => shown("PresetTask0"), 3000)
    await this.body.trigger(findInteractablesByName("PickerCancel", undefined, true)[0])
    await sleep(500)
    await this.body.trigger(findInteractablesByName("NotebookClose", undefined, true)[0])
    await waitFor("the notebook to close", () => !shown("Notebook"), 3000)
  }
}
