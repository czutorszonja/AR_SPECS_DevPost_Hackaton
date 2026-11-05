import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"

export type StickerArt = "plate" | "clothes" | "pebbles" | "custom" | "calm" | "drawing"

export interface SmallWinsTask {
  id: string
  title: string
  done: boolean
  art: StickerArt
}

export const TASK_LAUNDRY = "laundry"
export const TASK_DISHES = "dishes"
export const TASK_MINDFUL = "mindful"

/** Add and Edit pick from this list: the AR keyboard does not appear in SPECS 27 preview. */
export const TASK_PRESETS = [
  "Water the plants",
  "Call a friend",
  "Go for a short walk",
  "Read ten pages",
  "Tidy the desk",
]

// Four rows keep every button hand-sized on a page that still fits the narrow display.
export const MAX_TASKS = 4

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
    task.done = true
    this.addSticker(task, art)
    this.onChanged.invoke()
    return true
  }

  toggleTask(id: string): void {
    const task = this.getTask(id)
    if (!task) return
    task.done = !task.done
    if (task.done) this.addSticker(task)
    else this.stickers = this.stickers.filter((s) => s.taskId !== id)
    this.onChanged.invoke()
  }

  addTask(title: string): void {
    if (this.tasks.length >= MAX_TASKS) return
    this.tasks.push({id: "custom" + this.nextId++, title, done: false, art: "custom"})
    this.onChanged.invoke()
  }

  renameTask(id: string, title: string): void {
    const task = this.getTask(id)
    if (!task) return
    task.title = title
    this.stickers.filter((s) => s.taskId === id).forEach((s) => (s.label = title))
    this.onChanged.invoke()
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
