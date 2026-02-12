-- Create saved_locations table
CREATE TABLE IF NOT EXISTS saved_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  sort_key BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_location UNIQUE (user_id, location_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_saved_locations_user_id ON saved_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_locations_user_sort ON saved_locations(user_id, sort_key);

-- Create trigger to automatically update updated_at timestamp
CREATE TRIGGER update_saved_locations_updated_at BEFORE UPDATE ON saved_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
