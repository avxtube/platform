import { MongoClient } from "mongodb";

if (!process.env.DATABASE_URL) {
  throw new Error("Invalid/Missing environment variable: 'DATABASE_URL'");
}

const uri = process.env.DATABASE_URL;
const options = {
  maxPoolSize: 10,
  minPoolSize: 2,                // รักษา connection ขั้นต่ำไว้เสมอ
  maxIdleTimeMS: 60000,          // ปิด idle connection หลัง 60 วินาที (ก่อน Atlas จะปิดเอง)
  serverSelectionTimeoutMS: 5000, // timeout เลือก server 5 วินาที
  socketTimeoutMS: 45000,        // timeout ต่อ operation
  heartbeatFrequencyMS: 10000,   // ping MongoDB ทุก 10 วินาที เพื่อ keep alive
  connectTimeoutMS: 10000,       // timeout ต่อ connection ใหม่
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}
export { MongoClient };
export default clientPromise;
