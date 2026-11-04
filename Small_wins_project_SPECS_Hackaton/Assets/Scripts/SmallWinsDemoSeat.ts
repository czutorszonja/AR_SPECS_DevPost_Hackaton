import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {SmallWinsDemoNavigation} from "./SmallWinsDemoNavigation"
import {addButton, child} from "./SmallWinsUIKit"
import {faceViewer, pointInFront} from "./SmallWinsViewer"

const STAND_DISTANCE = 85
const STAND_RIGHT = 12
const STAND_DROP = 17
const FOLLOW_RATE = 4

/**
 * A demo stand-in for sitting down, since the preview camera can't sit: tap the sofa or its button to
 * sit facing the kitchen, then press Stand up to walk again. On real glasses you'd just sit.
 */
@component
export class SmallWinsDemoSeat extends BaseScriptComponent {
  @input
  @hint("The preview navigation, which moves the viewer")
  navigation: SmallWinsDemoNavigation

  @input
  @hint("Where your eyes are when sitting on the sofa, in world cm")
  seatEye: vec3 = new vec3(76, -45, 645)

  @input
  @hint("Where you end up after standing, in world cm")
  standEye: vec3 = new vec3(76, 0, 430)

  @input
  @hint("Where the Sit button floats, above the sofa back, in world cm")
  signPosition: vec3 = new vec3(76, -52, 650)

  @input
  @hint("The middle of the sofa, in world cm")
  sofaCentre: vec3 = new vec3(76, -122, 650)

  @input
  @hint("Size of the area you can tap on the sofa, in cm")
  sofaSize: vec3 = new vec3(190, 76, 88)

  private sitRoot: SceneObject
  private standRoot: SceneObject
  private sofaTap: Interactable

  onAwake() {
    if (!global.deviceInfoSystem.isEditor()) return
    this.buildSofaTapTarget()

    this.sitRoot = child(this.sceneObject, "SitDownSign")
    this.sitRoot.createComponent("Component.Canvas")
    this.sitRoot.getTransform().setWorldPosition(this.signPosition)
    addButton(this.sitRoot, "SitOnSofaButton", "Sit on the sofa (demo)", 56, 14, () => this.sit(), 400)

    this.standRoot = child(this.sceneObject, "StandUpHud")
    this.standRoot.createComponent("Component.Canvas")
    addButton(this.standRoot, "StandUpButton", "Stand up (demo)", 18, 4.4, () => this.stand(), STAND_DISTANCE)

    this.createEvent("OnStartEvent").bind(() => this.sofaTap.onTriggerEnd.add(() => this.sit()))
    this.createEvent("UpdateEvent").bind(() => this.onUpdate())
    const hide = this.createEvent("DelayedCallbackEvent")
    hide.bind(() => (this.standRoot.enabled = false))
    hide.reset(0)
  }

  private buildSofaTapTarget(): void {
    const target = child(this.sceneObject, "SofaTapTarget")
    target.getTransform().setWorldPosition(this.sofaCentre)
    const collider = target.createComponent("Physics.ColliderComponent") as ColliderComponent
    const shape = Shape.createBoxShape()
    shape.size = this.sofaSize
    collider.shape = shape
    collider.fitVisual = false
    this.sofaTap = target.createComponent(Interactable.getTypeName()) as Interactable
  }

  private sit(): void {
    if (this.navigation.isSeated) return
    this.navigation.sitAt(this.seatEye)
    this.standRoot.getTransform().setWorldPosition(pointInFront(STAND_DISTANCE, STAND_RIGHT, -STAND_DROP))
  }

  private stand(): void {
    this.navigation.standAt(this.standEye)
  }

  private onUpdate(): void {
    const seated = this.navigation.isSeated
    this.sitRoot.enabled = !seated
    this.standRoot.enabled = seated
    if (seated) {
      const t = this.standRoot.getTransform()
      const next = vec3.lerp(t.getWorldPosition(), pointInFront(STAND_DISTANCE, STAND_RIGHT, -STAND_DROP), Math.min(1, getDeltaTime() * FOLLOW_RATE))
      t.setWorldPosition(next)
      t.setWorldRotation(faceViewer(next))
    } else {
      this.sitRoot.getTransform().setWorldRotation(faceViewer(this.signPosition))
    }
  }
}
