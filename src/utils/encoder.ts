export const alphabet =
	'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789~_';

/**
 * Convert Buffer or Uint8Array to Base-64
 * @param input Byte array being converted
 * @returns Base-64 string
 */
export function encode(input: Uint8Array) {
	let out = '';
	let mod = 0;
	let tmp = 0;
	for (const byte of input) {
		tmp += byte;
		if (mod === 0) {
			// state: 00000000 AAAAAABB
			out += alphabet[tmp >> 2];
			tmp &= 0x03;
			++mod;
		} else if (mod == 1) {
			// state: 000000BB BBBBCCCC
			out += alphabet[tmp >> 4];
			tmp &= 0x0f;
			++mod;
		} else {
			// state: 0000CCCC CCDDDDDD
			out += alphabet[tmp >> 6];
			out += alphabet[tmp & 63];
			tmp = mod = 0;
		}
		tmp <<= 8;
	}
	if (mod) out += alphabet[tmp >> (2 + mod * 2)];
	return out;
}

/**
 * Convert Base-64 to Uint8Array
 *
 * Only correctly decodes strings from encode()
 *
 * @param input Base-64 string
 * @returns Uint8Array
 */
export function decode(input: string) {
	const out = Array<number>();
	let mod = 0;
	let tmp = 0;
	for (const chr of input) {
		tmp += alphabet.includes(chr)
			? alphabet.indexOf(chr)
			: chr.charCodeAt(0);
		if (mod === 0) {
			// state: 00000000 00AAAAAA
		} else if (mod === 1) {
			// state: 0000AAAA AABBBBBB
			const A = tmp & 0b111111110000;
			tmp ^= A;
			out.push(A >> 4);
		} else if (mod === 2) {
			// state: 000000BB BBCCCCCC
			const B = tmp & 0b1111111100;
			tmp ^= B;
			out.push(B >> 2);
		} else if (mod === 3) {
			// state: 00000000 CCDDDDDD
			const C = tmp & 0b11111111;
			tmp ^= C;
			out.push(C);
		} else {
			// state: 00000000 00AAAAAA
			mod = 0;
		}
		tmp <<= 6;
		++mod;
	}
	if (tmp) {
		tmp >>= 6;
		const ar = Array<number>();
		while (tmp) {
			ar.push(tmp & 255);
			tmp >>= 8;
		}
		out.push(...ar.reverse());
	}
	return Buffer.from(out);
}

export function hexToRecord(hex: string) {
	return '$' + encode(Buffer.from(hex, 'hex'));
}

export function recordToHex(record: string) {
	return decode(record.slice(1)).toString('hex');
}
