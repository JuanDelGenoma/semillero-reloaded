/** Small seeded PRNG (mulberry32) so a whole career is reproducible from its state. */
export class Rng {
  constructor(public seed: number) {}

  next(): number {
    let t = (this.seed = (this.seed + 0x6d2b79f5) | 0)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  int(min: number, max: number) {
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  chance(p: number) {
    return this.next() < p
  }

  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)]
  }

  /** Approximately normal, via sum of uniforms. */
  normal(mean: number, sd: number) {
    const u = this.next() + this.next() + this.next() + this.next() - 2
    return mean + u * sd * 1.22
  }

  weighted<T>(items: readonly T[], weight: (t: T) => number): T {
    const total = items.reduce((s, i) => s + weight(i), 0)
    let r = this.next() * total
    for (const i of items) {
      r -= weight(i)
      if (r <= 0) return i
    }
    return items[items.length - 1]
  }

  poisson(lambda: number) {
    const l = Math.exp(-lambda)
    let k = 0
    let p = 1
    do {
      k++
      p *= this.next()
    } while (p > l)
    return k - 1
  }

  id() {
    return Math.floor(this.next() * 1e12).toString(36)
  }
}
