/**
 * Particle class for particle-based effects
 * @module visualizers/core/Particle
 */

import { CONSTANTS } from './constants'

/**
 * Particle class for particle-based effects
 */
export class Particle {
  x: number
  y: number
  radius: number
  color: string
  velocity: { x: number; y: number }
  alpha: number

  /**
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} radius - Particle radius
   * @param {string} color - Color in CSS format
   * @param {Object} velocity - Velocity object with x and y properties
   */
  constructor(
    x: number,
    y: number,
    radius: number,
    color: string,
    velocity: { x: number; y: number },
  ) {
    this.x = x
    this.y = y
    this.radius = radius
    this.color = color
    this.velocity = velocity
    this.alpha = 1
  }

  /**
   * Draw the particle on canvas
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save()
    ctx.globalAlpha = this.alpha
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
    ctx.fillStyle = this.color
    ctx.fill()
    ctx.restore()
  }

  /**
   * Update particle position and fade
   */
  update(): void {
    this.x += this.velocity.x
    this.y += this.velocity.y
    this.alpha *= CONSTANTS.PARTICLE_FADE
  }
}
