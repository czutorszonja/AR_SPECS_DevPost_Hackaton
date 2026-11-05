import {FlexDirection, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"
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
import {faceViewer, pointInFront, pointInView} from "./SmallWinsViewer"

export type Therapy = "breathing" | "eyes" | "drawing"

// The bottom-left corner of the view, clear of cards and tasks. The display is about 36 degrees wide.
const HUD_DISTANCE = 75
const HUD_RIGHT = -14
const HUD_DROP = 21
const FOLLOW_RATE = 6
const BOOK_DISTANCE = 70
// Text is scaled well past the page's real distance, so it stays easy to read on the narrow display.
const BOOK_TEXT_DISTANCE = 140
const HUD_TEXT_DISTANCE = 160
const BOOK_DROP = 4
// At 70 cm the page has to stay under about 42 cm wide to fit the display.
const BOOK_W = 41
const BOOK_H = 41
const INNER_W = BOOK_W - 3
// Spectacles guidance: targets of at least 2 degrees, about 3 is best, 4 for main actions, 1 degree apart.
// At 70 cm that is 3.7 cm for a button, 5 cm for the main tiles, and 1.2 cm between them.
const BUTTON_H = 3.8
const TILE_H = 5.2
const GAP = 1.3
const ROW_H = BUTTON_H
const REFRESH_DELAY_SECONDS = 0.12

type Tab = "today" | "stickers" | "metime"

const THERAPIES: {id: Therapy; name: string; title: string; detail: string}[] = [
  {id: "breathing", name: "TherapyBreathing", title: "Box breathing", detail: "1 min"},
  {id: "eyes", name: "TherapyEyes", title: "Eye movement calm", detail: "EMDR-inspired, 1 min"},
  {id: "drawing", name: "TherapyDrawing", title: "Guided drawing", detail: "2 min"},
]

/** The Raise hand demo control, the animated hand with its page tab, and the notebook itself. */
@component
export class SmallWinsNotebookUI extends BaseScriptComponent {
  /** Fires when you pick one of the me-time exercises. The notebook closes first. */
  readonly onTherapy = new Event<Therapy>()

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
  private cardShowing = false
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
    this.updateHudVisibility()
  }

  /** The demo button also steps aside for the quest card, rather than sitting on top of it. */
  setCardShowing(showing: boolean): void {
    if (showing === this.cardShowing) return
    this.cardShowing = showing
    this.updateHudVisibility()
  }

  private updateHudVisibility(): void {
    this.hudRoot.enabled = !this.hidden && !this.cardShowing && !this.bookRoot.enabled
  }

  private buildHud(): void {
    this.hudRoot = child(this.sceneObject, "RaiseHandHud")
    this.hudRoot.createComponent("Component.Canvas")
    this.raiseButton = addButton(this.hudRoot, "RaiseHandButton", "Raise hand (demo)", 15, 4.6, () => this.toggleHand(), HUD_TEXT_DISTANCE)
    this.handRoot = child(this.hudRoot, "RaisedHandRoot", new vec3(-2, 9, 0))
    this.handImage = addImage(this.handRoot, "AnimatedHand", TEX.hand, 8, 10.5)
    addButton(this.handRoot, "NotebookTab", "My notebook", 15, 4.6, () => this.openBook(), HUD_TEXT_DISTANCE).so.getTransform().setLocalPosition(new vec3(12.5, 0, 0.3))
    this.getTransform().setWorldPosition(vec3.zero())
    this.hudRoot.getTransform().setWorldPosition(pointInView(HUD_DISTANCE, HUD_RIGHT, -HUD_DROP))
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
    this.updateHudVisibility()
  }

  /** A title with Close, then three big tiles: your list, your stickers, and time for yourself. */
  private buildBook(): void {
    this.bookRoot = child(this.sceneObject, "Notebook")
    this.bookRoot.createComponent("Component.Canvas")
    addPanel(this, this.bookRoot, BOOK_W, BOOK_H)
    const d = BOOK_TEXT_DISTANCE
    const header = flexContainer(this.bookRoot, "NotebookHeader", FlexDirection.Row, INNER_W, BUTTON_H, GAP, FlexJustify.SpaceBetween)
    header.getTransform().setLocalPosition(new vec3(0, BOOK_H / 2 - 3.2, 0.6))
    flexText(header, "NotebookTitle", "My notebook", {role: "Headline", distance: d, width: 26, height: BUTTON_H, align: HorizontalAlignment.Left})
    flexButton(header, "NotebookClose", "Close", 9, BUTTON_H, () => this.closeBook(), d)
    const tabs = flexContainer(this.bookRoot, "NotebookTabs", FlexDirection.Row, INNER_W, TILE_H, GAP)
    tabs.getTransform().setLocalPosition(new vec3(0, BOOK_H / 2 - 9, 0.6))
    const tileW = (INNER_W - 2 * GAP) / 3
    flexButton(tabs, "TodayTab", "Today", tileW, TILE_H, () => this.showTab("today"), d)
    flexButton(tabs, "StickersTab", "Stickers", tileW, TILE_H, () => this.showTab("stickers"), d)
    flexButton(tabs, "MeTimeTab", "Me-time", tileW, TILE_H, () => this.showTab("metime"), d)
    this.bodyHost = child(this.bookRoot, "NotebookBodyHost", new vec3(0, -5.6, 0.6))
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
    const h = BOOK_H - 14
    this.body = flexContainer(this.bodyHost, "NotebookBody", FlexDirection.Column, INNER_W, h, GAP, FlexJustify.Start)
    if (this.picker) this.buildPicker(this.body)
    else if (this.tab === "today") this.buildToday(this.body)
    else if (this.tab === "stickers") this.buildStickers(this.body)
    else this.buildMeTime(this.body)
  }

  private row(parent: SceneObject, name: string, height: number): SceneObject {
    const row = flexContainer(parent, name, FlexDirection.Row, INNER_W, height, GAP)
    flexPlace(row, INNER_W, height)
    return row
  }

  private buildToday(body: SceneObject): void {
    const d = BOOK_TEXT_DISTANCE
    const state = SmallWinsState.instance
    state.tasks.forEach((task, i) => {
      const row = this.row(body, "TaskRow" + i, ROW_H)
      flexButton(row, "TaskTick" + i, task.done ? "Done" : "Tick", 6, BUTTON_H, () => state.toggleTask(task.id), d)
      flexText(row, "TaskTitle" + i, task.title, {role: "Body", distance: d, width: 11, height: BUTTON_H, align: HorizontalAlignment.Left})
      const art = addImage(row, "TaskArt" + i, task.done ? stickerTexture(task.art) : TEX.outline, 3.4)
      flexPlace(art.getSceneObject(), 3.4, 3.4)
      flexButton(row, "TaskEdit" + i, "Edit", 5.4, BUTTON_H, () => this.openPicker(task.id), d)
      flexButton(row, "TaskRemove" + i, "Remove", 7, BUTTON_H, () => state.removeTask(task.id), d)
    })
    const footer = this.row(body, "TodayFooter", BUTTON_H)
    if (state.tasks.length < MAX_TASKS) {
      flexButton(footer, "AddTaskButton", "+ Add a task", 14, BUTTON_H, () => this.openPicker(null), d)
    }
    flexButton(footer, "ReducedMotionButton", "Reduced motion: " + (state.reducedMotion ? "On" : "Off"), 20, BUTTON_H, () => state.setReducedMotion(!state.reducedMotion), d)
  }

  private buildStickers(body: SceneObject): void {
    const d = BOOK_TEXT_DISTANCE
    const stickers = SmallWinsState.instance.stickers
    flexText(body, "StickersHeading", "Today's page", {role: "Subheadline", distance: d, width: INNER_W, height: 3, color: TEXT_SOFT})
    if (stickers.length === 0) {
      flexText(body, "StickersEmpty", "Your next sticker goes here.", {role: "Body", distance: d, width: INNER_W, height: 3.4})
      return
    }
    stickers.forEach((sticker, i) => {
      const row = this.row(body, "StickerRow" + i, ROW_H)
      const art = addImage(row, "StickerArt" + i, stickerTexture(sticker.art), 3.6)
      flexPlace(art.getSceneObject(), 3.6, 3.6)
      flexText(row, "StickerLabel" + i, sticker.label, {role: "Body", distance: d, width: 30, height: BUTTON_H, align: HorizontalAlignment.Left})
    })
  }

  /** Time for yourself, offered only when you ask for it: big tiles, one per exercise. */
  private buildMeTime(body: SceneObject): void {
    const d = BOOK_TEXT_DISTANCE
    flexText(body, "MeTimeHeading", "Take a few minutes for yourself", {role: "Subheadline", distance: d, width: INNER_W, height: 3, color: TEXT_SOFT})
    for (const therapy of THERAPIES) {
      const row = this.row(body, therapy.name + "Row", TILE_H)
      flexButton(
        row,
        therapy.name,
        therapy.title + "  ·  " + therapy.detail,
        INNER_W,
        TILE_H,
        () => {
          this.closeBook()
          this.onTherapy.invoke(therapy.id)
        },
        d,
      )
    }
    flexText(body, "MeTimeNote", "Gentle self-help exercises, not a replacement for therapy.", {role: "Caption", distance: d, width: INNER_W, height: 3, color: TEXT_SOFT})
  }

  private openPicker(editingId: string | null): void {
    this.picker = {editingId}
    this.requestRefresh()
  }

  /** Stands in for typing: the AR keyboard does not appear in SPECS 27 preview (brief: Risks). Two big columns. */
  private buildPicker(body: SceneObject): void {
    const d = BOOK_TEXT_DISTANCE
    const state = SmallWinsState.instance
    const editingId = this.picker ? this.picker.editingId : null
    flexText(body, "PickerHeading", editingId ? "Change this task to" : "What counts for you today?", {role: "Subheadline", distance: d, width: INNER_W, height: 3, color: TEXT_SOFT})
    const colW = (INNER_W - GAP) / 2
    for (let i = 0; i < TASK_PRESETS.length; i += 2) {
      const row = this.row(body, "PresetRow" + i, BUTTON_H)
      for (let j = i; j < Math.min(i + 2, TASK_PRESETS.length); j++) {
        const title = TASK_PRESETS[j]
        flexButton(
          row,
          "PresetTask" + j,
          title,
          colW,
          BUTTON_H,
          () => {
            this.picker = null
            if (editingId) state.renameTask(editingId, title)
            else state.addTask(title)
          },
          d,
        )
      }
    }
    const footer = this.row(body, "PickerFooter", BUTTON_H)
    flexButton(
      footer,
      "PickerCancel",
      "Cancel",
      12,
      BUTTON_H,
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
    const position = vec3.lerp(t.getWorldPosition(), pointInView(HUD_DISTANCE, HUD_RIGHT, -HUD_DROP), k)
    t.setWorldPosition(position)
    t.setWorldRotation(faceViewer(position))
  }
}
