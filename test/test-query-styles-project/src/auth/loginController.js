
import { AuthService } from './authService.js';

export async function handleUserLogin(req, res) {
  try {
    const { email, password } = req.body;
    const authService = new AuthService();
    
    const result = await authService.authenticateUser(email, password);
    
    res.json({
      success: true,
      token: result.token,
      user: result.user
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message
    });
  }
}

export async function handleTokenValidation(req, res) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const user = await authService.validateToken(token);
    res.json({ valid: true, user });
  } catch (error) {
    res.status(401).json({ valid: false, error: error.message });
  }
}