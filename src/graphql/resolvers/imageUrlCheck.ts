// imageUrlCheck.ts

import { getCluster } from "../../lib/clusterProvider";

const imageUrlCheck = {
	Query: {
		getImageUrlCheck: async (_: unknown, args: { divisions: string[], season: string }): Promise<any> => {
			try {
				const { divisions, season } = args;

				const cluster = await getCluster();
				const query = `EXECUTE FUNCTION \`default\`.\`_default\`.getImageUrlCheck($divisions, $season)`;

				const queryOptions = {
					parameters: {
						divisions,
						season,
					},
				};

				console.log("Query", query);
				console.log("queryOptions", queryOptions);

				let result = await cluster.cluster.query(query, queryOptions);

				console.log(JSON.stringify(result, null, 2));

				// Assuming the Couchbase function returns an array of objects with divisionCode and urls
				return result.rows[0];
			} catch (error) {
				console.error('Error:', error);
				throw error;
			}
		},
	},
};

export default imageUrlCheck;