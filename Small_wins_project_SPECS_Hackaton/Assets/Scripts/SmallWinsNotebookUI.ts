import {FlexDirection, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {MAX_TASKS, SmallWinsState, TASK_PRESETS} from "./SmallWinsState"
import {
  addButton,
  addImage,
  addPanel,
  ButtonHandle,
  child,
  flexButton,
  flexContainer,
  flexPlace,
  flexText,
  smooth,
  stickerTexture,
  TEX,
  TEXT_SOFT,
  tween,
} from "./SmallWinsUIKit"
import {faceViewer, pointInFront} from "./SmallWinsViewer"

const HUD_DISTANCE = 75
const HUD_RIGHT = -12
const HUD_DROP = 19
const FOLLOW_RATE = 2.5
const BOOK_DISTANCE = 70
const BOOK_DROP = 4
// The display is about 36 degrees wide, so at 70 cm the page has to stay under about 40 cm.
const BOOK_W = 38
const BOOK_H = 32
const ROW_H = 3.2
const REFRESH_DELAY_SECONDS = 0.12

type Tab = "today" | "stickers"

/** The Raise hand demo control, the animated hand with its page tab, and the notebook itself. */
@component
export class SmallWinsNotebookUI extends BaseScriptComponent {
  private hudRoot: SceneObject
  private raiseButton: ButtonHandle
  private handRoot: SceneObject
  private handImage: Image
  private bookRoot: SceneObject
  private bodyHost: SceneObject
  private body: SceneObject | null = null
  private tab: Tab = "today"
  private picker: {editingId: string | null} | null = null
  private handRaised = false
  private hidden = false
  private refreshEvent: DelayedCallbackEvent
  private refreshPending = false

  get isOpen(): boolean {
    return this.bookRoot.enabled
  }

  get activeTab(): Tab {
    return this.tab
  }

  onAwake() {
    this.buildHud()
    this.buildBook()
    this.createEvent("UpdateEvent").bind(() => this.followViewer())
    this.createEvent("OnStartEvent").bind(() => {
      SmallWinsState.instance.onChanged.add(() => this.requestRefresh())
    })
    this.refreshEvent = this.createEvent("DelayedCallbackEvent")
    this.refreshEvent.bind(() => {
      this.refreshPending = false
      if (this.bookRoot.enabled) this.refresh()
    })
    const hide = this.createEvent("DelayedCallbackEvent")
    hide.bind(() => {
      this.handRoot.enabled = false
      this.bookRoot.enabled = false
    })
    hide.reset(0)
  }

  /** Prompts stand back while the breathing runs. */
  setHudHidden(hidden: boolean): void {
    this.hidden = hidden
    this.hudRoot.enabled = !hidden && !this.bookRoot.enabled
  }

  private buildHud(): void {
    this.hudRoot = child(this.sceneObject, "RaiseHandHud")
    this.hudRoot.createComponent("Component.Canvas")
    this.raiseButton = addButton(this.hudRoot, "RaiseHandButton", "Raise hand (demo)", 13, 3.2, () => this.toggleHand(), HUD_DISTANCE)
    this.handRoot = child(this.hudRoot, "RaisedHandRoot", new vec3(-2, 8, 0))
    this.handImage = addImage(this.handRoot, "AnimatedHand", TEX.hand, 8, 10.5)
    addButton(this.handRoot, "NotebookTab", "My notebook", 11, 3.4, () => this.openBook(), HUD_DISTANCE).so.getTransform().setLocalPosition(new vec3(10, 0, 0.3))
    this.getTransform().setWorldPosition(vec3.zero())
    this.hudRoot.getTransform().setWorldPosition(pointInFront(HUD_DISTANCE, HUD_RIGHT, -HUD_DROP))
  }

  private toggleHand(): void {
    this.handRaised = !this.handRaised
    this.raiseButton.label.text = this.handRaised ? "Lower hand" : "Raise hand (demo)"
    if (this.handRaised) {
      this.handRoot.enabled = true
      this.animateHand()
    } else {
      this.handRoot.enabled = false
    }
  }

  /** The hand rises with a small wave. On real glasses this is the wearer's own raised hand. */
  private animateHand(): void {
    const t = this.handImage.getSceneObject().getTransform()
    tween(this, 0.7, (k) => {
      const e = smooth(k)
      t.setLocalPosition(new vec3(0, -8 + 8 * e, 0.1))
      t.setLocalRotation(quat.fromEulerVec(new vec3(0, 0, Math.sin(k * Math.PI * 3) * 0.12 * (1 - k))))
    })
  }

  private openBook(): void {
    this.handRaised = false
    this.raiseButton.label.text = "Raise hand (demo)"
    this.handRoot.enabled = false
    this.hudRoot.enabled = false
    const t = this.bookRoot.getTransform()
    const position = pointInFront(BOOK_DISTANCE, 0, -BOOK_DROP)
    t.setWorldPosition(position)
    t.setWorldRotation(faceViewer(position))
    this.bookRoot.enabled = true
    this.tab = "today"
    this.picker = null
    this.refresh()
  }

  private closeBook(): void {
    this.bookRoot.enabled = false
    this.hudRoot.enabled = !this.hidden
  }

  private buildBook(): void {
    this.bookRoot = child(this.sceneObject, "Notebook")
    this.bookRoot.createComponent("Component.Canvas")
    addPanel(this, this.bookRoot, BOOK_W, BOOK_H)
    const d = BOOK_DISTANCE
    const header = flexContainer(this.bookRoot, "NotebookHeader", FlexDirection.Row, BOOK_W - 3, 4, 1, FlexJustify.SpaceBetween)
    header.getTransform().setLocalPosition(new vec3(0, BOOK_H / 2 - 3, 0.6))
    flexText(header, "NotebookTitle", "My notebook", {role: "Headline", distance: d, width: 13, height: 3.6, align: HorizontalAlignment.Left})
    flexButton(header, "TodayTab", "Today", 6, 3, () => this.showTab("today"), d)
    flexButton(header, "StickersTab", "Stickers", 7, 3, () => this.showTab("stickers"), d)
    flexButton(header, "NotebookClose", "Close", 6, 3, () => this.closeBook(), d)
    this.bodyHost = child(this.bookRoot, "NotebookBodyHost", new vec3(0, -2.4, 0.6))
  }

  private showTab(tab: Tab): void {
    this.tab = tab
    this.picker = null
    this.requestRefresh()
  }

  /** Waits for the press to finish: most rebuilds destroy the very button that asked for them. */
  private requestRefresh(): void {
    if (this.refreshPending) return
    this.refreshPending = true
    this.refreshEvent.reset(REFRESH_DELAY_SECONDS)
  }

  /** Rebuilds the page. FlexLayout only discovers children reliably on a fresh container. */
  private refresh(): void {
    if (this.body) this.body.destroy()
    const h = BOOK_H - 7
    this.body = flexContainer(this.bodyHost, "NotebookBody", FlexDirection.Column, BOOK_W - 3, h, 0.7, FlexJustify.Start)
    if (this.picker) this.buildPicker(this.body)
    else if (this.tab === "today") this.buildToday(this.body)
    else this.buildStickers(this.body)
  }

  private buildToday(body: SceneObject): void {
    const d = BOOK_DISTANCE
    const state = SmallWinsState.instance
    state.tasks.forEach((task, i) => {
      const row = flexContainer(body, "TaskRow" + i, FlexDirection.Row, BOOK_W - 3, ROW_H, 0.6)
      flexPlace(row, BOOK_W - 3, ROW_H)
      flexButton(row, "TaskTick" + i, task.done ? "Done" : "Tick", 4.4, 2.9, () => state.toggleTask(task.id), d)
      flexText(row, "TaskTitle" + i, task.title, {role: "Body", distance: d, width: 16, height: 2.9, align: HorizontalAlignment.Left})
      const art = addImage(row, "TaskArt" + i, task.done ? stickerTexture(task.art) : TEX.outline, 2.8)
      flexPlace(art.getSceneObject(), 2.8, 2.8)
      flexButton(row, "TaskEdit" + i, "Edit", 4, 2.9, () => this.openPicker(task.id), d)
      flexButton(row, "TaskRemove" + i, "Remove", 5.6, 2.9, () => state.removeTask(task.id), d)
    })
    const footer = flexContainer(body, "TodayFooter", FlexDirection.Row, BOOK_W - 3, 3.6, 1)
    flexPlace(footer, BOOK_W - 3, 3.6)
    if (state.tasks.length < MAX_TASKS) {
      flexButton(footer, "AddTaskButton", "+ Add a task", 12, 3.2, () => this.openPicker(null), d)
    }
    flexButton(footer, "ReducedMotionButton", "Reduced motion: " + (state.reducedMotion ? "On" : "Off"), 17, 3.2, () => state.setReducedMotion(!state.reducedMotion), d)
  }

  private buildStickers(body: SceneObject): void {
    const d = BOOK_DISTANCE
    const stickers = SmallWinsState.instance.stickers
    flexText(body, "StickersHeading", "Today's page", {role: "Subheadline", distance: d, width: 34, height: 2.6, color: TEXT_SOFT})
    if (stickers.length === 0) {
      flexText(body, "StickersEmpty", "Your next sticker goes here.", {role: "Body", distance: d, width: 34, height: 3})
      return
    }
    stickers.forEach((sticker, i) => {
      const row = flexContainer(body, "StickerRow" + i, FlexDirection.Row, BOOK_W - 3, ROW_H, 1)
      flexPlace(row, BOOK_W - 3, ROW_H)
      const art = addImage(row, "StickerArt" + i, stickerTexture(sticker.art), 3.2)
      flexPlace(art.getSceneObject(), 3.2, 3.2)
      flexText(row, "StickerLabel" + i, sticker.label, {role: "Body", distance: d, width: 28, height: 3, align: HorizontalAlignment.Left})
    })
  }

  private openPicker(editingId: string | null): void {
    this.picker = {editingId}
    this.requestRefresh()
  }

  /** Stands in for typing: the AR keyboard does not appear in SPECS 27 preview (brief: Risks). */
  private buildPicker(body: SceneObject): void {
    const d = BOOK_DISTANCE
    const state = SmallWinsState.instance
    const editingId = this.picker ? this.picker.editingId : null
    flexText(body, "PickerHeading", editingId ? "Change this task to" : "What counts for you today?", {role: "Subheadline", distance: d, width: 34, height: 2.6, color: TEXT_SOFT})
    TASK_PRESETS.forEach((title, i) => {
      flexButton(
        body,
        "PresetTask" + i,
        title,
        24,
        3.4,
        () => {
          this.picker = null
          if (editingId) state.renameTask(editingId, title)
          else state.addTask(title)
        },
        d,
      )
    })
    flexButton(
      body,
      "PickerCancel",
      "Cancel",
      10,
      3.2,
      () => {
        this.picker = null
        this.requestRefresh()
      },
      d,
    )
  }

  private followViewer(): void {
    if (!this.hudRoot.enabled) return
    const t = this.hudRoot.getTransform()
    const k = Math.min(1, getDeltaTime() * FOLLOW_RATE)
    const position = vec3.lerp(t.getWorldPosition(), pointInFront(HUD_DISTANCE, HUD_RIGHT, -HUD_DROP), k)
    t.setWorldPosition(position)
    t.setWorldRotation(faceViewer(position))
  }
}
