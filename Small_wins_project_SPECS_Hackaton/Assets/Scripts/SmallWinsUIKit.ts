import {BackPlate} from "SpectaclesUIKit.lspkg/Scripts/BackPlate"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {FlexItem} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem"
import {FlexLayout} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {FlexAlign, FlexDirection, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {RoundedRectangle} from "SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangle"
import {StickerArt} from "./SmallWinsState"

const IMAGE_MATERIAL = requireAsset("../Materials/ImageMaterial.mat") as Material

export const TEX = {
  plate: requireAsset("../Textures/StickerPlate.png") as Texture,
  clothes: requireAsset("../Textures/StickerClothes_256x256.png") as Texture,
  pebbles: requireAsset("../Textures/StickerPebbles_256x256.png") as Texture,
  custom: requireAsset("../Textures/StickerCustom_256x256.png") as Texture,
  outline: requireAsset("../Textures/StickerOutline_256x256.png") as Texture,
  star: requireAsset("../Textures/Star_128x128.png") as Texture,
  ring: requireAsset("../Textures/GoldRing_256x256.png") as Texture,
  square: requireAsset("../Textures/BreathSquare_512x512.png") as Texture,
  dot: requireAsset("../Textures/BreathDot_128x128.png") as Texture,
  hand: requireAsset("../Textures/RaisedHand.png") as Texture,
  outside: requireAsset("../Textures/OutsideView.png") as Texture,
}

export function stickerTexture(art: StickerArt): Texture {
  return TEX[art]
}

/** Brighter teal than the storyboard, because the display only adds light (brief: Risks). */
export const PANEL_TEAL = new vec4(0.13, 0.55, 0.51, 1)
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
}

export function addText(parent: SceneObject, name: string, value: string, opts: TextOptions): Text {
  const so = child(parent, name)
  const text = so.createComponent("Component.Text") as Text
  const style = TYPE_SCALE[opts.role ?? "Body"]
  text.text = value
  text.depthTest = true
  text.size = style.size * ((opts.distance ?? 110) / 110)
  ;(text as Text & {weight?: number}).weight = style.weight
  text.horizontalAlignment = opts.align ?? HorizontalAlignment.Center
  text.verticalAlignment = VerticalAlignment.Center
  text.horizontalOverflow = opts.wrap ? HorizontalOverflow.Wrap : HorizontalOverflow.Overflow
  text.verticalOverflow = VerticalOverflow.Overflow
  text.layoutRect = Rect.create(-opts.width / 2, opts.width / 2, -opts.height / 2, opts.height / 2)
  text.textFill.color = opts.color ?? TEXT_LIGHT
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

/** Component.Image is a 2 x 2 unit quad, so a scale of half the size gives real centimetres. */
export function sizeImage(image: Image, width: number, height: number): void {
  image.getSceneObject().getTransform().setLocalScale(new vec3(width / 2, height / 2, 1))
}

export function setImageAlpha(image: Image, alpha: number): void {
  image.mainPass.baseColor = new vec4(1, 1, 1, alpha)
}

export function setImageTexture(image: Image, texture: Texture): void {
  image.mainPass.baseTex = texture
}

/** A flat teal surface. UIKit's BackPlate only offers grey styles, so its rectangle is recoloured once it exists. */
export function addPanel(script: BaseScriptComponent, host: SceneObject, width: number, height: number): BackPlate {
  const plate = host.createComponent(BackPlate.getTypeName()) as BackPlate
  plate.size = new vec2(width, height)
  const tint = script.createEvent("DelayedCallbackEvent")
  tint.bind(() => tintPanel(host))
  tint.reset(0)
  return plate
}

export function tintPanel(host: SceneObject): void {
  const rect = host.getComponent(RoundedRectangle.getTypeName()) as RoundedRectangle | null
  if (!rect) return
  rect.gradient = false
  rect.backgroundColor = PANEL_TEAL
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
