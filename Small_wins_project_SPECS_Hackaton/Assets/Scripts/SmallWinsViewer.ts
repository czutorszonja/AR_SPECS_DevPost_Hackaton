import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"

export interface ViewerPose {
  position: vec3
  forward: vec3
}

let overridePose: ViewerPose | null = null

/** Where the wearer is and where they look. Everything spatial reads through here. */
export function viewerPose(): ViewerPose {
  if (overridePose) return overridePose
  const t = WorldCameraFinderProvider.getInstance().getTransform()
  return {position: t.getWorldPosition(), forward: t.back}
}

/** LEAF cannot walk the preview camera, so door tests stand in a pose here. Null restores the camera. */
export function setViewerOverride(pose: ViewerPose | null): void {
  overridePose = pose
}

/** World position in front of the viewer, levelled so that looking down doesn't drag UI into the floor. */
export function pointInFront(distance: number, right: number, up: number): vec3 {
  const pose = viewerPose()
  const flat = flatForward(pose.forward)
  const side = flat.cross(vec3.up()).normalize()
  return pose.position.add(flat.uniformScale(distance)).add(side.uniformScale(right)).add(vec3.up().uniformScale(up))
}

/** World position fixed to the view itself, including tilt, for controls that hold a corner of the display. */
export function pointInView(distance: number, right: number, up: number): vec3 {
  const pose = viewerPose()
  const side = flatForward(pose.forward).cross(vec3.up()).normalize()
  const above = side.cross(pose.forward).normalize()
  return pose.position.add(pose.forward.uniformScale(distance)).add(side.uniformScale(right)).add(above.uniformScale(up))
}

/** Yaw-only rotation that points an object's +Z at the viewer, so panels stay upright. */
export function faceViewer(from: vec3): quat {
  const to = viewerPose().position.sub(from)
  const flat = new vec3(to.x, 0, to.z)
  if (flat.length < 0.001) return quat.quatIdentity()
  return quat.lookAt(flat.normalize(), vec3.up())
}

export interface InViewOptions {
  /** How far off the line of sight it may sit before it starts to move, in degrees. */
  maxDegrees: number
  /** How far away it settles when it moves, and the furthest it may stay, in cm. */
  maxDistance: number
  /** The middle of the content, this far below the object's origin, in cm. Negative is above. */
  drop?: number
  /** Jump straight there, for something just appearing. */
  snap?: boolean
}

const FOLLOW_RATE = 3
const MIN_DISTANCE = 45
const WALL_GAP = 3
const DEG = Math.PI / 180

let walls: {min: vec3; max: vec3} | null = null
let solid: {min: vec3; max: vec3} | null = null

/** The demo room's walls and worktop, so in-view content isn't drawn behind them. Real rooms hide nothing. */
export function setViewLimits(wallMin: vec3, wallMax: vec3, solidMin: vec3, solidMax: vec3): void {
  walls = {min: wallMin, max: wallMax}
  solid = {min: solidMin, max: solidMax}
}

/**
 * Leaves content where it belongs while you can see it, and eases it back into view when you can't.
 * The display is narrow (about 36 degrees across), so something on the wall is easily missed.
 */
export function keepInView(t: Transform, options: InViewOptions): void {
  const pose = viewerPose()
  const offset = new vec3(0, options.drop ?? 0, 0)
  const position = t.getWorldPosition()
  const toContent = position.sub(offset).sub(pose.position)
  const distance = toContent.length
  if (distance < 0.001) return
  const direction = toContent.uniformScale(1 / distance)
  const angle = Math.acos(Math.max(-1, Math.min(1, direction.dot(pose.forward))))
  const limit = options.maxDegrees * DEG
  if (angle <= limit && distance <= options.maxDistance) return

  const aim = angle > limit ? towards(pose.forward, direction, angle, limit) : direction
  // Always settle at a set distance: keeping the current one would creep closer on every turn.
  const reach = Math.max(MIN_DISTANCE, Math.min(options.maxDistance, clearDistance(pose.position, aim) - WALL_GAP))
  const target = pose.position.add(aim.uniformScale(reach)).add(offset)
  const k = options.snap ? 1 : Math.min(1, getDeltaTime() * FOLLOW_RATE)
  const next = vec3.lerp(position, target, k)
  t.setWorldPosition(next)
  t.setWorldRotation(faceViewer(next))
}

/** The direction at the given angle from one direction, turned towards another. */
function towards(from: vec3, to: vec3, between: number, angle: number): vec3 {
  const s = Math.sin(between)
  if (s < 0.001) return from
  return from.uniformScale(Math.sin(between - angle) / s).add(to.uniformScale(Math.sin(angle) / s)).normalize()
}

/** How far a ray travels before it meets a wall or the worktop. */
function clearDistance(origin: vec3, direction: vec3): number {
  let clear = Number.MAX_VALUE
  if (walls) {
    for (const axis of ["x", "y", "z"] as const) {
      const d = direction[axis]
      if (Math.abs(d) < 0.0001) continue
      const hit = ((d > 0 ? walls.max[axis] : walls.min[axis]) - origin[axis]) / d
      if (hit > 0) clear = Math.min(clear, hit)
    }
  }
  if (solid) {
    let enter = 0
    let exit = Number.MAX_VALUE
    for (const axis of ["x", "y", "z"] as const) {
      const d = direction[axis]
      if (Math.abs(d) < 0.0001) {
        if (origin[axis] < solid.min[axis] || origin[axis] > solid.max[axis]) exit = -1
        continue
      }
      const a = (solid.min[axis] - origin[axis]) / d
      const b = (solid.max[axis] - origin[axis]) / d
      enter = Math.max(enter, Math.min(a, b))
      exit = Math.min(exit, Math.max(a, b))
    }
    if (enter > 0 && enter <= exit) clear = Math.min(clear, enter)
  }
  return clear
}

function flatForward(forward: vec3): vec3 {
  const flat = new vec3(forward.x, 0, forward.z)
  return flat.length < 0.001 ? new vec3(0, 0, -1) : flat.normalize()
}
