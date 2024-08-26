/* src/lib/couchbaseConnector.ts */

import config from "$config";
import { log, err } from "$utils/logger";
import {
  Cluster,
  Bucket,
  Scope,
  Collection,
  connect,
  type QueryOptions,
  QueryResult,
  StreamableRowPromise,
  QueryMetaData,
} from "couchbase";

interface QueryableCluster extends Cluster {
  query<TRow = any>(
    statement: string,
    options?: QueryOptions,
  ): StreamableRowPromise<QueryResult<TRow>, TRow, QueryMetaData>;
}

export interface capellaConn {
  cluster: QueryableCluster;
  bucket: Bucket;
  scope: Scope;
  collection: Collection;
  connect: typeof connect;
}

export async function clusterConn(): Promise<capellaConn> {
  log("Attempting to connect to Couchbase...");

  try {
    const clusterConnStr: string = config.capella.COUCHBASE_URL;
    const username: string = config.capella.COUCHBASE_USERNAME;
    const password: string = config.capella.COUCHBASE_PASSWORD;
    const bucketName: string = config.capella.COUCHBASE_BUCKET;
    const scopeName: string = config.capella.COUCHBASE_SCOPE;
    const collectionName: string = config.capella.COUCHBASE_COLLECTION;

    log(`Configuring connection with the following default connection details:
                    URL: ${clusterConnStr},
                    Username: ${username},
                    Bucket: ${bucketName},
                    Scope: ${scopeName},
                    Collection: ${collectionName}`);

    const cluster: QueryableCluster = await connect(clusterConnStr, {
      username: username,
      password: password,
    });

    log("Cluster connection established.");

    const bucket: Bucket = cluster.bucket(bucketName);
    log(`Bucket ${bucketName} accessed.`);

    const scope: Scope = bucket.scope(scopeName);
    const collection: Collection = scope.collection(collectionName);
    log(`Collection ${collectionName} accessed under scope ${scopeName}.`);

    return { cluster, bucket, scope, collection, connect };
  } catch (error) {
    err("Couchbase connection failed:", error);
    throw error;
  }
}
