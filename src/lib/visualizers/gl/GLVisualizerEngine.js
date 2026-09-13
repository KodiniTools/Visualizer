/**
 * GLVisualizerEngine – WebGL2 renderer for shader-based visualizer presets.
 *
 * One engine instance owns one WebGL2 canvas (OffscreenCanvas where available,
 * so the same code runs in the visualizer worker and on the main thread). A
 * preset is a fragment shader (see glsl.js for the header it is compiled with)
 * plus optional per-frame uniforms. `render()` draws a single fullscreen
 * triangle with that shader into the engine canvas; the caller composites the
 * canvas onto its own 2D context with `drawImage()`.
 *
 * Construction throws when WebGL2 is unavailable so callers can fall back to a
 * Canvas2D visualizer (see createGlVisualizer.js).
 *
 * @module visualizers/gl/GLVisualizerEngine
 */

import { visualizerState } from '../core/state.js'
import { hexToHsl } from '../core/colorUtils.js'
import { REFERENCE_FRAME_MS } from '../core/helpers.js'
import { AUDIO_TEX_WIDTH, AUDIO_TEX_ROWS, updateAudioFeatures } from './audioFeatures.js'
import { VERT_SRC, buildFragmentSource } from './glsl.js'

const STANDARD_UNIFORMS = [
  'uResolution',
  'uTime',
  'uDt',
  'uColor',
  'uColorHsl',
  'uIntensity',
  'uBands',
  'uOnset',
  'uAudio',
]

/**
 * Parse a #rgb / #rrggbb colour into 0–1 RGB. Invalid input → mid blue-ish
 * default so a broken preset colour never renders black-on-black.
 * @param {string} hex
 * @returns {[number, number, number]}
 */
export function hexToRgb01(hex) {
  if (typeof hex !== 'string') return [0.43, 0.66, 1.0]
  let r = 0
  let g = 0
  let b = 0
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16)
    g = parseInt(hex[2] + hex[2], 16)
    b = parseInt(hex[3] + hex[3], 16)
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16)
    g = parseInt(hex.slice(3, 5), 16)
    b = parseInt(hex.slice(5, 7), 16)
  } else {
    return [0.43, 0.66, 1.0]
  }
  if ([r, g, b].some((v) => Number.isNaN(v))) return [0.43, 0.66, 1.0]
  return [r / 255, g / 255, b / 255]
}

function createCanvas(width, height) {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height)
  }
  if (typeof document !== 'undefined' && document.createElement) {
    const c = document.createElement('canvas')
    c.width = width
    c.height = height
    return c
  }
  throw new Error('Keine Canvas-Implementierung verfügbar')
}

export class GLVisualizerEngine {
  /**
   * @param {number} [width]
   * @param {number} [height]
   */
  constructor(width = 2, height = 2) {
    this.width = Math.max(1, width | 0)
    this.height = Math.max(1, height | 0)
    this.canvas = createCanvas(this.width, this.height)

    const gl = this.canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
    })
    if (!gl) throw new Error('WebGL2 nicht verfügbar')
    this.gl = gl

    /** @type {Map<string, {program: WebGLProgram|null, uniforms: Map<string, WebGLUniformLocation|null>, broken: boolean}>} */
    this.programs = new Map()
    this.time = 0
    this.contextLost = false
    this._vao = null
    this._vbo = null
    this._audioTex = null

    this._onContextLost = (e) => {
      if (e && typeof e.preventDefault === 'function') e.preventDefault()
      this.contextLost = true
    }
    this._onContextRestored = () => {
      this.contextLost = false
      this.programs.clear()
      this._initGlResources()
    }
    if (typeof this.canvas.addEventListener === 'function') {
      this.canvas.addEventListener('webglcontextlost', this._onContextLost, false)
      this.canvas.addEventListener('webglcontextrestored', this._onContextRestored, false)
    }

    this._initGlResources()
    this._selfTest()
  }

  _initGlResources() {
    const gl = this.gl

    // Fullscreen triangle (covers the clip space with a single primitive).
    this._vao = gl.createVertexArray()
    gl.bindVertexArray(this._vao)
    this._vbo = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vbo)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.bindVertexArray(null)

    // Audio texture: R8, AUDIO_TEX_WIDTH x 2, linear along x for smooth sampling.
    this._audioTex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, this._audioTex)
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R8,
      AUDIO_TEX_WIDTH,
      AUDIO_TEX_ROWS,
      0,
      gl.RED,
      gl.UNSIGNED_BYTE,
      null,
    )
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.bindTexture(gl.TEXTURE_2D, null)

    gl.disable(gl.BLEND)
    gl.disable(gl.DEPTH_TEST)
    gl.clearColor(0, 0, 0, 0)
  }

  /**
   * Compile a trivial program once so a broken GL implementation fails loudly
   * in the constructor (→ Canvas2D fallback) instead of silently drawing nothing.
   */
  _selfTest() {
    const entry = this._getProgram({
      id: '__selftest__',
      frag: 'void main(){ fragColor = vec4(0.0); }',
    })
    if (!entry || entry.broken) throw new Error('WebGL2 Selbsttest fehlgeschlagen')
    this.programs.delete('__selftest__')
    if (entry.program) this.gl.deleteProgram(entry.program)
  }

  _compileShader(type, source) {
    const gl = this.gl
    const shader = gl.createShader(type)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader) || 'unbekannter Shader-Fehler'
      gl.deleteShader(shader)
      throw new Error(log)
    }
    return shader
  }

  /**
   * @param {{id: string, frag: string}} preset
   */
  _getProgram(preset) {
    const key = preset.id
    let entry = this.programs.get(key)
    if (entry) return entry

    entry = { program: null, uniforms: new Map(), broken: false }
    this.programs.set(key, entry)

    const gl = this.gl
    let vs = null
    let fs = null
    try {
      vs = this._compileShader(gl.VERTEX_SHADER, VERT_SRC)
      fs = this._compileShader(gl.FRAGMENT_SHADER, buildFragmentSource(preset.frag))
      const program = gl.createProgram()
      gl.attachShader(program, vs)
      gl.attachShader(program, fs)
      gl.bindAttribLocation(program, 0, 'aPos')
      gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const log = gl.getProgramInfoLog(program) || 'Link-Fehler'
        gl.deleteProgram(program)
        throw new Error(log)
      }
      entry.program = program
      for (const name of STANDARD_UNIFORMS) {
        entry.uniforms.set(name, gl.getUniformLocation(program, name))
      }
    } catch (err) {
      entry.broken = true
      if (typeof console !== 'undefined') {
        console.error(
          `[GLVisualizer] Preset "${key}" konnte nicht kompiliert werden:`,
          err?.message,
        )
      }
    } finally {
      if (vs) gl.deleteShader(vs)
      if (fs) gl.deleteShader(fs)
    }
    return entry
  }

  _uniformLocation(entry, name) {
    if (!entry.uniforms.has(name)) {
      entry.uniforms.set(name, this.gl.getUniformLocation(entry.program, name))
    }
    return entry.uniforms.get(name)
  }

  /**
   * @param {number} width
   * @param {number} height
   */
  resize(width, height) {
    const w = Math.max(1, width | 0)
    const h = Math.max(1, height | 0)
    if (w === this.width && h === this.height) return
    this.width = w
    this.height = h
    this.canvas.width = w
    this.canvas.height = h
  }

  /**
   * Render one frame of `preset` into the engine canvas.
   *
   * @param {{id: string, frag: string, uniforms?: Function}} preset
   * @param {{dataArray: Uint8Array|number[], bufferLength: number, width: number, height: number, color: string, intensity?: number}} params
   * @param {{rows: Uint8Array, smooth: Float32Array, bands: Float32Array}} audioState Per-visualizer feature state (see audioFeatures.js)
   * @returns {boolean} true when a frame was drawn, false when the caller should fall back
   */
  render(preset, params, audioState) {
    if (this.contextLost) return false
    const entry = this._getProgram(preset)
    if (entry.broken || !entry.program) return false

    const gl = this.gl
    const { dataArray, bufferLength, width, height, color, intensity = 1.0 } = params
    this.resize(width, height)

    // Real elapsed time (bridged into visualizerState by the render loop / worker).
    const dtMs = visualizerState._dtMs
    const dt = (dtMs > 0 && dtMs < 250 ? dtMs : REFERENCE_FRAME_MS) / 1000
    this.time += dt

    updateAudioFeatures(audioState, dataArray, bufferLength)

    gl.bindTexture(gl.TEXTURE_2D, this._audioTex)
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      AUDIO_TEX_WIDTH,
      AUDIO_TEX_ROWS,
      gl.RED,
      gl.UNSIGNED_BYTE,
      audioState.rows,
    )

    gl.viewport(0, 0, this.width, this.height)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(entry.program)
    gl.bindVertexArray(this._vao)

    const u = (name) => entry.uniforms.get(name)
    const rgb = hexToRgb01(color)
    const hsl = hexToHsl(typeof color === 'string' ? color : '#6ea8fe')
    const onset = visualizerState._onsetData || {}

    gl.uniform2f(u('uResolution'), this.width, this.height)
    gl.uniform1f(u('uTime'), this.time)
    gl.uniform1f(u('uDt'), dt)
    gl.uniform3f(u('uColor'), rgb[0], rgb[1], rgb[2])
    gl.uniform3f(u('uColorHsl'), (hsl.h || 0) / 360, (hsl.s || 0) / 100, (hsl.l || 0) / 100)
    gl.uniform1f(u('uIntensity'), Number.isFinite(intensity) ? intensity : 1.0)
    const b = audioState.bands
    gl.uniform4f(u('uBands'), b[0], b[1], b[2], b[3])
    gl.uniform4f(u('uOnset'), onset.bass || 0, onset.mid || 0, onset.treble || 0, onset.all || 0)
    gl.activeTexture(gl.TEXTURE0)
    gl.uniform1i(u('uAudio'), 0)

    if (typeof preset.uniforms === 'function') {
      const custom = preset.uniforms({ bands: b, onset, time: this.time, dt, intensity })
      if (custom) {
        for (const [name, value] of Object.entries(custom)) {
          const loc = this._uniformLocation(entry, name)
          if (!loc) continue
          if (typeof value === 'number') gl.uniform1f(loc, value)
          else if (Array.isArray(value) || ArrayBuffer.isView(value)) {
            switch (value.length) {
              case 2:
                gl.uniform2fv(loc, value)
                break
              case 3:
                gl.uniform3fv(loc, value)
                break
              case 4:
                gl.uniform4fv(loc, value)
                break
              default:
                gl.uniform1fv(loc, value)
            }
          }
        }
      }
    }

    gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.bindVertexArray(null)
    gl.bindTexture(gl.TEXTURE_2D, null)
    return true
  }

  dispose() {
    const gl = this.gl
    if (typeof this.canvas.removeEventListener === 'function') {
      this.canvas.removeEventListener('webglcontextlost', this._onContextLost)
      this.canvas.removeEventListener('webglcontextrestored', this._onContextRestored)
    }
    for (const entry of this.programs.values()) {
      if (entry.program) gl.deleteProgram(entry.program)
    }
    this.programs.clear()
    if (this._audioTex) gl.deleteTexture(this._audioTex)
    if (this._vbo) gl.deleteBuffer(this._vbo)
    if (this._vao) gl.deleteVertexArray(this._vao)
    this._audioTex = null
    this._vbo = null
    this._vao = null
    const lose = gl.getExtension('WEBGL_lose_context')
    if (lose) {
      try {
        lose.loseContext()
      } catch {
        /* bewusst ignoriert */
      }
    }
  }
}
