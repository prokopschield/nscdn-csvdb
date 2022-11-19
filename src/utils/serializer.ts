import { encode, decode } from 'doge-json';
import nsblob from 'nsblob';

import { hexToRecord, recordToHex } from './encoder';

export const allowed_regexp = /^[a-z\d]{0,64}$/gi;
export const serialized_regexp = /^\$[a-z_~\d]{43}$/gi;

export async function serialize_raw(
	input: string | Buffer | object
): Promise<string> {
	if (!(input instanceof Uint8Array) && typeof input === 'object') {
		return serialize_raw(encode(input));
	} else if (typeof input === 'string' && input.match(allowed_regexp)) {
		return input;
	} else {
		return nsblob.store(input).then(hexToRecord);
	}
}

export async function deserialize_raw(input: string): Promise<Buffer> {
	return input.match(serialized_regexp)
		? await nsblob.fetch(recordToHex(input))
		: Buffer.from(input);
}

export async function serialize_object_helper(
	arg: any,
	stack: any[],
	hashes: string[]
) {
	arg = await arg;

	if (!stack.includes(arg)) {
		stack.push(arg);
	}

	const stackId = stack.indexOf(arg);

	if (hashes[stackId]) {
		return stackId;
	} else {
		hashes[stackId] = 'loading';
	}

	if (arg instanceof Uint8Array) {
		hashes[stackId] = await serialize_raw({
			type: 'buffer',
			hash: await serialize_raw(arg),
		});
	} else if (arg === null) {
		hashes[stackId] = await serialize_raw({
			type: 'null',
		});
	} else if (typeof arg === 'object') {
		if (arg instanceof Set || arg instanceof Array) {
			const type = arg instanceof Set ? 'set' : 'array';

			const kvmap: number[] = [];

			for (const value of arg) {
				kvmap.push(await serialize_object_helper(value, stack, hashes));
			}

			hashes[stackId] = await serialize_raw({
				type,
				hash: await serialize_raw(JSON.stringify(kvmap)),
			});
		} else {
			const type = arg instanceof Map ? 'map' : 'object';

			const kvmap: [number, number][] = [];

			for (const [key, value] of type === 'map'
				? arg.entries()
				: Object.entries(arg)) {
				kvmap.push([
					await serialize_object_helper(key, stack, hashes),
					await serialize_object_helper(value, stack, hashes),
				]);
			}

			hashes[stackId] = await serialize_raw({
				type,
				hash: await serialize_raw(JSON.stringify(kvmap)),
			});
		}
	} else {
		hashes[stackId] = await serialize_raw({
			type: typeof arg,
			hash: await serialize_raw(String(arg)),
		});
	}

	return stackId;
}

export async function serialize_object(
	arg: any,
	stack = [arg],
	hashes: string[] = []
) {
	const a = await arg;

	await serialize_object_helper(arg, stack, hashes);

	return await serialize_raw(hashes);
}

const parsers: Record<string, (buffer: Buffer) => any> = {
	null: () => null,
	undefined: () => undefined,
	string: String,
	buffer: (buffer: Buffer) => buffer,
	boolean: (buffer: Buffer) => Boolean(String(buffer)),
	number: (buffer: Buffer) => Number(String(buffer)),
	bigint: (buffer: Buffer) => BigInt(String(buffer)),
	symbol: (buffer: Buffer) => Symbol(String(buffer)),
};

const objtypes = ['object', 'set', 'array', 'map'];
const objconstructors = [
	() => new Object(),
	() => new Set(),
	() => new Array(),
	() => new Map(),
];

export async function deserialize_object(hash: string) {
	const hashes = decode(String(await deserialize_raw(hash)));

	const stack = new Array<any>();

	const objects = new Array<number>();

	for (let index = 0; index < hashes.length; ++index) {
		const { type, hash } = decode(
			String(await deserialize_raw(hashes[index]))
		);

		if (parsers[type]) {
			stack[index] = parsers[type](await deserialize_raw(hash));
		} else if (objtypes.includes(type)) {
			stack[index] = objconstructors[objtypes.indexOf(type)]();
			objects.push(index);
		} else {
			stack[index] = {
				type,
				hash,
				raw: await deserialize_raw(hash),
			};
		}
	}

	for (const index of objects) {
		const { type, hash } = decode(
			String(await deserialize_raw(hashes[index]))
		);

		const kvps = await decode(String(await deserialize_raw(hash)));

		if (type === 'array') {
			for (const value of kvps) {
				stack[index].push(stack[value]);
			}
		} else if (type === 'set') {
			for (const value of kvps) {
				stack[index].add(stack[value]);
			}
		} else if (type === 'object') {
			for (const [key, value] of kvps) {
				stack[index][stack[key]] = stack[value];
			}
		} else if (type === 'map') {
			for (const [key, value] of kvps) {
				stack[index].set(stack[key], stack[value]);
			}
		} else {
			throw new Error(
				'deserialized object type should be array|set|object|map'
			);
		}
	}

	return stack[0];
}
