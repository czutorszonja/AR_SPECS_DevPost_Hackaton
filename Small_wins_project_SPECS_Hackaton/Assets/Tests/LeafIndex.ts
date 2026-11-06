import {scenariosIndex} from "Leaf.lspkg/Scenarios/decorator/ScenarioIndexDecorator"
import {ScenarioMetadata} from "Leaf.lspkg/Scenarios/scenario/ScenarioMetadata"
import {SmallWinsBreathingFullScenario} from "./SmallWinsBreathingFullScenario"
import {SmallWinsBreathingScenario} from "./SmallWinsBreathingScenario"
import {SmallWinsChoresScenario} from "./SmallWinsChoresScenario"
import {SmallWinsButtonSizeScenario} from "./SmallWinsButtonSizeScenario"
import {SmallWinsDoorScenario} from "./SmallWinsDoorScenario"
import {SmallWinsDrawingScenario} from "./SmallWinsDrawingScenario"
import {SmallWinsEyeMovementFullScenario} from "./SmallWinsEyeMovementFullScenario"
import {SmallWinsEyeMovementScenario} from "./SmallWinsEyeMovementScenario"
import {SmallWinsHomeTasksScenario} from "./SmallWinsHomeTasksScenario"
import {SmallWinsIgnoreTodayScenario} from "./SmallWinsIgnoreTodayScenario"
import {SmallWinsIgnoreUntil5Scenario} from "./SmallWinsIgnoreUntil5Scenario"
import {SmallWinsInViewScenario} from "./SmallWinsInViewScenario"
import {SmallWinsNoThanksScenario} from "./SmallWinsNoThanksScenario"
import {SmallWinsNotebookScenario} from "./SmallWinsNotebookScenario"
import {SmallWinsReachScenario} from "./SmallWinsReachScenario"
import {SmallWinsReducedMotionScenario} from "./SmallWinsReducedMotionScenario"
import {SmallWinsRoomScenario} from "./SmallWinsRoomScenario"
import {SmallWinsSeatScenario} from "./SmallWinsSeatScenario"
import {SmallWinsUnplannedScenario} from "./SmallWinsUnplannedScenario"

@component
export class LeafIndex extends BaseScriptComponent {
  @scenariosIndex
  static scenariosIndex: ScenarioMetadata[] = [
    {id: "c1-room", typename: SmallWinsRoomScenario.getTypeName()},
    {id: "c2-chores-rewards", typename: SmallWinsChoresScenario.getTypeName()},
    {id: "c2-messages-in-view", typename: SmallWinsInViewScenario.getTypeName()},
    {id: "c2-reduced-motion", typename: SmallWinsReducedMotionScenario.getTypeName()},
    {id: "c2-unplanned-task", typename: SmallWinsUnplannedScenario.getTypeName()},
    {id: "c3-breathing", typename: SmallWinsBreathingScenario.getTypeName()},
    {id: "c3-breathing-full-64s", typename: SmallWinsBreathingFullScenario.getTypeName()},
    {id: "c3-no-thanks", typename: SmallWinsNoThanksScenario.getTypeName()},
    {id: "c3-sit-and-stand", typename: SmallWinsSeatScenario.getTypeName()},
    {id: "c4-door-quest", typename: SmallWinsDoorScenario.getTypeName()},
    {id: "c4-ignore-today", typename: SmallWinsIgnoreTodayScenario.getTypeName()},
    {id: "c4-ignore-until-5", typename: SmallWinsIgnoreUntil5Scenario.getTypeName()},
    {id: "c5-notebook", typename: SmallWinsNotebookScenario.getTypeName()},
    {id: "c6-eye-movement", typename: SmallWinsEyeMovementScenario.getTypeName()},
    {id: "c6-eye-movement-full", typename: SmallWinsEyeMovementFullScenario.getTypeName()},
    {id: "c6-guided-drawing", typename: SmallWinsDrawingScenario.getTypeName()},
    {id: "c7-home-tasks", typename: SmallWinsHomeTasksScenario.getTypeName()},
    {id: "button-sizes", typename: SmallWinsButtonSizeScenario.getTypeName()},
    {id: "reach-check", typename: SmallWinsReachScenario.getTypeName()},
  ]
}
