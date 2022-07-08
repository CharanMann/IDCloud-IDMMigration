/**
 * @file Custom sync mapping's behavior script for onprem_user_to_fidc_alpha_user_roles mapping (Situation: Confirmed)
 * @version 1.0
 * @keywords idm script
 */

logger.info("Updating Users<->Roles relationships for user: " + source.userName + " ,source Roles: " + source.roles);

var query, rolesRef;
const targetRefs = new Set();
const sourceRefs = new Set();

// Get all the existing target roles
query = { _queryFilter: 'userName eq "' + target.userName + '"' };
logger.info("Roles: query filter for target IDM: " + query._queryFilter);
queryResult = openidm.query("external/idm/fidc/managed/alpha_user", query, ["roles"]);
logger.info("Roles: query results for target user: " + source.userName + " ,roles: " + queryResult);
var targetRoles;
if (queryResult.resultCount >= 1) {
  targetRoles = queryResult.result[0].roles;
}

if (targetRoles != null) {
  for (role of targetRoles) {
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
  var deltaObjects = [];
  for (sourceRef of sourceRefs) {
    logger.info("Roles: Checking for new roles for user: " + source.userName);
    // Retrieve corresponding link _id from repo links
    query = { _queryFilter: 'linkType eq "onprem_role_to_fidc_alpha_role" AND firstId eq "' + sourceRef + '"' };
    logger.info("Roles: query filter for Proxy repo: " + query._queryFilter);
    var queryResult = openidm.query("repo/link", query);

    logger.info("Roles: query results for user: " + source.userName + " ,from Proxy Repo: " + queryResult);
    if (queryResult.resultCount >= 1) {
      rolesRef = queryResult.result[0].secondId;
      if (!targetRefs.has(rolesRef)) {
        logger.info("Roles: Considering new role to be added for user: " + target.userName + " ,role: " + rolesRef);
        deltaObjects.push({ operation: "add", field: "/roles/-", value: { _ref: "managed/alpha_role/" + rolesRef } });
      } else {
        logger.info("Roles: No need to add, existing role for user: " + source.userName + " ,role ref: " + rolesRef);
      }
    } else {
      logger.info("Roles: No query results for user: " + source.userName + " ,role: " + sourceRef);
    }
  }

  // Adding new objects
  if (deltaObjects.length >= 1) {
    logger.info("Roles: Adding new roles to user: " + target.userName + " ,roles: " + JSON.stringify(deltaObjects));
    openidm.patch("external/idm/fidc/managed/alpha_user/" + target._id, null, deltaObjects);
  }
}

// Remove qualifying old roles
if (targetRefs != null && targetRefs.size) {
  var deltaObjects = [];
  for (targetRef of targetRefs) {
    logger.info("Roles: Checking for deleted roles for user: " + source.userName);
    // Retrieve corresponding link _id from repo links
    query = { _queryFilter: 'linkType eq "onprem_role_to_fidc_alpha_role" AND secondId eq "' + targetRef + '"' };
    logger.info("Roles: query filter for Proxy repo: " + query._queryFilter);
    var queryResult = openidm.query("repo/link", query);

    logger.info("Roles: query results for user: " + source.userName + " ,from Proxy Repo: " + queryResult);
    if (queryResult.resultCount >= 1) {
      rolesRef = queryResult.result[0].firstId;
      if (!sourceRefs.has(rolesRef)) {
        if (targetRoles) {
          // Get the roles object to be deleted matching the targetRef
          var roleObject = targetRoles.filter((r) => r._refResourceId === targetRef);
          if (roleObject && roleObject.length >= 1) {
            roleObject = roleObject[0];
            logger.info("Roles: Considering role to be deleted from user: " + target.userName + " ,role object: " + roleObject);
            deltaObjects.push({ operation: "remove", field: "/roles", value: roleObject });
          }
        }
      } else {
        logger.info("Roles: No need to delete, existing role for user: " + source.userName + " ,role ref: " + rolesRef);
      }
    } else {
      logger.info("Roles: No query results for user: " + source.userName + " ,role: " + targetRef);
    }
  }

  // Remove deleted objects
  if (deltaObjects.length >= 1) {
    logger.info("Roles: Deleting roles from user: " + target.userName + " ,roles: " + JSON.stringify(deltaObjects));
    openidm.patch("external/idm/fidc/managed/alpha_user/" + target._id, null, deltaObjects);
  }
}

("REPORT");
