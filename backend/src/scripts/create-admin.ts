import bcrypt from 'bcrypt';
import { query } from '../db';
import * as readline from 'readline';

const SALT_ROUNDS = 10;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(question: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(question, resolve);
  });
}

async function main() {
  try {
    console.log('\n📋 Admin User Creation Script\n');

    const email = await prompt('Enter admin email: ');
    const firstName = await prompt('Enter first name: ');
    const lastName = await prompt('Enter last name: ');
    const password = await prompt('Enter password: ');

    // Validate inputs
    if (!email || !firstName || !lastName || !password) {
      console.error('❌ All fields are required');
      rl.close();
      process.exit(1);
    }

    // Check if email already exists
    const { rows: existing } = await query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existing.length) {
      console.error('❌ Email already registered');
      rl.close();
      process.exit(1);
    }

    // Get admin role ID
    const { rows: roles } = await query(
      "SELECT id FROM roles WHERE name = 'admin'"
    );

    if (!roles.length) {
      console.error('❌ Admin role not found. Please run migrations first.');
      rl.close();
      process.exit(1);
    }

    // Hash password and create user
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const { rows } = await query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role_id, is_active)
       VALUES ($1, $2, $3, $4, $5, 1) RETURNING id, email, first_name, last_name`,
      [email.toLowerCase(), passwordHash, firstName, lastName, roles[0].id]
    );

    const newAdmin = rows[0];
    console.log('\n✅ Admin user created successfully!\n');
    console.log('User Details:');
    console.log(`  ID:    ${newAdmin.id}`);
    console.log(`  Email: ${newAdmin.email}`);
    console.log(`  Name:  ${newAdmin.first_name} ${newAdmin.last_name}`);
    console.log('');

    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    rl.close();
    process.exit(1);
  }
}

main();
