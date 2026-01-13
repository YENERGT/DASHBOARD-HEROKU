/**
 * Script para crear las tablas en Supabase
 * Ejecuta: node server/database/setup.cjs
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY deben estar configurados en .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  console.log('🔧 Configurando base de datos...\n');

  try {
    // Crear tabla users
    console.log('1️⃣ Creando tabla users...');
    const { error: tableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email TEXT UNIQUE NOT NULL,
          google_id TEXT UNIQUE,
          display_name TEXT,
          photo_url TEXT,
          role TEXT NOT NULL DEFAULT 'ventas',
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          last_login TIMESTAMP WITH TIME ZONE
        );

        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      `
    });

    if (tableError) {
      console.log('⚠️ No se pudo crear tabla via RPC, intenta manualmente en SQL Editor');
      console.log('Copia y pega este SQL en Supabase SQL Editor:\n');
      console.log(`
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  google_id TEXT UNIQUE,
  display_name TEXT,
  photo_url TEXT,
  role TEXT NOT NULL DEFAULT 'ventas',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Insertar usuario admin
INSERT INTO users (email, display_name, role, active)
VALUES ('info@gruporevisa.net', 'Admin Principal', 'admin', true)
ON CONFLICT (email) DO NOTHING;
      `);
    } else {
      console.log('✅ Tabla users creada');
    }

    // Insertar usuario admin
    console.log('\n2️⃣ Creando usuario admin...');
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .insert({
        email: 'info@gruporevisa.net',
        display_name: 'Admin Principal',
        role: 'admin',
        active: true
      })
      .select()
      .single();

    if (adminError) {
      if (adminError.code === '23505') {
        console.log('✅ Usuario admin ya existe');
      } else {
        console.error('❌ Error creando admin:', adminError.message);
      }
    } else {
      console.log('✅ Usuario admin creado:', adminUser.email);
    }

    console.log('\n✅ ¡Base de datos configurada correctamente!\n');
    console.log('Usuarios iniciales:');

    const { data: users } = await supabase
      .from('users')
      .select('email, role, active');

    console.table(users);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n📝 Crea las tablas manualmente:');
    console.log('1. Ve a: https://supabase.com/dashboard/project/hrpayjpdgkbszukicvvj/editor');
    console.log('2. Click en "SQL Editor"');
    console.log('3. Copia y pega el SQL que aparece arriba\n');
  }
}

setupDatabase();
