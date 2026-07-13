/**
 * WebGLPostFX - GPU post-processing backend (WebGL2).
 *
 * Renders trails (feedback ping-pong) and a real bright-pass + separable
 * Gaussian bloom entirely on the GPU, at cost roughly independent of the
 * effect strength. It owns its own WebGL canvas; `apply()` uploads the source
 * 2D canvas as a texture, runs the passes, then blits the result back onto the
 * source canvas so the rest of the pipeline stays untouched.
 *
 * Construction runs a self-test render and throws on any failure, so the
 * factory can fall back to the Canvas2D backend on unsupported / broken GPUs.
 * We cannot exercise a real GPU in CI, so this defensive contract matters.
 *
 * @module postfx/WebGLPostFX
 */

const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

const FRAG_FEEDBACK = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSrc;
uniform sampler2D uPrev;
uniform float uDecay;
out vec4 fragColor;
void main() {
  vec4 s = texture(uSrc, vUv);
  vec4 p = texture(uPrev, vUv);
  float pa = p.a * uDecay;
  float outA = s.a + pa * (1.0 - s.a);
  vec3 outRGB = outA > 0.0 ? (s.rgb * s.a + p.rgb * pa * (1.0 - s.a)) / outA : vec3(0.0);
  fragColor = vec4(outRGB, outA);
}`

const FRAG_BRIGHT = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uScene;
uniform float uThreshold;
out vec4 fragColor;
void main() {
  vec4 c = texture(uScene, vUv);
  float l = max(max(c.r, c.g), c.b);
  float k = smoothstep(uThreshold, min(1.0, uThreshold + 0.15), l);
  fragColor = vec4(c.rgb * k, c.a * k);
}`

const FRAG_BLUR = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uDir;
out vec4 fragColor;
// 9-tap Gaussian
const float w0 = 0.2270270270;
const float w1 = 0.1945945946;
const float w2 = 0.1216216216;
const float w3 = 0.0540540541;
const float w4 = 0.0162162162;
void main() {
  vec4 c = texture(uTex, vUv) * w0;
  c += texture(uTex, vUv + uDir * 1.0) * w1;
  c += texture(uTex, vUv - uDir * 1.0) * w1;
  c += texture(uTex, vUv + uDir * 2.0) * w2;
  c += texture(uTex, vUv - uDir * 2.0) * w2;
  c += texture(uTex, vUv + uDir * 3.0) * w3;
  c += texture(uTex, vUv - uDir * 3.0) * w3;
  c += texture(uTex, vUv + uDir * 4.0) * w4;
  c += texture(uTex, vUv - uDir * 4.0) * w4;
  fragColor = c;
}`

const FRAG_COMPOSITE = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform float uStrength;
out vec4 fragColor;
void main() {
  vec4 sc = texture(uScene, vUv);
  vec4 bl = texture(uBloom, vUv);
  vec3 rgb = sc.rgb + bl.rgb * uStrength;
  float a = min(1.0, sc.a + bl.a * uStrength);
  fragColor = vec4(rgb, a);
}`

function compile(gl, type, src) {
  const sh = gl.createShader(type)
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh)
    gl.deleteShader(sh)
    throw new Error('PostFX shader compile failed: ' + log)
  }
  return sh
}

function link(gl, vsSrc, fsSrc) {
  const vs = compile(gl, gl.VERTEX_SHADER, vsSrc)
  const fs = compile(gl, gl.FRAGMENT_SHADER, fsSrc)
  const prog = gl.createProgram()
  gl.attachShader(prog, vs)
  gl.attachShader(prog, fs)
  gl.bindAttribLocation(prog, 0, 'aPos')
  gl.linkProgram(prog)
  gl.deleteShader(vs)
  gl.deleteShader(fs)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(prog)
    gl.deleteProgram(prog)
    throw new Error('PostFX program link failed: ' + log)
  }
  return prog
}

function createTargetTexture(gl, w, h) {
  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  const fb = gl.createFramebuffer()
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
  return { tex, fb, w, h }
}

export class WebGLPostFX {
  constructor(width, height) {
    this.backend = 'webgl2'
    this.width = width
    this.height = height

    const canvas =
      typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(width, height)
        : document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    this.canvas = canvas

    const gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
    })
    if (!gl) throw new Error('WebGL2 not available')
    this.gl = gl

    // Full-screen triangle.
    this._vao = gl.createVertexArray()
    gl.bindVertexArray(this._vao)
    this._vbo = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this._vbo)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.bindVertexArray(null)

    this._progFeedback = link(gl, VERT, FRAG_FEEDBACK)
    this._progBright = link(gl, VERT, FRAG_BRIGHT)
    this._progBlur = link(gl, VERT, FRAG_BLUR)
    this._progComposite = link(gl, VERT, FRAG_COMPOSITE)

    this._srcTex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, this._srcTex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    this._feedbackA = null
    this._feedbackB = null
    this._bright = null
    this._blurTmp = null
    this._bloomScale = 0
    this._trailsPrimed = false

    this._allocTargets()
    this._selfTest()
  }

  _allocTargets() {
    const gl = this.gl
    const { width: w, height: h } = this
    this._disposeTargets()
    this._feedbackA = createTargetTexture(gl, w, h)
    this._feedbackB = createTargetTexture(gl, w, h)
    // Bloom buffers at quarter resolution by default.
    const bw = Math.max(1, Math.round(w * 0.25))
    const bh = Math.max(1, Math.round(h * 0.25))
    this._bright = createTargetTexture(gl, bw, bh)
    this._blurTmp = createTargetTexture(gl, bw, bh)
    this._bloomScale = 0.25
    this._trailsPrimed = false
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  _disposeTargets() {
    const gl = this.gl
    for (const t of [this._feedbackA, this._feedbackB, this._bright, this._blurTmp]) {
      if (t) {
        gl.deleteTexture(t.tex)
        gl.deleteFramebuffer(t.fb)
      }
    }
    this._feedbackA = this._feedbackB = this._bright = this._blurTmp = null
  }

  _draw() {
    const gl = this.gl
    gl.bindVertexArray(this._vao)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.bindVertexArray(null)
  }

  _uploadSource(source) {
    const gl = this.gl
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.bindTexture(gl.TEXTURE_2D, this._srcTex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
  }

  _bindTarget(target) {
    const gl = this.gl
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fb : null)
    gl.viewport(0, 0, target ? target.w : this.width, target ? target.h : this.height)
  }

  _bindTex(unit, tex) {
    const gl = this.gl
    gl.activeTexture(gl.TEXTURE0 + unit)
    gl.bindTexture(gl.TEXTURE_2D, tex)
  }

  resize(width, height) {
    if (width === this.width && height === this.height) return
    this.width = width
    this.height = height
    this.canvas.width = width
    this.canvas.height = height
    this._allocTargets()
  }

  clearHistory() {
    const gl = this.gl
    for (const t of [this._feedbackA, this._feedbackB]) {
      if (!t) continue
      gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb)
      gl.viewport(0, 0, t.w, t.h)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    this._trailsPrimed = false
  }

  /**
   * Run the pipeline for one frame and blit the result back onto `source`.
   * @param {HTMLCanvasElement|OffscreenCanvas} source
   * @param {Object} config
   * @param {number} [quality=1]
   */
  apply(source, config = {}, quality = 1) {
    const gl = this.gl
    const trails = config.trails || {}
    const bloom = config.bloom || {}
    gl.disable(gl.BLEND)

    this._uploadSource(source)

    // ── Scene (optionally with trails) ──────────────────────────────────────
    let sceneTex = this._srcTex
    if (trails.enabled) {
      const decay = Math.max(0, Math.min(0.97, trails.decay ?? 0.85))
      this._bindTarget(this._feedbackB)
      gl.useProgram(this._progFeedback)
      this._bindTex(0, this._srcTex)
      this._bindTex(1, this._feedbackA.tex)
      gl.uniform1i(gl.getUniformLocation(this._progFeedback, 'uSrc'), 0)
      gl.uniform1i(gl.getUniformLocation(this._progFeedback, 'uPrev'), 1)
      gl.uniform1f(
        gl.getUniformLocation(this._progFeedback, 'uDecay'),
        this._trailsPrimed ? decay : 0,
      )
      this._draw()
      // Swap ping-pong; the newly written buffer is the current scene.
      const tmp = this._feedbackA
      this._feedbackA = this._feedbackB
      this._feedbackB = tmp
      sceneTex = this._feedbackA.tex
      this._trailsPrimed = true
    } else {
      this._trailsPrimed = false
    }

    // ── Bloom ───────────────────────────────────────────────────────────────
    const strength = Math.max(0, bloom.strength ?? 0)
    const doBloom = bloom.enabled && strength > 0
    if (doBloom) {
      const threshold = Math.max(0, Math.min(1, bloom.threshold ?? 0.35))
      // Bright pass (downscaled).
      this._bindTarget(this._bright)
      gl.useProgram(this._progBright)
      this._bindTex(0, sceneTex)
      gl.uniform1i(gl.getUniformLocation(this._progBright, 'uScene'), 0)
      gl.uniform1f(gl.getUniformLocation(this._progBright, 'uThreshold'), threshold)
      this._draw()

      // Blur — number of passes scales with adaptive quality.
      const passes = quality >= 0.85 ? 2 : 1
      const radius = bloom.radius ?? 8
      const blurProg = this._progBlur
      gl.useProgram(blurProg)
      const dirLoc = gl.getUniformLocation(blurProg, 'uDir')
      const texLoc = gl.getUniformLocation(blurProg, 'uTex')
      let read = this._bright
      let write = this._blurTmp
      for (let p = 0; p < passes; p++) {
        const spread = radius * (p + 1)
        // Horizontal
        this._bindTarget(write)
        this._bindTex(0, read.tex)
        gl.uniform1i(texLoc, 0)
        gl.uniform2f(dirLoc, spread / read.w, 0)
        this._draw()
        // Vertical
        this._bindTarget(read)
        this._bindTex(0, write.tex)
        gl.uniform1i(texLoc, 0)
        gl.uniform2f(dirLoc, 0, spread / read.h)
        this._draw()
      }
      // Bloom result now lives in `read` (= this._bright after even swaps).
      this._bloomResult = read
    }

    // ── Composite to the GL canvas ──────────────────────────────────────────
    this._bindTarget(null)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(this._progComposite)
    this._bindTex(0, sceneTex)
    gl.uniform1i(gl.getUniformLocation(this._progComposite, 'uScene'), 0)
    if (doBloom) {
      this._bindTex(1, this._bloomResult.tex)
      gl.uniform1i(gl.getUniformLocation(this._progComposite, 'uBloom'), 1)
      gl.uniform1f(gl.getUniformLocation(this._progComposite, 'uStrength'), strength)
    } else {
      // No bloom: multiply contribution by zero using the scene as a dummy tex.
      this._bindTex(1, sceneTex)
      gl.uniform1i(gl.getUniformLocation(this._progComposite, 'uBloom'), 1)
      gl.uniform1f(gl.getUniformLocation(this._progComposite, 'uStrength'), 0)
    }
    this._draw()
    gl.flush()

    // Blit the GPU result back onto the source 2D canvas.
    const ctx = source.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, this.width, this.height)
      ctx.drawImage(this.canvas, 0, 0, this.width, this.height)
    }
  }

  _selfTest() {
    const gl = this.gl
    // Draw a known opaque-red 2x2 source through the composite path (strength 0)
    // and confirm the center pixel survives upload + sampling + orientation.
    const probe =
      typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(2, 2)
        : document.createElement('canvas')
    probe.width = 2
    probe.height = 2
    const pctx = probe.getContext('2d')
    pctx.fillStyle = 'rgb(255,0,0)'
    pctx.fillRect(0, 0, 2, 2)

    this._uploadSource(probe)
    this._bindTarget(null)
    gl.viewport(0, 0, this.width, this.height)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.disable(gl.BLEND)
    gl.useProgram(this._progComposite)
    this._bindTex(0, this._srcTex)
    gl.uniform1i(gl.getUniformLocation(this._progComposite, 'uScene'), 0)
    this._bindTex(1, this._srcTex)
    gl.uniform1i(gl.getUniformLocation(this._progComposite, 'uBloom'), 1)
    gl.uniform1f(gl.getUniformLocation(this._progComposite, 'uStrength'), 0)
    this._draw()

    const px = new Uint8Array(4)
    gl.readPixels(
      Math.floor(this.width / 2),
      Math.floor(this.height / 2),
      1,
      1,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      px,
    )
    if (gl.getError() !== gl.NO_ERROR || px[0] < 200 || px[1] > 60 || px[3] < 200) {
      throw new Error('WebGL PostFX self-test failed')
    }
  }

  dispose() {
    const gl = this.gl
    if (!gl) return
    this._disposeTargets()
    gl.deleteTexture(this._srcTex)
    gl.deleteBuffer(this._vbo)
    gl.deleteVertexArray(this._vao)
    gl.deleteProgram(this._progFeedback)
    gl.deleteProgram(this._progBright)
    gl.deleteProgram(this._progBlur)
    gl.deleteProgram(this._progComposite)
    // Best-effort context release.
    const ext = gl.getExtension('WEBGL_lose_context')
    if (ext) ext.loseContext()
  }
}
