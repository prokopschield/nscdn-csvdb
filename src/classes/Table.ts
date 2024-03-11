import { exec } from 'child_process';
import fs from 'fs';
import { Lock, Pipeline } from 'ps-std';
import { promisify } from 'util';

import { RowDescriptor } from '../types';
import { serialize_raw, deserialize_raw } from '../utils/serializer';

const exec_p = promisify(exec);

export class Table<T extends Record<string, any>> {
	private _file: string;
	private _stream: fs.WriteStream;
	private _descriptor: RowDescriptor<T>;
	private _descriptorEntries: [
		keyof RowDescriptor<T>,
		RowDescriptor<T>[keyof RowDescriptor<T>]
	][];

	private _lock = new Lock();

	constructor(file: string, descriptor: RowDescriptor<T>) {
		this._file = file;
		this._stream = fs.createWriteStream(file, {
			flags: 'a',
		});
		this._descriptor = descriptor;
		this._descriptorEntries = [...Object.entries(descriptor)];
	}

	get file() {
		return this._file;
	}

	/** internal csv write stream */
	get stream() {
		return this._stream;
	}

	insert_item = Pipeline((value: T) => {
		return this._descriptorEntries.map(async ([name, { serializer }]) => {
			return await serialize_raw(
				value[name] ? await serializer(value[name]) : ''
			);
		});
	})
		.pipe((items) => Promise.all(items))
		.pipe((items) => items.join(',') + '\n')
		.pipe((line) => this._stream.write(line), this._lock);

	async insert(...values: T[]) {
		await Promise.all(values.map(this.insert_item));
	}

	/** the second parameter may be a unix filter */
	async find(criteria: Partial<T>, append: string = ''): Promise<T[]> {
		const values = Object.entries(criteria).filter((a) => a[1]);
		const encoded = await Promise.all(
			values.map(
				async ([name, value]) =>
					await serialize_raw(
						await this._descriptor[name].serializer(value)
					)
			)
		);

		const query = `cat ${this._file} ${encoded
			.map((filter) => `| grep "${filter}"`)
			.join(' ')} ${append} | cat`.replace(/\$/g, '\\$');

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

					for (let i = 0; i < this._descriptorEntries.length; ++i) {
						const [key, type] = this._descriptorEntries[i];
						const part = parts.shift();

						entries.push([
							key,
							part
								? await type.deserializer(
										await deserialize_raw(part)
								  )
								: undefined,
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
