/**
 * Middleware de autenticación
 */

/**
 * Verificar si el usuario está autenticado
 */
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  // Si es una petición API, devolver 401
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({
      success: false,
      error: 'No autenticado',
      message: 'Debes iniciar sesión para acceder a este recurso'
    });
  }

  // Si es una página web, redirigir a login
  res.redirect('/login');
}

/**
 * Verificar si el usuario es admin
 */
function isAdmin(req, res, next) {
  if (!req.isAuthenticated()) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({
        success: false,
        error: 'No autenticado'
      });
    }
    return res.redirect('/login');
  }

  if (req.user.role !== 'admin') {
    if (req.path.startsWith('/api/')) {
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado',
        message: 'No tienes permisos de administrador'
      });
    }
    return res.status(403).send('Acceso denegado. Solo administradores.');
  }

  next();
}

/**
 * Verificar roles específicos
 */
function hasRole(...roles) {
  return (req, res, next) => {
    if (!req.isAuthenticated()) {
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({
          success: false,
          error: 'No autenticado'
        });
      }
      return res.redirect('/login');
    }

    if (!roles.includes(req.user.role)) {
      if (req.path.startsWith('/api/')) {
        return res.status(403).json({
          success: false,
          error: 'Acceso denegado',
          message: `Requiere uno de estos roles: ${roles.join(', ')}`
        });
      }
      return res.status(403).send('Acceso denegado.');
    }

    next();
  };
}

/**
 * Middleware opcional - permite acceso sin autenticación pero agrega info del usuario si existe
 */
function optionalAuth(req, res, next) {
  next();
}

module.exports = {
  isAuthenticated,
  isAdmin,
  hasRole,
  optionalAuth
};
