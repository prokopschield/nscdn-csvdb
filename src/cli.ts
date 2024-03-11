#!/usr/bin/env node

import argv from '@prokopschield/argv';
import { Future, Lock } from 'ps-std';

import { Database, descriptors } from '.';

function* getLines() {
	let buffer = '';
	const lock = new Lock();

	process.stdin.on('data', (chunk) => {
		buffer += String(chunk);
		lock.release();
	});

	while (!process.stdin.closed) {
		yield new Future<string>(async (resolve) => {
			while (true) {
				if (buffer.includes('\n')) {
					const parts = buffer.split('\n');

					buffer = parts.slice(1).join('\n');

					return resolve(parts[0]);
				} else {
					await lock.wait_and_lock();
				}
			}
		});
	}
}

async function main() {
	const args = argv.expectMutate(['database', 'table'], {
		database: 'dbtest',
		table: 'test',
	});
	const database = new Database(String(args.database));
	const table = await database.getTable(String(args.table), {
		line: descriptors.JsNumberType,
		text: descriptors.JsStringType,
	});

	let counter = 0;

	for await (const line of getLines()) {
		table?.insert({ line: ++counter, text: String(line).trim() });
	}
}

main();
