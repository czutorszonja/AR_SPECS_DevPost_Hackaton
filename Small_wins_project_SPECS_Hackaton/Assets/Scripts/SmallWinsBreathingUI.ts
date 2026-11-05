import {FlexDirection} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {addImage, addPanel, addText, child, ButtonHandle, fadeTree, flexButton, flexContainer, smooth, TEX, tween} from "./SmallWinsUIKit"
import {faceViewer, pointInFront} from "./SmallWinsViewer"

const VIEW_DISTANCE = 100
// Text is scaled well past the square's real distance, so it stays easy to read on the narrow display.
const TEXT_DISTANCE = 180
const DROP_BELOW_EYES = 10
const SQUARE_CM = 20
const TRACK = SQUARE_CM / 2 - 1
const SIDE_SECONDS = 4
const ROUNDS = 4
const WORDS = ["Breathe in", "Hold", "Breathe out", "Rest"]
// Clockwise from the bottom-left corner: up the left edge, across the top, down the right, across the bottom.
const CORNERS = [
  new vec2(-TRACK, -TRACK),
  new vec2(-TRACK, TRACK),
  new vec2(TRACK, TRACK),
  new vec2(TRACK, -TRACK),
]
const REWARD_HOLD_SECONDS = 7

export type BreathingPhase = "idle" | "running" | "paused" | "homing" | "reward"

/** Box breathing. Appears wherever you are when you're ready, then stays put in the room. */
@component
export class SmallWinsBreathingUI extends BaseScriptComponent {
  /** Fires when the breathing ends, whether it ran its four rounds or you finished early. Both earn the sticker. */
  readonly onFinished = new Event<void>()

  phase: BreathingPhase = "idle"
  elapsed = 0

  private square: SceneObject
  private dot: SceneObject
  private roundText: Text
  private wordText: Text
  private introRoot: SceneObject
  private pauseButton: ButtonHandle
  private rewardRoot: SceneObject

  onAwake() {
    this.buildSquare()
    this.buildReward()
    this.createEvent("UpdateEvent").bind(() => this.onUpdate())
    const hide = this.createEvent("DelayedCallbackEvent")
    hide.bind(() => {
      if (this.phase !== "idle") return
      this.square.enabled = false
      this.rewardRoot.enabled = false
    })
    hide.reset(0)
  }

  get currentWord(): string {
    return this.wordText.text
  }

  get currentRoundLabel(): string {
    return this.roundText.text
  }

  get dotPosition(): vec3 {
    return this.dot.getTransform().getLocalPosition()
  }

  begin(): void {
    const position = pointInFront(VIEW_DISTANCE, 0, -DROP_BELOW_EYES)
    this.getTransform().setWorldPosition(position)
    this.getTransform().setWorldRotation(faceViewer(position))
    this.elapsed = 0
    this.phase = "running"
    this.rewardRoot.enabled = false
    this.square.enabled = true
    this.pauseButton.label.text = "Pause"
    fadeTree(this.square, 1)
    this.applyElapsed()
  }

  private buildSquare(): void {
    this.square = child(this.sceneObject, "BreathingSquare")
    this.square.createComponent("Component.Canvas")
    addImage(this.square, "SquareFrame", TEX.square, SQUARE_CM)
    const d = TEXT_DISTANCE
    this.introRoot = child(this.square, "BreathingIntroRoot", new vec3(0, SQUARE_CM / 2 + 3, 0.1))
    addPanel(this, this.introRoot, 34, 3.8)
    addText(this.introRoot, "BreathingIntro", "Follow the dot. Four counts on each side.", {role: "Body", distance: d, width: 33, height: 3.8})
      .getSceneObject()
      .getTransform()
      .setLocalPosition(new vec3(0, 0, 0.6))
    this.roundText = addText(this.square, "BreathingRound", "Round 1 of 4", {role: "Subheadline", distance: d, width: 16, height: 3})
    this.roundText.getSceneObject().getTransform().setLocalPosition(new vec3(0, 3, 0.2))
    this.wordText = addText(this.square, "BreathingWord", WORDS[0], {role: "Title", distance: d, width: 17, height: 4})
    this.wordText.getSceneObject().getTransform().setLocalPosition(new vec3(0, -1.2, 0.2))
    const dotImage = addImage(this.square, "BreathingDot", TEX.dot, 3.4)
    this.dot = dotImage.getSceneObject()
    const row = flexContainer(this.square, "BreathingButtons", FlexDirection.Row, 30, 6, 2.5)
    row.getTransform().setLocalPosition(new vec3(0, -SQUARE_CM / 2 - 5, 0.2))
    this.pauseButton = flexButton(row, "PauseButton", "Pause", 12, 5.5, () => this.togglePause(), d)
    flexButton(row, "FinishNowButton", "Finish now", 15, 5.5, () => this.finish(), d)
  }

  private buildReward(): void {
    this.rewardRoot = child(this.sceneObject, "BreathingReward")
    this.rewardRoot.createComponent("Component.Canvas")
    addImage(this.rewardRoot, "PebbleSticker", TEX.pebbles, 11).getSceneObject().getTransform().setLocalPosition(new vec3(0, 3, 0.2))
    const a = addImage(this.rewardRoot, "PebbleSparkleA", TEX.star, 2.4)
    a.getSceneObject().getTransform().setLocalPosition(new vec3(-8, 6, 0.3))
    const b = addImage(this.rewardRoot, "PebbleSparkleB", TEX.star, 1.8)
    b.getSceneObject().getTransform().setLocalPosition(new vec3(8, 1, 0.3))
    const messageRoot = child(this.rewardRoot, "BreathingRewardMessageRoot", new vec3(0, -5.5, 0.1))
    addPanel(this, messageRoot, 36, 4.6)
    addText(messageRoot, "BreathingRewardMessage", "Breathe normally. Take your time.", {role: "Headline", distance: TEXT_DISTANCE, width: 35, height: 4.6})
      .getSceneObject()
      .getTransform()
      .setLocalPosition(new vec3(0, 0, 0.6))
  }

  private togglePause(): void {
    if (this.phase === "running") {
      this.phase = "paused"
      this.pauseButton.label.text = "Resume"
    } else if (this.phase === "paused") {
      this.phase = "running"
      this.pauseButton.label.text = "Pause"
    }
  }

  private onUpdate(): void {
    if (this.phase !== "running") return
    this.elapsed += getDeltaTime()
    if (this.elapsed >= SIDE_SECONDS * 4 * ROUNDS) {
      this.elapsed = SIDE_SECONDS * 4 * ROUNDS
      this.finish()
      return
    }
    this.applyElapsed()
  }

  private applyElapsed(): void {
    const sideIndex = Math.floor(this.elapsed / SIDE_SECONDS)
    const side = sideIndex % 4
    const k = this.elapsed / SIDE_SECONDS - sideIndex
    const from = CORNERS[side]
    const to = CORNERS[(side + 1) % 4]
    this.placeDot(new vec2(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k))
    this.wordText.text = WORDS[side]
    this.roundText.text = "Round " + (Math.floor(sideIndex / 4) + 1) + " of " + ROUNDS
    this.introRoot.enabled = this.elapsed < SIDE_SECONDS * 2
  }

  private placeDot(p: vec2): void {
    this.dot.getTransform().setLocalPosition(new vec3(p.x, p.y, 0.5))
  }

  /** The dot comes home, the square fades, and the pebbles appear. Finishing early earns them too. */
  private finish(): void {
    if (this.phase !== "running" && this.phase !== "paused") return
    this.phase = "homing"
    const start = this.dotPosition
    tween(
      this,
      0.7,
      (k) => {
        const e = smooth(k)
        this.placeDot(new vec2(start.x + (CORNERS[0].x - start.x) * e, start.y + (CORNERS[0].y - start.y) * e))
      },
      () => {
        tween(
          this,
          0.5,
          (k) => fadeTree(this.square, 1 - k),
          () => this.showReward(),
        )
      },
    )
  }

  private showReward(): void {
    this.square.enabled = false
    this.phase = "reward"
    this.rewardRoot.enabled = true
    fadeTree(this.rewardRoot, 1)
    this.onFinished.invoke()
    const later = this.createEvent("DelayedCallbackEvent") as DelayedCallbackEvent
    later.bind(() => {
      tween(
        this,
        0.6,
        (k) => fadeTree(this.rewardRoot, 1 - k),
        () => {
          this.rewardRoot.enabled = false
          this.phase = "idle"
        },
      )
    })
    later.reset(REWARD_HOLD_SECONDS)
  }
}
