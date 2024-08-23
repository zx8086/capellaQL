// getAllSeasonalAssignments.ts

import { getCluster } from "../../lib/clusterProvider";

const getAllSeasonalAssignments = {
	Query: {
		getAllSeasonalAssignments: async (_: unknown, args: { styleSeasonCode: string, companyCode?: string, isActive?: boolean }): Promise<any> => {
			try {
				const { styleSeasonCode, companyCode, isActive } = args;

				const cluster = await getCluster();
				const query = `EXECUTE FUNCTION \`default\`.\`new_model\`.getAllSeasonalAssignments($styleSeasonCode, $companyCode)`;

				const queryOptions = {
					parameters: {
						styleSeasonCode,
						companyCode: companyCode !== undefined ? companyCode : null,
					},
				};

				console.log("Query", query);
				console.log("queryOptions", queryOptions);

				let result = await cluster.cluster.query(query, queryOptions);

				console.log(JSON.stringify(result, null, 2));

				// Filter divisions based on isActive if it's provided
				if (isActive !== undefined) {
					result.rows[0] = result.rows[0].map((assignment: { divisions: any[]; }) => ({
						...assignment,
						divisions: assignment.divisions.filter(div => div.isActive === isActive),
					}));
				}

				return result.rows[0];
			} catch (error) {
				console.error('Error:', error);
				throw error;
			}
		},
	},
};

export default getAllSeasonalAssignments;