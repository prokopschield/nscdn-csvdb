export type TypeDescriptor<T> = {
	serializer: (value: T) => string | Promise<string | Buffer>;
	deserializer: (value: Buffer) => T | Promise<T>;
};

export type RowDescriptor<T extends Record<string, any>> = {
	[P in keyof T]: TypeDescriptor<T[P]>;
};
