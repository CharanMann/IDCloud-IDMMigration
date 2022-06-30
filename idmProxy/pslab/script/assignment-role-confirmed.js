/**
 * @file Custom sync mapping's behavior script for onprem_role_to_fidc_alpha_role_assignments mapping (Situation: Confirmed)
 * @version 1.0
 * @keywords idm script
 */

logger.info("Updating Roles<->Assignments relationships for role: " + source.name + " ,source Assignments: " + source.assignments);

var query, assignmentsRef;
const targetRefs = new Set();
const sourceRefs = new Set();

// Get all the existing target assignments
query = { _queryFilter: 'name eq "' + target.name + '"' };
logger.info("Assignments: query filter for target IDM: " + query._queryFilter);
queryResult = openidm.query("external/idm/fidc/managed/alpha_role", query, ["assignments"]);
logger.info("Assignments: query results for target role: " + source.name + " ,assignments: " + queryResult);
var targetAssignments;
if (queryResult.resultCount >= 1) {
  targetAssignments = queryResult.result[0].assignments;
}

if (targetAssignments != null) {
  for (asgn of targetAssignments) {
    targetRefs.add(asgn._refResourceId);
  }
  logger.info("Assignments: Target external IDM role: " + target.name + " assignments count: " + targetRefs.size);
}

// Get all the source assignments
if (source.assignments != null) {
  for (asgn of source.assignments) {
    sourceRefs.add(asgn._refResourceId);
  }
  logger.info("Assignments: Source external IDM role: " + source.name + " assignments count: " + sourceRefs.size);
}

// Add qualifying new assignments
if (sourceRefs != null && sourceRefs.size) {
  for (sourceRef of sourceRefs) {
    logger.info("Assignments: Checking for new assignments for role: " + source.name);
    // Retrieve corresponding link _id from repo links
    query = { _queryFilter: 'linkType eq "onprem_asgn_to_fidc_alpha_asgn" AND firstId eq "' + sourceRef + '"' };
    logger.info("Assignments: query filter for Proxy repo: " + query._queryFilter);
    var queryResult = openidm.query("repo/link", query);

    logger.info("Assignments: query results for role: " + source.name + " ,from Proxy Repo: " + queryResult);
    if (queryResult.resultCount >= 1) {
      assignmentsRef = queryResult.result[0].secondId;
      if (!targetRefs.has(assignmentsRef)) {
        logger.info("Assignments: Adding new assignment to role: " + target.name + " ,assignment: " + assignmentsRef);
        assignmentsRef = { _ref: "managed/alpha_assignment/" + assignmentsRef };
        openidm.patch("external/idm/fidc/managed/alpha_role/" + target._id, null, [
          { operation: "add", field: "/assignments/-", value: assignmentsRef },
        ]);
      } else {
        logger.info("Assignments: No need to add, existing assignment for role: " + source.name + " ,assignment ref: " + assignmentsRef);
      }
    } else {
      logger.info("Assignments: No query results for role: " + source.name + " ,assignment: " + sourceRef);
    }
  }
}

// Remove qualifying old assignments
if (targetRefs != null && targetRefs.size) {
  for (targetRef of targetRefs) {
    logger.info("Assignments: Checking for deleted assignment for role: " + source.name);
    // Retrieve corresponding link _id from repo links
    query = { _queryFilter: 'linkType eq "onprem_asgn_to_fidc_alpha_asgn" AND secondId eq "' + targetRef + '"' };
    logger.info("Assignments: query filter for Proxy repo: " + query._queryFilter);
    var queryResult = openidm.query("repo/link", query);

    logger.info("Assignments: query results for role: " + source.name + " ,from Proxy Repo: " + queryResult);
    if (queryResult.resultCount >= 1) {
      assignmentsRef = queryResult.result[0].firstId;
      if (!sourceRefs.has(assignmentsRef)) {
        // Query qualying assignment object from target IDM
        query = { _queryFilter: 'name eq "' + target.name + '"' };
        logger.info("Assignments: query filter for target IDM: " + query._queryFilter);

        queryResult = openidm.query("external/idm/fidc/managed/alpha_role", query, ["assignments"]);
        logger.info("Assignments: query results for target role: " + source.name + " ,assignments: " + queryResult);

        if (targetAssignments) {
          // Get the roles object to be deleted matching the targetRef
          var asgnObject = targetAssignments.filter((a) => a._refResourceId === targetRef);
          if (asgnObject && asgnObject.length >= 1) {
            asgnObject = asgnObject[0];
            logger.info("Assignments: Removing assignment from role: " + target.name + " ,assignment object: " + asgnObject);
            openidm.patch("external/idm/fidc/managed/alpha_role/" + target._id, null, [
              { operation: "remove", field: "/assignments", value: asgnObject },
            ]);
          }
        }
      } else {
        logger.info("Assignments: No need to delete, existing assignment for role: " + source.name + " ,assignment ref: " + assignmentsRef);
      }
    } else {
      logger.info("Assignments: No query results for role: " + source.name + " ,assignment: " + targetRef);
    }
  }
}

("REPORT");
