import { encode, decode } from 'doge-json';
import nsblob from 'nsblob';

import { hexToRecord, recordToHex } from './encoder';

export const allowed_regexp = /^[a-z\d]{0,64}$/gi;
export const serialized_regexp = /^\$[a-z_~\d]{43}$/gi;

export async function serialize(
	input: string | Buffer | object
): Promise<string> {
	if (!(input instanceof Uint8Array) && typeof input === 'object') {
		return serialize(encode(input));
	} else if (typeof input === 'string' && input.match(allowed_regexp)) {
		return input;
	} else {
		return nsblob.store(input).then(hexToRecord);
	}
}

export async function deserialize_raw(input: string): Promise<string | Buffer> {
	return input.match(serialized_regexp)
		? await nsblob.fetch(recordToHex(input))
		: input;
}

export async function deserialize_buffer(input: string): Promise<Buffer> {
	return Buffer.from(await deserialize_raw(input));
}

export async function deserialize_string(input: string): Promise<string> {
	return String(await deserialize_raw(input));
}

export async function deserialize_object(input: string): Promise<object> {
	return decode(await deserialize_string(input));
}

export const deserializers = {
	buffer: deserialize_buffer,
	object: deserialize_object,
	string: deserialize_string,
};
