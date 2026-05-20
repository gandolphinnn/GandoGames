export function playerNameHue(name: string): number {
	let hash = 0;
	for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
	return hash % 360;
}
