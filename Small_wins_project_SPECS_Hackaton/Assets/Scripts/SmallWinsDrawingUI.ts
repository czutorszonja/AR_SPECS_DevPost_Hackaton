import {FlexDirection} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {
  addImage,
  addPanel,
  addSegment,
  addText,
  ButtonHandle,
  child,
  fadeTree,
  flexButton,
  flexContainer,
  flexPlace,
  flexText,
  makeImageMaterial,
  setImageAlpha,
  setImageColor,
  sizeImage,
  smooth,
  TEX,
  TEXT_SOFT,
  tween,
} from "./SmallWinsUIKit"
import {SPRIG_STROKES} from "./SmallWinsSprig"
import {faceViewer, pointInFront} from "./SmallWinsViewer"

const VIEW_DISTANCE = 80
const DROP_BELOW_EYES = 1
// Text is scaled well past the sheet's real distance, so it stays easy to read on the narrow display.
const TEXT_DISTANCE = 170
const PAPER_W = 34
const PAPER_H = 24
const LINE_CM = 0.45
const STROKE_SECONDS = 3
const REWARD_HOLD_SECONDS = 8
// The finale: the colour wash soaks in with a few sparkles, then the sticker and message join it.
const WASH_SECONDS = 1.6
const SPARKLE_COUNT = 7
const BUTTON_H = 5

export type DrawingPhase = "idle" | "intro" | "drawing" | "admiring" | "reward"

interface Stroke {
  name: string
  /** One or more separate lines; the pen lifts between them. */
  paths: vec2[][]
}

/** Today's drawing: a leafy sprig, built up a few simple lines at a time. */
function sprigStrokes(): Stroke[] {
  return SPRIG_STROKES.map((stroke) => ({name: stroke.name, paths: stroke.paths.map((path) => path.map((p) => new vec2(p[0], p[1])))}))
}

/**
 * Guided drawing: a pen dot traces a simple picture one line at a time for you to copy.
 * On real glasses the guide would lie on your own paper; in the demo it is a sheet in front of you.
 */
@component
export class SmallWinsDrawingUI extends BaseScriptComponent {
  /** Fires when you finish, at any line. It earns the sticker. */
  readonly onFinished = new Event<void>()
  /** Fires when you choose Not now, before starting. Nothing is earned. */
  readonly onClosed = new Event<void>()

  phase: DrawingPhase = "idle"
  strokeIndex = 0
  progress = 0

  private strokes = sprigStrokes()
  private introRoot: SceneObject
  private sheetRoot: SceneObject
  private rewardRoot: SceneObject
  private pen: SceneObject
  private wash: Image
  private sparkles: Image[] = []
  private buttonsRow: SceneObject
  private admireTime = 0
  private stepLabel: Text
  private nextButton: ButtonHandle
  /** Ink segments for each stroke, in drawing order, with how far along the stroke each one ends. */
  private ink: {so: SceneObject; at: number}[][] = []
  /** The faint guide under each stroke. It is hidden once inked, which also keeps the sheet's image count down. */
  private guides: SceneObject[][] = []

  get strokeCount(): number {
    return this.strokes.length
  }

  get inkShown(): number {
    return this.ink.reduce((sum, stroke) => sum + stroke.filter((s) => s.so.enabled).length, 0)
  }

  onAwake() {
    this.buildIntro()
    this.buildSheet()
    this.buildReward()
    this.createEvent("UpdateEvent").bind(() => this.onUpdate())
    const hide = this.createEvent("DelayedCallbackEvent")
    hide.bind(() => {
      if (this.phase === "idle") this.showOnly(null)
    })
    hide.reset(0)
  }

  begin(): void {
    const position = pointInFront(VIEW_DISTANCE, 0, -DROP_BELOW_EYES)
    this.getTransform().setWorldPosition(position)
    this.getTransform().setWorldRotation(faceViewer(position))
    this.phase = "intro"
    this.showOnly(this.introRoot)
  }

  private buildIntro(): void {
    const d = TEXT_DISTANCE
    this.introRoot = child(this.sceneObject, "DrawIntro")
    this.introRoot.createComponent("Component.Canvas")
    addPanel(this, this.introRoot, 44, 27)
    const col = flexContainer(this.introRoot, "DrawIntroColumn", FlexDirection.Column, 41, 25, 1.2)
    col.getTransform().setLocalPosition(new vec3(0, 0, 0.6))
    flexText(col, "DrawIntroTitle", "Guided drawing", {role: "Title", distance: d, width: 40, height: 5})
    flexText(col, "DrawIntroBody", "Grab a pen and some paper. Today: a leafy sprig. Follow the dot, a few lines at a time.", {role: "Body", distance: d, width: 40, height: 7, wrap: true})
    flexText(col, "DrawIntroNote", "There's no wrong way to do it.", {role: "Body", distance: d, width: 40, height: 3.4, color: TEXT_SOFT})
    const row = flexContainer(col, "DrawIntroButtons", FlexDirection.Row, 40, BUTTON_H + 1, 2.5)
    flexPlace(row, 40, BUTTON_H + 1)
    flexButton(row, "DrawStartButton", "Start", 14, BUTTON_H, () => this.start(), d)
    flexButton(row, "DrawNotNowButton", "Not now", 14, BUTTON_H, () => this.close(), d)
  }

  private buildSheet(): void {
    const d = TEXT_DISTANCE
    this.sheetRoot = child(this.sceneObject, "DrawSheet")
    this.sheetRoot.createComponent("Component.Canvas")
    // A teal frame, so the cream sheet stands out from the warm white walls behind it.
    // Plain images, drawn in the order they are made: frame, paper, colour wash, then the lines on top.
    const frame = addImage(this.sheetRoot, "DrawFrame", TEX.ink, PAPER_W + 3, PAPER_H + 3)
    frame.getSceneObject().getTransform().setLocalPosition(new vec3(0, 0, -0.3))
    setImageColor(frame, new vec4(0.13, 0.55, 0.51, 1))
    const paper = addImage(this.sheetRoot, "DrawPaper", TEX.ink, PAPER_W, PAPER_H)
    setImageColor(paper, new vec4(0.99, 0.96, 0.89, 1))
    this.wash = addImage(this.sheetRoot, "DrawWash", TEX.sprigWash, PAPER_W, PAPER_H)
    this.wash.getSceneObject().getTransform().setLocalPosition(new vec3(0, 0, 0.1))
    const guide = makeImageMaterial(TEX.ink, new vec4(0.42, 0.64, 0.61, 0.6))
    const inkMat = makeImageMaterial(TEX.ink, new vec4(0.85, 0.4, 0.23, 1))
    this.strokes.forEach((stroke, s) => {
      const segments: {so: SceneObject; at: number}[] = []
      const guides: SceneObject[] = []
      const total = this.strokeLength(stroke)
      let walked = 0
      stroke.paths.forEach((path, p) => {
        for (let i = 0; i + 1 < path.length; i++) {
          guides.push(addSegment(this.sheetRoot, "DrawGuide" + s + "_" + p + "_" + i, guide, path[i], path[i + 1], LINE_CM * 0.6, 0.2))
          walked += path[i + 1].distance(path[i])
          const so = addSegment(this.sheetRoot, "DrawInk" + s + "_" + p + "_" + i, inkMat, path[i], path[i + 1], LINE_CM, 0.3)
          so.enabled = false
          segments.push({so, at: walked / total})
        }
      })
      this.ink.push(segments)
      this.guides.push(guides)
    })
    for (let i = 0; i < SPARKLE_COUNT; i++) {
      const star = addImage(this.sheetRoot, "DrawFinaleSparkle" + i, TEX.star, 2)
      const a = (i / SPARKLE_COUNT) * Math.PI * 2 + 0.4
      star.getSceneObject().getTransform().setLocalPosition(new vec3(Math.cos(a) * (PAPER_W / 2 - 3), Math.sin(a) * (PAPER_H / 2 - 2.5), 0.6))
      this.sparkles.push(star)
    }
    this.pen = addImage(this.sheetRoot, "DrawPen", TEX.pen, 2.6).getSceneObject()

    const top = child(this.sheetRoot, "DrawStepRoot", new vec3(0, PAPER_H / 2 + 4, 0))
    addPanel(this, top, 40, 6)
    this.stepLabel = addText(top, "DrawStepLabel", "", {role: "Subheadline", distance: d, width: 38, height: 5})
    this.stepLabel.getSceneObject().getTransform().setLocalPosition(new vec3(0, 0, 0.6))

    const row = flexContainer(this.sheetRoot, "DrawButtons", FlexDirection.Row, 36, BUTTON_H + 1, 3)
    row.getTransform().setLocalPosition(new vec3(0, -PAPER_H / 2 - 4.5, 0.2))
    this.buttonsRow = row
    this.nextButton = flexButton(row, "DrawNextButton", "Next line", 15, BUTTON_H, () => this.next(), d)
    flexButton(row, "DrawFinishButton", "Finish", 15, BUTTON_H, () => this.finish(), d)
  }

  private buildReward(): void {
    this.rewardRoot = child(this.sceneObject, "DrawReward")
    this.rewardRoot.createComponent("Component.Canvas")
    // Over the sheet's top corner, with the message where the buttons were, so the drawing stays in view.
    addImage(this.rewardRoot, "DrawingSticker", TEX.drawing, 10).getSceneObject().getTransform().setLocalPosition(new vec3(PAPER_W / 2 - 1, PAPER_H / 2 - 1, 1))
    addImage(this.rewardRoot, "DrawSparkleA", TEX.star, 3).getSceneObject().getTransform().setLocalPosition(new vec3(PAPER_W / 2 - 8, PAPER_H / 2 + 2.5, 1.1))
    addImage(this.rewardRoot, "DrawSparkleB", TEX.star, 2.2).getSceneObject().getTransform().setLocalPosition(new vec3(PAPER_W / 2 + 4, PAPER_H / 2 - 7, 1.1))
    const messageRoot = child(this.rewardRoot, "DrawRewardMessageRoot", new vec3(0, -PAPER_H / 2 - 5.5, 0.1))
    addPanel(this, messageRoot, 46, 9)
    addText(messageRoot, "DrawRewardMessage", "Look what you made. Colour yours in too, if you like.", {role: "Headline", distance: TEXT_DISTANCE, width: 44, height: 8.5, wrap: true})
      .getSceneObject()
      .getTransform()
      .setLocalPosition(new vec3(0, 0, 0.6))
  }

  private strokeLength(stroke: Stroke): number {
    let length = 0
    for (const path of stroke.paths) for (let i = 0; i + 1 < path.length; i++) length += path[i + 1].distance(path[i])
    return Math.max(0.001, length)
  }

  private start(): void {
    this.phase = "drawing"
    this.showOnly(this.sheetRoot)
    for (const stroke of this.ink) for (const seg of stroke) seg.so.enabled = false
    for (const stroke of this.guides) for (const g of stroke) g.enabled = true
    this.wash.getSceneObject().enabled = false
    this.sparkles.forEach((s) => (s.getSceneObject().enabled = false))
    this.pen.enabled = true
    this.buttonsRow.enabled = true
    this.beginStroke(0)
  }

  private close(): void {
    this.phase = "idle"
    this.showOnly(null)
    this.onClosed.invoke()
  }

  private beginStroke(index: number): void {
    this.strokeIndex = index
    this.progress = 0
    const last = index === this.strokes.length - 1
    this.stepLabel.text = "Step " + (index + 1) + " of " + this.strokes.length + ": " + this.strokes[index].name
    this.nextButton.label.text = last ? "I'm done" : "Next step"
  }

  /** Moves on to the next line, finishing off the one being traced so the picture stays whole. */
  private next(): void {
    if (this.phase !== "drawing") return
    for (const seg of this.ink[this.strokeIndex]) seg.so.enabled = true
    for (const g of this.guides[this.strokeIndex]) g.enabled = false
    if (this.strokeIndex >= this.strokes.length - 1) this.finish()
    else this.beginStroke(this.strokeIndex + 1)
  }

  private onUpdate(): void {
    if (this.phase === "admiring" || this.phase === "reward") this.updateFinale()
    if (this.phase !== "drawing") return
    this.progress = Math.min(1, this.progress + getDeltaTime() / STROKE_SECONDS)
    const segments = this.ink[this.strokeIndex]
    let pen: SceneObject | null = null
    for (const seg of segments) {
      seg.so.enabled = seg.at <= this.progress + 0.0001
      if (seg.so.enabled) pen = seg.so
    }
    // The pen sits at the end of the newest line, or at the start before any is drawn.
    const tip = pen ? pen.getTransform().getLocalPosition() : this.firstPoint(this.strokeIndex)
    this.pen.getTransform().setLocalPosition(new vec3(tip.x, tip.y, 0.5))
  }

  private firstPoint(index: number): vec3 {
    const p = this.strokes[index].paths[0][0]
    return new vec3(p.x, p.y, 0.5)
  }

  /** Every line inked, the pen lifts, and the colour wash soaks in before the sticker arrives. */
  private finish(): void {
    if (this.phase !== "drawing") return
    for (const stroke of this.ink) for (const seg of stroke) seg.so.enabled = true
    for (const stroke of this.guides) for (const g of stroke) g.enabled = false
    this.pen.enabled = false
    this.buttonsRow.enabled = false
    this.wash.getSceneObject().enabled = true
    setImageAlpha(this.wash, 0)
    this.sparkles.forEach((s) => (s.getSceneObject().enabled = true))
    this.stepLabel.text = "Look what you made!"
    this.phase = "admiring"
    this.admireTime = 0
    this.onFinished.invoke()
  }

  private updateFinale(): void {
    this.admireTime += getDeltaTime()
    const t = this.admireTime
    if (this.phase === "admiring") setImageAlpha(this.wash, smooth(t / WASH_SECONDS))
    this.sparkles.forEach((star, i) => {
      const twinkle = 0.5 + 0.5 * Math.sin(t * 5 + i * 1.9)
      const grow = smooth((t - i * 0.12) / 0.4)
      const size = 2.4 * grow * (0.7 + 0.5 * twinkle)
      sizeImage(star, size, size)
      if (this.phase === "admiring") setImageAlpha(star, grow * (0.5 + 0.5 * twinkle))
    })
    if (this.phase === "admiring" && t >= WASH_SECONDS + 0.4) this.showReward()
  }

  private showReward(): void {
    this.phase = "reward"
    this.rewardRoot.enabled = true
    fadeTree(this.rewardRoot, 1)
    const later = this.createEvent("DelayedCallbackEvent") as DelayedCallbackEvent
    later.bind(() => {
      tween(
        this,
        0.6,
        (k) => {
          fadeTree(this.rewardRoot, 1 - k)
          fadeTree(this.sheetRoot, 1 - k)
        },
        () => {
          this.showOnly(null)
          fadeTree(this.sheetRoot, 1)
          this.phase = "idle"
        },
      )
    })
    later.reset(REWARD_HOLD_SECONDS)
  }

  private showOnly(root: SceneObject | null): void {
    for (const r of [this.introRoot, this.sheetRoot, this.rewardRoot]) r.enabled = r === root
  }
}
