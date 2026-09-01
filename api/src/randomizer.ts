export class Randomizer {
	private readonly LCG_MULTIPLIER = 1664525;
	private readonly LCG_INCREMENT = 1013904223;
	private readonly LCG_MODULUS = 2 ** 32;

	private seed: number;
	public constructor(seed?: number) {
		this.seed = seed ?? new Date().getTime();
	}
	
	public nextItem<T>(array: T[]): T {
		this.seed = (this.LCG_MULTIPLIER * this.seed + this.LCG_INCREMENT) % this.LCG_MODULUS;
		const rng = this.seed / this.LCG_MODULUS;
		const index = Math.floor(rng * array.length);
		return array[index];
	}

	public next(): number {
		this.seed = (this.LCG_MULTIPLIER * this.seed + this.LCG_INCREMENT) % this.LCG_MODULUS;
		const rng = this.seed / this.LCG_MODULUS;
		return rng;
	}
}

