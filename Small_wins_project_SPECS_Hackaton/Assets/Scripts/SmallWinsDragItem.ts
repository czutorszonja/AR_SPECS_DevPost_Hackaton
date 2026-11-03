import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {InteractableManipulation} from "SpectaclesInteractionKit.lspkg/Components/Interaction/InteractableManipulation/InteractableManipulation"
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {smooth, tween} from "./SmallWinsUIKit"
import {viewerPose} from "./SmallWinsViewer"

/** A dish or the pile of clothes. Pinch, drag and release over the appliance: that drop stands in for "task done". */
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

  readonly onDropped = new Event<SmallWinsDragItem>()
  dropped = false

  private home: vec3
  private interactable: Interactable

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
    this.createEvent("OnStartEvent").bind(() => {
      manipulation.onManipulationEnd.add(() => this.onRelease())
    })
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

  private onRelease(): void {
    if (this.dropped) return
    const from = this.getTransform().getWorldPosition()
    if (this.isOverDropZone(from)) this.acceptDrop(from)
    else this.moveTo(from, this.home)
  }

  private acceptDrop(from: vec3): void {
    this.dropped = true
    this.interactable.enabled = false
    this.moveTo(from, this.dropZone.getTransform().getWorldPosition(), () => {
      this.sceneObject.enabled = false
      this.onDropped.invoke(this)
    })
  }

  private moveTo(from: vec3, to: vec3, done?: () => void): void {
    const transform = this.getTransform()
    tween(this, 0.3, (t) => transform.setWorldPosition(vec3.lerp(from, to, smooth(t))), done)
  }
}
