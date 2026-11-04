import {createIKInteractor} from "Leaf.lspkg/Interactors/interactor/ik/visualizer/BitmojiAvatar"
import {findInteractablesByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {SmallWinsDemoNavigation} from "../Scripts/SmallWinsDemoNavigation"
import {shown, SmallWinsLeafInteractor, so, waitFor} from "./SmallWinsLeafHelpers"

/**
 * Reach check: a simulated arm and head reaching for the notebook's controls, as a person standing there would.
 * The Raise hand button is opened with a plain tap: it holds a corner of the view, so a turning head only chases
 * it, and on real glasses it isn't there because you raise your actual hand.
 */
@component
export class SmallWinsReachScenario extends Scenario {
  private readonly body = createIKInteractor()

  async run(): Promise<void> {
    const hand = new SmallWinsLeafInteractor()
    // The simulated body stands at the scene origin, so the viewer walks over to stand in it.
    const navigation = so("ViewerRig (preview navigation)").getComponent(SmallWinsDemoNavigation.getTypeName()) as SmallWinsDemoNavigation
    navigation.standAt(vec3.zero())
    await sleep(2500)
    await hand.tap("RaiseHandButton")
    await waitFor("the hand", () => shown("NotebookTab"), 3000)
    await hand.tap("NotebookTab")
    await waitFor("the notebook", () => shown("Notebook"), 3000)
    await sleep(800)
    await this.body.trigger(findInteractablesByName("AddTaskButton", undefined, true)[0])
    await waitFor("the preset list", () => shown("PresetTask0"), 3000)
    await sleep(800)
    await this.body.trigger(findInteractablesByName("PickerCancel", undefined, true)[0])
    await sleep(800)
    await this.body.trigger(findInteractablesByName("NotebookClose", undefined, true)[0])
    await waitFor("the notebook to close", () => !shown("Notebook"), 3000)
  }
}
