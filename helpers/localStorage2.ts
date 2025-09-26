type PrimitiveType = "string" | "number" | "boolean";
type ComplexType = "date" | "object" | "array";
type SchemaType = PrimitiveType | ComplexType;

// For primitives, no default needed - will be inferred
type PrimitiveSchemaEntry = {
  type: PrimitiveType;
};

// For complex types, default is required
type ComplexSchemaEntry<T> = {
  type: ComplexType;
  default: T;
};

type SchemaEntry<T = any> = PrimitiveSchemaEntry | ComplexSchemaEntry<T>;

type Schema = Record<string, SchemaEntry>;

// Infer the TypeScript type from a schema entry
type InferSchemaType<T extends SchemaEntry> = T extends { type: "string" }
  ? string
  : T extends { type: "number" }
  ? number
  : T extends { type: "boolean" }
  ? boolean
  : T extends { type: "date"; default: infer D }
  ? D
  : T extends { type: "object"; default: infer D }
  ? D
  : T extends { type: "array"; default: infer D }
  ? D
  : never;

// Get default value for a schema entry
function getDefaultValue<T extends SchemaEntry>(entry: T): InferSchemaType<T> {
  switch (entry.type) {
    case "string":
      return "" as InferSchemaType<T>;
    case "number":
      return 0 as InferSchemaType<T>;
    case "boolean":
      return false as InferSchemaType<T>;
    case "date":
    case "object":
    case "array":
      return (entry as ComplexSchemaEntry<any>).default as InferSchemaType<T>;
  }
}

const MinaSchema = {
  needsToSetupStorage: { type: "string" as const },
  setupStorageInProgress: { type: "string" as const },
  nestedObject: { type: "object" as const, default: { a: 1, b: [1, 2] } },
  someArray: { type: "array" as const, default: [1, 2, 3] },
  someDate: { type: "date" as const, default: new Date() },
  someNumber: { type: "number" as const },
} satisfies Schema;

function serializeByType(value: any, type: SchemaType): string {
  switch (type) {
    case "string":
    case "number":
    case "boolean":
    case "object":
    case "array":
      return JSON.stringify(value);
    case "date":
      return (value as Date).toISOString();
  }
}

function deserializeByType(raw: string | null, type: SchemaType): any {
  if (raw === null) return null;
  switch (type) {
    case "string":
      return raw;
    case "number":
      return Number(raw);
    case "boolean":
      if (raw === "true") return true;
      if (raw === "false") return false;
      return null;
    case "array":
    case "object":
      return JSON.parse(raw);
    case "date":
      return new Date(raw);
  }
}

function createStorageObjectFromSchema<T extends Schema>(
  suffix: string | undefined,
  schema: T
) {
  const obj = {} as { [K in keyof T]: InferSchemaType<T[K]> | null };

  for (const key in schema) {
    const entry = schema[key];
    Object.defineProperty(obj, key, {
      get() {
        const storageKey = suffix ? `${key}:${suffix}` : key;
        const raw = localStorage.getItem(storageKey);
        const deserialized = deserializeByType(raw, entry.type);

        if (
          deserialized === null &&
          (entry.type === "string" ||
            entry.type === "number" ||
            entry.type === "boolean")
        ) {
          return getDefaultValue(entry);
        }

        return deserialized;
      },
      set(value) {
        const storageKey = suffix ? `${key}:${suffix}` : key;
        if (value === null) {
          localStorage.removeItem(storageKey);
        } else {
          localStorage.setItem(storageKey, serializeByType(value, entry.type));
        }
      },
      enumerable: true,
      configurable: true,
    });
  }

  return obj;
}

export class Store {
  static global() {
    return createStorageObjectFromSchema(undefined, {
      // todo later multiple deposits
    });
  }

  static forMina(minaWallet: string) {
    return createStorageObjectFromSchema(minaWallet, {
      ethWallet: { type: "string" as const }, // keep
      needsToSetupStorage: { type: "boolean" as const }, // keep
      setupStorageInProgress: { type: "boolean" as const }, // keep
    });
  }

  static forEth(ethWallet: string) {
    return createStorageObjectFromSchema(ethWallet, {
      codeVerifier: { type: "string" as const }, // keep
    });
  }

  static forPair(ethWallet: string, minaWallet: string) {
    const suffix = `${ethWallet}-${minaWallet}`;
    return createStorageObjectFromSchema(suffix, {
      activeDepositNumber: { type: "string" as const },
      computedEthProof: { type: "string" as const },
      depositMintTx: { type: "string" as const },
    });
  }
}

export function resetStore(ethWallet: string, minaWallet: string) {
    const keys = ["activeDepositNumber", "computedEthProof", "depositMintTx"] as const;
    keys.forEach((key) => {
        Store.forPair(ethWallet, minaWallet)[key] = null;
    });
}

export function storageIsSetupAndFinalizedForCurrentMinaKey(minaWallet: string) {
  return Store.forMina(minaWallet).needsToSetupStorage === false;
  //return needsToSetupStorage === "false"; // If we are specifically told by localStorage that for this mina key we have setup storage then we dont need to again and can skip
}

export function isSetupStorageInProgressForMinaKey(minaWallet: string): boolean {
  return Store.forMina(minaWallet).setupStorageInProgress === true;
  //return setupStorageInProgress === "true";
}