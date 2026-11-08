import {BackPlate} from "SpectaclesUIKit.lspkg/Scripts/BackPlate"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {FlexItem} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem"
import {FlexLayout} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {FlexAlign, FlexDirection, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {GradientParameters, RoundedRectangle} from "SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangle"
import {RoundedRectangleVisual} from "SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangleVisual"
import {StickerArt} from "./SmallWinsState"

const IMAGE_MATERIAL = requireAsset("../Materials/ImageMaterial.mat") as Material

export const TEX = {
  plate: requireAsset("../Textures/StickerPlate.png") as Texture,
  clothes: requireAsset("../Textures/StickerClothes_256x256.png") as Texture,
  pebbles: requireAsset("../Textures/StickerPebbles_256x256.png") as Texture,
  custom: requireAsset("../Textures/StickerCustom_256x256.png") as Texture,
  outline: requireAsset("../Textures/StickerOutline_256x256.png") as Texture,
  star: requireAsset("../Textures/StarGold.png") as Texture,
  // Sticker holders in the flat: teal edges so they stand out on the warm cream and yellow walls.
  holderOutline: requireAsset("../Textures/HolderOutline_512x512.png") as Texture,
  holderStar: requireAsset("../Textures/HolderStar_512x512.png") as Texture,
  ring: requireAsset("../Textures/GoldRing_256x256.png") as Texture,
  square: requireAsset("../Textures/BreathSquareTeal.png") as Texture,
  dot: requireAsset("../Textures/BreathDot_128x128.png") as Texture,
  hand: requireAsset("../Textures/RaisedHand.png") as Texture,
  outside: requireAsset("../Textures/OutsideView.png") as Texture,
  calm: requireAsset("../Textures/StickerCalm_256x256.png") as Texture,
  drawing: requireAsset("../Textures/StickerDrawing_256x256.png") as Texture,
  ink: requireAsset("../Textures/Ink.png") as Texture,
  focus: requireAsset("../Textures/FocusDot_128x128.png") as Texture,
  pen: requireAsset("../Textures/PenDot_128x128.png") as Texture,
  sprigWash: requireAsset("../Textures/SprigWash_680x480.png") as Texture,
  sprigGuide: requireAsset("../Textures/SprigGuide_680x480.png") as Texture,
  plant: requireAsset("../Textures/StickerPlant_256x256.png") as Texture,
  book: requireAsset("../Textures/StickerBook_256x256.png") as Texture,
  cat: requireAsset("../Textures/StickerCat_256x256.png") as Texture,
  phone: requireAsset("../Textures/StickerPhone_256x256.png") as Texture,
  table: requireAsset("../Textures/StickerTable_256x256.png") as Texture,
  droplet: requireAsset("../Textures/Droplet_64x64.png") as Texture,
  heart: requireAsset("../Textures/Heart_96x96.png") as Texture,
}

export function stickerTexture(art: StickerArt): Texture {
  return TEX[art]
}

/** Brighter teal than the storyboard, because the display only adds light (brief: Risks). */
export const PANEL_TEAL = new vec4(0.1, 0.46, 0.43, 1)
// A card this tall (cm) would hide what's in front of you, so you could walk into a chair or a person:
// big cards let the room show through. Small message strips stay solid, so a line of text is easy to read.
const SEE_THROUGH_FROM_HEIGHT = 10
const PANEL_SEE_THROUGH = new vec4(PANEL_TEAL.r, PANEL_TEAL.g, PANEL_TEAL.b, 0.8)
// With the room showing through, writing on a big card is larger and heavier so it stays readable.
const CARD_TEXT_SCALE = 1.15
// This font has one weight, so a thin outline in the letters' own colour is what thickens them.
const CARD_TEXT_THICKNESS = 0.12
// One teal: a button is the card's own colour, and its cream outline is what says you can press it.
const BUTTON_TEAL = PANEL_TEAL
const BUTTON_OUTLINE = new vec4(1, 0.98, 0.9, 1)
const BUTTON_OUTLINE_SIZE = 0.14
const BUTTON_HOVER = new vec4(0.38, 0.84, 0.76, 1)
const BUTTON_PRESSED = new vec4(0.55, 0.92, 0.82, 1)
export const TEXT_LIGHT = new vec4(1, 0.98, 0.9, 1)
export const TEXT_SOFT = new vec4(0.86, 0.95, 0.88, 1)

// Type scale from the Specs spec. Sizes are calibrated at 110 cm, so pass the panel's distance.
export type TextRole = "Title" | "Headline" | "Subheadline" | "Body" | "Caption"
const TYPE_SCALE: Record<TextRole, {size: number; weight: number}> = {
  Title: {size: 62, weight: 700},
  Headline: {size: 48, weight: 700},
  Subheadline: {size: 41, weight: 700},
  Body: {size: 39, weight: 500},
  Caption: {size: 38, weight: 500},
}

export function child(parent: SceneObject, name: string, position?: vec3): SceneObject {
  const so = global.scene.createSceneObject(name)
  so.setParent(parent)
  if (position) so.getTransform().setLocalPosition(position)
  return so
}

export interface TextOptions {
  role?: TextRole
  distance?: number
  width: number
  height: number
  color?: vec4
  wrap?: boolean
  align?: HorizontalAlignment
  /** Larger, heavier writing. By default, only for writing straight on a see-through card. */
  emphasis?: boolean
}

/** Whether writing placed here sits on a see-through card, rather than on a button or a solid strip. */
function isOnSeeThroughCard(parent: SceneObject): boolean {
  for (let so: SceneObject | null = parent; so; so = so.getParent()) {
    if (so.getComponent(Button.getTypeName())) return false
    const plate = so.getComponent(BackPlate.getTypeName()) as BackPlate | null
    if (plate) return plate.size.y >= SEE_THROUGH_FROM_HEIGHT
  }
  return false
}

export function addText(parent: SceneObject, name: string, value: string, opts: TextOptions): Text {
  const so = child(parent, name)
  const text = so.createComponent("Component.Text") as Text
  const style = TYPE_SCALE[opts.role ?? "Body"]
  text.text = value
  text.depthTest = true
  const emphasis = opts.emphasis ?? isOnSeeThroughCard(parent)
  text.size = style.size * ((opts.distance ?? 110) / 110) * (emphasis ? CARD_TEXT_SCALE : 1)
  ;(text as Text & {weight?: number}).weight = style.weight
  text.horizontalAlignment = opts.align ?? HorizontalAlignment.Center
  text.verticalAlignment = VerticalAlignment.Center
  text.horizontalOverflow = opts.wrap ? HorizontalOverflow.Wrap : HorizontalOverflow.Overflow
  text.verticalOverflow = VerticalOverflow.Overflow
  text.layoutRect = Rect.create(-opts.width / 2, opts.width / 2, -opts.height / 2, opts.height / 2)
  text.textFill.color = opts.color ?? TEXT_LIGHT
  if (emphasis) {
    text.outlineSettings.enabled = true
    text.outlineSettings.fill.color = opts.color ?? TEXT_LIGHT
    text.outlineSettings.size = CARD_TEXT_THICKNESS
  }
  return text
}

/** An image that lives in the room or on a panel. Size is width and height in cm. */
export function addImage(parent: SceneObject, name: string, texture: Texture, width: number, height?: number): Image {
  const so = child(parent, name)
  const image = so.createComponent("Component.Image") as Image
  const mat = IMAGE_MATERIAL.clone()
  mat.mainPass.baseTex = texture
  mat.mainPass.depthTest = true
  mat.mainPass.depthWrite = false
  image.clearMaterials()
  image.addMaterial(mat)
  sizeImage(image, width, height ?? width)
  return image
}

/** Component.Image is a 1 x 1 unit quad, so its scale is its size in centimetres. */
export function sizeImage(image: Image, width: number, height: number): void {
  image.getSceneObject().getTransform().setLocalScale(new vec3(width, height, 1))
}

export function setImageAlpha(image: Image, alpha: number): void {
  image.mainPass.baseColor = new vec4(1, 1, 1, alpha)
}

export function setImageColor(image: Image, color: vec4): void {
  image.mainPass.baseColor = color
}

/** One material for many images of the same colour, such as the segments of a drawn line. */
export function makeImageMaterial(texture: Texture, color: vec4): Material {
  const mat = IMAGE_MATERIAL.clone()
  mat.mainPass.baseTex = texture
  mat.mainPass.baseColor = color
  mat.mainPass.depthTest = true
  mat.mainPass.depthWrite = false
  return mat
}

/** A thin bar from one point to another on a flat surface, in that surface's centimetres. */
export function addSegment(parent: SceneObject, name: string, mat: Material, from: vec2, to: vec2, thickness: number, z: number): SceneObject {
  const so = child(parent, name)
  const image = so.createComponent("Component.Image") as Image
  image.clearMaterials()
  image.addMaterial(mat)
  const d = to.sub(from)
  const t = so.getTransform()
  t.setLocalPosition(new vec3((from.x + to.x) / 2, (from.y + to.y) / 2, z))
  t.setLocalRotation(quat.fromEulerVec(new vec3(0, 0, Math.atan2(d.y, d.x))))
  t.setLocalScale(new vec3(d.length + thickness * 0.6, thickness, 1))
  return so
}

export function setImageTexture(image: Image, texture: Texture): void {
  image.mainPass.baseTex = texture
}

/** A flat teal surface. UIKit's BackPlate only offers grey styles, so its rectangle is recoloured once it exists. */
export function addPanel(script: BaseScriptComponent, host: SceneObject, width: number, height: number, solid: boolean = false): BackPlate {
  const plate = host.createComponent(BackPlate.getTypeName()) as BackPlate
  plate.size = new vec2(width, height)
  const tint = script.createEvent("DelayedCallbackEvent")
  tint.bind(() => tintPanel(host, solid))
  tint.reset(0)
  return plate
}

export function tintPanel(host: SceneObject, solid: boolean = false): void {
  const rect = host.getComponent(RoundedRectangle.getTypeName()) as RoundedRectangle | null
  if (!rect) return
  const plate = host.getComponent(BackPlate.getTypeName()) as BackPlate | null
  rect.gradient = false
  rect.backgroundColor = !solid && plate && plate.size.y >= SEE_THROUGH_FROM_HEIGHT ? PANEL_SEE_THROUGH : PANEL_TEAL
}

export function flexContainer(
  parent: SceneObject,
  name: string,
  direction: FlexDirection,
  width: number,
  height: number,
  gap: number,
  justify: FlexJustify = FlexJustify.Center,
): SceneObject {
  const so = child(parent, name)
  const flex = so.createComponent(FlexLayout.getTypeName()) as FlexLayout
  flex.autoDiscoverItemsOnStart = false
  flex.onInitialized.add(() => {
    flex.width = width
    flex.height = height
    flex.direction = direction
    if (direction === FlexDirection.Row) flex.columnGap = gap
    else flex.rowGap = gap
    flex.justifyContent = justify
    flex.alignItems = FlexAlign.Center
  })
  return so
}

/** Registers a child with its parent's layout. Without this a FlexLayout stacks children at its origin. */
export function flexPlace(so: SceneObject, width: number, height: number): void {
  const item = so.createComponent(FlexItem.getTypeName()) as FlexItem
  item.overrideWidth = width
  item.overrideHeight = height
  item.flexShrink = 0
  const parent = so.getParent()
  const flex = parent ? (parent.getComponent(FlexLayout.getTypeName()) as FlexLayout | null) : null
  if (flex) flex.addItems([item])
}

export function flexText(parent: SceneObject, name: string, value: string, opts: TextOptions): Text {
  const text = addText(parent, name, value, opts)
  flexPlace(text.getSceneObject(), opts.width, opts.height)
  return text
}

export interface ButtonHandle {
  button: Button
  label: Text
  so: SceneObject
}

/** Light teal that brightens when aimed at. UIKit's default dark grey would fade on the additive display. */
function styleButton(button: Button): void {
  const visual = button.visual as RoundedRectangleVisual
  visual.baseDefaultColor = BUTTON_TEAL
  visual.baseHoveredColor = BUTTON_HOVER
  visual.baseTriggeredColor = BUTTON_PRESSED
  // Each state also keeps its own gradient, which wins over the base colour in this style.
  visual.defaultGradient = solidGradient(BUTTON_TEAL)
  visual.hoveredGradient = solidGradient(BUTTON_HOVER)
  visual.triggeredGradient = solidGradient(BUTTON_PRESSED)
  // Likewise, each state's border is drawn from its gradient, not from its border colour.
  visual.borderDefaultGradient = solidGradient(BUTTON_OUTLINE)
  visual.borderHoveredGradient = solidGradient(BUTTON_OUTLINE)
  visual.borderTriggeredGradient = solidGradient(BUTTON_OUTLINE)
  visual.defaultHasBorder = true
  visual.hoveredHasBorder = true
  visual.triggeredHasBorder = true
  visual.defaultBorderSize = BUTTON_OUTLINE_SIZE
  visual.hoveredBorderSize = BUTTON_OUTLINE_SIZE
  visual.triggeredBorderSize = BUTTON_OUTLINE_SIZE
}

/** A button whose picture is the whole of it: no shape of its own, and the picture grows a little when you aim at it. */
export function makePictureButton(button: Button, picture: SceneObject): void {
  const t = picture.getTransform()
  const rest = t.getLocalScale()
  button.onInitialized.add(() => (button.visual.renderMeshVisual.enabled = false))
  button.onHoverEnter.add(() => t.setLocalScale(rest.uniformScale(1.15)))
  button.onHoverExit.add(() => t.setLocalScale(rest))
}

function solidGradient(color: vec4): GradientParameters {
  return {
    type: "Linear",
    start: new vec2(-1, 0),
    end: new vec2(1, 0),
    stop0: {enabled: true, color, percent: 0},
    stop1: {enabled: true, color, percent: 1},
  } as GradientParameters
}

/** UIKit button with a light label. The name is what LEAF finds it by, so keep it stable. */
export function addButton(
  parent: SceneObject,
  name: string,
  label: string,
  width: number,
  height: number,
  onPress: () => void,
  distance: number = 110,
): ButtonHandle {
  const so = child(parent, name)
  const button = so.createComponent(Button.getTypeName()) as Button
  button.size = new vec3(width, height, 1)
  button.onInitialized.add(() => {
    button.size = new vec3(width, height, 1)
    styleButton(button)
  })
  button.onTriggerUp.add(() => onPress())
  const text = addText(so, name + "Label", label, {role: "Body", distance, width: width - 0.4, height})
  text.getSceneObject().getTransform().setLocalPosition(new vec3(0, 0, 0.6))
  return {button, label: text, so}
}

export function flexButton(
  parent: SceneObject,
  name: string,
  label: string,
  width: number,
  height: number,
  onPress: () => void,
  distance: number = 110,
): ButtonHandle {
  const handle = addButton(parent, name, label, width, height, onPress, distance)
  flexPlace(handle.so, width, height)
  return handle
}

/** Fades everything in a subtree. Panels, buttons, text and images each keep alpha differently. */
export function fadeTree(root: SceneObject, alpha: number): void {
  const text = root.getComponent("Component.Text") as Text | null
  if (text) {
    const c = text.textFill.color
    text.textFill.color = new vec4(c.r, c.g, c.b, alpha)
    if (text.outlineSettings.enabled) text.outlineSettings.fill.color = new vec4(c.r, c.g, c.b, alpha)
  }
  const image = root.getComponent("Component.Image") as Image | null
  if (image) setImageAlpha(image, alpha)
  const rect = root.getComponent(RoundedRectangle.getTypeName()) as RoundedRectangle | null
  if (rect) rect.opacity = alpha
  const button = root.getComponent(Button.getTypeName()) as Button | null
  if (button) button.opacity = alpha
  for (let i = 0; i < root.getChildrenCount(); i++) fadeTree(root.getChild(i), alpha)
}

export function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t))
}

export function smooth(t: number): number {
  const c = clamp01(t)
  return c * c * (3 - 2 * c)
}

/** A small frame-driven tween, so sequences stay cancellable and readable from LEAF. */
/** Sticker holders bob gently while they wait for you. They keep still when `still` says so (reduced motion). */
export function floatGently(script: BaseScriptComponent, objects: SceneObject[], still: () => boolean): void {
  const bases = objects.map((o) => o.getTransform().getLocalPosition())
  let time = 0
  script.createEvent("UpdateEvent").bind(() => {
    time += getDeltaTime()
    objects.forEach((o, i) => {
      if (!o.enabled) return
      const lift = still() ? 0 : Math.sin(time * 1.6 + i * 1.3) * 1.6
      o.getTransform().setLocalPosition(bases[i].add(new vec3(0, lift, 0)))
    })
  })
}

export function tween(script: BaseScriptComponent, duration: number, update: (t: number) => void, done?: () => void): () => void {
  let elapsed = 0
  const event = script.createEvent("UpdateEvent")
  update(0)
  const cancel = () => {
    event.enabled = false
    script.removeEvent(event)
  }
  event.bind(() => {
    elapsed += getDeltaTime()
    const t = duration <= 0 ? 1 : clamp01(elapsed / duration)
    update(t)
    if (t >= 1) {
      cancel()
      if (done) done()
    }
  })
  return cancel
}

/**
 * A short "hurray" for a sticker: it pops in with one soft bounce, a gold ring pulses out behind it,
 * and a ring of stars bursts outwards, twinkles, and fades. Build it once, play it each time.
 */
export class StickerBurst {
  private stars: Image[] = []
  private ring: Image
  private centre: vec3

  constructor(
    root: SceneObject,
    private sticker: Image,
    private size: number,
    private count: number = 10,
  ) {
    this.centre = sticker.getSceneObject().getTransform().getLocalPosition()
    this.ring = addImage(root, sticker.getSceneObject().name + "Ring", TEX.ring, size)
    this.ring.getSceneObject().getTransform().setLocalPosition(this.centre.add(new vec3(0, 0, -0.05)))
    for (let i = 0; i < count; i++) {
      const star = addImage(root, sticker.getSceneObject().name + "Star" + i, TEX.star, 2)
      star.getSceneObject().getTransform().setLocalPosition(this.centre.add(new vec3(0, 0, 0.1)))
      this.stars.push(star)
    }
  }

  play(script: BaseScriptComponent, seconds: number = 1.8): void {
    const sticker = this.sticker
    tween(script, seconds, (k) => {
      const t = k * seconds
      const pop = burstPop(t) * this.size
      sizeImage(sticker, pop, pop)
      const ringK = clamp01(t / 0.7)
      sizeImage(this.ring, this.size * (0.6 + 0.9 * ringK), this.size * (0.6 + 0.9 * ringK))
      setImageAlpha(this.ring, t < 0.7 ? Math.sin(ringK * Math.PI) : 0)
      this.stars.forEach((star, i) => {
        const angle = (i / this.count) * Math.PI * 2 + 0.3
        const out = smooth(t / 0.8)
        const radius = this.size * (0.35 + out * (0.55 + 0.2 * (i % 2)))
        star.getSceneObject().getTransform().setLocalPosition(this.centre.add(new vec3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.1)))
        const twinkle = 0.5 + 0.5 * Math.sin(t * 9 + i * 1.7)
        const starSize = (i % 3 === 0 ? 3 : 2.2) * (0.7 + 0.5 * twinkle) * Math.min(1, t / 0.15)
        sizeImage(star, starSize, starSize)
        setImageAlpha(star, (0.55 + 0.45 * twinkle) * (1 - clamp01((t - seconds * 0.55) / (seconds * 0.45))))
      })
    })
  }
}

/** Up past full size, a small dip, then settle. */
function burstPop(t: number): number {
  if (t < 0.25) return 1.2 * smooth(t / 0.25)
  if (t < 0.45) return 1.2 + (0.94 - 1.2) * smooth((t - 0.25) / 0.2)
  if (t < 0.65) return 0.94 + 0.06 * smooth((t - 0.45) / 0.2)
  return 1
}
