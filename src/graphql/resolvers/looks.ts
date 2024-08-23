// looks.ts

import { getCluster } from "../../lib/clusterProvider";

const looks = {
	Query: {
		looks: async (_: unknown, args: { brand: string, season: string, division: string }): Promise<any> => {
			try {
				const { brand, season, division } = args;

				const cluster = await getCluster().catch(error => {
					console.error('Error in getCluster:', error);
					throw error;
				});
				const query = `EXECUTE FUNCTION \`default\`.\`media_assets\`.get_looks($brand, $season, $division)`;

				const queryOptions = {
					parameters: {
						brand, season, division,
					},
				};
				console.log("Query", query);
				console.log("queryOptions", queryOptions);

				let result = await cluster.cluster.query(query, queryOptions);

				// console.log(JSON.stringify(result.rows[0], null, 2));

				return result.rows[0];
			} catch (error) {
				console.error('Error:', error);
				throw error;
			}
		},
	},
};

export default looks;