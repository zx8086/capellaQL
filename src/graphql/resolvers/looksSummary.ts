// looksSummary.ts

import { getCluster } from "../../lib/clusterProvider";

const looksSummary = {
	Query: {
		looksSummary: async (_: unknown, args: { brand: string, season: string, division: string }): Promise<any> => {
			try {
				const { brand, season, division } = args;

				const cluster = await getCluster();
				const query = `EXECUTE FUNCTION \`default\`.\`media_assets\`.get_looks_summary($brand, $season, $division)`;

				const queryOptions = {
					parameters: {
						brand, season, division,
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

export default looksSummary;