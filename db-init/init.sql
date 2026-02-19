-- Create the properties table with specific schema
CREATE TABLE IF NOT EXISTS properties (
    id BIGINT PRIMARY KEY,
    price DECIMAL NOT NULL,
    bedrooms INTEGER,
    bathrooms INTEGER,
    region_origin VARCHAR(2) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Seed with 1000 rows of sample data
-- We use generate_series to create 1000 records quickly
INSERT INTO properties (id, price, bedrooms, bathrooms, region_origin)
SELECT 
    gs AS id,
    (random() * 500000 + 100000)::DECIMAL as price,
    (random() * 5 + 1)::INTEGER as bedrooms,
    (random() * 3 + 1)::INTEGER as bathrooms,
    (CASE WHEN random() > 0.5 THEN 'us' ELSE 'eu' END) as region_origin
FROM generate_series(1, 1000) AS gs
ON CONFLICT (id) DO NOTHING;