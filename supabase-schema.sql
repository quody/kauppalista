-- Create the shopping_items table
CREATE TABLE shopping_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  is_crossed BOOLEAN DEFAULT FALSE,
  crossed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations (since this is a simple shopping app)
CREATE POLICY "Allow all operations on shopping_items" ON shopping_items
  FOR ALL USING (true);

-- Create an index for faster queries
CREATE INDEX idx_shopping_items_category ON shopping_items(category);
CREATE INDEX idx_shopping_items_crossed_at ON shopping_items(crossed_at);