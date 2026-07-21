import messagingIndexDefinitions from '../schemas/indexes/Messaging.json';
import onboardingIndexDefinitions from '../schemas/indexes/Onboarding.json';

const allIndexDefinitions = messagingIndexDefinitions.concat(
  onboardingIndexDefinitions,
);

export const keysToObject = keys =>
  keys.reduce(
    (result, pair) => ({
      ...result,
      [pair[0]]: pair[1],
    }),
    {},
  );

const normalizedEntries = value =>
  Object.keys(value || {}).map(key => [key, value[key]]);

const normalizedPartialFilter = value => value || undefined;

export const indexMatches = (index, definition) => {
  const actualKeys = normalizedEntries(index.key);
  const expectedKeys = definition.keys;
  return (
    JSON.stringify(actualKeys) === JSON.stringify(expectedKeys) &&
    Boolean(index.unique) === Boolean(definition.unique) &&
    JSON.stringify(normalizedPartialFilter(index.partialFilterExpression)) ===
      JSON.stringify(
        normalizedPartialFilter(definition.partialFilterExpression),
      )
  );
};

export const getIndexOptions = definition => ({
  name: definition.name,
  unique: definition.unique,
  ...(definition.partialFilterExpression
    ? { partialFilterExpression: definition.partialFilterExpression }
    : {}),
});

export const getExistingIndexes = async collection => {
  try {
    return await collection.indexes();
  } catch (error) {
    // MongoDB 7 reports NamespaceNotFound for indexes() on a collection that
    // has not received its first object. createIndex below creates it safely.
    if (error && error.code === 26) return [];
    throw error;
  }
};

export const ensureMessagingIndexes = async (
  database,
  definitions = allIndexDefinitions,
) => {
  const verified = [];

  // Index creation is intentionally sequential so a failed unique index names
  // the exact migration that must be repaired before writes are enabled.
  // eslint-disable-next-line no-restricted-syntax
  for (const definition of definitions) {
    const collection = database.collection(definition.className);
    // eslint-disable-next-line no-await-in-loop
    const indexes = await getExistingIndexes(collection);
    const existing = indexes.find(index => index.name === definition.name);

    if (existing && !indexMatches(existing, definition)) {
      throw new Error(
        `Messaging index ${definition.className}.${definition.name} has incompatible keys or options.`,
      );
    }

    if (!existing) {
      // eslint-disable-next-line no-await-in-loop
      await collection.createIndex(
        keysToObject(definition.keys),
        getIndexOptions(definition),
      );
    }

    // Verify persisted metadata instead of treating createIndex as sufficient.
    // eslint-disable-next-line no-await-in-loop
    const refreshedIndexes = await getExistingIndexes(collection);
    const persisted = refreshedIndexes.find(
      index => index.name === definition.name,
    );
    if (!persisted || !indexMatches(persisted, definition)) {
      throw new Error(
        `Messaging index ${definition.className}.${definition.name} could not be verified.`,
      );
    }
    verified.push(`${definition.className}.${definition.name}`);
  }

  return verified;
};

export default {
  ensureMessagingIndexes,
  getExistingIndexes,
  getIndexOptions,
  indexMatches,
  keysToObject,
};
