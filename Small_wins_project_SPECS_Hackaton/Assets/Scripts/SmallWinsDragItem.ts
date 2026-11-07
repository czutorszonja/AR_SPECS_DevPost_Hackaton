import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {InteractableManipulation} from "SpectaclesInteractionKit.lspkg/Components/Interaction/InteractableManipulation/InteractableManipulation"
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {smooth, tween} from "./SmallWinsUIKit"
import {viewerPose} from "./SmallWinsViewer"

/** A dish or the pile of clothes. Pinch, drag and release over the appliance: that drop stands in for "task done". */
// The pointer can drop its grab for a frame or two mid-drag (in the preview, as it slides over furniture).
// Only a let-go that lasts longer than this counts, so the item doesn't twitch back towards home.
const RELEASE_SETTLE_SECONDS = 0.15

@component
export class SmallWinsDragItem extends BaseScriptComponent {
  @input
  @hint("Where this item has to be dropped")
  dropZone: SceneObject

  @input
  @hint("How close to the drop zone counts as a drop, in cm")
  dropRadius: number = 45

  @input
  @hint("Grab volume in cm. Keep it generous: targets should be big")
  grabSize: vec3 = new vec3(22, 16, 22)

  @input
  @hint("Stay visible where it was dropped, like a mug set down on the counter, instead of going inside")
  stayAfterDrop: boolean = false

  @input
  @hint("Where it settles, relative to the drop zone, when it stays")
  dropOffset: vec3 = new vec3(0, 0, 0)

  readonly onDropped = new Event<SmallWinsDragItem>()
  dropped = false

  /** Where the item started, so a task can carry it back after use. */
  get homePosition(): vec3 {
    return this.home
  }

  /** Carries the item to its drop zone by itself, as ticking the task off the list does. */
  autoDrop(): void {
    if (this.dropped) return
    this.acceptDrop(this.getTransform().getWorldPosition(), 0.7)
  }

  private home: vec3
  private interactable: Interactable
  private visuals: {visual: RenderMeshVisual; order: number; materials: Material[]}[] = []
  private carried = false
  private releaseTimer: DelayedCallbackEvent
  private glide: {t: Transform; local: vec3; pos: vec3}[] = []

  onAwake() {
    const collider = this.sceneObject.createComponent("Physics.ColliderComponent") as ColliderComponent
    const shape = Shape.createBoxShape()
    shape.size = this.grabSize
    collider.shape = shape
    collider.fitVisual = false

    this.interactable = this.sceneObject.createComponent(Interactable.getTypeName()) as Interactable
    const manipulation = this.sceneObject.createComponent(InteractableManipulation.getTypeName()) as InteractableManipulation
    manipulation.setCanRotate(false)
    manipulation.setCanScale(false)

    this.home = this.getTransform().getWorldPosition()
    this.collectVisuals(this.sceneObject)
    this.releaseTimer = this.createEvent("DelayedCallbackEvent") as DelayedCallbackEvent
    this.releaseTimer.bind(() => {
      this.setCarried(false)
      this.onRelease()
    })
    this.createEvent("LateUpdateEvent").bind(() => this.glideAfterHand())
    this.createEvent("OnStartEvent").bind(() => {
      manipulation.onManipulationStart.add(() => {
        // A let-go followed straight away by a re-grab is one carry, not a drop and a new pick-up.
        this.releaseTimer.enabled = false
        if (!this.carried) this.setCarried(true)
      })
      manipulation.onManipulationEnd.add(() => {
        this.releaseTimer.enabled = true
        this.releaseTimer.reset(RELEASE_SETTLE_SECONDS)
      })
    })
  }

  /** Its own copies of its materials, so drawing it on top changes only this item. */
  private collectVisuals(o: SceneObject): void {
    for (const visual of o.getComponents("Component.RenderMeshVisual") as RenderMeshVisual[]) {
      const materials = visual.materials.map((m) => m.clone())
      visual.materials = materials
      this.visuals.push({visual, order: visual.getRenderOrder(), materials})
    }
    for (let i = 0; i < o.getChildrenCount(); i++) this.collectVisuals(o.getChild(i))
  }

  /**
   * While you carry it, it draws over everything, so it never vanishes into the counter or a cupboard on the way.
   * In the preview a mouse drag keeps the item at the same depth, which slides it straight through the furniture.
   */
  private setCarried(carried: boolean): void {
    this.carried = carried
    if (carried) {
      this.glide = []
      for (let i = 0; i < this.sceneObject.getChildrenCount(); i++) {
        const t = this.sceneObject.getChild(i).getTransform()
        this.glide.push({t, local: t.getLocalPosition(), pos: t.getWorldPosition()})
      }
    } else {
      this.glide.forEach((g) => g.t.setLocalPosition(g.local))
      this.glide = []
    }
    for (const entry of this.visuals) {
      entry.visual.setRenderOrder(carried ? 5000 : entry.order)
      for (const m of entry.materials) m.mainPass.depthTest = !carried
    }
  }

  /** Over the zone in space, or over it along the line of sight: mouse drags in preview keep their depth. */
  isOverDropZone(position: vec3): boolean {
    const zone = this.dropZone.getTransform().getWorldPosition()
    if (position.distance(zone) < this.dropRadius) return true
    const eye = viewerPose().position
    const ray = position.sub(eye)
    if (ray.length < 0.001) return false
    const dir = ray.normalize()
    const along = zone.sub(eye).dot(dir)
    if (along <= 0) return false
    return eye.add(dir.uniformScale(along)).distance(zone) < this.dropRadius * 0.75
  }

  /**
   * The grab point can jump a little from frame to frame (in the preview, the pointer's depth flickers as it
   * crosses furniture), so what you see eases after it rather than twitching.
   */
  private glideAfterHand(): void {
    if (!this.carried) return
    const world = this.getTransform().getWorldTransform()
    const k = Math.min(1, getDeltaTime() * 14)
    for (const g of this.glide) {
      g.pos = vec3.lerp(g.pos, world.multiplyPoint(g.local), k)
      g.t.setWorldPosition(g.pos)
    }
  }

  private onRelease(): void {
    if (this.dropped) return
    const from = this.getTransform().getWorldPosition()
    if (this.isOverDropZone(from)) this.acceptDrop(from)
    else this.moveTo(from, this.home, 0.3)
  }

  private acceptDrop(from: vec3, seconds: number = 0.3): void {
    this.dropped = true
    this.interactable.enabled = false
    const to = this.dropZone.getTransform().getWorldPosition().add(this.stayAfterDrop ? this.dropOffset : vec3.zero())
    this.moveTo(from, to, seconds, () => {
      if (!this.stayAfterDrop) this.sceneObject.enabled = false
      this.onDropped.invoke(this)
    })
  }

  private moveTo(from: vec3, to: vec3, seconds: number, done?: () => void): void {
    const transform = this.getTransform()
    // A gentle arc when it travels by itself, so it reads as being carried rather than sliding through things.
    const lift = seconds > 0.4 ? 25 : 0
    tween(this, seconds, (t) => transform.setWorldPosition(vec3.lerp(from, to, smooth(t)).add(new vec3(0, Math.sin(t * Math.PI) * lift, 0))), done)
  }
}
