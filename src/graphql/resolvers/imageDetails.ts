// imageDetails.ts

import { getCluster } from "../../lib/clusterProvider";

const imageDetails = {
	Query: {
		imageDetails: async (_: unknown, args: { divisionCode: string, styleSeasonCode: string, styleCode: string }): Promise<any> => {
			try {
				const { divisionCode, styleSeasonCode, styleCode } = args;

				const cluster = await getCluster();
				const query = `EXECUTE FUNCTION \`default\`.\`_default\`.getImageDetails($divisionCode, $styleSeasonCode, $styleCode)`;

				const queryOptions = {
					parameters: {
						divisionCode,
						styleSeasonCode,
						styleCode,
					},
				};

				console.log("Query", query);
				console.log("queryOptions", queryOptions);

				let result = await cluster.cluster.query(query, queryOptions);

				console.log(JSON.stringify(result, null, 2));

				return result.rows[0][0];
			} catch (error) {
				console.error('Error:', error);
				throw error;
			}
		},
	},
};

export default imageDetails;