import {addImage, smooth, TEX, tween} from "./SmallWinsUIKit"
import {QuestChoice, SmallWinsQuestUI} from "./SmallWinsQuestUI"
import {viewerPose} from "./SmallWinsViewer"

export type QuestState = "offered" | "started" | "ignoredToday" | "ignoredUntil5" | "cancelled"

const DEG = Math.PI / 180

/** Everything in the room that moves: the appliance doors, and the front door that opens as you approach. */
@component
export class SmallWinsRoomController extends BaseScriptComponent {
  @input dishwasherHinge: SceneObject
  @input washerHinge: SceneObject
  @input entryDoorHinge: SceneObject
  @input
  @hint("The simple backdrop seen through the door")
  doorView: SceneObject
  @input questUI: SmallWinsQuestUI

  @input
  @hint("Walking closer than this opens the door, in cm")
  openDistance: number = 150

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

  onAwake() {
    addImage(this.doorView, "OutsideView", TEX.outside, 200, 233)
    this.doorCentre = this.entryDoorHinge.getTransform().getWorldPosition().add(new vec3(0, 0, 44))
    this.createEvent("OnStartEvent").bind(() => {
      this.questUI.onChoice.add((choice) => this.onQuestChoice(choice))
    })
    this.createEvent("UpdateEvent").bind(() => this.updateDoor())
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
  }

  private updateDoor(): void {
    const pose = viewerPose()
    const toDoor = this.doorCentre.sub(pose.position)
    const flat = new vec3(toDoor.x, 0, toDoor.z)
    const distance = flat.length
    const gaze = toDoor.length > 0.001 ? (Math.acos(Math.max(-1, Math.min(1, pose.forward.dot(toDoor.normalize())))) / DEG) : 0

    const near = distance < this.openDistance
    if (near !== this.doorIsOpen) this.setDoorOpen(near)

    const offered = this.questState === "offered"
    const onCard = offered || this.questState === "started"
    this.questUI.setHintVisible(offered && !near && gaze < this.hintGazeDegrees)
    this.questUI.setCardVisible(onCard && near && gaze < this.cardGazeDegrees)
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
