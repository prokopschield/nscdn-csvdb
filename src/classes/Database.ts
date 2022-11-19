import fs from 'fs';
import path from 'path';

import { Table } from './Table';
import { RowDescriptor } from '../types';
import { serialize_raw } from '../utils/serializer';

export class Database {
	private _directory: string;
	private _tables = new Map<string, Table<any>>();

	constructor(directory: string) {
		this._directory = directory;
	}

	/**
	 * @param name must be unique
	 * @param descriptor example value
	 */
	async getTable<T extends Record<string, any>>(
		name: string,
		descriptor: RowDescriptor<T>
	): Promise<Table<T>> {
		const existing = this._tables.get(name);

		if (existing) {
			return existing;
		}

		fs.mkdirSync(this._directory, { recursive: true });

		const table = new Table(
			path.resolve(
				this._directory,
				`${(await serialize_raw(name)).replace('$', '')}.csv`
			),
			descriptor
		);

		this._tables.set(name, table);

		return table;
	}
}
