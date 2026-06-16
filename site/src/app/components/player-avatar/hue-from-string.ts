/** Maps any string to a stable hue (0–359), so a given player always gets the same colour. */
export function hueFromString(value: string): number {
	let hash = 0;
	for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) & 0xffff;
	return hash % 360;
}
