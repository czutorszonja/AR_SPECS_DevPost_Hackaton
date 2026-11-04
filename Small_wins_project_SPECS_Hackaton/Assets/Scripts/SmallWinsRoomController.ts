import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {child, smooth, tween} from "./SmallWinsUIKit"
import {QuestChoice, SmallWinsQuestUI} from "./SmallWinsQuestUI"
import {viewerPose} from "./SmallWinsViewer"

export type QuestState = "offered" | "started" | "ignoredToday" | "ignoredUntil5" | "cancelled"

const DEG = Math.PI / 180

/** Everything in the room that moves: the appliance doors, and the front door that opens when you tap it. */
@component
export class SmallWinsRoomController extends BaseScriptComponent {
  @input dishwasherHinge: SceneObject
  @input washerHinge: SceneObject
  @input entryDoorHinge: SceneObject
  @input questUI: SmallWinsQuestUI

  @input
  @hint("How far the door swings open, in degrees")
  openAngle: number = 100

  @input
  @hint("The sign shows when you look within this angle of the door")
  hintGazeDegrees: number = 35

  @input
  @hint("The card stays while you look within this angle of the door")
  cardGazeDegrees: number = 60

  questState: QuestState = "offered"
  doorIsOpen = false

  private doorCentre: vec3
  private doorAngle = 0
  private cancelDoorTween: (() => void) | null = null
  private doorTap: Interactable

  onAwake() {
    this.doorCentre = this.entryDoorHinge.getTransform().getWorldPosition().add(new vec3(0, 0, 44))
    this.buildDoorTapTarget()
    this.createEvent("OnStartEvent").bind(() => {
      this.questUI.onChoice.add((choice) => this.onQuestChoice(choice))
      this.doorTap.onTriggerEnd.add(() => this.setDoorOpen(!this.doorIsOpen))    })
    this.createEvent("UpdateEvent").bind(() => this.updateDoor())
  }

  /** A demo stand-in: you pinch the door to open it. It doesn't swing with the door, so it can close it too. */
  private buildDoorTapTarget(): void {
    const target = child(this.sceneObject, "EntryDoorTapTarget")
    target.getTransform().setWorldPosition(this.doorCentre)
    const collider = target.createComponent("Physics.ColliderComponent") as ColliderComponent
    const shape = Shape.createBoxShape()
    shape.size = new vec3(10, 208, 88)
    collider.shape = shape
    collider.fitVisual = false
    this.doorTap = target.createComponent(Interactable.getTypeName()) as Interactable
  }

  closeDishwasher(done: () => void): void {
    this.swing(this.dishwasherHinge, new vec3(85, 0, 0), vec3.zero(), done)
  }

  closeWasher(done: () => void): void {
    this.swing(this.washerHinge, new vec3(0, -105, 0), vec3.zero(), done)
  }

  private swing(hinge: SceneObject, fromDeg: vec3, toDeg: vec3, done: () => void): void {
    const t = hinge.getTransform()
    tween(
      this,
      0.7,
      (k) => {
        const e = vec3.lerp(fromDeg, toDeg, smooth(k)).uniformScale(DEG)
        t.setLocalRotation(quat.fromEulerVec(e))
      },
      done,
    )
  }

  private onQuestChoice(choice: QuestChoice): void {
    if (choice === "start") this.questState = "started"
    else if (choice === "ignoreToday") this.questState = "ignoredToday"
    else if (choice === "ignoreUntil5") this.questState = "ignoredUntil5"
    else this.questState = "cancelled"
    this.questUI.showStarted(this.questState === "started")
    if (this.questState !== "started") this.setDoorOpen(false)
  }

  private updateDoor(): void {
    const pose = viewerPose()
    const toDoor = this.doorCentre.sub(pose.position)
    const gaze = toDoor.length > 0.001 ? (Math.acos(Math.max(-1, Math.min(1, pose.forward.dot(toDoor.normalize())))) / DEG) : 0

    const offered = this.questState === "offered"
    const onCard = offered || this.questState === "started"
    this.questUI.setHintVisible(offered && !this.doorIsOpen && gaze < this.hintGazeDegrees)
    this.questUI.setCardVisible(onCard && this.doorIsOpen && gaze < this.cardGazeDegrees)
  }

  private setDoorOpen(open: boolean): void {
    this.doorIsOpen = open
    if (this.cancelDoorTween) this.cancelDoorTween()
    const from = this.doorAngle
    const to = open ? this.openAngle : 0
    const t = this.entryDoorHinge.getTransform()
    this.cancelDoorTween = tween(this, 1.1, (k) => {
      this.doorAngle = from + (to - from) * smooth(k)
      t.setLocalRotation(quat.fromEulerVec(new vec3(0, this.doorAngle * DEG, 0)))
    })
  }
}
