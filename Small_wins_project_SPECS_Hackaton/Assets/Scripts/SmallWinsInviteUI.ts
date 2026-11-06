import {FlexDirection} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {addPanel, child, fadeTree, flexButton, flexContainer, flexPlace, flexText, smooth, tween} from "./SmallWinsUIKit"
import {faceViewer, keepInView, pointInFront} from "./SmallWinsViewer"

const IN_VIEW_DEGREES = 4
const IN_VIEW_DISTANCE = 110
// Text is scaled well past the panel's real distance, so it stays easy to read on the narrow display.
const INVITE_TEXT_DISTANCE = 230
const PROMPT_DISTANCE = 85
const PROMPT_TEXT_DISTANCE = 180
const PROMPT_DROP = 15
const FOLLOW_RATE = 2.5

/** The me-time invitation on the wall, then the prompt that gently follows you until you're seated. */
@component
export class SmallWinsInviteUI extends BaseScriptComponent {
  readonly onAccepted = new Event<void>()
  readonly onDeclined = new Event<void>()
  readonly onReady = new Event<void>()

  @input
  @hint("Shown when no line is given: normally it names what you've just done")
  inviteLine: string = "Well done for the dishes and the washing machine."

  @input
  @hint("Asks if you'd like to reward yourself")
  rewardLine: string = "Want to reward yourself with some me-time? Make a tea, sit down, take a few minutes."

  @input
  @hint("The question Yes and No answer")
  questionLine: string = "Are you ready for some conscious breathing?"

  @input
  @hint("Shown after Yes. It waits as long as you need")
  promptLine: string = "Find somewhere comfortable to sit, in this room or another. Take as long as you need."

  private inviteRoot: SceneObject
  private inviteText: Text
  private promptRoot: SceneObject
  private following = false

  onAwake() {
    this.inviteRoot = child(this.sceneObject, "MeTimeInvitation")
    this.promptRoot = child(this.sceneObject, "ComfortPrompt")
    this.buildInvite()
    this.buildPrompt()
    this.createEvent("UpdateEvent").bind(() => this.followViewer())
    const hide = this.createEvent("DelayedCallbackEvent")
    hide.bind(() => {
      this.inviteRoot.enabled = false
      this.promptRoot.enabled = false
    })
    hide.reset(0)
  }

  /** Appears where the last reward just faded, thanking you for what you've just done. */
  showInvitation(anchor: SceneObject, line?: string): void {
    this.inviteText.text = line ?? this.inviteLine
    const t = this.inviteRoot.getTransform()
    t.setWorldPosition(anchor.getTransform().getWorldPosition().add(new vec3(0, 6, 0.5)))
    t.setWorldRotation(anchor.getTransform().getWorldRotation())
    keepInView(t, {maxDegrees: IN_VIEW_DEGREES, maxDistance: IN_VIEW_DISTANCE, snap: true})
    this.inviteRoot.enabled = true
    tween(this, 0.4, (k) => fadeTree(this.inviteRoot, smooth(k)))
  }

  private buildInvite(): void {
    this.inviteRoot.createComponent("Component.Canvas")
    addPanel(this, this.inviteRoot, 52, 34.5)
    const col = flexContainer(this.inviteRoot, "InviteColumn", FlexDirection.Column, 49, 32.5, 0.8)
    col.getTransform().setLocalPosition(new vec3(0, 0, 0.6))
    const d = INVITE_TEXT_DISTANCE
    // Room for two lines: it names up to three things you've done.
    this.inviteText = flexText(col, "InviteLine", this.inviteLine, {role: "Subheadline", distance: d, width: 48, height: 7, wrap: true})
    flexText(col, "RewardLine", this.rewardLine, {role: "Body", distance: d, width: 48, height: 9.4, wrap: true})
    flexText(col, "QuestionLine", this.questionLine, {role: "Subheadline", distance: d, width: 48, height: 4.6, wrap: true})
    const row = flexContainer(col, "InviteButtons", FlexDirection.Row, 48, 8, 2)
    flexPlace(row, 48, 8)
    flexButton(row, "YesButton", "Yes", 16, 7, () => this.answer(true), d)
    flexButton(row, "NoButton", "No", 16, 7, () => this.answer(false), d)
  }

  private buildPrompt(): void {
    this.promptRoot.createComponent("Component.Canvas")
    addPanel(this, this.promptRoot, 34, 17)
    const col = flexContainer(this.promptRoot, "PromptColumn", FlexDirection.Column, 32, 16, 1)
    col.getTransform().setLocalPosition(new vec3(0, 0, 0.6))
    const d = PROMPT_TEXT_DISTANCE
    flexText(col, "PromptLine", this.promptLine, {role: "Subheadline", distance: d, width: 31, height: 8, wrap: true})
    flexButton(col, "ReadyButton", "I'm ready", 16, 5.5, () => this.ready(), d)
  }

  /** Fades on either answer. No leaves the room quiet. */
  private answer(yes: boolean): void {
    if (yes) this.onAccepted.invoke()
    else this.onDeclined.invoke()
    tween(
      this,
      0.3,
      (k) => fadeTree(this.inviteRoot, 1 - k),
      () => {
        this.inviteRoot.enabled = false
        if (yes) this.showPrompt()
      },
    )
  }

  private showPrompt(): void {
    this.promptRoot.getTransform().setWorldPosition(pointInFront(PROMPT_DISTANCE, 0, -PROMPT_DROP))
    this.promptRoot.enabled = true
    this.following = true
    tween(this, 0.3, (k) => fadeTree(this.promptRoot, smooth(k)))
  }

  private ready(): void {
    this.following = false
    this.promptRoot.enabled = false
    this.onReady.invoke()
  }

  /** Stays low in view and eases after you, never stuck to your face. */
  private followViewer(): void {
    if (this.inviteRoot.enabled) keepInView(this.inviteRoot.getTransform(), {maxDegrees: IN_VIEW_DEGREES, maxDistance: IN_VIEW_DISTANCE})
    if (!this.following) return
    const t = this.promptRoot.getTransform()
    const k = Math.min(1, getDeltaTime() * FOLLOW_RATE)
    const position = vec3.lerp(t.getWorldPosition(), pointInFront(PROMPT_DISTANCE, 0, -PROMPT_DROP), k)
    t.setWorldPosition(position)
    t.setWorldRotation(faceViewer(position))
  }
}
