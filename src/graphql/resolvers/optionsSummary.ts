// optionsSummary.ts
import { getCluster } from "../../lib/clusterProvider";
const optionsSummary = {
	Query: {
		optionsSummary: async (_: unknown, args: {
			SalesOrganizationCode: string,
			StyleSeasonCode: string,
			DivisionCode: string,
			ActiveOption: boolean,
			SalesChannels: string[]
		}): Promise<any> => {
			try {
				const { SalesOrganizationCode, StyleSeasonCode, DivisionCode, ActiveOption, SalesChannels } = args;
				const cluster = await getCluster();
				const query = `EXECUTE FUNCTION \`default\`.\`_default\`.get_options_summary($SalesOrganizationCode, $StyleSeasonCode, $DivisionCode, $ActiveOption, $SalesChannels)`;
				const queryOptions = {
					parameters: {
						 SalesOrganizationCode, StyleSeasonCode, DivisionCode, ActiveOption, SalesChannels
					},
				};
				console.log("Query:", query);
				console.log("queryOptions:", queryOptions);
				let result = await cluster.cluster.query(query, queryOptions);
				console.log("Result:",JSON.stringify(result, null, 2));
				return result.rows[0][0];
			} catch (error) {
				console.error('Error:', error);
				throw error;
			}
		},
	},
};
export default optionsSummary;