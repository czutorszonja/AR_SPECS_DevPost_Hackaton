import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {SmallWinsDragItem} from "./SmallWinsDragItem"
import {SmallWinsState, TASK_CAT, TASK_PHONE, TASK_PLANTS, TASK_TABLE} from "./SmallWinsState"
import {addImage, addPanel, addText, child, clamp01, floatGently, setImageAlpha, sizeImage, smooth, TEX, tintPanel, tween} from "./SmallWinsUIKit"
import {faceViewer} from "./SmallWinsViewer"

const POUR_SECONDS = 1.4
const DROPLETS = 7
const PHONE_MESSAGE = "Sent to Anna: Thinking of you! Coffee soon?"

/**
 * The extra jobs around the flat, each with its own sticker: water the plants, feed the cat, clear the table,
 * text a friend. Each can be done by hand in the room, or ticked off the list, which plays it out by itself.
 */
@component
export class SmallWinsHomeTasks extends BaseScriptComponent {
  @ui.group_start("Water the plants")
  @input wateringCan: SmallWinsDragItem
  @input plant: SceneObject
  @input plantAnchor: SceneObject
  @ui.group_end

  @ui.group_start("Feed the cat")
  @input catFood: SmallWinsDragItem
  @input cat: SceneObject
  @input bowlEmpty: SceneObject
  @input bowlFull: SceneObject
  @input catAnchor: SceneObject
  @ui.group_end

  @ui.group_start("Clear the table")
  @input tableItems: SmallWinsDragItem[]
  @input tableAnchor: SceneObject
  @ui.group_end

  @ui.group_start("Text a friend")
  @input phone: SceneObject
  @input phoneAnchor: SceneObject
  @ui.group_end

  /** Fires when a job is finished by hand in the room. Ticking it off the list calls back instead. */
  readonly onDone = new Event<string>()

  private hints: Record<string, SceneObject> = {}
  private finished: Record<string, boolean> = {}
  private callbacks: Record<string, () => void> = {}
  private tablePlaced = 0
  private droplets: Image[] = []
  private dropRoot: SceneObject
  private heart: Image
  private phoneCard: SceneObject
  private phoneGlow: Image
  private phoneGlowRoot: SceneObject

  anchorFor(id: string): SceneObject | null {
    if (id === TASK_PLANTS) return this.plantAnchor
    if (id === TASK_CAT) return this.catAnchor
    if (id === TASK_TABLE) return this.tableAnchor
    if (id === TASK_PHONE) return this.phoneAnchor
    return null
  }

  isFinished(id: string): boolean {
    return !!this.finished[id]
  }

  onAwake() {
    for (const id of [TASK_PLANTS, TASK_CAT, TASK_TABLE, TASK_PHONE]) this.hints[id] = this.addHint(this.anchorFor(id), id)
    floatGently(this, Object.keys(this.hints).map((id) => this.hints[id]), () => SmallWinsState.instance.reducedMotion)
    this.buildEffects()
    this.createEvent("OnStartEvent").bind(() => {
      SmallWinsState.instance.onChanged.add(() => this.updateHints())
      this.updateHints()
      this.wateringCan.onDropped.add(() => this.water())
      this.catFood.onDropped.add(() => this.feed())
      this.tableItems.forEach((item) => item.onDropped.add(() => this.placeOnCounter()))
      const tap = this.phone.createComponent(Interactable.getTypeName()) as Interactable
      tap.onTriggerEnd.add(() => this.text())
    })
    const collider = this.phone.createComponent("Physics.ColliderComponent") as ColliderComponent
    const shape = Shape.createBoxShape()
    shape.size = new vec3(18, 8, 24)
    collider.shape = shape
    collider.fitVisual = false
  }

  /** Plays the job out by itself, then calls back so the sticker can follow. */
  perform(id: string, done: () => void): void {
    if (this.finished[id]) {
      done()
      return
    }
    this.callbacks[id] = done
    if (id === TASK_PLANTS) this.wateringCan.autoDrop()
    else if (id === TASK_CAT) this.catFood.autoDrop()
    else if (id === TASK_TABLE) this.tableItems.forEach((item, i) => this.later(i * 0.35, () => item.autoDrop()))
    else if (id === TASK_PHONE) this.text()
  }

  /** The same sticker outline and star as the chores, shown while the job is on today's list. */
  private addHint(anchor: SceneObject, id: string): SceneObject {
    const root = child(anchor, "TaskHint_" + id, new vec3(0, -14, 0))
    root.createComponent("Component.Canvas")
    addImage(root, "TaskHintOutline_" + id, TEX.outline, 24)
    addImage(root, "TaskHintStar_" + id, TEX.star, 12).getSceneObject().getTransform().setLocalPosition(new vec3(0, 0, 0.2))
    return root
  }

  private updateHints(): void {
    for (const id of Object.keys(this.hints)) {
      const task = SmallWinsState.instance.getTask(id)
      this.hints[id].enabled = !!task && !task.done && !this.finished[id]
    }
  }

  private buildEffects(): void {
    this.dropRoot = child(this.sceneObject, "WaterDrops")
    this.dropRoot.createComponent("Component.Canvas")
    for (let i = 0; i < DROPLETS; i++) this.droplets.push(addImage(this.dropRoot, "WaterDrop" + i, TEX.droplet, 2.2))
    this.dropRoot.enabled = false

    const heartRoot = child(this.cat, "CatHeartRoot", new vec3(0, 40, 0))
    heartRoot.createComponent("Component.Canvas")
    this.heart = addImage(heartRoot, "CatHeart", TEX.heart, 7)
    this.heart.getSceneObject().enabled = false

    // A lit screen lying on the phone's face.
    const glow = child(this.phone, "PhoneGlowRoot", new vec3(0, 1.8, 0))
    glow.getTransform().setLocalRotation(quat.fromEulerVec(new vec3(-Math.PI / 2, 0, 0)))
    glow.createComponent("Component.Canvas")
    this.phoneGlow = addImage(glow, "PhoneGlow", TEX.ink, 6.5, 13)
    this.phoneGlow.mainPass.baseColor = new vec4(0.75, 0.97, 0.93, 0)
    glow.enabled = false
    this.phoneGlowRoot = glow

    this.phoneCard = child(this.sceneObject, "PhoneMessage")
    this.phoneCard.createComponent("Component.Canvas")
    addPanel(this, this.phoneCard, 46, 13)
    addText(this.phoneCard, "PhoneMessageText", PHONE_MESSAGE, {role: "Headline", distance: 250, width: 43, height: 11, wrap: true})
      .getSceneObject()
      .getTransform()
      .setLocalPosition(new vec3(0, 0, 0.6))
    this.phoneCard.enabled = false
  }

  /** The can tips over the plant, water falls, and the plant gives a happy little sway. */
  private water(): void {
    const can = this.wateringCan.getTransform()
    const upright = can.getWorldRotation()
    const spout = (): vec3 => can.getWorldPosition().add(can.getWorldRotation().multiplyVec3(new vec3(-15, 14, 0)))
    const soil = this.plant.getTransform().getWorldPosition().add(new vec3(0, 32, 0))
    this.dropRoot.enabled = true
    tween(
      this,
      POUR_SECONDS,
      (t) => {
        const tilt = Math.sin(clamp01(t * 1.3) * Math.PI * 0.5) * (t < 0.8 ? 1 : 1 - (t - 0.8) / 0.2)
        can.setWorldRotation(upright.multiply(quat.angleAxis(tilt * 0.75, vec3.forward())))
        const from = spout()
        this.droplets.forEach((drop, i) => {
          const k = (t * 3 + i / DROPLETS) % 1
          const p = vec3.lerp(from, new vec3(soil.x + (i - 3) * 1.2, soil.y, soil.z), k).add(new vec3(0, -Math.sin(k * Math.PI) * 2, 0))
          drop.getSceneObject().getTransform().setWorldPosition(p)
          drop.getSceneObject().getTransform().setWorldRotation(faceViewer(p))
          setImageAlpha(drop, tilt > 0.3 ? 1 - k * 0.6 : 0)
        })
      },
      () => {
        this.dropRoot.enabled = false
        this.sway(this.plant, () => this.finish(TASK_PLANTS))
      },
    )
  }

  /** The food tips into the bowl, the bowl fills, the bag goes back, and the cat is very pleased. */
  private feed(): void {
    const bag = this.catFood.getTransform()
    const upright = bag.getWorldRotation()
    tween(
      this,
      POUR_SECONDS,
      (t) => {
        const tilt = Math.sin(clamp01(t * 1.4) * Math.PI * 0.5) * (t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25)
        bag.setWorldRotation(upright.multiply(quat.angleAxis(tilt * 1.6, vec3.forward())))
        if (t > 0.45 && this.bowlEmpty.enabled) this.fillBowl()
      },
      () => {
        const from = bag.getWorldPosition()
        const home = this.catFood.homePosition
        tween(this, 0.6, (t) => bag.setWorldPosition(vec3.lerp(from, home, smooth(t)).add(new vec3(0, Math.sin(t * Math.PI) * 15, 0))))
        this.happyCat(() => this.finish(TASK_CAT))
      },
    )
  }

  private fillBowl(): void {
    this.bowlEmpty.enabled = false
    this.bowlFull.enabled = true
    const t = this.bowlFull.getTransform()
    tween(this, 0.35, (k) => t.setLocalScale(vec3.one().uniformScale(0.8 + 0.2 * smooth(k))))
  }

  private happyCat(done: () => void): void {
    const t = this.cat.getTransform()
    const base = t.getLocalScale()
    const heart = this.heart.getSceneObject()
    heart.enabled = true
    tween(
      this,
      1.4,
      (k) => {
        const bounce = Math.sin(k * Math.PI * 3) * (1 - k) * 0.06
        t.setLocalScale(new vec3(base.x * (1 - bounce * 0.5), base.y * (1 + bounce), base.z * (1 - bounce * 0.5)))
        heart.getTransform().setLocalPosition(new vec3(0, k * 12, 0.2))
        heart.getTransform().setWorldRotation(faceViewer(heart.getTransform().getWorldPosition()))
        sizeImage(this.heart, 4 + 4 * smooth(k * 3), 4 + 4 * smooth(k * 3))
        setImageAlpha(this.heart, k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3)
      },
      () => {
        heart.enabled = false
        t.setLocalScale(base)
        done()
      },
    )
  }

  /** Each dish set down on the counter; the last one finishes the job. */
  private placeOnCounter(): void {
    this.tablePlaced++
    if (this.tablePlaced >= this.tableItems.length) this.later(0.3, () => this.finish(TASK_TABLE))
  }

  /** The screen lights up and the message you sent shows above it. */
  private text(): void {
    if (this.finished[TASK_PHONE] || this.phoneCard.enabled) return
    const glow = this.phoneGlowRoot
    glow.enabled = true
    const card = this.phoneCard.getTransform()
    const at = this.phone.getTransform().getWorldPosition().add(new vec3(0, 30, 0))
    card.setWorldPosition(at)
    card.setWorldRotation(faceViewer(at))
    this.phoneCard.enabled = true
    // The panel only builds its surface once shown, so it takes its teal then.
    for (const t of [0, 0.1, 0.3]) this.later(t, () => tintPanel(this.phoneCard))
    tween(
      this,
      1.2,
      (k) => {
        this.phoneGlow.mainPass.baseColor = new vec4(0.75, 0.97, 0.93, 0.9 * smooth(k * 3))
        card.setWorldPosition(at.add(new vec3(0, 4 * smooth(k), 0)))
      },
      () => this.finish(TASK_PHONE),
    )
    this.later(7, () => {
      this.phoneCard.enabled = false
      glow.enabled = false
    })
  }

  private sway(target: SceneObject, done: () => void): void {
    const t = target.getTransform()
    const base = t.getLocalRotation()
    tween(
      this,
      1.0,
      (k) => t.setLocalRotation(base.multiply(quat.angleAxis(Math.sin(k * Math.PI * 4) * (1 - k) * 0.07, vec3.forward()))),
      () => {
        t.setLocalRotation(base)
        done()
      },
    )
  }

  private finish(id: string): void {
    if (this.finished[id]) return
    this.finished[id] = true
    this.updateHints()
    const callback = this.callbacks[id]
    delete this.callbacks[id]
    if (callback) callback()
    else this.onDone.invoke(id)
  }

  private later(seconds: number, action: () => void): void {
    const event = this.createEvent("DelayedCallbackEvent") as DelayedCallbackEvent
    event.bind(action)
    event.reset(seconds)
  }
}
