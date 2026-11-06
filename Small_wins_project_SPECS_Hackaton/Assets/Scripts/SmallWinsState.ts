import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"

export type StickerArt = "plate" | "clothes" | "pebbles" | "custom" | "calm" | "drawing" | "plant" | "cat" | "phone" | "table"

export interface SmallWinsTask {
  id: string
  title: string
  done: boolean
  art: StickerArt
}

export const TASK_LAUNDRY = "laundry"
export const TASK_DISHES = "dishes"
export const TASK_MINDFUL = "mindful"
export const TASK_PLANTS = "plants"
export const TASK_CAT = "cat"
export const TASK_TABLE = "table"
export const TASK_PHONE = "phone"

export interface TaskPreset {
  title: string
  /** Tasks with something to do in the flat have a fixed id, so the room knows which one it is. */
  id?: string
  art: StickerArt
}

/** Add and Edit pick from this list: the AR keyboard does not appear in SPECS 27 preview. */
export const TASK_PRESETS: TaskPreset[] = [
  {title: "Water the plants", id: TASK_PLANTS, art: "plant"},
  {title: "Feed the cat", id: TASK_CAT, art: "cat"},
  {title: "Clear the table", id: TASK_TABLE, art: "table"},
  {title: "Text a friend", id: TASK_PHONE, art: "phone"},
  {title: "Go for a short walk", art: "custom"},
  {title: "Read ten pages", art: "custom"},
]

// Five rows keep every button hand-sized on a card that still fits the narrow display.
export const MAX_TASKS = 5

/** The presets you can still pick: a task that belongs to something in the flat can only be on the list once. */
export function presetsFor(editingId: string | null): TaskPreset[] {
  const state = SmallWinsState.instance
  return TASK_PRESETS.filter((p) => !p.id || p.id === editingId || !state.getTask(p.id))
}

/** The sample day. Nothing is remembered between preview runs (brief: out of scope). */
export class SmallWinsState {
  private static _instance: SmallWinsState | null = null
  static get instance(): SmallWinsState {
    if (!SmallWinsState._instance) SmallWinsState._instance = new SmallWinsState()
    return SmallWinsState._instance
  }

  tasks: SmallWinsTask[] = []
  /** Earned stickers in the order they were earned. Max 5 are shown in the strip. */
  stickers: {taskId: string; art: StickerArt; label: string}[] = []
  reducedMotion = false
  onChanged = new Event<void>()
  /** Each time something gets done, so the day can notice when you've earned a break. */
  onCompleted = new Event<SmallWinsTask>()

  private nextId = 1

  constructor() {
    this.reset()
  }

  reset(): void {
    this.tasks = [
      {id: TASK_LAUNDRY, title: "Do the laundry", done: false, art: "clothes"},
      {id: TASK_DISHES, title: "Load the dishwasher", done: false, art: "plate"},
      {id: TASK_MINDFUL, title: "Mindfulness moment", done: false, art: "pebbles"},
    ]
    this.stickers = []
    this.reducedMotion = false
    this.nextId = 1
  }

  getTask(id: string): SmallWinsTask | undefined {
    return this.tasks.find((t) => t.id === id)
  }

  /**
   * Marks a task done and saves its sticker. Only planned tasks earn one, so returns false if it was removed.
   * The art can differ from the task's own: any me-time exercise completes the mindfulness task, with its own sticker.
   */
  completeTask(id: string, art?: StickerArt): boolean {
    const task = this.getTask(id)
    if (!task) return false
    if (task.done && art === undefined) return false
    task.done = true
    this.addSticker(task, art)
    this.onChanged.invoke()
    this.onCompleted.invoke(task)
    return true
  }

  toggleTask(id: string): void {
    const task = this.getTask(id)
    if (!task) return
    task.done = !task.done
    if (task.done) this.addSticker(task)
    else this.stickers = this.stickers.filter((s) => s.taskId !== id)
    this.onChanged.invoke()
    if (task.done) this.onCompleted.invoke(task)
  }

  addTask(preset: TaskPreset): void {
    if (this.tasks.length >= MAX_TASKS) return
    if (preset.id && this.getTask(preset.id)) return
    this.tasks.push(this.taskFrom(preset))
    this.onChanged.invoke()
  }

  /** Edit swaps a task for another, in the same place on the list. Any sticker it had goes with it. */
  replaceTask(id: string, preset: TaskPreset): void {
    const index = this.tasks.findIndex((t) => t.id === id)
    if (index < 0) return
    if (preset.id && preset.id !== id && this.getTask(preset.id)) return
    this.stickers = this.stickers.filter((s) => s.taskId !== id)
    this.tasks[index] = this.taskFrom(preset)
    this.onChanged.invoke()
  }

  private taskFrom(preset: TaskPreset): SmallWinsTask {
    return {id: preset.id ?? "custom" + this.nextId++, title: preset.title, done: false, art: preset.art}
  }

  removeTask(id: string): void {
    this.tasks = this.tasks.filter((t) => t.id !== id)
    this.stickers = this.stickers.filter((s) => s.taskId !== id)
    this.onChanged.invoke()
  }

  setReducedMotion(on: boolean): void {
    this.reducedMotion = on
    this.onChanged.invoke()
  }

  private addSticker(task: SmallWinsTask, art?: StickerArt): void {
    if (this.stickers.some((s) => s.taskId === task.id)) return
    this.stickers.push({taskId: task.id, art: art ?? task.art, label: task.title})
  }
}
