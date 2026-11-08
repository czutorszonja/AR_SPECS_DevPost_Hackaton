import {FlexDirection} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {addImage, addPanel, addText, child, flexButton, flexContainer, flexPlace, flexText, TEX, TEXT_SOFT} from "./SmallWinsUIKit"
import {keepInView} from "./SmallWinsViewer"

// Text is scaled well past the card's real distance, so it stays easy to read on the narrow display.
const TEXT_DISTANCE = 225
const HINT_TEXT_DISTANCE = 480
// How far the sign stands out from the door, in cm. Right against it, the frame cuts through the sign and flickers.
const SIGN_CLEARANCE = 30

// The card rides low in view, leaving the top of the doorway clear to look through.
const CARD_IN_VIEW_DEGREES = 3
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

  @input
  @hint("Tells you how to take it up")
  hintAction: string = "Tap the door to see it"

  private hintRoot: SceneObject
  private offerRoot: SceneObject
  private startedRoot: SceneObject
  private cardRoot: SceneObject

  onAwake() {
    this.hintRoot = child(this.hintAnchor, "QuestHint")
    const sign = child(this.hintRoot, "QuestHintSign", new vec3(0, 36, SIGN_CLEARANCE))
    addImage(sign, "QuestHintOutline", TEX.holderOutline, 42)
    addImage(sign, "QuestHintStar", TEX.holderStar, 25).getSceneObject().getTransform().setLocalPosition(new vec3(0, 0, 0.2))
    const label = child(this.hintRoot, "QuestHintLabel", new vec3(0, -6, SIGN_CLEARANCE))
    addPanel(this, label, 104, 34)
    addText(label, "QuestHintText", this.hintLine + "\n" + this.hintAction, {role: "Title", distance: HINT_TEXT_DISTANCE, width: 100, height: 32, wrap: true}).getSceneObject().getTransform().setLocalPosition(new vec3(0, 0, 0.6))
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

  get isCardVisible(): boolean {
    return this.cardRoot.enabled
  }

  setCardVisible(visible: boolean): void {
    // Appearing, it jumps straight to its reading spot in front of you: gliding out from beside the door frame,
    // it would spend a moment at the frame's depth and flicker in and out behind it.
    const appearing = visible && !this.cardRoot.enabled
    this.cardRoot.enabled = visible
    if (visible) keepInView(this.cardRoot.getTransform(), {maxDegrees: CARD_IN_VIEW_DEGREES, maxDistance: CARD_IN_VIEW_DISTANCE, drop: CARD_BELOW_GAZE, snap: appearing})
  }

  showStarted(started: boolean): void {
    this.offerRoot.enabled = !started
    this.startedRoot.enabled = started
  }

  private buildCard(): void {
    const d = TEXT_DISTANCE
    this.cardRoot = child(this.cardAnchor, "QuestCard")
    this.cardRoot.createComponent("Component.Canvas")
    addPanel(this, this.cardRoot, 46, 24)
    const content = child(this.cardRoot, "QuestContent", new vec3(0, 0, 0.6))

    this.offerRoot = flexContainer(content, "QuestOffer", FlexDirection.Column, 44, 23, 0.8)
    flexText(this.offerRoot, "QuestKicker", "OPTIONAL QUEST", {role: "Caption", distance: d, width: 42, height: 3.4, color: TEXT_SOFT})
    flexText(this.offerRoot, "QuestTitle", this.questTitle, {role: "Title", distance: d, width: 42, height: 5.4})
    flexText(this.offerRoot, "QuestExample", this.questExample, {role: "Body", distance: d, width: 42, height: 3.4, color: TEXT_SOFT})
    const row = flexContainer(this.offerRoot, "QuestButtons", FlexDirection.Row, 44, 7.5, 2.2)
    flexPlace(row, 44, 7.5)
    flexButton(row, "QuestStartButton", "Start", 8.6, 6.8, () => this.onChoice.invoke("start"), d)
    flexButton(row, "IgnoreTodayButton", "Ignore for today", 15.4, 6.8, () => this.onChoice.invoke("ignoreToday"), d)
    flexButton(row, "IgnoreUntil5Button", "Ignore until 5 pm", 15.4, 6.8, () => this.onChoice.invoke("ignoreUntil5"), d)

    this.startedRoot = flexContainer(content, "QuestStarted", FlexDirection.Column, 44, 23, 1)
    flexText(this.startedRoot, "QuestStartedTitle", "Quest started", {role: "Title", distance: d, width: 42, height: 5.4})
    flexText(this.startedRoot, "QuestStartedBody", this.questTitle + ". The door is open whenever you're ready.", {role: "Body", distance: d, width: 42, height: 7.4, wrap: true})
    flexButton(this.startedRoot, "QuestCancelButton", "Cancel quest", 18, 6.8, () => this.onChoice.invoke("cancel"), d)
    addText(this.startedRoot, "QuestSpacer", "", {width: 1, height: 1})
  }
}
