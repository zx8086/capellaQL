/* src/graphql/resolvers/optionsProductView.ts */

import { log, err } from "$utils/logger";
import { getCluster } from "../../lib/clusterProvider";

const optionsProductView = {
  Query: {
    optionsProductView: async (
      _: unknown,
      args: {
        BrandCode: string;
        SalesOrganizationCode: string;
        StyleSeasonCode: string;
        DivisionCode: string;
        ActiveOption: boolean;
        SalesChannels: string[];
      },
    ): Promise<any> => {
      try {
        const {
          BrandCode,
          SalesOrganizationCode,
          StyleSeasonCode,
          DivisionCode,
          ActiveOption,
          SalesChannels,
        } = args;

        const cluster = await getCluster().catch((error) => {
          err("Error in getCluster:", error);
          throw error;
        });
        const query = `EXECUTE FUNCTION \`default\`.\`_default\`.get_options_product_view($BrandCode, $SalesOrganizationCode, $StyleSeasonCode, $DivisionCode, $ActiveOption, $SalesChannels)`;

        const queryOptions = {
          parameters: {
            BrandCode,
            SalesOrganizationCode,
            StyleSeasonCode,
            DivisionCode,
            ActiveOption,
            SalesChannels,
          },
        };
        log("Query", query);
        log("queryOptions", queryOptions);

        let result = await cluster.cluster.query(query, queryOptions);

        // log(JSON.stringify(result.rows, null, 2));

        return result.rows[0];
      } catch (error) {
        err("Error:", error);
        throw error;
      }
    },
  },
};

export default optionsProductView;
