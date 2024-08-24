/* src/graphql/resolvers/imageUrlCheck.ts */

import { log, err } from "$utils/logger";
import { getCluster } from "../../lib/clusterProvider";

const imageUrlCheck = {
  Query: {
    getImageUrlCheck: async (
      _: unknown,
      args: { divisions: string[]; season: string },
    ): Promise<any> => {
      try {
        const { divisions, season } = args;

        const cluster = await getCluster().catch((error) => {
          err("Error in getCluster:", error);
          throw error;
        });
        const query = `EXECUTE FUNCTION \`default\`.\`_default\`.getImageUrlCheck($divisions, $season)`;

        const queryOptions = {
          parameters: {
            divisions,
            season,
          },
        };

        log("Query", query);
        log("queryOptions", queryOptions);

        let result = await cluster.cluster.query(query, queryOptions);

        log(JSON.stringify(result, null, 2));

        return result.rows[0];
      } catch (error) {
        err("Error:", error);
        throw error;
      }
    },
  },
};

export default imageUrlCheck;
