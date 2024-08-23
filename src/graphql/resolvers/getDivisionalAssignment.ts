// getDivisionAssignment.ts

import { getCluster } from "../../lib/clusterProvider";

const getDivisionAssignment = {
	Query: {
		getDivisionAssignment: async (_: unknown, args: { styleSeasonCode: String, companyCode: String, divisionCode: String }): Promise<any> => {
			try {
				const { styleSeasonCode, companyCode, divisionCode } = args;

				const cluster = await getCluster();
				const query = `EXECUTE FUNCTION \`default\`.\`new_model\`.getDivisionAssignment($styleSeasonCode, $companyCode, $divisionCode)`;

				const queryOptions = {
					parameters: {
						styleSeasonCode, companyCode, divisionCode
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

export default getDivisionAssignment;