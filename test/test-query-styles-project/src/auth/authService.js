
export class AuthService {
  async authenticateUser(email, password) {
    const user = await this.findUserByEmail(email);
    if (!user) throw new Error('User not found');
    
    const isValid = await this.verifyPassword(password, user.hashedPassword);
    if (!isValid) throw new Error('Invalid password');
    
    return this.generateAuthToken(user);
  }
  
  generateAuthToken(user) {
    return jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
  }
  
  async validateToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return await this.findUserById(decoded.userId);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}