import {BackPlate} from "SpectaclesUIKit.lspkg/Scripts/BackPlate"
import {FlexDirection, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {Day, MAX_TASKS, presetsFor, SmallWinsState, SmallWinsTask, TaskPreset} from "./SmallWinsState"
import {
  addButton,
  addImage,
  addPanel,
  addText,
  ButtonHandle,
  child,
  flexButton,
  flexContainer,
  flexPlace,
  flexText,
  makePictureButton,
  smooth,
  stickerTexture,
  TEX,
  TEXT_SOFT,
  tween,
} from "./SmallWinsUIKit"
import {faceViewer, pointAlongGaze, pointInView} from "./SmallWinsViewer"

export type Therapy = "breathing" | "eyes" | "drawing"
export type Card = "todo" | "wins" | "metime"

// The bottom-left corner of the view, clear of cards and tasks. The display is about 36 degrees wide.
const HUD_DISTANCE = 75
const HUD_RIGHT = -14
const HUD_DROP = 21
const HUD_TEXT_DISTANCE = 160
const FOLLOW_RATE = 6
// The three choices that come up with your hand: a row just below the middle of the view.
const MENU_DISTANCE = 72
const MENU_DROP = 4
const MENU_TILE_W = 10.5
const MENU_TILE_H = 6
const MENU_GAP = 1.6
const CARD_DISTANCE = 70
// Text is scaled well past the card's real distance, so it stays easy to read on the narrow display.
const CARD_TEXT_DISTANCE = 140
// Just below the eyes; the tallest card (a full day) still fits the view.
const CARD_DROP = 1.5
// A card follows your gaze this far up or down, and no further; it always stays upright.
const CARD_MAX_PITCH = 15
// One thing at a time: each card is about two thirds of the display wide.
const CARD_W = 33
const INNER_W = CARD_W - 3
// Spectacles guidance: targets of at least 2 degrees, about 3 is best, 4 for main actions, 1 degree apart.
// At 70 cm that is 3.7 cm for a button, 5 cm for the main tiles, and 1.2 cm between them.
const BUTTON_H = 3.8
const TILE_H = 5.2
const GAP = 1.3
const HEADER_H = BUTTON_H
const CARD_PAD = 1.6
const WINS_PER_ROW = 3
const WIN_CELL_H = 8.5
const REFRESH_DELAY_SECONDS = 0.12

const CARD_TITLES: Record<Card, string> = {todo: "To-do list", wins: "Today's wins", metime: "Me-time"}
const DAY_TITLES: Record<Day, string> = {[-1]: "Yesterday", 0: "Today", 1: "Tomorrow"}
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const DAY_BUTTON_W = 8.5
// A task row: its sticker circle (which is the tick), its name, and Edit, reaching both edges of the card.
const TICK_W = BUTTON_H
const STICKER_W = 3.4
const EDIT_W = 5.5
const TASK_TITLE_W = INNER_W - TICK_W - EDIT_W - 2 * GAP

/** "Fri 6 Nov", for today and the days either side. */
function dateLabel(day: Day): string {
  const d = new Date(Date.now() + day * 24 * 60 * 60 * 1000)
  return DAY_NAMES[d.getDay()] + " " + d.getDate() + " " + MONTH_NAMES[d.getMonth()]
}

const THERAPIES: {id: Therapy; name: string; label: string}[] = [
  {id: "breathing", name: "TherapyBreathing", label: "Box breathing  ·  1 min"},
  {id: "eyes", name: "TherapyEyes", label: "Eye movement calm  ·  1 min"},
  {id: "drawing", name: "TherapyDrawing", label: "Guided drawing  ·  2 min"},
]

/** The Raise hand demo control, the three choices that come up with your hand, and one small card at a time. */
@component
export class SmallWinsNotebookUI extends BaseScriptComponent {
  /** Fires when you pick one of the me-time exercises. The card closes first. */
  readonly onTherapy = new Event<Therapy>()
  /** Fires when you tick a task off the list. The card closes, so its sticker can play out in the room. */
  readonly onTaskTicked = new Event<string>()

  private hudRoot: SceneObject
  private raiseButton: ButtonHandle
  private handRoot: SceneObject
  private handImage: Image
  private menuRoot: SceneObject
  private bookRoot: SceneObject
  private plate: BackPlate
  private header: SceneObject
  private title: Text
  private bodyHost: SceneObject
  private body: SceneObject | null = null
  private card: Card = "todo"
  /** Which day the planner shows: look back at yesterday, plan tomorrow. Opens on today. */
  private day: Day = 0
  private picker: {editingId: string | null; day: Day} | null = null
  private handRaised = false
  private hidden = false
  private cardShowing = false
  private refreshEvent: DelayedCallbackEvent
  private refreshPending = false

  private static instance: SmallWinsNotebookUI | null = null

  /** Whether a card is open, for the demo button that would otherwise show through it. */
  static get anyCardOpen(): boolean {
    return !!SmallWinsNotebookUI.instance && SmallWinsNotebookUI.instance.isOpen
  }

  get isOpen(): boolean {
    return this.bookRoot.enabled
  }

  get activeCard(): Card {
    return this.card
  }

  onAwake() {
    SmallWinsNotebookUI.instance = this
    this.buildHud()
    this.buildMenu()
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
      this.menuRoot.enabled = false
      this.bookRoot.enabled = false
    })
    hide.reset(0)
  }

  /** Prompts stand back while a reward, the breathing or an exercise runs. */
  setHudHidden(hidden: boolean): void {
    this.hidden = hidden
    if (hidden) this.lowerHand()
    this.updateHudVisibility()
  }

  /** The demo button also steps aside for the quest card, rather than sitting on top of it. */
  setCardShowing(showing: boolean): void {
    if (showing === this.cardShowing) return
    this.cardShowing = showing
    if (showing) this.lowerHand()
    this.updateHudVisibility()
  }

  /** Opens one card directly, as tapping its choice does. */
  open(card: Card): void {
    this.lowerHand()
    this.hudRoot.enabled = false
    const t = this.bookRoot.getTransform()
    const position = pointAlongGaze(CARD_DISTANCE, CARD_MAX_PITCH, CARD_DROP)
    t.setWorldPosition(position)
    t.setWorldRotation(faceViewer(position))
    this.bookRoot.enabled = true
    this.card = card
    this.day = 0
    this.picker = null
    this.refresh()
  }

  private updateHudVisibility(): void {
    const show = !this.hidden && !this.cardShowing && !this.bookRoot.enabled
    // Coming back after a while, it starts in its corner rather than drifting over from where you last were.
    if (show && !this.hudRoot.enabled) {
      const t = this.hudRoot.getTransform()
      const position = pointInView(HUD_DISTANCE, HUD_RIGHT, -HUD_DROP)
      t.setWorldPosition(position)
      t.setWorldRotation(faceViewer(position))
    }
    this.hudRoot.enabled = show
  }

  private buildHud(): void {
    this.hudRoot = child(this.sceneObject, "RaiseHandHud")
    this.hudRoot.createComponent("Component.Canvas")
    this.raiseButton = addButton(this.hudRoot, "RaiseHandButton", "Raise hand (demo)", 15, 4.6, () => this.toggleHand(), HUD_TEXT_DISTANCE)
    this.handRoot = child(this.hudRoot, "RaisedHandRoot", new vec3(-2, 9, 0))
    this.handImage = addImage(this.handRoot, "AnimatedHand", TEX.hand, 8, 10.5)
    this.getTransform().setWorldPosition(vec3.zero())
    this.hudRoot.getTransform().setWorldPosition(pointInView(HUD_DISTANCE, HUD_RIGHT, -HUD_DROP))
  }

  /** The to-do list on the left, me-time in the middle, today's wins on the right. Big, well spaced tiles. */
  private buildMenu(): void {
    this.menuRoot = child(this.sceneObject, "HandMenu")
    this.menuRoot.createComponent("Component.Canvas")
    const row = flexContainer(this.menuRoot, "HandMenuRow", FlexDirection.Row, 3 * MENU_TILE_W + 2 * MENU_GAP, MENU_TILE_H, MENU_GAP)
    const d = HUD_TEXT_DISTANCE
    flexButton(row, "TodoTab", "To-do list", MENU_TILE_W, MENU_TILE_H, () => this.open("todo"), d)
    flexButton(row, "MeTimeTab", "Me-time", MENU_TILE_W, MENU_TILE_H, () => this.open("metime"), d)
    flexButton(row, "WinsTab", "Today's wins", MENU_TILE_W, MENU_TILE_H, () => this.open("wins"), d)
  }

  private toggleHand(): void {
    if (this.handRaised) {
      this.lowerHand()
      return
    }
    this.handRaised = true
    this.raiseButton.label.text = "Lower hand"
    this.handRoot.enabled = true
    this.menuRoot.enabled = true
    this.placeMenu(true)
    this.animateHand()
  }

  private lowerHand(): void {
    this.handRaised = false
    if (this.raiseButton) this.raiseButton.label.text = "Raise hand (demo)"
    if (this.handRoot) this.handRoot.enabled = false
    if (this.menuRoot) this.menuRoot.enabled = false
  }

  /** The hand rises with a small wave. On real glasses this is the wearer's own raised hand. */
  private animateHand(): void {
    const t = this.handImage.getSceneObject().getTransform()
    tween(this, 0.7, (k) => {
      const e = smooth(k)
      t.setLocalPosition(new vec3(0, -8 + 8 * e, 0.1))
      t.setLocalRotation(quat.fromEulerVec(new vec3(0, 0, Math.sin(k * Math.PI * 3) * 0.12 * (1 - k))))
    })
    const menu = this.menuRoot.getTransform()
    tween(this, 0.45, (k) => menu.setLocalScale(vec3.one().uniformScale(0.85 + 0.15 * smooth(k))))
  }

  private closeBook(): void {
    this.bookRoot.enabled = false
    this.updateHudVisibility()
  }

  /** A title with Close, then whatever the card holds. The panel grows to fit it. */
  private buildBook(): void {
    this.bookRoot = child(this.sceneObject, "Notebook")
    this.bookRoot.createComponent("Component.Canvas")
    this.plate = addPanel(this, this.bookRoot, CARD_W, 30)
    this.header = flexContainer(this.bookRoot, "NotebookHeader", FlexDirection.Row, INNER_W, HEADER_H, GAP, FlexJustify.SpaceBetween)
    this.title = flexText(this.header, "NotebookTitle", "", {role: "Headline", distance: CARD_TEXT_DISTANCE, width: INNER_W - DAY_BUTTON_W - GAP, height: HEADER_H, align: HorizontalAlignment.Left})
    flexButton(this.header, "NotebookClose", "Close", DAY_BUTTON_W, BUTTON_H, () => this.closeBook(), CARD_TEXT_DISTANCE)
    this.bodyHost = child(this.bookRoot, "NotebookBodyHost")
  }

  /** Waits for the press to finish: most rebuilds destroy the very button that asked for them. */
  private requestRefresh(): void {
    if (this.refreshPending) return
    this.refreshPending = true
    this.refreshEvent.reset(REFRESH_DELAY_SECONDS)
  }

  /** Rebuilds the card body and sizes the panel around it. FlexLayout only discovers children on a fresh container. */
  private refresh(): void {
    if (this.body) this.body.destroy()
    const rows = this.picker ? this.pickerRows() : this.card === "todo" ? this.todoRows() : this.card === "wins" ? this.winsRows() : this.meTimeRows()
    const bodyH = rows.reduce((sum, h) => sum + h, 0) + GAP * Math.max(0, rows.length - 1)
    const cardH = CARD_PAD + HEADER_H + GAP + bodyH + CARD_PAD
    this.plate.size = new vec2(CARD_W, cardH)
    this.header.getTransform().setLocalPosition(new vec3(0, cardH / 2 - CARD_PAD - HEADER_H / 2, 0.6))
    this.title.text = this.picker
      ? this.picker.editingId
        ? "Change this task"
        : "Add a task"
      : this.card === "todo"
        ? DAY_TITLES[this.day] + "  ·  " + dateLabel(this.day)
        : CARD_TITLES[this.card]
    this.bodyHost.getTransform().setLocalPosition(new vec3(0, cardH / 2 - CARD_PAD - HEADER_H - GAP - bodyH / 2, 0.6))
    this.body = flexContainer(this.bodyHost, "NotebookBody", FlexDirection.Column, INNER_W, bodyH, GAP, FlexJustify.Start)
    if (this.picker) this.buildPicker(this.body)
    else if (this.card === "todo") this.buildTodo(this.body)
    else if (this.card === "wins") this.buildWins(this.body)
    else this.buildMeTime(this.body)
  }

  private row(parent: SceneObject, name: string, height: number, justify: FlexJustify = FlexJustify.Center): SceneObject {
    const row = flexContainer(parent, name, FlexDirection.Row, INNER_W, height, GAP, justify)
    flexPlace(row, INNER_W, height)
    return row
  }

  private todoRows(): number[] {
    const state = SmallWinsState.instance
    const count = this.day === -1 ? state.yesterday.length : state.tasksFor(this.day).length
    const rows = [BUTTON_H, ...new Array(count).fill(BUTTON_H)]
    if (this.day !== -1 && count < MAX_TASKS) rows.push(BUTTON_H)
    return rows
  }

  /** A day planner: step back to yesterday or on to tomorrow, see what else is on, then the day's tasks. */
  private buildTodo(body: SceneObject): void {
    this.buildDayNav(body)
    if (this.day === 0) this.buildToday(body)
    else if (this.day === 1) this.buildTomorrow(body)
    else this.buildYesterday(body)
  }

  /** Yesterday and Tomorrow either side of what else the day holds, like a birthday or a concert. */
  private buildDayNav(body: SceneObject): void {
    const d = CARD_TEXT_DISTANCE
    const nav = this.row(body, "DayNav", BUTTON_H, FlexJustify.SpaceBetween)
    if (this.day > -1) {
      flexButton(nav, "DayPrev", this.day === 1 ? "Today" : "Yesterday", DAY_BUTTON_W, BUTTON_H, () => this.showDay((this.day - 1) as Day), d)
    } else {
      flexPlace(child(nav, "DayPrevSpace"), DAY_BUTTON_W, BUTTON_H)
    }
    const state = SmallWinsState.instance
    const note = this.day === -1 ? state.yesterday.length + " small wins" : state.events[this.day] || "Nothing else on"
    flexText(nav, "DayNote", note, {role: "Body", distance: d, width: INNER_W - 2 * DAY_BUTTON_W - 2 * GAP, height: BUTTON_H, color: TEXT_SOFT, wrap: true})
    if (this.day < 1) {
      flexButton(nav, "DayNext", this.day === -1 ? "Today" : "Tomorrow", DAY_BUTTON_W, BUTTON_H, () => this.showDay((this.day + 1) as Day), d)
    } else {
      flexPlace(child(nav, "DayNextSpace"), DAY_BUTTON_W, BUTTON_H)
    }
  }

  private showDay(day: Day): void {
    this.day = day
    this.requestRefresh()
  }

  /** A sticker or its empty circle, in the left-hand spot of a row, when it's only there to look at. */
  private stickerSlot(row: SceneObject, name: string, texture: Texture): void {
    const slot = child(row, name + "Slot")
    flexPlace(slot, TICK_W, BUTTON_H)
    addImage(slot, name, texture, STICKER_W).getSceneObject().getTransform().setLocalPosition(new vec3(0, 0, 0.1))
  }

  /** Each task: its circle, which you tap to earn the sticker that fills it; its name; and Edit (which can also remove it). */
  private buildToday(body: SceneObject): void {
    const d = CARD_TEXT_DISTANCE
    const state = SmallWinsState.instance
    state.tasks.forEach((task, i) => {
      const row = this.row(body, "TaskRow" + i, BUTTON_H)
      const tick = flexButton(row, "TaskTick" + i, "", TICK_W, BUTTON_H, () => this.tick(task.id), d)
      const art = addImage(tick.so, "TaskArt" + i, task.done ? stickerTexture(task.art) : TEX.outline, STICKER_W).getSceneObject()
      art.getTransform().setLocalPosition(new vec3(0, 0, 0.6))
      makePictureButton(tick.button, art)
      flexText(row, "TaskTitle" + i, task.title, {role: "Body", distance: d, width: TASK_TITLE_W, height: BUTTON_H, align: HorizontalAlignment.Left})
      flexButton(row, "TaskEdit" + i, "Edit", EDIT_W, BUTTON_H, () => this.openPicker(task.id), d)
    })
    this.addTaskFooter(body, state.tasks)
  }

  /** Tomorrow's plan: change it as you like. Its ticks wait for the day, and its stickers for when it's done. */
  private buildTomorrow(body: SceneObject): void {
    const d = CARD_TEXT_DISTANCE
    SmallWinsState.instance.tomorrow.forEach((task, i) => {
      const row = this.row(body, "PlanRow" + i, BUTTON_H)
      this.stickerSlot(row, "PlanArt" + i, TEX.outline)
      flexText(row, "PlanTitle" + i, task.title, {role: "Body", distance: d, width: TASK_TITLE_W, height: BUTTON_H, align: HorizontalAlignment.Left})
      flexButton(row, "PlanEdit" + i, "Edit", EDIT_W, BUTTON_H, () => this.openPicker(task.id), d)
    })
    this.addTaskFooter(body, SmallWinsState.instance.tomorrow)
  }

  /** Looking back: what you did yesterday, each with its sticker. Nothing about what you didn't. */
  private buildYesterday(body: SceneObject): void {
    const d = CARD_TEXT_DISTANCE
    SmallWinsState.instance.yesterday.forEach((win, i) => {
      const row = this.row(body, "PastRow" + i, BUTTON_H)
      this.stickerSlot(row, "PastArt" + i, stickerTexture(win.art))
      flexText(row, "PastTitle" + i, win.title, {role: "Body", distance: d, width: TASK_TITLE_W, height: BUTTON_H, align: HorizontalAlignment.Left})
      flexPlace(child(row, "PastSpace" + i), EDIT_W, BUTTON_H)
    })
  }

  private addTaskFooter(body: SceneObject, tasks: SmallWinsTask[]): void {
    if (tasks.length >= MAX_TASKS) return
    const footer = this.row(body, "TodoFooter", BUTTON_H)
    flexButton(footer, "AddTaskButton", "+ Add a task", INNER_W, BUTTON_H, () => this.openPicker(null), CARD_TEXT_DISTANCE)
  }

  /** Ticking off plays the sticker out in the room. Unticking just takes it back off the page. */
  private tick(id: string): void {
    const state = SmallWinsState.instance
    const task = state.getTask(id)
    if (!task) return
    state.toggleTask(id)
    if (!task.done) return
    this.closeBook()
    this.onTaskTicked.invoke(id)
  }

  private winsRows(): number[] {
    const count = SmallWinsState.instance.stickers.length
    const grid = count === 0 ? [3.4] : new Array(Math.ceil(count / WINS_PER_ROW)).fill(WIN_CELL_H)
    return [3, ...grid, BUTTON_H]
  }

  /** The day's stickers, big, three to a row, with what each was for. */
  private buildWins(body: SceneObject): void {
    const d = CARD_TEXT_DISTANCE
    const state = SmallWinsState.instance
    const stickers = state.stickers
    flexText(body, "WinsHeading", "Every small win counts", {role: "Subheadline", distance: d, width: INNER_W, height: 3, color: TEXT_SOFT})
    if (stickers.length === 0) {
      flexText(body, "StickersEmpty", "Your first sticker goes here.", {role: "Body", distance: d, width: INNER_W, height: 3.4})
    }
    const cellW = (INNER_W - GAP * (WINS_PER_ROW - 1)) / WINS_PER_ROW
    for (let r = 0; r * WINS_PER_ROW < stickers.length; r++) {
      const row = this.row(body, "WinsRow" + r, WIN_CELL_H, FlexJustify.Start)
      for (let c = 0; c < WINS_PER_ROW && r * WINS_PER_ROW + c < stickers.length; c++) {
        const i = r * WINS_PER_ROW + c
        const cell = child(row, "WinCell" + i)
        flexPlace(cell, cellW, WIN_CELL_H)
        addImage(cell, "StickerArt" + i, stickerTexture(stickers[i].art), 5.6).getSceneObject().getTransform().setLocalPosition(new vec3(0, 1.3, 0.1))
        addText(cell, "StickerLabel" + i, stickers[i].label, {role: "Caption", distance: 112, width: cellW, height: 2.6, wrap: true})
          .getSceneObject().getTransform().setLocalPosition(new vec3(0, -3, 0.1))
      }
    }
    const footer = this.row(body, "WinsFooter", BUTTON_H)
    flexButton(footer, "ReducedMotionButton", "Reduced motion: " + (state.reducedMotion ? "On" : "Off"), INNER_W, BUTTON_H, () => state.setReducedMotion(!state.reducedMotion), d)
  }

  private meTimeRows(): number[] {
    return [3, ...THERAPIES.map(() => TILE_H), 3]
  }

  /** Time for yourself, offered only when you ask for it: big tiles, one per exercise. */
  private buildMeTime(body: SceneObject): void {
    const d = CARD_TEXT_DISTANCE
    flexText(body, "MeTimeHeading", "Take a few minutes for yourself", {role: "Subheadline", distance: d, width: INNER_W, height: 3, color: TEXT_SOFT})
    for (const therapy of THERAPIES) {
      const row = this.row(body, therapy.name + "Row", TILE_H)
      flexButton(
        row,
        therapy.name,
        therapy.label,
        INNER_W,
        TILE_H,
        () => {
          this.closeBook()
          this.onTherapy.invoke(therapy.id)
        },
        d,
      )
    }
    flexText(body, "MeTimeNote", "Gentle self-help, not a replacement for therapy.", {role: "Caption", distance: d, width: INNER_W, height: 3, color: TEXT_SOFT})
  }

  private openPicker(editingId: string | null): void {
    this.picker = {editingId, day: this.day}
    this.requestRefresh()
  }

  private pickerChoices(): TaskPreset[] {
    return this.picker ? presetsFor(this.picker.editingId, this.picker.day) : []
  }

  private pickerRows(): number[] {
    return [3, ...new Array(Math.ceil(this.pickerChoices().length / 2)).fill(BUTTON_H), BUTTON_H]
  }

  /** Stands in for typing: the AR keyboard does not appear in SPECS 27 preview (brief: Risks). Two big columns. */
  private buildPicker(body: SceneObject): void {
    const d = CARD_TEXT_DISTANCE
    const state = SmallWinsState.instance
    const editingId = this.picker ? this.picker.editingId : null
    const day: Day = this.picker ? this.picker.day : 0
    const choices = this.pickerChoices()
    const heading = editingId ? "Swap it for" : day === 1 ? "What would you like to do tomorrow?" : "What counts for you today?"
    flexText(body, "PickerHeading", heading, {role: "Subheadline", distance: d, width: INNER_W, height: 3, color: TEXT_SOFT})
    const colW = (INNER_W - GAP) / 2
    for (let i = 0; i < choices.length; i += 2) {
      const row = this.row(body, "PresetRow" + i, BUTTON_H, FlexJustify.Start)
      for (let j = i; j < Math.min(i + 2, choices.length); j++) {
        const preset = choices[j]
        flexButton(
          row,
          "PresetTask" + j,
          preset.title,
          colW,
          BUTTON_H,
          () => {
            this.picker = null
            if (editingId) state.replaceTask(editingId, preset, day)
            else state.addTask(preset, day)
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
      editingId ? colW : INNER_W,
      BUTTON_H,
      () => {
        this.picker = null
        this.requestRefresh()
      },
      d,
    )
    if (editingId) {
      flexButton(
        footer,
        "PickerRemove",
        "Remove this task",
        colW,
        BUTTON_H,
        () => {
          this.picker = null
          state.removeTask(editingId, day)
        },
        d,
      )
    }
  }

  private followViewer(): void {
    const k = Math.min(1, getDeltaTime() * FOLLOW_RATE)
    if (this.hudRoot.enabled) {
      const t = this.hudRoot.getTransform()
      const position = vec3.lerp(t.getWorldPosition(), pointInView(HUD_DISTANCE, HUD_RIGHT, -HUD_DROP), k)
      t.setWorldPosition(position)
      t.setWorldRotation(faceViewer(position))
    }
    if (this.menuRoot.enabled) this.placeMenu(false, k)
  }

  private placeMenu(snap: boolean, k: number = 1): void {
    const t = this.menuRoot.getTransform()
    const target = pointInView(MENU_DISTANCE, 0, -MENU_DROP)
    const position = snap ? target : vec3.lerp(t.getWorldPosition(), target, k)
    t.setWorldPosition(position)
    t.setWorldRotation(faceViewer(position))
  }
}
