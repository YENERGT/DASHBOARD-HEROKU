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
  },

  /**
   * Reactivar usuario
   */
  async reactivateUser(userId) {
    const { data, error } = await supabase
      .from('users')
      .update({
        active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error reactivating user:', error);
      throw error;
    }

    return data;
  },

  /**
   * Eliminar usuario permanentemente (hard delete)
   */
  async deleteUserPermanently(userId) {
    const { data, error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error deleting user permanently:', error);
      throw error;
    }

    return data;
  },

  /**
   * Subir imagen a Supabase Storage
   * @param {string} base64Image - Imagen en formato base64 (con o sin prefijo data:image/...)
   * @param {string} fileName - Nombre del archivo (sin extensión)
   * @returns {Promise<string>} - URL pública de la imagen
   */
  async uploadGuideImage(base64Image, fileName) {
    try {
      // Extraer el tipo de imagen y los datos
      let imageData = base64Image;
      let mimeType = 'image/jpeg';
      let extension = 'jpg';

      if (base64Image.startsWith('data:')) {
        const matches = base64Image.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          imageData = matches[2];
          extension = mimeType.split('/')[1] || 'jpg';
          if (extension === 'jpeg') extension = 'jpg';
        }
      }

      // Convertir base64 a Buffer
      const buffer = Buffer.from(imageData, 'base64');

      // Generar nombre único
      const uniqueFileName = `${fileName}_${Date.now()}.${extension}`;

      // Subir a Supabase Storage
      const { data, error } = await supabase.storage
        .from('guias-imagenes')
        .upload(uniqueFileName, buffer, {
          contentType: mimeType,
          upsert: false
        });

      if (error) {
        console.error('Error uploading image to Supabase:', error);
        throw error;
      }

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('guias-imagenes')
        .getPublicUrl(uniqueFileName);

      console.log(`✅ Image uploaded to Supabase: ${urlData.publicUrl}`);
      return urlData.publicUrl;

    } catch (error) {
      console.error('Error in uploadGuideImage:', error);
      throw error;
    }
  },

  /**
   * Subir PDF de comprobante de devolución a Supabase Storage
   * @param {string} base64Pdf - PDF en formato base64 (con o sin prefijo data:application/pdf...)
   * @param {string} pedido - Número de pedido para nombrar el archivo
   * @returns {Promise<string>} - URL pública del PDF
   */
  async uploadRefundReceipt(base64Pdf, pedido) {
    try {
      // Extraer los datos del base64
      let pdfData = base64Pdf;
      let mimeType = 'application/pdf';

      if (base64Pdf.startsWith('data:')) {
        const matches = base64Pdf.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          pdfData = matches[2];
        }
      }

      // Convertir base64 a Buffer
      const buffer = Buffer.from(pdfData, 'base64');

      // Limpiar número de pedido para nombre de archivo
      const cleanPedido = pedido.replace(/[^a-zA-Z0-9]/g, '');
      const uniqueFileName = `devolucion_${cleanPedido}_${Date.now()}.pdf`;

      // Subir a Supabase Storage (bucket: devoluciones-comprobantes)
      const { data, error } = await supabase.storage
        .from('devoluciones-comprobantes')
        .upload(uniqueFileName, buffer, {
          contentType: mimeType,
          upsert: false
        });

      if (error) {
        // Si el bucket no existe, intentar crearlo o usar uno existente
        if (error.message.includes('Bucket not found')) {
          console.warn('⚠️ Bucket "devoluciones-comprobantes" no existe, usando "guias-imagenes"');

          // Intentar con el bucket existente
          const { data: altData, error: altError } = await supabase.storage
            .from('guias-imagenes')
            .upload(`devoluciones/${uniqueFileName}`, buffer, {
              contentType: mimeType,
              upsert: false
            });

          if (altError) {
            console.error('Error uploading PDF to Supabase:', altError);
            throw altError;
          }

          const { data: altUrlData } = supabase.storage
            .from('guias-imagenes')
            .getPublicUrl(`devoluciones/${uniqueFileName}`);

          console.log(`✅ Refund receipt uploaded to Supabase: ${altUrlData.publicUrl}`);
          return altUrlData.publicUrl;
        }

        console.error('Error uploading PDF to Supabase:', error);
        throw error;
      }

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('devoluciones-comprobantes')
        .getPublicUrl(uniqueFileName);

      console.log(`✅ Refund receipt uploaded to Supabase: ${urlData.publicUrl}`);
      return urlData.publicUrl;

    } catch (error) {
      console.error('Error in uploadRefundReceipt:', error);
      throw error;
    }
  }
};
