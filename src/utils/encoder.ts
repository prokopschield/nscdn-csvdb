import { encode, decode, alphabet } from '@prokopschield/base64';

export { encode, decode, alphabet };

export function hexToRecord(hex: string) {
	return '$' + encode(Buffer.from(hex, 'hex'));
}

export function recordToHex(record: string) {
	return Buffer.from(decode(record.slice(1)).buffer).toString('hex');
}
