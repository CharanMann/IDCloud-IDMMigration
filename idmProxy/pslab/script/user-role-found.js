/**
 * Custom sync mapping's behavior script for onprem_user_to_fidc_alpha_user_roles mapping (Situation: Found)
 */
logger.info("Creating Users<->Roles relationships for user: " + source.userName + " ,source Roles: " + source.roles);

var rolesRefs = [];
var query, rolesRef, userName;
const uniqueRefs = new Set();

if (source.roles != null) {
  for (role of source.roles) {
    // Retrieve _id from repo links
    query = { _queryFilter: 'linkType eq "onprem_role_to_fidc_alpha_role" AND firstId eq "' + role._refResourceId + '"' };
    logger.info("Roles: query filter for Proxy repo: " + query._queryFilter);
    var queryResult = openidm.query("repo/link", query);

    logger.info("Roles: query results for user: " + source.userName + " ,from Proxy Repo: " + queryResult);

    if (queryResult.resultCount >= 1) {
      rolesRef = queryResult.result[0].secondId;
      if (!uniqueRefs.has(rolesRef)) {
        rolesRefs.push({ _ref: "managed/alpha_role/" + rolesRef });
        uniqueRefs.add(rolesRef);
      } else {
        logger.info("Roles: Duplicate role ref found, ignoring: " + rolesRef);
      }
    }
  }

  logger.info("Roles: Replacing external IDM user: " + target.userName + " with roles: " + JSON.stringify(rolesRefs));
  openidm.patch("external/idm/fidc/managed/alpha_user/" + target._id, null, [{ operation: "replace", field: "/roles", value: rolesRefs }]);
}

("LINK");
