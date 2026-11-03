import {FlexDirection} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {addPanel, child, fadeTree, flexButton, flexContainer, flexPlace, flexText, smooth, tween} from "./SmallWinsUIKit"
import {faceViewer, pointInFront} from "./SmallWinsViewer"

const INVITE_DISTANCE = 140
const PROMPT_DISTANCE = 85
const PROMPT_DROP = 22
const FOLLOW_RATE = 2.5

/** The me-time invitation on the wall, then the prompt that gently follows you until you're seated. */
@component
export class SmallWinsInviteUI extends BaseScriptComponent {
  readonly onReady = new Event<void>()

  @input
  @hint("Shown after both chores")
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

  /** Appears where the second reward just faded. */
  showInvitation(anchor: SceneObject): void {
    const t = this.inviteRoot.getTransform()
    t.setWorldPosition(anchor.getTransform().getWorldPosition().add(new vec3(0, 6, 0.5)))
    t.setWorldRotation(anchor.getTransform().getWorldRotation())
    this.inviteRoot.enabled = true
    tween(this, 0.4, (k) => fadeTree(this.inviteRoot, smooth(k)))
  }

  private buildInvite(): void {
    this.inviteRoot.createComponent("Component.Canvas")
    addPanel(this, this.inviteRoot, 40, 24)
    const col = flexContainer(this.inviteRoot, "InviteColumn", FlexDirection.Column, 37, 22, 0.8)
    col.getTransform().setLocalPosition(new vec3(0, 0, 0.6))
    const d = INVITE_DISTANCE
    flexText(col, "InviteLine", this.inviteLine, {role: "Subheadline", distance: d, width: 36, height: 3.4, wrap: true})
    flexText(col, "RewardLine", this.rewardLine, {role: "Body", distance: d, width: 36, height: 6, wrap: true})
    flexText(col, "QuestionLine", this.questionLine, {role: "Subheadline", distance: d, width: 36, height: 3.4, wrap: true})
    const row = flexContainer(col, "InviteButtons", FlexDirection.Row, 36, 6, 2)
    flexPlace(row, 36, 6)
    flexButton(row, "YesButton", "Yes", 12, 5.4, () => this.answer(true), d)
    flexButton(row, "NoButton", "No", 12, 5.4, () => this.answer(false), d)
  }

  private buildPrompt(): void {
    this.promptRoot.createComponent("Component.Canvas")
    addPanel(this, this.promptRoot, 30, 15)
    const col = flexContainer(this.promptRoot, "PromptColumn", FlexDirection.Column, 28, 14, 1)
    col.getTransform().setLocalPosition(new vec3(0, 0, 0.6))
    const d = PROMPT_DISTANCE
    flexText(col, "PromptLine", this.promptLine, {role: "Subheadline", distance: d, width: 27, height: 6.5, wrap: true})
    flexButton(col, "ReadyButton", "I'm ready", 14, 4.4, () => this.ready(), d)
  }

  /** Fades on either answer. No leaves the room quiet. */
  private answer(yes: boolean): void {
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
    if (!this.following) return
    const t = this.promptRoot.getTransform()
    const k = Math.min(1, getDeltaTime() * FOLLOW_RATE)
    const position = vec3.lerp(t.getWorldPosition(), pointInFront(PROMPT_DISTANCE, 0, -PROMPT_DROP), k)
    t.setWorldPosition(position)
    t.setWorldRotation(faceViewer(position))
  }
}
