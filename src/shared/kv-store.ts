/**
 * The ChurchTools KV-Store, as far as this extension uses it: one custom
 * module, holding one data category per stored document.
 */
import { churchtoolsClient } from '@churchtools/churchtools-client';
import { withRetryOn429 } from './api';
import type {
    CustomModule,
    CustomModuleCreate,
    CustomModuleDataCategory,
    CustomModuleDataCategoryCreate,
} from './types';

/**
 * The extension's module, or undefined when it is not installed yet.
 *
 * A failed request throws rather than answering "undefined": a first run and
 * a failed read are different facts, and treating a failed read as "nothing
 * configured" would hand the configuration form to whoever is looking.
 */
export async function findModule(extensionKey: string): Promise<CustomModule | undefined> {
    const modules = await withRetryOn429(() =>
        churchtoolsClient.get<CustomModule[]>('/custommodules'),
    );
    return modules.find((m) => m.shorty === extensionKey);
}

/** Creates the module only when the lookup succeeded and found nothing. */
export async function getOrCreateModule(
    extensionKey: string,
    name: string,
    description: string,
): Promise<CustomModule> {
    const existing = await findModule(extensionKey);
    if (existing) return existing;
    const create: CustomModuleCreate = {
        name,
        shorty: extensionKey,
        description,
        sortKey: 100,
        // Required by the API — without it the call fails with HTTP 400
        // `validation.boolean`. False because the extension is reached
        // through the menu entry the installed ZIP registers, not through a
        // second one this call would add.
        inMenu: false,
    };
    return await churchtoolsClient.post<CustomModule>('/custommodules', create);
}

/** A stored category: its metadata, and its `data` parsed from JSON. */
export type StoredCategory = {
    category: CustomModuleDataCategory;
    data: unknown;
};

/** The category with the given shorty, without reading its data. */
export async function findCategory(
    moduleId: number,
    shorty: string,
): Promise<CustomModuleDataCategory | undefined> {
    const categories = await withRetryOn429(() =>
        churchtoolsClient.get<CustomModuleDataCategory[]>(
            `/custommodules/${moduleId}/customdatacategories`,
        ),
    );
    return categories.find((c) => c.shorty === shorty);
}

/**
 * The category with the given shorty and its data parsed, or undefined when
 * there is none.
 *
 * Throws when its data is not valid JSON. An unreadable record is not an
 * empty one: read as `{}`, it would make a configured installation look
 * unconfigured.
 */
export async function readCategory(
    moduleId: number,
    shorty: string,
): Promise<StoredCategory | undefined> {
    const category = await findCategory(moduleId, shorty);
    if (!category) return undefined;
    return { category, data: category.data ? JSON.parse(category.data) : undefined };
}

/**
 * Create a category, or replace an existing one.
 *
 * The PUT **replaces** the record, so the payload has to be complete: a body
 * carrying only `data` is rejected with HTTP 400 and validation errors on
 * `customModuleId` and `shorty`.
 */
export async function writeCategory(
    moduleId: number,
    payload: CustomModuleDataCategoryCreate,
    existingId?: number,
): Promise<void> {
    const base = `/custommodules/${moduleId}/customdatacategories`;
    if (existingId === undefined) await churchtoolsClient.post(base, payload);
    else await churchtoolsClient.put(`${base}/${existingId}`, payload);
}
