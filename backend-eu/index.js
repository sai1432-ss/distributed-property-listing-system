const express = require('express');
const { Pool } = require('pg');
const { Kafka } = require('kafkajs');
const app = express();
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// --- KAFKA CONFIGURATION ---
const kafka = new Kafka({
  clientId: `backend-${process.env.REGION}`,
  brokers: [process.env.KAFKA_BROKER]
});
const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: `property-group-${process.env.REGION}` });

// --- TRACKING VARIABLES ---
const processedRequests = new Set(); // Requirement 10: Idempotency
let lastReplicatedTimestamp = null;  // Requirement 5: Replication Lag

// --- KAFKA CONSUMER LOGIC (REPLICATION) ---
const initKafka = async () => {
  let connected = false;
  while (!connected) {
    try {
      console.log(`[${process.env.REGION}] Attempting to connect to Kafka...`);
      await producer.connect();
      await consumer.connect();
      await consumer.subscribe({ topic: 'property-updates', fromBeginning: true });

      await consumer.run({
        eachMessage: async ({ message }) => {
          const event = JSON.parse(message.value.toString());
          
          // Requirement 4 & 7: Only process updates from the OTHER region
          if (event.region_origin !== process.env.REGION) {
            console.log(`[SYNC] Replicating ID ${event.id} from ${event.region_origin}`);
            
            await pool.query(
              `INSERT INTO properties (id, price, bedrooms, bathrooms, region_origin, version, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               ON CONFLICT (id) DO UPDATE SET 
                 price = EXCLUDED.price, 
                 version = EXCLUDED.version, 
                 updated_at = EXCLUDED.updated_at`,
              [event.id, event.price, event.bedrooms, event.bathrooms, event.region_origin, event.version, event.updated_at]
            );

            // Track timestamp for lag calculation
            lastReplicatedTimestamp = new Date(event.updated_at);
          }
        },
      });
      connected = true;
      console.log(`[${process.env.REGION}] Kafka Connected and Consumer Running.`);
    } catch (err) {
      console.error(`[KAFKA ERROR] Coordinator not ready, retrying in 5s...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};

// --- API ENDPOINT: UPDATE PROPERTY ---
app.put('/properties/:id', async (req, res) => {
  const { id } = req.params;
  const { price, version } = req.body;
  const requestId = req.header('X-Request-ID');

  // Requirement 10: Idempotency using X-Request-ID
  if (!requestId) return res.status(400).send("Missing X-Request-ID header");
  
  if (processedRequests.has(requestId)) {
    // REVISED: Return 422 for duplicate requests
    return res.status(422).json({
      error: "Unprocessable Entity",
      message: "Duplicate request detected"
    });
  }

  try {
    // Requirement 9: Optimistic Locking
    const result = await pool.query(
      `UPDATE properties 
       SET price = $1, version = version + 1, updated_at = NOW() 
       WHERE id = $2 AND version = $3 
       RETURNING *`,
      [price, id, version]
    );

    if (result.rows.length === 0) {
      // Requirement 9: Reject outdated version with 409 Conflict
      return res.status(409).json({ error: "Conflict: Version mismatch or ID not found" });
    }

    const updatedProperty = result.rows[0];
    processedRequests.add(requestId);

    // Requirement 4: Publish event to Kafka
    await producer.send({
      topic: 'property-updates',
      messages: [{ value: JSON.stringify(updatedProperty) }],
    });

    res.status(200).json(updatedProperty);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// --- API ENDPOINT: REPLICATION LAG ---
app.get('/replication-lag', (req, res) => {
  if (!lastReplicatedTimestamp) {
    return res.status(200).json({ lag_seconds: 0 });
  }

  const currentTime = new Date();
  const lagSeconds = (currentTime - lastReplicatedTimestamp) / 1000;

  res.status(200).json({
    lag_seconds: parseFloat(lagSeconds.toFixed(2))
  });
});

// Helper routes
app.get('/health', (req, res) => res.status(200).send('OK'));
app.get('/properties/:id', async (req, res) => {
  const r = await pool.query('SELECT * FROM properties WHERE id = $1', [req.params.id]);
  res.json(r.rows[0] || {error: "Not found"});
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`${process.env.REGION.toUpperCase()} Backend listening on ${PORT}`);
  initKafka().catch(console.error);
});