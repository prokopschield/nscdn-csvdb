import { exec } from 'child_process';
import fs from 'fs';
import { promisify } from 'util';

import { RecordType, ValueType } from '../types';
import {
	deserializers,
	deserialize_buffer,
	serialize,
} from '../utils/serializer';

const exec_p = promisify(exec);

export class Table<T extends Record<string, ValueType>> {
	private _file: string;
	private _stream: fs.WriteStream;
	private _types: RecordType[];

	constructor(file: string, template: T) {
		this._file = file;
		this._stream = fs.createWriteStream(file, {
			flags: 'a',
		});
		this._types = Object.entries(template).map(([key, value]) => {
			if (typeof value === 'object') {
				if (value instanceof Buffer) {
					return [key, 'buffer'];
				} else {
					return [key, 'object'];
				}
			} else {
				return [key, 'string'];
			}
		});
	}

	get file() {
		return this._file;
	}

	/** internal csv write stream */
	get stream() {
		return this._stream;
	}

	async insert(...values: T[]) {
		for (const value of values) {
			this._stream.write(
				(
					await Promise.all(
						this._types.map(([key, type]) => {
							return value[key] ? serialize(value[key]) : '';
						})
					)
				).join(',') + '\n'
			);
		}
	}

	/** the second parameter may be a unix filter */
	async find(criteria: Partial<T>, append: string = ''): Promise<T[]> {
		const values = Object.values(criteria).filter((a) => a);
		const encoded = await Promise.all(values.map(serialize));

		const query = `cat ${this._file} ${encoded.map(
			(filter) => `| grep ${filter}`
		)} ${append}`;

		const { stdout, stderr } = await exec_p(query);

		if (stderr) {
			throw new Error(stderr);
		}

		return Promise.all(
			stdout
				.split(/\n+/g)
				.filter((a) => a)
				.map(async (line) => {
					const parts = line.split(/[,;]/g);
					const entries = new Array();

					for (let i = 0; i < this._types.length; ++i) {
						const [key, type] = this._types[i];
						const part = parts.shift();

						entries.push([
							key,
							part ? await deserializers[type](part) : undefined,
						]);
					}

					return Object.fromEntries(entries) as T;
				})
		);
	}

	async find_first(criteria: Partial<T>, n: number = 1) {
		return this.find(criteria, `| head -n ${n}`);
	}

	async find_last(criteria: Partial<T>, n: number = 1) {
		return this.find(criteria, `| tail -n ${n}`);
	}
}
