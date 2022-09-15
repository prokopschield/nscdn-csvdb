#!/usr/bin/env node

import argv from '@prokopschield/argv';

import { Database } from './classes/Database';

async function main() {
	const args = argv.expectMutate(['database', 'table'], {
		database: 'dbtest',
		table: 'test',
	});
	const database = new Database(String(args.database));
	const table = await database.getTable(String(args.table), {
		text: 'string',
	});

	process.stdin.on('data', (line) =>
		table?.insert({ text: String(line).trim() })
	);
}

main();
