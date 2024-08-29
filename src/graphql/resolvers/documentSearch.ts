/* src/graphql/resolvers/documentSearch.ts */

import { log, err } from "$utils/logger";
import { getCluster } from "$lib/clusterProvider";
import { DocumentNotFoundError } from "couchbase";

const documentSearch = {
  Query: {
    searchDocuments: async (
      _: unknown,
      args: {
        collections: { bucket: string; scope: string; collection: string }[];
        keys: string[];
      },
    ): Promise<any[]> => {
      try {
        const { collections, keys } = args;
        const connection = await getCluster().catch((error) => {
          err("Error in getCluster:", error);
          throw error;
        });

        const results = [];

        for (const key of keys) {
          for (const { bucket, scope, collection } of collections) {
            const start = Date.now();

            if (!key.trim()) {
              log(`Skipping empty key for ${bucket}.${scope}.${collection}`);
              results.push({
                bucket,
                scope,
                collection,
                data: null,
                timeTaken: 0,
              });
              continue;
            }

            log("Fetching document using K/V operation", {
              bucket,
              scope,
              collection,
              key,
            });

            try {
              const collectionRef = connection.bucket
                .scope(scope)
                .collection(collection);
              const result = await collectionRef.get(key);
              const timeTaken = Date.now() - start;

              results.push({
                bucket,
                scope,
                collection,
                data: { id: key, ...result.content },
                timeTaken,
              });

              log(
                `Time taken to fetch document from ${bucket}.${scope}.${collection}: ${timeTaken}ms`,
              );
            } catch (error) {
              if (error instanceof DocumentNotFoundError) {
                log(
                  `Document with key ${key} not found in ${bucket}.${scope}.${collection}`,
                );
                results.push({
                  bucket,
                  scope,
                  collection,
                  data: null,
                  timeTaken: Date.now() - start,
                });
              } else {
                err(
                  `Error fetching document with key ${key} from ${bucket}.${scope}.${collection}:`,
                  error,
                );
                results.push({
                  bucket,
                  scope,
                  collection,
                  data: null,
                  timeTaken: Date.now() - start,
                  error: error.message,
                });
              }
            }
          }
        }

        return results;
      } catch (error) {
        err("Error:", error);
        throw error;
      }
    },
  },
};

export default documentSearch;
