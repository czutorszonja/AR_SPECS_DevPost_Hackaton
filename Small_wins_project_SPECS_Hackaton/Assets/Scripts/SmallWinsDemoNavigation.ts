import {setViewLimits} from "./SmallWinsViewer"

const DEG = Math.PI / 180
const EASE_RATE = 10

/**
 * Preview-only help for walking the demo room: J and L turn, I and K tilt, and the viewer stays
 * inside the walls. On real glasses you turn your own head and walk your own home, so it switches off.
 */
@component
export class SmallWinsDemoNavigation extends BaseScriptComponent {
  @input
  @hint("The camera, parented to this rig")
  viewerCamera: SceneObject

  @input
  @hint("Degrees per press of J or L")
  turnStep: number = 30

  @input
  @hint("Degrees per press of I or K")
  tiltStep: number = 15

  @input
  @hint("Furthest the view can tilt up or down, in degrees")
  maxTilt: number = 70

  @input
  @hint("Lowest corner the viewer can reach, in world cm")
  boundsMin: vec3 = new vec3(-395, -140, -100)

  @input
  @hint("Highest corner the viewer can reach, in world cm")
  boundsMax: vec3 = new vec3(227, 70, 360)

  @input
  @hint("Inside corner of the room's walls, in world cm")
  wallMin: vec3 = new vec3(-420, -160, -170)

  @input
  @hint("Opposite inside corner of the room's walls, in world cm")
  wallMax: vec3 = new vec3(250, 100, 380)

  @input
  @hint("Lowest corner of the kitchen run, in world cm")
  worktopMin: vec3 = new vec3(-172, -160, -170)

  @input
  @hint("Highest corner of the kitchen run, in world cm")
  worktopMax: vec3 = new vec3(172, -68, -108)

  private targetYaw = 0
  private targetTilt = 0
  private yaw = 0
  private tilt = 0
  private eye: vec3
  private lastLocal: vec3

  onAwake() {
    if (!global.deviceInfoSystem.isEditor()) return
    setViewLimits(this.wallMin, this.wallMax, this.worktopMin, this.worktopMax)
    this.createEvent("KeyPressEvent").bind((e) => this.onKey(e.key))
    this.createEvent("LateUpdateEvent").bind(() => this.updateRig())
  }

  private onKey(key: Keys): void {
    if (key === Keys.J) this.targetYaw += this.turnStep
    else if (key === Keys.L) this.targetYaw -= this.turnStep
    else if (key === Keys.I) this.targetTilt = Math.min(this.maxTilt, this.targetTilt + this.tiltStep)
    else if (key === Keys.K) this.targetTilt = Math.max(-this.maxTilt, this.targetTilt - this.tiltStep)
  }

  private updateRig(): void {
    const camera = this.viewerCamera.getTransform()
    const rig = this.getTransform()
    const local = camera.getLocalPosition()
    if (!this.eye) {
      this.eye = camera.getWorldPosition()
      this.lastLocal = local
    }

    const k = Math.min(1, getDeltaTime() * EASE_RATE)
    this.yaw += (this.targetYaw - this.yaw) * k
    this.tilt += (this.targetTilt - this.tilt) * k
    const facing = quat.fromEulerVec(new vec3(0, this.yaw * DEG, 0))
    const rotation = facing.multiply(quat.fromEulerVec(new vec3(this.tilt * DEG, 0, 0)))

    // Walk where you face on the level, whatever the tilt, and stop at the walls.
    this.eye = this.keepInside(this.eye.add(facing.multiplyVec3(local.sub(this.lastLocal))))
    this.lastLocal = local

    rig.setWorldRotation(rotation)
    rig.setWorldPosition(this.eye.sub(rotation.multiplyVec3(local)))
  }

  private keepInside(p: vec3): vec3 {
    return new vec3(this.clamp(p.x, this.boundsMin.x, this.boundsMax.x), this.clamp(p.y, this.boundsMin.y, this.boundsMax.y), this.clamp(p.z, this.boundsMin.z, this.boundsMax.z))
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
  }
}
