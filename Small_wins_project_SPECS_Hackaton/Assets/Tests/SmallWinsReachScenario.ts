import {createIKInteractor} from "Leaf.lspkg/Interactors/interactor/ik/visualizer/BitmojiAvatar"
import {findInteractablesByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {SmallWinsDemoNavigation} from "../Scripts/SmallWinsDemoNavigation"
import {SmallWinsState} from "../Scripts/SmallWinsState"
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
    await this.reach("AddTaskButton", () => shown("PresetTask0"))
    await sleep(800)
    await this.reach("PickerCancel", () => !shown("PresetTask0"))
    await sleep(800)
    // Cancel closes the list without adding anything. (On its way down from the shoulder the simulated arm
    // can brush a tab in the top row, so which page shows next isn't checked here.)
    expect(SmallWinsState.instance.tasks.length).toBe(3)
    await this.reach("NotebookClose", () => !shown("Notebook"))
  }

  /**
   * Reach for a button and press it. A button that rebuilds its page is gone by the time the arm lets go,
   * which the arm reports as an error; that's fine as long as the press did what it should.
   */
  private async reach(name: string, pressed: () => boolean): Promise<void> {
    const target = findInteractablesByName(name, undefined, true)[0]
    if (!target) throw new Error(name + " isn't on screen to reach for")
    try {
      await this.body.trigger(target)
    } catch (e) {
      print("reach-check: the arm's release after " + name + " reported: " + e)
    }
    await waitFor(name + " to take effect", pressed, 3000)
  }
}
