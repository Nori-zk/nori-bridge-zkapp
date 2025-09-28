'use client'
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

function serializeByType(value: any, type: SchemaType): string {
  switch (type) {
    case "string":
      return String(value);
    case "number":
      return String(value);
    case "boolean":
      return String(value);
    case "object":
    case "array":
      // Only stringify if it's not already a string
      if (typeof value === 'string') {
        // It's already stringified, return as-is
        return value;
      }
      return JSON.stringify(value);
    case "date":
      return (value as Date).toISOString();
  }
}

function deserializeByType(raw: string | null, type: SchemaType): any {
  if (raw === null) return null;
  switch (type) {
    case "string":
      return raw; // Return as-is
    case "number":
      return Number(raw);
    case "boolean":
      if (raw === "true") return true;
      if (raw === "false") return false;
      return null;
    case "array":
    case "object":
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
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
        if (typeof window === 'undefined') {
          return
        }
        const storageKey = suffix ? `${key}:${suffix}` : key;
        const raw = localStorage.getItem(storageKey);
        const deserialized = deserializeByType(raw, entry.type);
        return deserialized;
      },
      set(value) {
        if (typeof window === 'undefined') {
          return
        }
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
      activeDepositNumber: { type: "number" as const },
      computedEthProof: { type: "string" as const },
      depositMintTx: { type: "string" as const },
      txAmount: { type: "string" as const },
    });
  }
}

//const activeDepositNumber = Store.forPair("","").activeDepositNumber;

export function resetLocalStorage(ethWallet: string, minaWallet: string) {
  const keys = ["activeDepositNumber", "computedEthProof", "depositMintTx", "txAmount"] as const;
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