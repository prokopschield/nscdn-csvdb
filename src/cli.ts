#!/usr/bin/env node

import argv from '@prokopschield/argv';

import { Database, descriptors } from '.';

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

	process.stdin.on('data', (line) =>
		table?.insert({ line: ++counter, text: String(line).trim() })
	);
}

main();
