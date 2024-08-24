// getDivisionAssignment.ts

import { log, err } from "$utils/logger";
import { getCluster } from "../../lib/clusterProvider";

const getDivisionAssignment = {
  Query: {
    getDivisionAssignment: async (
      _: unknown,
      args: {
        styleSeasonCode: String;
        companyCode: String;
        divisionCode: String;
      },
    ): Promise<any> => {
      try {
        const { styleSeasonCode, companyCode, divisionCode } = args;

        const cluster = await getCluster().catch((error) => {
          err("Error in getCluster:", error);
          throw error;
        });
        const query = `EXECUTE FUNCTION \`default\`.\`new_model\`.getDivisionAssignment($styleSeasonCode, $companyCode, $divisionCode)`;

        const queryOptions = {
          parameters: {
            styleSeasonCode,
            companyCode,
            divisionCode,
          },
        };

        log("Query", query);
        log("queryOptions", queryOptions);

        let result = await cluster.cluster.query(query, queryOptions);

        log(JSON.stringify(result, null, 2));

        return result.rows[0][0];
      } catch (error) {
        err("Error:", error);
        throw error;
      }
    },
  },
};

export default getDivisionAssignment;
