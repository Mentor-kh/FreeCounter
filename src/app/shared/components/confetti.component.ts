import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  OnDestroy,
  viewChild,
} from '@angular/core';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  spin: number;
  color: string;
  life: number;
}

const PARTICLE_COUNT = 90;
const GRAVITY = 0.16;
const DRAG = 0.985;

@Component({
  selector: 'app-confetti',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<canvas #canvas></canvas>`,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      pointer-events: none;
    }
    canvas {
      width: 100%;
      height: 100%;
    }
  `,
})
export class ConfettiComponent implements AfterViewInit, OnDestroy {
  readonly seed = input<number>(0);
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private frame = 0;
  private particles: Particle[] = [];

  ngAfterViewInit(): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const canvas = this.canvas().nativeElement;
    const ctx = canvas.getContext('2d');
    if (ctx === null) {
      return;
    }
    const ratio = Math.min(window.devicePixelRatio, 2);
    canvas.width = window.innerWidth * ratio;
    canvas.height = window.innerHeight * ratio;
    ctx.scale(ratio, ratio);
    this.particles = this.createParticles(window.innerWidth, window.innerHeight);
    const loop = (): void => {
      if (this.step(ctx, window.innerWidth, window.innerHeight)) {
        this.frame = requestAnimationFrame(loop);
      }
    };
    this.frame = requestAnimationFrame(loop);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frame);
  }

  private createParticles(width: number, height: number): Particle[] {
    const style = getComputedStyle(document.documentElement);
    const accent = style.getPropertyValue('--accent').trim();
    const colors = [accent === '' ? '#ffd60a' : accent, accent === '' ? '#ffd60a' : accent, '#ffffff', '#ffd34d'];
    return Array.from({ length: PARTICLE_COUNT }, (_, i): Particle => {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
      const speed = 7 + Math.random() * 9;
      return {
        x: width / 2,
        y: height * 0.48,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 5 + Math.random() * 6,
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.4,
        color: colors[(i + this.seed()) % colors.length],
        life: 1,
      };
    });
  }

  /**
   * @description Advances the confetti simulation by one frame and draws it.
   * @returns True while there are visible particles left.
   */
  private step(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
    ctx.clearRect(0, 0, width, height);
    let alive = false;
    for (const p of this.particles) {
      p.vx *= DRAG;
      p.vy = p.vy * DRAG + GRAVITY;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.spin;
      p.life -= 0.006;
      if (p.life <= 0 || p.y > height + 20) {
        continue;
      }
      alive = true;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }
    return alive;
  }
}
