const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase credentials not configured');
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * SQL para crear las tablas necesarias (ejecutar en Supabase SQL Editor)
 *
 * -- Tabla de usuarios
 * CREATE TABLE IF NOT EXISTS users (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   email TEXT UNIQUE NOT NULL,
 *   google_id TEXT UNIQUE,
 *   display_name TEXT,
 *   photo_url TEXT,
 *   role TEXT NOT NULL DEFAULT 'viewer',
 *   active BOOLEAN DEFAULT true,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *   last_login TIMESTAMP WITH TIME ZONE
 * );
 *
 * -- Índices
 * CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
 * CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
 * CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
 *
 * -- Insertar usuario admin inicial
 * INSERT INTO users (email, display_name, role, active)
 * VALUES ('info@gruporevisa.net', 'Admin Principal', 'admin', true)
 * ON CONFLICT (email) DO NOTHING;
 */

module.exports = {
  supabase,

  /**
   * Buscar usuario por email
   */
  async getUserByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user by email:', error);
      return null;
    }

    return data;
  },

  /**
   * Buscar usuario por Google ID
   */
  async getUserByGoogleId(googleId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('google_id', googleId)
      .eq('active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user by Google ID:', error);
      return null;
    }

    return data;
  },

  /**
   * Crear o actualizar usuario
   */
  async upsertUser(userData) {
    const { data, error } = await supabase
      .from('users')
      .upsert({
        email: userData.email,
        google_id: userData.googleId,
        display_name: userData.displayName,
        photo_url: userData.photoUrl,
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'email',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting user:', error);
      throw error;
    }

    return data;
  },

  /**
   * Obtener todos los usuarios (solo admin)
   */
  async getAllUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all users:', error);
      throw error;
    }

    return data;
  },

  /**
   * Actualizar rol de usuario
   */
  async updateUserRole(userId, newRole) {
    const { data, error } = await supabase
      .from('users')
      .update({
        role: newRole,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user role:', error);
      throw error;
    }

    return data;
  },

  /**
   * Desactivar usuario (soft delete)
   */
  async deactivateUser(userId) {
    const { data, error } = await supabase
      .from('users')
      .update({
        active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error deactivating user:', error);
      throw error;
    }

    return data;
  },

  /**
   * Crear nuevo usuario (invitación)
   */
  async createUser(userData) {
    const { data, error } = await supabase
      .from('users')
      .insert({
        email: userData.email,
        display_name: userData.displayName || userData.email,
        role: userData.role || 'ventas',
        active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      throw error;
    }

    return data;
  }
};
