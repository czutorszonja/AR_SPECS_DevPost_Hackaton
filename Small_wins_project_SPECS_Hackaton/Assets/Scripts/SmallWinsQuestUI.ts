import {FlexDirection} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {addImage, addPanel, addText, child, flexButton, flexContainer, flexPlace, flexText, TEX, TEXT_SOFT} from "./SmallWinsUIKit"
import {keepInView} from "./SmallWinsViewer"

const VIEW_DISTANCE = 130
const HINT_TEXT_DISTANCE = 300

// The card rides low in view, leaving the top of the doorway clear to look through.
const CARD_IN_VIEW_DEGREES = 5
const CARD_IN_VIEW_DISTANCE = 115
const CARD_BELOW_GAZE = -14

export type QuestChoice = "start" | "ignoreToday" | "ignoreUntil5" | "cancel"

/** The small sign seen from across the room, and the card beside the door frame. */
@component
export class SmallWinsQuestUI extends BaseScriptComponent {
  readonly onChoice = new Event<QuestChoice>()

  @input
  @hint("Where the sign sits, above the door")
  hintAnchor: SceneObject

  @input
  @hint("Where the card floats, beside the door frame")
  cardAnchor: SceneObject

  @input
  @hint("The quest on offer")
  questTitle: string = "Find 3 yellow things"

  @input
  @hint("Another example of a quest")
  questExample: string = "or 3 unique leaves"

  @input
  @hint("The sign you see from across the room")
  hintLine: string = "A little quest is waiting outside"

  private hintRoot: SceneObject
  private offerRoot: SceneObject
  private startedRoot: SceneObject
  private cardRoot: SceneObject

  onAwake() {
    this.hintRoot = child(this.hintAnchor, "QuestHint")
    const sign = child(this.hintRoot, "QuestHintSign", new vec3(0, 12, 1))
    addImage(sign, "QuestHintOutline", TEX.outline, 26)
    addImage(sign, "QuestHintStar", TEX.star, 15).getSceneObject().getTransform().setLocalPosition(new vec3(0, 0, 0.2))
    const label = child(this.hintRoot, "QuestHintLabel", new vec3(0, -12, 1))
    addPanel(this, label, 72, 13)
    addText(label, "QuestHintText", this.hintLine, {role: "Title", distance: HINT_TEXT_DISTANCE, width: 70, height: 13}).getSceneObject().getTransform().setLocalPosition(new vec3(0, 0, 0.6))
    this.buildCard()
    const hide = this.createEvent("DelayedCallbackEvent")
    hide.bind(() => {
      this.hintRoot.enabled = false
      this.cardRoot.enabled = false
      this.startedRoot.enabled = false
    })
    hide.reset(0)
  }

  setHintVisible(visible: boolean): void {
    this.hintRoot.enabled = visible
  }

  setCardVisible(visible: boolean): void {
    this.cardRoot.enabled = visible
    if (visible) keepInView(this.cardRoot.getTransform(), {maxDegrees: CARD_IN_VIEW_DEGREES, maxDistance: CARD_IN_VIEW_DISTANCE, drop: CARD_BELOW_GAZE})
  }

  showStarted(started: boolean): void {
    this.offerRoot.enabled = !started
    this.startedRoot.enabled = started
  }

  private buildCard(): void {
    const d = VIEW_DISTANCE
    this.cardRoot = child(this.cardAnchor, "QuestCard")
    this.cardRoot.createComponent("Component.Canvas")
    addPanel(this, this.cardRoot, 40, 20)
    const content = child(this.cardRoot, "QuestContent", new vec3(0, 0, 0.6))

    this.offerRoot = flexContainer(content, "QuestOffer", FlexDirection.Column, 38, 19, 0.8)
    flexText(this.offerRoot, "QuestKicker", "OPTIONAL QUEST", {role: "Caption", distance: d, width: 36, height: 2.4, color: TEXT_SOFT})
    flexText(this.offerRoot, "QuestTitle", this.questTitle, {role: "Title", distance: d, width: 36, height: 4})
    flexText(this.offerRoot, "QuestExample", this.questExample, {role: "Body", distance: d, width: 36, height: 2.6, color: TEXT_SOFT})
    const row = flexContainer(this.offerRoot, "QuestButtons", FlexDirection.Row, 38, 6, 1)
    flexPlace(row, 38, 6)
    flexButton(row, "QuestStartButton", "Start", 8, 5.2, () => this.onChoice.invoke("start"), d)
    flexButton(row, "IgnoreTodayButton", "Ignore for today", 14, 5.2, () => this.onChoice.invoke("ignoreToday"), d)
    flexButton(row, "IgnoreUntil5Button", "Ignore until 5 pm", 14, 5.2, () => this.onChoice.invoke("ignoreUntil5"), d)

    this.startedRoot = flexContainer(content, "QuestStarted", FlexDirection.Column, 38, 19, 1)
    flexText(this.startedRoot, "QuestStartedTitle", "Quest started", {role: "Title", distance: d, width: 36, height: 4})
    flexText(this.startedRoot, "QuestStartedBody", this.questTitle + ". The door is open whenever you're ready.", {role: "Body", distance: d, width: 36, height: 5, wrap: true})
    flexButton(this.startedRoot, "QuestCancelButton", "Cancel quest", 14, 5.2, () => this.onChoice.invoke("cancel"), d)
    addText(this.startedRoot, "QuestSpacer", "", {width: 1, height: 1})
  }
}
