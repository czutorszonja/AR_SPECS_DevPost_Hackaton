import {InteractionManager} from "SpectaclesInteractionKit.lspkg/Core/InteractionManager/InteractionManager"
import {InteractorInputType} from "SpectaclesInteractionKit.lspkg/Core/Interactor/Interactor"
import {setViewLimits} from "./SmallWinsViewer"

const DEG = Math.PI / 180
const EASE_RATE = 10
const SIT_RATE = 4
const MOUSE_REACH = 1500

/**
 * Preview-only help for walking the demo room: J and L turn, I and K tilt, the viewer stays inside
 * the walls, and can sit down. On real glasses you do all of this yourself, so it switches off.
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
  boundsMin: vec3 = new vec3(-372, -140, -100)

  @input
  @hint("Highest corner the viewer can reach, in world cm")
  boundsMax: vec3 = new vec3(526, 110, 846)

  @input
  @hint("Inside corner of the room's walls, in world cm")
  wallMin: vec3 = new vec3(-420, -160, -170)

  @input
  @hint("Opposite inside corner of the room's walls, in world cm")
  wallMax: vec3 = new vec3(572, 140, 890)

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
  private startEye: vec3
  private moveTarget: vec3 | null = null
  private seated = false
  /** Top speeds for a calm, filmable camera. Unlimited unless something (like the demo run) asks for it. */
  maxTurnSpeed = Infinity
  maxMoveSpeed = Infinity

  get isSeated(): boolean {
    return this.seated
  }

  /** True once the viewer has arrived and stopped turning. */
  get isSettled(): boolean {
    return this.moveTarget === null && Math.abs(this.targetYaw - this.yaw) < 0.5 && Math.abs(this.targetTilt - this.tilt) < 0.5
  }

  /** For diagnosing a camera that won't come to rest. */
  get debugState(): string {
    const m = this.moveTarget ? this.eye.distance(this.moveTarget).toFixed(2) : "none"
    return "yaw " + this.yaw.toFixed(2) + "/" + this.targetYaw.toFixed(2) + " tilt " + this.tilt.toFixed(2) + "/" + this.targetTilt.toFixed(2) + " move " + m
  }

  /** Turns on the spot by this many degrees, positive to the left; a full 360 goes all the way round. */
  turnBy(degrees: number): void {
    this.targetYaw += degrees
  }

  /** Eases the viewer to a seat, facing the way they'd face sitting there. They stay put until they stand. */
  sitAt(eye: vec3): void {
    this.seated = true
    this.moveTarget = eye
    this.faceAhead()
  }

  standAt(eye: vec3): void {
    this.seated = false
    this.moveTarget = eye
  }

  /** Walks to a spot and turns to look at something there, as a person would. */
  standLooking(eye: vec3, target: vec3): void {
    this.standAt(eye)
    this.turnToward(eye, target)
  }

  /** Turns the head towards something without moving, seated or standing. */
  lookToward(target: vec3): void {
    this.turnToward(this.moveTarget ?? this.eye ?? target, target)
  }

  private turnToward(eye: vec3, target: vec3): void {
    const d = target.sub(eye).normalize()
    let wanted = Math.atan2(-d.x, -d.z) / DEG
    while (wanted - this.yaw > 180) wanted -= 360
    while (wanted - this.yaw < -180) wanted += 360
    this.targetYaw = wanted
    this.targetTilt = Math.max(-this.maxTilt, Math.min(this.maxTilt, Math.asin(d.y) / DEG))
  }

  /** Turns to face -Z, allowing for any turn already made with the preview's own camera controls. */
  private faceAhead(): void {
    const look = this.viewerCamera.getTransform().getLocalRotation().multiplyVec3(new vec3(0, 0, -1))
    let wanted = Math.atan2(look.x, -look.z) / DEG
    while (wanted - this.yaw > 180) wanted -= 360
    while (wanted - this.yaw < -180) wanted += 360
    this.targetYaw = wanted
    this.targetTilt = 0
  }

  onAwake() {
    if (!global.deviceInfoSystem.isEditor()) return
    setViewLimits(this.wallMin, this.wallMax, this.worktopMin, this.worktopMax)
    this.createEvent("OnStartEvent").bind(() => this.extendMouseReach())
    this.createEvent("KeyPressEvent").bind((e) => this.onKey(e.key))
    this.createEvent("LateUpdateEvent").bind(() => this.updateRig())
  }

  /**
   * The mouse pointer stops at 500 cm, which is less than the width of this demo room, and SIK has no
   * setting for it. Hands keep their usual reach: this only lets the preview's mouse cross the room.
   */
  private extendMouseReach(): void {
    const mice = InteractionManager.getInstance().getInteractorsByType(InteractorInputType.Mouse) as unknown as {
      _maxRaycastDistance: number
      mouseTargetProvider: {config: {maxRayDistance: number}}
    }[]
    for (const mouse of mice) {
      mouse._maxRaycastDistance = MOUSE_REACH
      mouse.mouseTargetProvider.config.maxRayDistance = MOUSE_REACH
    }
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
      this.startEye = rig.getWorldPosition()
      this.lastLocal = local
    }

    // The preview's Reset button puts its camera back, so go back to the start too.
    if (local.length < 0.01 && this.lastLocal.length > 1) {
      this.eye = this.startEye
      this.seated = false
      this.moveTarget = null
      this.yaw = this.targetYaw = 0
      this.tilt = this.targetTilt = 0
      this.lastLocal = local
    }

    const dt = getDeltaTime()
    const k = Math.min(1, dt * EASE_RATE)
    // Unlimited stays unlimited even on a frame where no time passes (Infinity x 0 is not a number).
    const turn = isFinite(this.maxTurnSpeed) ? this.maxTurnSpeed * dt : Infinity
    this.yaw += clampAbs((this.targetYaw - this.yaw) * k, turn)
    this.tilt += clampAbs((this.targetTilt - this.tilt) * k, turn)
    const facing = quat.fromEulerVec(new vec3(0, this.yaw * DEG, 0))
    const rotation = facing.multiply(quat.fromEulerVec(new vec3(this.tilt * DEG, 0, 0)))

    if (this.moveTarget) {
      let step = vec3.lerp(this.eye, this.moveTarget, Math.min(1, dt * SIT_RATE)).sub(this.eye)
      if (isFinite(this.maxMoveSpeed) && step.length > this.maxMoveSpeed * dt) step = step.normalize().uniformScale(this.maxMoveSpeed * dt)
      this.eye = this.eye.add(step)
      if (this.eye.distance(this.moveTarget) < 0.5) {
        this.eye = this.moveTarget
        this.moveTarget = null
      }
    } else if (!this.seated) {
      // Walk where you face on the level, whatever the tilt, and stop at the walls.
      this.eye = this.keepInside(this.eye.add(facing.multiplyVec3(local.sub(this.lastLocal))))
    }
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

function clampAbs(value: number, limit: number): number {
  return Math.max(-limit, Math.min(limit, value))
}
