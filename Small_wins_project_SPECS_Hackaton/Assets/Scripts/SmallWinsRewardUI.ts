import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {SmallWinsState, StickerArt} from "./SmallWinsState"
import {addImage, addPanel, addText, child, clamp01, fadeTree, setImageAlpha, setImageTexture, sizeImage, smooth, stickerTexture, TEX} from "./SmallWinsUIKit"

const PLATE_CM = 10
const SLOT_CM = 5
const SLOT_STEP = 6
const MESSAGE_Y = -8.5
const STRIP_Y = -15.5
const MAX_SLOTS = 5
const VIEW_DISTANCE = 140

// Seconds from the start of a normal reward.
const POP_END = 1.0
const MESSAGE_IN = 0.4
const READ_END = 3.6
const SHRINK_END = 4.2
const HOLD_END = SHRINK_END + 2.0
const FADE_END = HOLD_END + 0.5

// Reduced motion: the message appears gently, the sticker fades into place, the 2 second hold stays.
const CALM_MESSAGE_END = 1.0
const CALM_FADE_IN_END = 1.8
const CALM_READ_END = 2.6
const CALM_HOLD_END = CALM_READ_END + 2.0
const CALM_FADE_END = CALM_HOLD_END + 0.5

interface RewardRequest {
  anchor: SceneObject
  art: StickerArt
  message: string
}

/** The pop, stars, personal line and sticker strip, anchored to the wall beside the appliance. */
@component
export class SmallWinsRewardUI extends BaseScriptComponent {
  readonly onRewardFinished = new Event<SceneObject>()

  private queue: RewardRequest[] = []
  private active: RewardRequest | null = null
  private elapsed = 0
  private calm = false

  private plate: Image
  private ring: Image
  private stars: Image[] = []
  private messageRoot: SceneObject
  private messageText: Text
  private stripRoot: SceneObject
  private slots: Image[] = []
  private slotCount = 0
  private landingSlot = 0

  get isPlaying(): boolean {
    return this.active !== null || this.queue.length > 0
  }

  onAwake() {
    this.sceneObject.createComponent("Component.Canvas")
    this.buildVisuals()
    this.createEvent("UpdateEvent").bind(() => this.onUpdate())
    const hide = this.createEvent("DelayedCallbackEvent")
    hide.bind(() => this.setVisible(false))
    hide.reset(0)
  }

  play(anchor: SceneObject, art: StickerArt, message: string): void {
    this.queue.push({anchor, art, message})
    if (!this.active) this.startNext()
  }

  private buildVisuals(): void {
    this.stripRoot = child(this.sceneObject, "RewardStrip", new vec3(0, STRIP_Y, 0))
    addPanel(this, this.stripRoot, SLOT_STEP * 2 + 1, 6.5)
    for (let i = 0; i < MAX_SLOTS; i++) {
      this.slots.push(addImage(this.stripRoot, "StripSlot" + i, TEX.outline, SLOT_CM))
      this.slots[i].getSceneObject().getTransform().setLocalPosition(new vec3(0, 0, 0.7))
    }

    this.messageRoot = child(this.sceneObject, "RewardMessageRoot", new vec3(0, MESSAGE_Y, 0.2))
    addPanel(this, this.messageRoot, 32, 4.4)
    this.messageText = addText(this.messageRoot, "RewardMessage", "", {
      role: "Headline",
      distance: VIEW_DISTANCE,
      width: 32,
      height: 4.4,
    })
    this.messageText.getSceneObject().getTransform().setLocalPosition(new vec3(0, 0, 0.7))

    this.ring = addImage(this.sceneObject, "RewardRing", TEX.ring, PLATE_CM)
    this.ring.getSceneObject().getTransform().setLocalPosition(new vec3(0, 0, 0.8))
    for (let i = 0; i < 6; i++) {
      const star = addImage(this.sceneObject, "RewardStar" + i, TEX.star, 2.4)
      star.getSceneObject().getTransform().setLocalPosition(new vec3(0, 0, 0.9))
      this.stars.push(star)
    }
    this.plate = addImage(this.sceneObject, "RewardPlate", TEX.plate, PLATE_CM)
    this.plate.getSceneObject().getTransform().setLocalPosition(new vec3(0, 0, 1))
  }

  private startNext(): void {
    this.active = this.queue.shift() ?? null
    if (!this.active) {
      this.setVisible(false)
      return
    }
    this.elapsed = 0
    this.calm = SmallWinsState.instance.reducedMotion
    this.getTransform().setWorldPosition(this.active.anchor.getTransform().getWorldPosition())
    this.getTransform().setWorldRotation(this.active.anchor.getTransform().getWorldRotation())
    this.setVisible(true)
    setImageTexture(this.plate, stickerTexture(this.active.art))
    this.messageText.text = this.active.message
    this.layoutStrip()
    fadeTree(this.messageRoot, 0)
    fadeTree(this.stripRoot, 0)
    this.showLanded(false)
    this.applyPlate(0, 0, 0)
    setImageAlpha(this.ring, 0)
    this.stars.forEach((s) => setImageAlpha(s, 0))
  }

  /** Earlier stickers show their art. The newest slot stays an outline until the sticker lands in it. */
  private layoutStrip(): void {
    const stickers = SmallWinsState.instance.stickers.slice(-MAX_SLOTS)
    this.slotCount = Math.max(1, stickers.length)
    this.landingSlot = this.slotCount - 1
    const left = (-(this.slotCount - 1) * SLOT_STEP) / 2
    for (let i = 0; i < MAX_SLOTS; i++) {
      const shown = i < this.slotCount
      const so = this.slots[i].getSceneObject()
      so.enabled = shown
      if (!shown) continue
      so.getTransform().setLocalPosition(new vec3(left + i * SLOT_STEP, 0, 0.7))
      setImageTexture(this.slots[i], i === this.landingSlot || !stickers[i] ? TEX.outline : stickerTexture(stickers[i].art))
    }
    const plate = this.stripRoot.getComponent("ScriptComponent") as unknown as {size: vec2}
    plate.size = new vec2(this.slotCount * SLOT_STEP + 1, 6.5)
  }

  private slotPosition(): vec3 {
    const x = ((-(this.slotCount - 1)) * SLOT_STEP) / 2 + this.landingSlot * SLOT_STEP
    return new vec3(x, STRIP_Y, 1)
  }

  private applyPlate(x: number, y: number, size: number): void {
    const so = this.plate.getSceneObject()
    so.getTransform().setLocalPosition(new vec3(x, y, 1))
    sizeImage(this.plate, size, size)
    so.enabled = size > 0.01
  }

  private showLanded(landed: boolean): void {
    if (!this.active) return
    setImageTexture(this.slots[this.landingSlot], landed ? stickerTexture(this.active.art) : TEX.outline)
  }

  private onUpdate(): void {
    if (!this.active) return
    this.elapsed += getDeltaTime()
    const finished = this.calm ? this.updateCalm(this.elapsed) : this.updateFull(this.elapsed)
    if (finished) {
      const anchor = this.active.anchor
      this.active = null
      this.startNext()
      this.onRewardFinished.invoke(anchor)
    }
  }

  private updateFull(t: number): boolean {
    if (t < POP_END) {
      this.applyPlate(0, 0, PLATE_CM * popScale(t))
      this.updateSparkle(t)
    } else if (t < READ_END) {
      this.applyPlate(0, 0, PLATE_CM)
      setImageAlpha(this.ring, 0)
      this.stars.forEach((s) => setImageAlpha(s, 0))
    }
    if (t >= POP_END && t < READ_END) {
      const a = smooth((t - POP_END) / MESSAGE_IN)
      fadeTree(this.messageRoot, a)
      fadeTree(this.stripRoot, a)
    }
    if (t >= READ_END && t < SHRINK_END) {
      const k = smooth((t - READ_END) / (SHRINK_END - READ_END))
      const target = this.slotPosition()
      this.applyPlate(target.x * k, target.y * k, PLATE_CM + (SLOT_CM - PLATE_CM) * k)
    } else if (t >= SHRINK_END && t < HOLD_END) {
      this.applyPlate(0, 0, 0)
      this.showLanded(true)
    }
    if (t >= HOLD_END) {
      this.applyPlate(0, 0, 0)
      this.showLanded(true)
      const a = 1 - clamp01((t - HOLD_END) / (FADE_END - HOLD_END))
      fadeTree(this.messageRoot, a)
      fadeTree(this.stripRoot, a)
    }
    return t >= FADE_END
  }

  private updateCalm(t: number): boolean {
    fadeTree(this.messageRoot, smooth(t / CALM_MESSAGE_END))
    fadeTree(this.stripRoot, smooth(t / CALM_MESSAGE_END))
    if (t >= CALM_MESSAGE_END && t < CALM_FADE_IN_END) {
      const target = this.slotPosition()
      this.applyPlate(target.x, target.y, SLOT_CM)
      setImageAlpha(this.plate, smooth((t - CALM_MESSAGE_END) / (CALM_FADE_IN_END - CALM_MESSAGE_END)))
    } else if (t >= CALM_FADE_IN_END) {
      setImageAlpha(this.plate, 1)
      this.applyPlate(0, 0, 0)
      this.showLanded(true)
    }
    if (t >= CALM_HOLD_END) {
      const a = 1 - clamp01((t - CALM_HOLD_END) / (CALM_FADE_END - CALM_HOLD_END))
      fadeTree(this.messageRoot, a)
      fadeTree(this.stripRoot, a)
    }
    return t >= CALM_FADE_END
  }

  /** Gold ring and six small stars, all staying within a handspan (20 cm) of the sticker. */
  private updateSparkle(t: number): void {
    const k = t / POP_END
    sizeImage(this.ring, PLATE_CM * (0.7 + k * 0.9), PLATE_CM * (0.7 + k * 0.9))
    setImageAlpha(this.ring, Math.sin(k * Math.PI))
    this.stars.forEach((star, i) => {
      const angle = (i / this.stars.length) * Math.PI * 2 + 0.4
      const radius = 6 + k * (8 + (i % 2) * 3)
      star.getSceneObject().getTransform().setLocalPosition(new vec3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.9))
      setImageAlpha(star, Math.sin(k * Math.PI))
    })
  }

  private setVisible(visible: boolean): void {
    for (let i = 0; i < this.sceneObject.getChildrenCount(); i++) this.sceneObject.getChild(i).enabled = visible
  }
}

/** One soft bounce: up past full size, a small dip, then settle. */
function popScale(t: number): number {
  if (t < 0.25) return 1.16 * smooth(t / 0.25)
  if (t < 0.45) return 1.16 + (0.96 - 1.16) * smooth((t - 0.25) / 0.2)
  if (t < 0.65) return 0.96 + 0.04 * smooth((t - 0.45) / 0.2)
  return 1
}
