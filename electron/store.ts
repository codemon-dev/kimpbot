// src/main/store.ts
import Store, { Schema } from 'electron-store'
import { JSONSchemaType } from 'ajv'
import { API_KEY_INFO } from './../constants/types'
import { EXCHANGE } from '../constants/enum'

// Define your schema in TS
// This is essentially the shape/spec of your store
export type SchemaType = {
    api_key_infos: API_KEY_INFO[],
}

export const STORE_KEYS: { [key: string]: keyof SchemaType } = {
    API_KEY_INFOS: 'api_key_infos'
}

// Define your schema per the ajv/JSON spec
// But you also need to create a mirror of that spec in TS
// And use the type here
const schema: Schema<SchemaType> = {
    api_key_infos: {
        type: 'array',
        items: {
            type: 'object',
            properties: {
                exchange: { type: 'string' },
                apiKey: { type: 'string' },
                securityKey: { type: 'string' },
            },
            required: ['exchange', 'apiKey', 'securityKey'],
          },
    },
}

// We define the keys we'll be using to access the store
// This is basically the top-level properties in the object
// But electron-store supports dot notation, so feel free to set deeper keys

// We set the type like this so when we use `store.get()`
// It'll use the actual keys from store and infer the data type


// Create new store with schema
// And make sure to pass in schema TS types
// If you don't do this, when you use `store.get/set`, the return type will be unknown.
// Not sure why this has lint error. But get/set methods return proper types so...
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const store = new Store<SchemaType>({ schema })

export default store