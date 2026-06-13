// Cosmos-klient med selv-provisionering (opretter db + container hvis de mangler).
var CosmosClient = require('@azure/cosmos').CosmosClient;
var containerPromise = null;

function getContainer(){
  if(containerPromise) return containerPromise;
  containerPromise = (async function(){
    var conn = process.env.COSMOS_CONNECTION_STRING;
    if(!conn) throw new Error('COSMOS_CONNECTION_STRING mangler i app settings');
    var client = new CosmosClient(conn);
    var dbRes = await client.databases.createIfNotExists({ id: process.env.COSMOS_DB || 'timereg' });
    var cRes = await dbRes.database.containers.createIfNotExists({
      id: process.env.COSMOS_CONTAINER || 'timesheets',
      partitionKey: { paths: ['/employeeId'] }
    });
    return cRes.container;
  })();
  return containerPromise;
}

module.exports = { getContainer: getContainer };
