import { TypeDescriptor } from './types';
import { serializer } from './utils';

export const JsBigIntType: TypeDescriptor<bigint> = {
	serializer: String,
	deserializer: (buffer) => BigInt(String(buffer)),
};

export const JsNumberType: TypeDescriptor<number> = {
	serializer: String,
	deserializer: (buffer) => Number(String(buffer)),
};

export const JsStringType: TypeDescriptor<string> = {
	serializer: String,
	deserializer: String,
};

export const JsSymbolType: TypeDescriptor<symbol> = {
	serializer: String,
	deserializer: (buffer) => Symbol(String(buffer)),
};

export const JsBufferType: TypeDescriptor<Buffer> = {
	serializer: serializer.serialize_raw,
	deserializer: (buffer) => buffer,
};

export const JsObjectType: TypeDescriptor<object> = {
	serializer: serializer.serialize_object,
	deserializer: (value) => serializer.deserialize_object(String(value)),
};
