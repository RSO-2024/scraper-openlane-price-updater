const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Load the gRPC service definition
const PROTO_PATH = path.join(__dirname, './src/price.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const priceProto = grpc.loadPackageDefinition(packageDefinition).PriceService;

// Create a gRPC client
const client = new priceProto('localhost:50051', grpc.credentials.createInsecure());

// Function to invoke the server method
function invokeUpdatePricesForId(id) {
    client.UpdatePricesForId({ id }, (err, response) => {
        if (err) {
            console.error('Error invoking UpdatePricesForId:', err.message);
            return;
        }
        console.log(`Response for ID "${id}":`, response.success ? 'Success' : 'Failure');
    });
}

// Invoke the method with a sample ID
const sampleId = '12345';
invokeUpdatePricesForId(sampleId);
