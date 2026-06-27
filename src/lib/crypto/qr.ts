// A local, dependency-free QR-*like* matrix builder. It renders a monochrome,
// QR-shaped glyph (three finder squares + a deterministic data field hashed from
// the address) so Receive has a scannable-looking code — but it is ILLUSTRATIVE,
// not a real QR payload. The real, copyable address text is always shown alongside
// it as the canonical value (and the accessible alternative). Deterministic.

/** Build an n×n boolean matrix (true = filled module) for an address string. */
export function qrMatrix(data: string, n = 29): boolean[][] {
	const grid: boolean[][] = Array.from({ length: n }, () => Array.from({ length: n }, () => false));

	// A 7×7 finder pattern (filled border + filled 3×3 core) at (r,c).
	const placeFinder = (r: number, c: number) => {
		for (let i = 0; i < 7; i++) {
			for (let j = 0; j < 7; j++) {
				const border = i === 0 || i === 6 || j === 0 || j === 6;
				const core = i >= 2 && i <= 4 && j >= 2 && j <= 4;
				grid[r + i][c + j] = border || core;
			}
		}
	};
	placeFinder(0, 0);
	placeFinder(0, n - 7);
	placeFinder(n - 7, 0);

	// Is (r,c) inside a finder's 8×8 reserved zone (pattern + 1px quiet gap)?
	const reserved = (r: number, c: number) =>
		(r < 8 && c < 8) || (r < 8 && c >= n - 8) || (r >= n - 8 && c < 8);

	// Fill the data field with a deterministic bit stream hashed from the address.
	let h = 0x811c9dc5;
	for (let i = 0; i < data.length; i++) {
		h ^= data.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	for (let r = 0; r < n; r++) {
		for (let c = 0; c < n; c++) {
			if (reserved(r, c)) continue;
			h = (Math.imul(h, 1103515245) + 12345 + r * 31 + c) >>> 0;
			grid[r][c] = (h & 0x40) !== 0; // ~50% fill, stable per address
		}
	}
	return grid;
}
