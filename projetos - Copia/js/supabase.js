const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL === 'https://ocmppjapkrdovcgltjed.supabase.co' ? process.env.SUPABASE_URL : '',
    process.env.SUPABASE_SERVICE_ROLE_KEY === 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jbXBwamFwa3Jkb3ZjZ2x0amVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTA2MzM0OSwiZXhwIjoyMDk0NjM5MzQ5fQ.6-2NdM9YbaCaol2sqZ6SQ3emw2sl95TkT4v2ynmtonQ' ? process.env.SUPABASE_SERVICE_ROLE_KEY : ''

);

module.exports = supabase;