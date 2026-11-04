import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {findInteractablesByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {findSceneObjectByName, nextFrame, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {setViewerOverride, viewerPose} from "../Scripts/SmallWinsViewer"

const STEER_GAIN = 0.15
const CARRY_MS = 1500

export function so(name: string): SceneObject {
  const found = findSceneObjectByName(name)
  if (!found) throw new Error(`Scene object "${name}" not found`)
  return found
}

export function shown(name: string): boolean {
  const found = findSceneObjectByName(name)
  return !!found && found.isEnabledInHierarchy
}

export function textOf(name: string): string {
  return (so(name).getComponent("Component.Text") as Text).text
}

export function worldPos(name: string): vec3 {
  return so(name).getTransform().getWorldPosition()
}

export function imageTexture(name: string): Texture {
  return (so(name).getComponent("Component.Image") as Image).mainPass.baseTex
}

export function imageAlpha(name: string): number {
  return (so(name).getComponent("Component.Image") as Image).mainPass.baseColor.a
}

/** Stands about a metre back from an anchor on the wall, looking straight at it. */
export function faceAnchor(name: string): void {
  setViewerOverride({position: worldPos(name).add(new vec3(0, 0, 100)), forward: new vec3(0, 0, -1)})
}

/** Degrees between where the viewer looks and a point. The display is only about 36 degrees across. */
export function viewAngle(point: vec3): number {
  const pose = viewerPose()
  const direction = point.sub(pose.position).normalize()
  return Math.acos(Math.max(-1, Math.min(1, direction.dot(pose.forward)))) * (180 / Math.PI)
}

/** Polls instead of sleeping for a fixed time, so a slow frame doesn't fail a test. */
export async function waitFor(what: string, condition: () => boolean, timeoutMs: number = 15000): Promise<void> {
  let waited = 0
  while (!condition()) {
    if (waited >= timeoutMs) throw new Error(`Timed out after ${timeoutMs} ms waiting for: ${what}`)
    await sleep(50)
    waited += 50
  }
}

export class SmallWinsLeafInteractor extends DefaultLeafInteractor {
  /** Pinches a button: finds it by scene object name, enabled only. */
  async tap(name: string): Promise<void> {
    const target = findInteractablesByName(name, undefined, true)[0]
    if (!target) throw new Error(`Button "${name}" is not on screen`)
    await this.trigger(target)
    await sleep(250)
  }

  /**
   * Pinches an item, carries it to a point in the world, and releases it there.
   * LEAF applies a drag vector every frame, so this steers the vector towards the
   * destination, slowing as it arrives, the way a hand would.
   */
  async dragTo(name: string, destination: vec3): Promise<void> {
    const target = findInteractablesByName(name, undefined, true)[0]
    if (!target) throw new Error(`Item "${name}" cannot be grabbed`)
    const transform = target.getSceneObject().getTransform()
    const step = new vec3(0, 0, 0)
    let carrying = true
    const steer = async () => {
      while (carrying) {
        const remaining = destination.sub(transform.getWorldPosition())
        step.x = remaining.x * STEER_GAIN
        step.y = remaining.y * STEER_GAIN
        step.z = remaining.z * STEER_GAIN
        await nextFrame()
      }
    }
    steer()
    await this.drag(target, step, CARRY_MS)
    carrying = false
    await sleep(600)
  }

  async loadDishes(): Promise<void> {
    const zone = worldPos("DishwasherDropZone")
    await this.dragTo("DishPlate", zone)
    await this.dragTo("DishBowl", zone)
    await this.dragTo("DishMug", zone)
  }

  async loadLaundry(): Promise<void> {
    await this.dragTo("ClothesPile", worldPos("WasherDropZone"))
  }

  /** Both chores, then waits for the me-time invitation they lead to. */
  async doBothChores(): Promise<void> {
    await sleep(1200)
    faceAnchor("DishRewardAnchor")
    await this.loadDishes()
    await waitFor("the dishes reward to end", () => !shown("RewardPlate") && !shown("RewardMessageRoot"), 14000)
    faceAnchor("LaundryRewardAnchor")
    await this.loadLaundry()
    await waitFor("the me-time invitation", () => shown("MeTimeInvitation"), 18000)
    await sleep(500)
  }
}
