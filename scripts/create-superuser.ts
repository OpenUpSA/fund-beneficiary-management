import { PrismaClient } from '@prisma/client'
import * as readline from 'readline'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const question = (prompt: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer)
    })
  })
}

const questionHidden = (prompt: string): Promise<string> => {
  return new Promise((resolve) => {
    process.stdout.write(prompt)
    
    const stdin = process.stdin
    const wasRaw = stdin.isRaw
    stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding('utf8')
    
    let password = ''
    
    const onData = (char: string) => {
      if (char === '\n' || char === '\r' || char === '\u0004') {
        stdin.setRawMode(wasRaw)
        stdin.removeListener('data', onData)
        process.stdout.write('\n')
        resolve(password)
      } else if (char === '\u0003') {
        process.exit()
      } else if (char === '\u007F' || char === '\b') {
        if (password.length > 0) {
          password = password.slice(0, -1)
          process.stdout.write('\b \b')
        }
      } else {
        password += char
        process.stdout.write('*')
      }
    }
    
    stdin.on('data', onData)
  })
}

const createHash = async (plainPassword: string): Promise<string> => {
  const saltRounds = 10
  const salt = await bcrypt.genSalt(saltRounds)
  return await bcrypt.hash(plainPassword, salt)
}

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

async function main() {
  console.log('\n🔐 Create Superuser\n')
  console.log('─'.repeat(40))
  
  // Get name
  const name = await question('Name: ')
  if (!name.trim()) {
    console.error('❌ Name is required')
    process.exit(1)
  }
  
  // Get email
  const email = await question('Email: ')
  if (!email.trim()) {
    console.error('❌ Email is required')
    process.exit(1)
  }
  if (!validateEmail(email)) {
    console.error('❌ Invalid email format')
    process.exit(1)
  }
  
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  })
  
  if (existingUser) {
    console.error(`❌ User with email ${email} already exists`)
    process.exit(1)
  }
  
  // Get password
  const password = await questionHidden('Password: ')
  if (!password || password.length < 8) {
    console.error('❌ Password must be at least 8 characters')
    process.exit(1)
  }
  
  // Confirm password
  const confirmPassword = await questionHidden('Confirm Password: ')
  if (password !== confirmPassword) {
    console.error('❌ Passwords do not match')
    process.exit(1)
  }
  
  console.log('\n─'.repeat(40))
  console.log('\nCreating superuser...')
  
  try {
    const passwordHash = await createHash(password)
    
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        role: 'SUPER_USER',
        approved: true
      }
    })
    
    console.log('\n✅ Superuser created successfully!')
    console.log(`   ID: ${user.id}`)
    console.log(`   Name: ${user.name}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Role: ${user.role}`)
    console.log(`   Approved: ${user.approved}`)
    
  } catch (error) {
    console.error('❌ Failed to create superuser:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
    rl.close()
  }
}

main()
