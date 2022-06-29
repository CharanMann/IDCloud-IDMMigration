/**
 * Custom sync mapping's behavior script for onprem_user_to_fidc_alpha_user_roles mapping (Situation: Confirmed)
 */
logger.info("Updating Users<->Roles relationships for user: " + source.userName + " ,source Roles: " + source.roles);

var query, rolesRef;
const targetRefs = new Set();
const sourceRefs = new Set();

// Get all the existing target roles
if (target.effectiveRoles != null) {
  for (role of target.effectiveRoles) {
    targetRefs.add(role._refResourceId);
  }
  logger.info("Roles: Target external IDM user: " + target.userName + " roles count: " + targetRefs.size);
}

// Get all the source roles
if (source.roles != null) {
  for (role of source.roles) {
    sourceRefs.add(role._refResourceId);
  }
  logger.info("Roles: Source external IDM user: " + source.userName + " roles count: " + sourceRefs.size);
}

// Add qualifying new roles
if (sourceRefs != null && sourceRefs.size) {
  for (sourceRef of sourceRefs) {
    logger.info("Roles: Checking for new roles for user: " + source.userName);
    // Retrieve _id from repo links
    query = { _queryFilter: 'linkType eq "onprem_role_to_fidc_alpha_role" AND firstId eq "' + sourceRef + '"' };
    logger.info("Roles: query filter for Proxy repo: " + query._queryFilter);
    var queryResult = openidm.query("repo/link", query);

    logger.info("Roles: query results for user: " + source.userName + " ,from Proxy Repo: " + queryResult);
    if (queryResult.resultCount >= 1) {
      rolesRef = queryResult.result[0].secondId;
      if (!targetRefs.has(rolesRef)) {
        logger.info("Roles: Adding new role to user: " + target.userName + " ,role: " + rolesRef);
        rolesRef = { _ref: "managed/alpha_role/" + rolesRef };
        openidm.patch("external/idm/fidc/managed/alpha_user/" + target._id, null, [
          { operation: "add", field: "/roles/-", value: rolesRef },
        ]);
      } else {
        logger.info("Roles: No need to add, existing role for user: " + source.userName + " ,role ref: " + rolesRef);
      }
    } else {
      logger.info("Roles: No query results for user: " + source.userName + " ,role: " + sourceRef);
    }
  }
}

// Remove qualifying old roles
if (targetRefs != null && targetRefs.size) {
  for (targetRef of targetRefs) {
    logger.info("Roles: Checking for deleted roles for user: " + source.userName);
    // Retrieve _id from repo links
    query = { _queryFilter: 'linkType eq "onprem_role_to_fidc_alpha_role" AND secondId eq "' + targetRef + '"' };
    logger.info("Roles: query filter for Proxy repo: " + query._queryFilter);
    var queryResult = openidm.query("repo/link", query);

    logger.info("Roles: query results for user: " + source.userName + " ,from Proxy Repo: " + queryResult);
    if (queryResult.resultCount >= 1) {
      rolesRef = queryResult.result[0].firstId;
      if (!sourceRefs.has(rolesRef)) {
        logger.info("Roles: Removing role from user: " + target.userName + " ,role: " + rolesRef);

        // Query qualying role object from target IDM
        query = { _queryFilter: 'userName eq "' + target.userName + '"' };
        logger.info("Roles: query filter for target IDM: " + query._queryFilter);

        queryResult = openidm.query("external/idm/fidc/managed/alpha_user", query, ["roles"]);
        logger.info("Roles: query results for target user: " + source.userName + " ,roles: " + queryResult);

        if (queryResult.resultCount >= 1) {
          var roles = queryResult.result[0].roles;

          // Get the roles object to be deleted matching the targetRef
          var asgnObject = roles.filter((r) => r._refResourceId === targetRef);
          if (asgnObject && asgnObject.length >= 1) {
            asgnObject = asgnObject[0];
            logger.info("Roles: Removing role from user: " + target.userName + " ,role object: " + asgnObject);
            openidm.patch("external/idm/fidc/managed/alpha_user/" + target._id, null, [
              { operation: "remove", field: "/roles", value: asgnObject },
            ]);
          }
        }
      } else {
        logger.info("Roles: No need to delete, existing role for user: " + source.userName + " ,role ref: " + rolesRef);
      }
    } else {
      logger.info("Roles: No query results for user: " + source.userName + " ,role: " + targetRef);
    }
  }
}

("REPORT");
