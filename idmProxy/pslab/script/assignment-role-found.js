/**
 * Custom sync mapping's behavior script for oonprem_role_to_fidc_alpha_role_assignments mapping (Situation: Found)
 */
logger.info("Creating Roles<->Assignments relationships for role: " + source.name + " ,source Assignments: " + source.assignments);
var assignmentRefs = [];
var assignmentRef;
const uniqueRefs = new Set();

if (source.assignments != null) {
  for (assignment of source.assignments) {
    // Retrieve _id from repo links
    query = { _queryFilter: 'linkType eq "onprem_asgn_to_fidc_alpha_asgn" AND firstId eq "' + assignment._refResourceId + '"' };
    logger.info("Assignments: query filter for Proxy repo: " + query._queryFilter);
    var queryResult = openidm.query("repo/link", query);

    logger.info("Assignments: query results for role: " + source.name + " ,from Proxy Repo: " + queryResult);

    if (queryResult.resultCount >= 1) {
      assignmentRef = queryResult.result[0].secondId;

      if (!uniqueRefs.has(assignmentRef)) {
        assignmentRefs.push({ _ref: "managed/alpha_assignment/" + assignmentRef });
        uniqueRefs.add(assignmentRef);
      } else {
        logger.info("Duplicate assignment ref found, ignoring: " + assignmentRef);
      }
    }
  }

  logger.info("Assignments: Replacing external IDM role: " + target.name + " with assignments: " + JSON.stringify(assignmentRefs));
  openidm.patch("external/idm/fidc/managed/alpha_role/" + target._id, null, [{ operation: "replace", field: "/assignments", value: assignmentRefs }]);
}


("LINK");
