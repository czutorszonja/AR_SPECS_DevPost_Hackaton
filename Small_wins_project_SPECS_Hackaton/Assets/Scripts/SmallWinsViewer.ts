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

/** Yaw-only rotation that points an object's +Z at the viewer, so panels stay upright. */
export function faceViewer(from: vec3): quat {
  const to = viewerPose().position.sub(from)
  const flat = new vec3(to.x, 0, to.z)
  if (flat.length < 0.001) return quat.quatIdentity()
  return quat.lookAt(flat.normalize(), vec3.up())
}

function flatForward(forward: vec3): vec3 {
  const flat = new vec3(forward.x, 0, forward.z)
  return flat.length < 0.001 ? new vec3(0, 0, -1) : flat.normalize()
}
