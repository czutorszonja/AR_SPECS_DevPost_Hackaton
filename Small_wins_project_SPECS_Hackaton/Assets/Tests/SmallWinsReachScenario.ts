import {createIKInteractor} from "Leaf.lspkg/Interactors/interactor/ik/visualizer/BitmojiAvatar"
import {findInteractablesByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {SmallWinsDemoNavigation} from "../Scripts/SmallWinsDemoNavigation"
import {shown, so, waitFor} from "./SmallWinsLeafHelpers"

/** Reach check: a simulated arm and head reaching for the controls, as a person standing there would. */
@component
export class SmallWinsReachScenario extends Scenario {
  private readonly body = createIKInteractor()

  async run(): Promise<void> {
    // The simulated body stands at the scene origin, so the viewer walks over to stand in it.
    const navigation = so("ViewerRig (preview navigation)").getComponent(SmallWinsDemoNavigation.getTypeName()) as SmallWinsDemoNavigation
    navigation.standAt(vec3.zero())
    await sleep(2500)
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
