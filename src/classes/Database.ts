import fs from 'fs';
import path from 'path';
import { ValueType } from '../types';
import { serialize } from '../utils/serializer';

import { Table } from './Table';

export class Database {
	private _directory: string;
	private _tables = new Map<string, Table<any>>();

	constructor(directory: string) {
		this._directory = directory;
	}

	/**
	 * @param name must be unique
	 * @param template example value
	 */
	async getTable<T extends Record<string, ValueType>>(
		name: string,
		template: T
	): Promise<Table<T>> {
		const existing = this._tables.get(name);

		if (existing) {
			return existing;
		}

		fs.mkdirSync(this._directory, { recursive: true });

		const table = new Table(
			path.resolve(this._directory, `${await serialize(name)}.csv`),
			template
		);

		this._tables.set(name, table);

		return table;
	}
}
