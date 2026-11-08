// canvasManager/index.js - Haupt-Export

// Rendering-Module
export { BackgroundRenderer, SceneRenderer, UIRenderer } from './rendering/index'

// Interaction-Module
export { MouseHandler, SelectionManager, DragDropHandler } from './interaction/index'

// Recording-Module
export { CanvasPool, RecordingRenderer } from './recording/index'

// Methoden-Gruppen des CanvasManagers
export * from './methods/index'
