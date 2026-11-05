import {SmallWinsBreathingUI} from "./SmallWinsBreathingUI"
import {SmallWinsDragItem} from "./SmallWinsDragItem"
import {SmallWinsDrawingUI} from "./SmallWinsDrawingUI"
import {SmallWinsEyeMovementUI} from "./SmallWinsEyeMovementUI"
import {SmallWinsInviteUI} from "./SmallWinsInviteUI"
import {SmallWinsNotebookUI, Therapy} from "./SmallWinsNotebookUI"
import {SmallWinsRewardUI} from "./SmallWinsRewardUI"
import {SmallWinsRoomController} from "./SmallWinsRoomController"
import {SmallWinsState, StickerArt, TASK_DISHES, TASK_LAUNDRY, TASK_MINDFUL} from "./SmallWinsState"
import {addImage, TEX} from "./SmallWinsUIKit"

/** Orchestrates the day: two chores, the me-time invitation, the breathing. */
@component
export class SmallWinsMain extends BaseScriptComponent {
  @ui.label("Small Wins")
  @ui.separator
  @ui.group_start("Personal")
  @input
  @hint("Used in the laundry reward message")
  userName: string = "Szonja"

  @input
  @hint("The line that pops up after the dishes")
  dishesMessage: string = "A clear sink for tomorrow."
  @ui.group_end

  @ui.group_start("Chores")
  @input dishPlate: SmallWinsDragItem
  @input dishBowl: SmallWinsDragItem
  @input dishMug: SmallWinsDragItem
  @input clothesPile: SmallWinsDragItem
  @input
  @hint("Sticker hint beside the dishes")
  dishHint: SceneObject
  @input
  @hint("Sticker hint beside the basket")
  laundryHint: SceneObject
  @input dishRewardAnchor: SceneObject
  @input laundryRewardAnchor: SceneObject
  @ui.group_end

  @ui.group_start("Modules")
  @input room: SmallWinsRoomController
  @input reward: SmallWinsRewardUI
  @input invite: SmallWinsInviteUI
  @input breathing: SmallWinsBreathingUI
  @input notebook: SmallWinsNotebookUI
  @input eyeMovement: SmallWinsEyeMovementUI
  @input drawing: SmallWinsDrawingUI
  @ui.group_end

  private dishesLoaded = 0
  private dishesResolved = false
  private laundryResolved = false
  private invited = false

  private get laundryMessage(): string {
    return "Fresh clothes, well done, " + this.userName + "."
  }

  onAwake() {
    SmallWinsState.instance.reset()
    this.addHint(this.dishHint)
    this.addHint(this.laundryHint)
    this.createEvent("OnStartEvent").bind(() => this.wireFlow())
    this.createEvent("UpdateEvent").bind(() => this.notebook.setCardShowing(this.room.questUI.isCardVisible))
  }

  private addHint(anchor: SceneObject): void {
    addImage(anchor, "StickerHintOutline", TEX.outline, 30)
    addImage(anchor, "StickerHintStar", TEX.star, 15).getSceneObject().getTransform().setLocalPosition(new vec3(0, 0, 0.2))
  }

  private wireFlow(): void {
    for (const dish of [this.dishPlate, this.dishBowl, this.dishMug]) {
      dish.onDropped.add(() => this.onDishLoaded())
    }
    this.clothesPile.onDropped.add(() => {
      this.laundryHint.enabled = false
      this.room.closeWasher(() => {
        this.laundryResolved = true
        this.resolveChore(TASK_LAUNDRY, "clothes", this.laundryMessage, this.laundryRewardAnchor)
      })
    })
    this.reward.onRewardFinished.add((anchor) => {
      if (!this.reward.isPlaying) this.notebook.setHudHidden(false)
      this.maybeInvite(anchor)
    })
    this.invite.onDeclined.add(() => this.notebook.setHudHidden(false))
    this.invite.onReady.add(() => this.breathing.begin())
    this.breathing.onFinished.add(() => {
      SmallWinsState.instance.completeTask(TASK_MINDFUL, "pebbles")
      this.notebook.setHudHidden(false)
    })
    this.notebook.onTherapy.add((therapy) => this.startTherapy(therapy))
    this.eyeMovement.onFinished.add(() => {
      SmallWinsState.instance.completeTask(TASK_MINDFUL, "calm")
      this.notebook.setHudHidden(false)
    })
    this.drawing.onFinished.add(() => {
      SmallWinsState.instance.completeTask(TASK_MINDFUL, "drawing")
      this.notebook.setHudHidden(false)
    })
    this.eyeMovement.onClosed.add(() => this.notebook.setHudHidden(false))
    this.drawing.onClosed.add(() => this.notebook.setHudHidden(false))
  }

  /** Any of the me-time exercises completes the mindfulness task, each with its own sticker. */
  private startTherapy(therapy: Therapy): void {
    this.notebook.setHudHidden(true)
    if (therapy === "breathing") this.breathing.begin()
    else if (therapy === "eyes") this.eyeMovement.begin()
    else this.drawing.begin()
  }

  /** The last dish, with the door closing, triggers the reward. */
  private onDishLoaded(): void {
    this.dishesLoaded++
    if (this.dishesLoaded < 3) return
    this.dishHint.enabled = false
    this.room.closeDishwasher(() => {
      this.dishesResolved = true
      this.resolveChore(TASK_DISHES, "plate", this.dishesMessage, this.dishRewardAnchor)
    })
  }

  /** Only tasks you planned earn a sticker, so a task removed from the notebook passes quietly. */
  private resolveChore(taskId: string, art: StickerArt, message: string, anchor: SceneObject): void {
    if (SmallWinsState.instance.completeTask(taskId)) {
      // The demo button sits low in view, right where the reward lands, so it steps aside.
      this.notebook.setHudHidden(true)
      this.reward.play(anchor, art, message)
    } else {
      this.maybeInvite(anchor)
    }
  }

  private maybeInvite(anchor: SceneObject): void {
    if (this.invited || !this.dishesResolved || !this.laundryResolved || this.reward.isPlaying) return
    this.invited = true
    this.notebook.setHudHidden(true)
    this.invite.showInvitation(anchor)
  }
}
