
export class UserService {
  async findUserByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await db.query(query, [email]);
    return result.rows[0];
  }
  
  async findUserById(id) {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }
  
  async createUser(userData) {
    const { email, password, name } = userData;
    const hashedPassword = await hashPassword(password);
    
    const query = 'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING *';
    const result = await db.query(query, [email, hashedPassword, name]);
    return result.rows[0];
  }
}