const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { getUserByGoogleId, getUserByEmail, upsertUser } = require('../database/supabase.cjs');

/**
 * Configuración de Passport.js con Google OAuth
 */
function setupPassport() {
  // Serializar usuario para la sesión
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserializar usuario desde la sesión
  passport.deserializeUser(async (id, done) => {
    try {
      const { supabase } = require('../database/supabase.cjs');
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .eq('active', true)
        .single();

      if (error) {
        return done(error, null);
      }

      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Estrategia de Google OAuth
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.NODE_ENV === 'production'
          ? 'https://dashboard-app-8ef826ce4126.herokuapp.com/auth/google/callback'
          : 'http://localhost:3001/auth/google/callback',
        scope: ['profile', 'email']
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Extraer información del perfil de Google
          const email = profile.emails[0].value;
          const googleId = profile.id;
          const displayName = profile.displayName;
          const photoUrl = profile.photos && profile.photos[0] ? profile.photos[0].value : null;

          console.log('🔐 Google OAuth - Email:', email);

          // Buscar usuario por email en Supabase
          let user = await getUserByEmail(email);

          if (!user) {
            // Usuario no existe en la base de datos
            console.log('❌ Usuario no autorizado:', email);
            return done(null, false, { message: 'No tienes acceso. Contacta al administrador.' });
          }

          // Usuario existe - actualizar información de Google
          user = await upsertUser({
            email: email,
            googleId: googleId,
            displayName: displayName,
            photoUrl: photoUrl
          });

          console.log('✅ Usuario autenticado:', email, '- Rol:', user.role);
          return done(null, user);

        } catch (error) {
          console.error('❌ Error en Google OAuth:', error);
          return done(error, null);
        }
      }
    )
  );

  console.log('✅ Passport.js configurado con Google OAuth');
}

module.exports = { setupPassport };
