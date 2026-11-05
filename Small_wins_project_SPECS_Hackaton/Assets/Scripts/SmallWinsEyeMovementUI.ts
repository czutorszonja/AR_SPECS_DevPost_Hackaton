import {FlexDirection} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {addImage, addPanel, addSegment, addText, ButtonHandle, child, fadeTree, flexButton, flexContainer, flexPlace, flexText, makeImageMaterial, TEX, TEXT_SOFT, tween} from "./SmallWinsUIKit"
import {faceViewer, pointInFront} from "./SmallWinsViewer"

const VIEW_DISTANCE = 100
const DROP_BELOW_EYES = 4
// Text is scaled well past the panel's real distance, so it stays easy to read on the narrow display.
const TEXT_DISTANCE = 190
// About 12 degrees either side at a metre: a wide, easy sweep that stays inside the display.
const SWEEP_CM = 21
const PASS_SECONDS = 1.1
const PASSES_PER_SET = 12
const SETS = 4
const REST_SECONDS = 6
const REWARD_HOLD_SECONDS = 7
const BUTTON_H = 5.5

export type EyePhase = "idle" | "intro" | "running" | "paused" | "resting" | "checkin" | "reward"
export type EyeFeeling = "calmer" | "same" | "notGreat" | "stopped"

const REWARD_LINES: Record<EyeFeeling, string> = {
  calmer: "Lovely. Carry that calm with you.",
  same: "Thank you for taking the time. That counts.",
  notGreat: "That's okay. Be gentle with yourself. If hard feelings stay, a therapist can help.",
  stopped: "Good call to stop. Take a moment before you move on.",
}

/**
 * An EMDR-inspired calming exercise: short, slow sets of side-to-side eye movements while you think of a calm place.
 * It is for relaxation only, not trauma processing, which needs a trained therapist. Stop is always on screen.
 */
@component
export class SmallWinsEyeMovementUI extends BaseScriptComponent {
  /** Fires when the exercise ends, however it ended. It earns the sticker. */
  readonly onFinished = new Event<EyeFeeling>()
  /** Fires when you choose Not now, before starting. Nothing is earned. */
  readonly onClosed = new Event<void>()

  phase: EyePhase = "idle"
  set = 0
  elapsed = 0
  feeling: EyeFeeling | null = null

  private introRoot: SceneObject
  private trackRoot: SceneObject
  private checkRoot: SceneObject
  private rewardRoot: SceneObject
  private dot: SceneObject
  private setLabel: Text
  private hintText: Text
  private rewardText: Text
  private pauseButton: ButtonHandle

  get dotX(): number {
    return this.dot.getTransform().getLocalPosition().x
  }

  onAwake() {
    this.buildIntro()
    this.buildTrack()
    this.buildCheckIn()
    this.buildReward()
    this.createEvent("UpdateEvent").bind(() => this.onUpdate())
    const hide = this.createEvent("DelayedCallbackEvent")
    hide.bind(() => {
      if (this.phase === "idle") this.showOnly(null)
    })
    hide.reset(0)
  }

  /** Opens in front of you and stays put, so your head can stay still while your eyes move. */
  begin(): void {
    const position = pointInFront(VIEW_DISTANCE, 0, -DROP_BELOW_EYES)
    this.getTransform().setWorldPosition(position)
    this.getTransform().setWorldRotation(faceViewer(position))
    this.feeling = null
    this.phase = "intro"
    this.showOnly(this.introRoot)
  }

  private buildIntro(): void {
    const d = TEXT_DISTANCE
    this.introRoot = child(this.sceneObject, "EyeIntro")
    this.introRoot.createComponent("Component.Canvas")
    addPanel(this, this.introRoot, 50, 30)
    const col = flexContainer(this.introRoot, "EyeIntroColumn", FlexDirection.Column, 47, 28, 1.2)
    col.getTransform().setLocalPosition(new vec3(0, 0, 0.6))
    flexText(col, "EyeIntroTitle", "Eye movement calm", {role: "Title", distance: d, width: 46, height: 5})
    flexText(col, "EyeIntroBody", "Inspired by EMDR. Keep your head still and follow the dot with your eyes, in four short sets.", {role: "Body", distance: d, width: 46, height: 7.5, wrap: true})
    flexText(col, "EyeIntroSafety", "A calming exercise, not trauma therapy. Stop whenever you like.", {role: "Body", distance: d, width: 46, height: 5, wrap: true, color: TEXT_SOFT})
    const row = flexContainer(col, "EyeIntroButtons", FlexDirection.Row, 46, BUTTON_H + 1, 2.5)
    flexPlace(row, 46, BUTTON_H + 1)
    flexButton(row, "EyeStartButton", "Start", 15, BUTTON_H, () => this.start(), d)
    flexButton(row, "EyeNotNowButton", "Not now", 15, BUTTON_H, () => this.close(), d)
  }

  private buildTrack(): void {
    const d = TEXT_DISTANCE
    this.trackRoot = child(this.sceneObject, "EyeTrack")
    this.trackRoot.createComponent("Component.Canvas")
    const line = makeImageMaterial(TEX.ink, new vec4(0.98, 0.93, 0.8, 0.35))
    addSegment(this.trackRoot, "EyeTrackLine", line, new vec2(-SWEEP_CM, 0), new vec2(SWEEP_CM, 0), 0.4, 0)
    this.dot = addImage(this.trackRoot, "EyeDot", TEX.dot, 4.2).getSceneObject()
    this.dot.getTransform().setLocalPosition(new vec3(-SWEEP_CM, 0, 0.3))

    const top = child(this.trackRoot, "EyeHintRoot", new vec3(0, 11, 0))
    addPanel(this, top, 48, 10)
    this.setLabel = addText(top, "EyeSetLabel", "Set 1 of " + SETS, {role: "Subheadline", distance: d, width: 46, height: 4})
    this.setLabel.getSceneObject().getTransform().setLocalPosition(new vec3(0, 2.4, 0.6))
    this.hintText = addText(top, "EyeHint", "", {role: "Body", distance: d, width: 46, height: 4.5, wrap: true})
    this.hintText.getSceneObject().getTransform().setLocalPosition(new vec3(0, -2.2, 0.6))

    const row = flexContainer(this.trackRoot, "EyeButtons", FlexDirection.Row, 36, BUTTON_H + 1, 3)
    row.getTransform().setLocalPosition(new vec3(0, -10, 0.2))
    this.pauseButton = flexButton(row, "EyePauseButton", "Pause", 15, BUTTON_H, () => this.togglePause(), d)
    flexButton(row, "EyeStopButton", "Stop", 15, BUTTON_H, () => this.finish("stopped"), d)
  }

  private buildCheckIn(): void {
    const d = TEXT_DISTANCE
    this.checkRoot = child(this.sceneObject, "EyeCheckIn")
    this.checkRoot.createComponent("Component.Canvas")
    addPanel(this, this.checkRoot, 52, 20)
    const col = flexContainer(this.checkRoot, "EyeCheckColumn", FlexDirection.Column, 49, 18, 2)
    col.getTransform().setLocalPosition(new vec3(0, 0, 0.6))
    flexText(col, "EyeCheckQuestion", "How do you feel now?", {role: "Title", distance: d, width: 48, height: 5})
    const row = flexContainer(col, "EyeCheckButtons", FlexDirection.Row, 49, BUTTON_H + 1, 2)
    flexPlace(row, 49, BUTTON_H + 1)
    flexButton(row, "EyeCalmerButton", "Calmer", 14, BUTTON_H, () => this.finish("calmer"), d)
    flexButton(row, "EyeSameButton", "About the same", 18, BUTTON_H, () => this.finish("same"), d)
    flexButton(row, "EyeNotGreatButton", "Not great", 14, BUTTON_H, () => this.finish("notGreat"), d)
  }

  private buildReward(): void {
    this.rewardRoot = child(this.sceneObject, "EyeReward")
    this.rewardRoot.createComponent("Component.Canvas")
    addImage(this.rewardRoot, "CalmSticker", TEX.calm, 12).getSceneObject().getTransform().setLocalPosition(new vec3(0, 4, 0.2))
    addImage(this.rewardRoot, "CalmSparkleA", TEX.star, 3).getSceneObject().getTransform().setLocalPosition(new vec3(-9, 8, 0.3))
    addImage(this.rewardRoot, "CalmSparkleB", TEX.star, 2.2).getSceneObject().getTransform().setLocalPosition(new vec3(9, 2, 0.3))
    const messageRoot = child(this.rewardRoot, "EyeRewardMessageRoot", new vec3(0, -6.5, 0.1))
    addPanel(this, messageRoot, 48, 9)
    this.rewardText = addText(messageRoot, "EyeRewardMessage", "", {role: "Headline", distance: TEXT_DISTANCE, width: 46, height: 8.5, wrap: true})
    this.rewardText.getSceneObject().getTransform().setLocalPosition(new vec3(0, 0, 0.6))
  }

  private start(): void {
    this.set = 1
    this.elapsed = 0
    this.phase = "running"
    this.pauseButton.label.text = "Pause"
    this.showOnly(this.trackRoot)
    this.updateLabels()
  }

  private close(): void {
    this.phase = "idle"
    this.showOnly(null)
    this.onClosed.invoke()
  }

  private togglePause(): void {
    if (this.phase === "running" || this.phase === "resting") {
      this.phase = "paused"
      this.pauseButton.label.text = "Resume"
    } else if (this.phase === "paused") {
      this.phase = this.elapsed >= PASS_SECONDS * PASSES_PER_SET ? "resting" : "running"
      this.pauseButton.label.text = "Pause"
    }
  }

  private onUpdate(): void {
    if (this.phase === "running") {
      this.elapsed += getDeltaTime()
      // Starts on the left and sweeps smoothly side to side: one pass is one sweep across.
      this.placeDot(-SWEEP_CM * Math.cos((Math.PI * this.elapsed) / PASS_SECONDS))
      if (this.elapsed >= PASS_SECONDS * PASSES_PER_SET) {
        if (this.set >= SETS) {
          this.phase = "checkin"
          this.showOnly(this.checkRoot)
          return
        }
        this.phase = "resting"
        this.updateLabels()
      }
    } else if (this.phase === "resting") {
      this.elapsed += getDeltaTime()
      if (this.elapsed >= PASS_SECONDS * PASSES_PER_SET + REST_SECONDS) {
        this.set++
        this.elapsed = 0
        this.phase = "running"
        this.updateLabels()
      }
    }
  }

  private updateLabels(): void {
    this.setLabel.text = "Set " + this.set + " of " + SETS
    if (this.phase === "resting") this.hintText.text = "Take a slow breath. Notice how you feel."
    else if (this.set === 1) this.hintText.text = "Think of a place where you feel calm, and follow the dot."
    else this.hintText.text = "Keep your head still. Follow the dot with your eyes."
    this.dot.enabled = this.phase !== "resting"
  }

  private placeDot(x: number): void {
    this.dot.getTransform().setLocalPosition(new vec3(x, 0, 0.3))
  }

  /** However it ends, it ends kindly, and it earns the sticker. */
  private finish(feeling: EyeFeeling): void {
    if (this.phase === "idle" || this.phase === "reward") return
    this.feeling = feeling
    this.phase = "reward"
    this.rewardText.text = REWARD_LINES[feeling]
    this.showOnly(this.rewardRoot)
    fadeTree(this.rewardRoot, 1)
    this.onFinished.invoke(feeling)
    const later = this.createEvent("DelayedCallbackEvent") as DelayedCallbackEvent
    later.bind(() => {
      tween(
        this,
        0.6,
        (k) => fadeTree(this.rewardRoot, 1 - k),
        () => {
          this.showOnly(null)
          this.phase = "idle"
        },
      )
    })
    later.reset(REWARD_HOLD_SECONDS)
  }

  private showOnly(root: SceneObject | null): void {
    for (const r of [this.introRoot, this.trackRoot, this.checkRoot, this.rewardRoot]) r.enabled = r === root
  }
}
