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
  setImageColor,
  TEX,
  TEXT_SOFT,
  tween,
} from "./SmallWinsUIKit"
import {faceViewer, pointInFront} from "./SmallWinsViewer"

const VIEW_DISTANCE = 80
const DROP_BELOW_EYES = 1
// Text is scaled well past the sheet's real distance, so it stays easy to read on the narrow display.
const TEXT_DISTANCE = 170
const PAPER_W = 34
const PAPER_H = 24
const LINE_CM = 0.45
const STROKE_SECONDS = 3
const REWARD_HOLD_SECONDS = 7
const BUTTON_H = 5

export type DrawingPhase = "idle" | "intro" | "drawing" | "reward"

interface Stroke {
  name: string
  /** One or more separate lines; the pen lifts between them. */
  paths: vec2[][]
}

/** Points along a curve from a to b, bending towards c. */
function curve(a: vec2, c: vec2, b: vec2, steps: number): vec2[] {
  const points: vec2[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const u = 1 - t
    points.push(new vec2(u * u * a.x + 2 * u * t * c.x + t * t * b.x, u * u * a.y + 2 * u * t * c.y + t * t * b.y))
  }
  return points
}

/** Today's drawing: a leaf, built up one simple line at a time. */
function leafStrokes(): Stroke[] {
  const base = new vec2(0, -7)
  const tip = new vec2(0, 9.5)
  const veins: vec2[][] = []
  for (const y of [-3.5, 0.5, 4.5]) {
    veins.push([new vec2(0, y), new vec2(-4.2 + Math.abs(y) * 0.15, y + 3)])
    veins.push([new vec2(0, y), new vec2(4.2 - Math.abs(y) * 0.15, y + 3)])
  }
  return [
    {name: "the stem", paths: [curve(new vec2(0.4, -10.5), new vec2(-0.6, 0), new vec2(0, 8.5), 16)]},
    {name: "the left edge", paths: [curve(base, new vec2(-11, 0.5), tip, 20)]},
    {name: "the right edge", paths: [curve(base, new vec2(11, 0.5), tip, 20)]},
    {name: "the veins", paths: veins},
  ]
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

  private strokes = leafStrokes()
  private introRoot: SceneObject
  private sheetRoot: SceneObject
  private rewardRoot: SceneObject
  private pen: SceneObject
  private stepLabel: Text
  private nextButton: ButtonHandle
  /** Ink segments for each stroke, in drawing order, with how far along the stroke each one ends. */
  private ink: {so: SceneObject; at: number}[][] = []

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
    flexText(col, "DrawIntroBody", "Grab a pen and some paper. Today: a leaf. Follow the dot, one line at a time.", {role: "Body", distance: d, width: 40, height: 7, wrap: true})
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
    const paper = addImage(this.sheetRoot, "DrawPaper", TEX.ink, PAPER_W, PAPER_H)
    setImageColor(paper, new vec4(0.99, 0.96, 0.89, 1))
    const guide = makeImageMaterial(TEX.ink, new vec4(0.55, 0.75, 0.72, 0.55))
    const inkMat = makeImageMaterial(TEX.ink, new vec4(0.85, 0.4, 0.23, 1))
    this.strokes.forEach((stroke, s) => {
      const segments: {so: SceneObject; at: number}[] = []
      const total = this.strokeLength(stroke)
      let walked = 0
      stroke.paths.forEach((path, p) => {
        for (let i = 0; i + 1 < path.length; i++) {
          addSegment(this.sheetRoot, "DrawGuide" + s + "_" + p + "_" + i, guide, path[i], path[i + 1], LINE_CM * 0.6, 0.2)
          walked += path[i + 1].distance(path[i])
          const so = addSegment(this.sheetRoot, "DrawInk" + s + "_" + p + "_" + i, inkMat, path[i], path[i + 1], LINE_CM, 0.3)
          so.enabled = false
          segments.push({so, at: walked / total})
        }
      })
      this.ink.push(segments)
    })
    this.pen = addImage(this.sheetRoot, "DrawPen", TEX.dot, 2.2).getSceneObject()

    const top = child(this.sheetRoot, "DrawStepRoot", new vec3(0, PAPER_H / 2 + 4, 0))
    addPanel(this, top, 40, 6)
    this.stepLabel = addText(top, "DrawStepLabel", "", {role: "Subheadline", distance: d, width: 38, height: 5})
    this.stepLabel.getSceneObject().getTransform().setLocalPosition(new vec3(0, 0, 0.6))

    const row = flexContainer(this.sheetRoot, "DrawButtons", FlexDirection.Row, 36, BUTTON_H + 1, 3)
    row.getTransform().setLocalPosition(new vec3(0, -PAPER_H / 2 - 4.5, 0.2))
    this.nextButton = flexButton(row, "DrawNextButton", "Next line", 15, BUTTON_H, () => this.next(), d)
    flexButton(row, "DrawFinishButton", "Finish", 15, BUTTON_H, () => this.finish(), d)
  }

  private buildReward(): void {
    this.rewardRoot = child(this.sceneObject, "DrawReward")
    this.rewardRoot.createComponent("Component.Canvas")
    addImage(this.rewardRoot, "DrawingSticker", TEX.drawing, 12).getSceneObject().getTransform().setLocalPosition(new vec3(0, 4, 0.2))
    addImage(this.rewardRoot, "DrawSparkleA", TEX.star, 3).getSceneObject().getTransform().setLocalPosition(new vec3(-9, 8, 0.3))
    addImage(this.rewardRoot, "DrawSparkleB", TEX.star, 2.2).getSceneObject().getTransform().setLocalPosition(new vec3(9, 2, 0.3))
    const messageRoot = child(this.rewardRoot, "DrawRewardMessageRoot", new vec3(0, -6.5, 0.1))
    addPanel(this, messageRoot, 46, 9)
    addText(messageRoot, "DrawRewardMessage", "Lovely. Colour it in if you like, or keep it as it is.", {role: "Headline", distance: TEXT_DISTANCE, width: 44, height: 8.5, wrap: true})
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
    this.stepLabel.text = "Line " + (index + 1) + " of " + this.strokes.length + ": " + this.strokes[index].name
    this.nextButton.label.text = last ? "I'm done" : "Next line"
  }

  /** Moves on to the next line, finishing off the one being traced so the picture stays whole. */
  private next(): void {
    if (this.phase !== "drawing") return
    for (const seg of this.ink[this.strokeIndex]) seg.so.enabled = true
    if (this.strokeIndex >= this.strokes.length - 1) this.finish()
    else this.beginStroke(this.strokeIndex + 1)
  }

  private onUpdate(): void {
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

  private finish(): void {
    if (this.phase !== "drawing") return
    this.phase = "reward"
    this.showOnly(this.rewardRoot)
    fadeTree(this.rewardRoot, 1)
    this.onFinished.invoke()
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
    for (const r of [this.introRoot, this.sheetRoot, this.rewardRoot]) r.enabled = r === root
  }
}
